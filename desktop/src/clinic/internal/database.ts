import {z} from 'zod';
import {medicineSchema,prescriptionSchema,lineSchema} from '../../contracts/responses';
import {photoSchema} from '../../contracts';
import {UserError,localDate,localTime} from '../../contracts/errors';
import type {LegacyExport} from '../../contracts/legacy';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, createHash } from 'node:crypto';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Medicine, MedicineInput, PrescriptionInput, Prescription, PrescriptionDetail, Line, PhotoInput, Query, SearchResult, MonthReport } from '../../contracts';

export function textValue(value: unknown, label: string, max = 200, required = false): string {
  if (typeof value !== 'string' || value.length > max || value.includes(String.fromCharCode(0))) throw new UserError(`${label}格式不正确或过长`);
  const result = value.trim();
  if (required && !result) throw new UserError(`请填写${label}`);
  return result;
}
export function cents(value: unknown): number {
  if (typeof value !== 'string' || !/^[0-9]{1,7}([.][0-9]{1,2})?$/.test(value.trim())) throw new UserError('金额请填写非负数字，最多两位小数');
  const [whole, fraction = ''] = value.trim().split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
function integer(value: unknown, label: string, max = 1000000000): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > max) throw new UserError(`${label}格式不正确`);
  return Number(value);
}
function dateValue(value: string) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new UserError('日期格式不正确');
  return value;
}
export function validatePhoto(photo: PhotoInput): PhotoInput {
  const name = textValue(photo?.name, '照片名称', 200, true);
  const match = typeof photo?.data === 'string' && new RegExp('^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/]*={0,2})$').exec(photo.data);
  if (!match || photo.data.length > 12 * 1024 * 1024) throw new UserError('照片须为 PNG、JPEG 或 WebP，且不超过 8 MB');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 8 * 1024 * 1024 || bytes.toString('base64') !== match[2]) throw new UserError('照片内容无效或过大');
  const valid = match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid) throw new UserError('照片内容与文件类型不一致');
  return { name, data: photo.data };
}
const TABLES = ['settings', 'medicines', 'prescriptions', 'items', 'photos', 'counters', 'requests', 'audit'];
export class ClinicStore {
  private readonly db: DatabaseSync;
  constructor(readonly path: string) {
    mkdirSync(dirname(path), { recursive: true });
    if (existsSync(path) && statSync(path).size === 0) throw new UserError('数据文件为空，原文件已保留。请联系维护者从完整备份恢复');
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    const version = Number(this.db.prepare('PRAGMA user_version').get()!.user_version);
    if (version > 1) { this.db.close(); throw new UserError('数据由更新版本创建，请使用更新的诊所助手'); }
    if (!version) {
      const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      if (tables.length) { this.db.close(); throw new UserError('数据文件格式不匹配，原文件已保留'); }
      this.db.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
        INSERT INTO settings VALUES ('application','clinic-desktop'),('clinic','我的诊所'),('doctor',''),('lastBackup',''),('backupError','');
        CREATE TABLE medicines(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, acronym TEXT NOT NULL, brand TEXT NOT NULL, standard TEXT NOT NULL, purchaseCents INTEGER NOT NULL CHECK(purchaseCents>=0), retailCents INTEGER NOT NULL CHECK(retailCents>=0), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)));
        CREATE TABLE prescriptions(id TEXT PRIMARY KEY, name TEXT NOT NULL, sex TEXT NOT NULL, age TEXT NOT NULL, diagnosis TEXT NOT NULL, allergic TEXT NOT NULL, address TEXT NOT NULL, doctor TEXT NOT NULL, createdAt TEXT NOT NULL, totalCents INTEGER NOT NULL CHECK(totalCents>=0), status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active','void')), legacy INTEGER NOT NULL DEFAULT 0 CHECK(legacy IN(0,1)));
        CREATE INDEX prescription_date ON prescriptions(createdAt);
        CREATE TABLE items(prescriptionId TEXT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE, position INTEGER NOT NULL, medicineId INTEGER NOT NULL REFERENCES medicines(id), name TEXT NOT NULL, standard TEXT NOT NULL, brand TEXT NOT NULL, unitCents INTEGER NOT NULL CHECK(unitCents>=0), quantity INTEGER NOT NULL CHECK(quantity>0), PRIMARY KEY(prescriptionId,position));
        CREATE TABLE photos(prescriptionId TEXT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE, position INTEGER NOT NULL, name TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(prescriptionId,position));
        CREATE TABLE counters(day TEXT PRIMARY KEY, value INTEGER NOT NULL CHECK(value>0));
        CREATE TABLE requests(requestId TEXT PRIMARY KEY, prescriptionId TEXT NOT NULL REFERENCES prescriptions(id));
        CREATE TABLE audit(id INTEGER PRIMARY KEY, at TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, beforeJson TEXT NOT NULL);
        PRAGMA user_version=1;
        COMMIT;
      `);
    }
    if (this.getSetting('application') !== 'clinic-desktop') { this.db.close(); throw new UserError('数据文件不属于诊所助手'); }
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
  }
  close() { this.db.close(); }
  transaction<T>(work: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = work(); this.db.exec('COMMIT'); return result; } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  getSetting(key: string): string { return String(this.db.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value ?? ''); }
  setSetting(key: string, value: string) { this.db.prepare('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, value); }
  settings() { return { clinic: this.getSetting('clinic'), doctor: this.getSetting('doctor'), lastBackup: this.getSetting('lastBackup'), backupError: this.getSetting('backupError') }; }
  saveSettings(input: { clinic: string; doctor: string }) {
    const clinic = textValue(input.clinic, '诊所名称', 80, true), doctor = textValue(input.doctor, '医生姓名', 80, true);
    this.transaction(() => { this.setSetting('clinic', clinic); this.setSetting('doctor', doctor); });
  }
  medicines(search = '', includeArchived = false): Medicine[] {
    const term = textValue(search, '搜索内容', 100).toUpperCase();
    return z.array(medicineSchema).parse(this.db.prepare('SELECT * FROM medicines WHERE (?=1 OR active=1) AND (instr(upper(name),?)>0 OR instr(upper(acronym),?)>0 OR instr(upper(brand),?)>0) ORDER BY active DESC,name LIMIT 500').all(Number(includeArchived), term, term, term) );
  }
  saveMedicine(input: MedicineInput): number {
    const values = [textValue(input.name, '药品名称', 200, true), textValue(input.acronym, '拼音简称', 100).toUpperCase(), textValue(input.brand, '厂家', 200), textValue(input.standard, '规格', 200, true), cents(input.purchase), cents(input.retail)];
    if (input.id != null) {
      const id = integer(input.id, '药品编号');
      if (!this.db.prepare('UPDATE medicines SET name=?,acronym=?,brand=?,standard=?,purchaseCents=?,retailCents=? WHERE id=?').run(...values, id).changes) throw new UserError('药品不存在');
      return id;
    }
    return Number(this.db.prepare('INSERT INTO medicines(name,acronym,brand,standard,purchaseCents,retailCents) VALUES(?,?,?,?,?,?)').run(...values).lastInsertRowid);
  }
  archiveMedicine(id: number, active: boolean) {
    if (typeof active !== 'boolean') throw new UserError('药品状态不正确');
    if (!this.db.prepare('UPDATE medicines SET active=? WHERE id=?').run(Number(active), integer(id, '药品编号')).changes) throw new UserError('药品不存在');
  }
  getPrescription(id: string): PrescriptionDetail {
    const raw=this.db.prepare('SELECT * FROM prescriptions WHERE id=?').get(textValue(id,'处方编号',100,true));
    const row=raw?prescriptionSchema.parse(raw):undefined;
    if (!row) throw new UserError('找不到该处方');
    return { ...row, items:z.array(lineSchema).parse(this.db.prepare('SELECT medicineId,name,standard,brand,unitCents,quantity FROM items WHERE prescriptionId=? ORDER BY position').all(id) ), photos:z.array(photoSchema).parse(this.db.prepare('SELECT name,data FROM photos WHERE prescriptionId=? ORDER BY position').all(id) ) };
  }
  savePrescription(input: PrescriptionInput): string {
    const requestId = textValue(input.requestId, '提交编号', 100, true);
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const previous = this.db.prepare('SELECT prescriptionId FROM requests WHERE requestId=?').get(requestId);
    if (previous) {
      const saved = this.db.prepare("SELECT beforeJson FROM audit WHERE action='submission' AND target=? ORDER BY id LIMIT 1").get(requestId);
      if (saved && saved.beforeJson !== fingerprint) throw new UserError('这次提交内容已改变，请重新保存');
      return String(previous.prescriptionId);
    }
    const name = textValue(input.name, '患者姓名', 100, true), sex = textValue(input.sex, '性别', 10, true);
    const age = textValue(input.age, '年龄', 20, true);
    if (!/^[0-9]{1,3}([.][0-9]{1,2})?$/.test(age) || Number(age) > 150) throw new UserError('年龄请填写 0 至 150 的数字');
    if (!['男','女','未记录'].includes(sex)) throw new UserError('请选择性别');
    const diagnosis = textValue(input.diagnosis, '诊断', 2000, true), allergic = textValue(input.allergic, '过敏史', 1000, true);
    const address = textValue(input.address, '地址', 500), doctor = textValue(input.doctor, '医生姓名', 100, true);
    if (!Array.isArray(input.items) || input.items.length > 100 || !Array.isArray(input.photos) || input.photos.length > 5) throw new UserError('每张处方最多 100 项药品和 5 张照片');
    if (!input.items.length && !input.photos.length) throw new UserError('请添加药品或处方照片');
    const photos = input.photos.map(validatePhoto);
    return this.transaction(() => {
      const before = input.id ? this.getPrescription(input.id) : undefined;
      if (before?.status === 'void') throw new UserError('已作废处方不能修改');
      const priced = this.quote(input);
      const lines = priced.items, total = priced.totalCents;
      let id = before?.id;
      if (!id) {
        const day = localDate().replaceAll('-', '');
        let sequence: number;
        do {
          sequence = Number(this.db.prepare('INSERT INTO counters VALUES(?,1) ON CONFLICT(day) DO UPDATE SET value=value+1 RETURNING value').get(day)!.value);
          id = `${day}${String(sequence).padStart(4, '0')}`;
        } while (this.db.prepare('SELECT 1 FROM prescriptions WHERE id=?').get(id));
      }
      if (before) {
        this.audit('update', id, JSON.stringify(before));
        this.db.prepare('UPDATE prescriptions SET name=?,sex=?,age=?,diagnosis=?,allergic=?,address=?,doctor=?,totalCents=?,legacy=? WHERE id=?').run(name, sex, age, diagnosis, allergic, address, doctor, total, before.legacy, id);
        this.db.prepare('DELETE FROM items WHERE prescriptionId=?').run(id);
        this.db.prepare('DELETE FROM photos WHERE prescriptionId=?').run(id);
      } else this.db.prepare('INSERT INTO prescriptions(id,name,sex,age,diagnosis,allergic,address,doctor,createdAt,totalCents) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id, name, sex, age, diagnosis, allergic, address, doctor, localTime(), total);
      lines.forEach((line, i) => this.db.prepare('INSERT INTO items VALUES(?,?,?,?,?,?,?,?)').run(id!, i, line.medicineId, line.name, line.standard, line.brand, line.unitCents, line.quantity));
      photos.forEach((photo, i) => this.db.prepare('INSERT INTO photos VALUES(?,?,?,?)').run(id!, i, photo.name, photo.data));
      this.db.prepare('INSERT INTO requests VALUES(?,?)').run(requestId, id);
      this.audit('submission', requestId, fingerprint);
      if (!before) this.audit('create', id);
      return id;
    });
  }
  importLegacy(data:LegacyExport){
  if (Number(this.db.prepare('SELECT (SELECT count(*) FROM prescriptions)+(SELECT count(*) FROM medicines) n').get()!.n)) throw new UserError('为避免混入或覆盖数据，旧数据只能导入全新空库');
  const positiveId = (id: number) => { if (!Number.isSafeInteger(id) || id < 1) throw new UserError('旧数据编号无效'); return id; };
  const string = (value: unknown, label: string, max = 2000, required = false) => textValue(value == null ? '' : String(value), label, max, required);
  const users = new Map<number, string>();
  for (const user of data.users) { if (users.has(user.id)) throw new UserError('旧数据有重复用户编号'); users.set(positiveId(user.id), string(user.username, '医生姓名', 100, true)); }
  return this.transaction(() => {
    const medicines = new Map<number, { name: string; brand: string; standard: string; price: number }>();
    for (const item of data.medicines) {
      const id = positiveId(item.id), name = string(item.name, '药品名称', 200, true), brand = string(item.brand, '厂家', 200), standard = string(item.standard, '规格', 200);
      const price = cents(String(item.retail_price)), purchase = cents(String(item.purchase_price));
      this.db.prepare('INSERT INTO medicines(id,name,acronym,brand,standard,purchaseCents,retailCents) VALUES(?,?,?,?,?,?,?)').run(id, name, string(item.acronym, '简称', 100), brand, standard, purchase, price);
      medicines.set(id, { name, brand, standard, price });
    }
    for (const p of data.prescriptions) {
      const time = string(p.time, '旧处方时间', 19, true);
      if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$/.test(time) || Number.isNaN(Date.parse(time.replace(' ', 'T')))) throw new UserError('旧处方时间无效');
      const doctor = users.get(p.userid);
      if (!doctor) throw new UserError(`旧处方 ${string(p.id, '编号', 100)} 对应的医生不存在，请先核对旧数据`);
      this.db.prepare('INSERT INTO prescriptions(id,name,sex,age,diagnosis,allergic,address,doctor,createdAt,totalCents,legacy) VALUES(?,?,?,?,?,?,?,?,?,?,1)').run(string(p.id, '处方编号', 100, true), string(p.name, '患者姓名', 100, true), string(p.sex, '性别', 10) || '未记录', string(p.age, '年龄', 20), string(p.dianose, '诊断'), string(p.allergic, '过敏史', 1000), string(p.address, '地址', 500), doctor, time, cents(String(p.sum)));
    }
    const positions = new Map<string, number>();
    const seenItems = new Set<string>();
    for (const item of data.items) {
      const medicine = medicines.get(item.medicineId);
      if (!medicine || !Number.isSafeInteger(item.num) || item.num < 1 || item.num > 10000) throw new UserError('旧处方药品关联或数量无效，请先核对旧数据');
      const id = string(item.prescriptionId, '处方编号', 100, true), key = `${id}:${item.medicineId}`;
      if (seenItems.has(key)) throw new UserError('旧处方有重复药品，请先核对旧数据');
      seenItems.add(key);
      const position = positions.get(id) ?? 0;
      this.db.prepare('INSERT INTO items VALUES(?,?,?,?,?,?,?,?)').run(id, position, item.medicineId, medicine.name, medicine.standard, medicine.brand, medicine.price, item.num);
      positions.set(id, position + 1);
    }
    positions.clear();
    for (const item of data.photos) {
      const photo = validatePhoto(item), id = string(item.prescriptionId, '处方编号', 100, true), position = positions.get(id) ?? 0;
      if (position >= 5) throw new UserError('一张旧处方超过 5 张照片，请先核对');
      this.db.prepare('INSERT INTO photos VALUES(?,?,?,?)').run(id, position, photo.name, photo.data);
      positions.set(id, position + 1);
    }
    const totalCents = Number(this.db.prepare('SELECT COALESCE(sum(totalCents),0) n FROM prescriptions').get()!.n);
    const result = { medicines: data.medicines.length, prescriptions: data.prescriptions.length, photos: data.photos.length, totalCents };
    this.audit('legacy-import', 'hospital-legacy-v1', JSON.stringify(result));
    return result;
  });

  }
  quote(input: import('../../contracts').QuoteInput): import('../../contracts').PricePreview {
    const before = input.id ? this.getPrescription(input.id) : undefined;
    if (before?.status === 'void') throw new UserError('已作废处方不能修改');
    const seen = new Set<number>();
    const items = input.items.map(item => {
      const id=integer(item.medicineId,'药品编号'),quantity=integer(item.quantity,'药品数量',10000);
      if(seen.has(id))throw new UserError('同一种药品请合并数量');seen.add(id);
      const old=before?.items.find(line=>line.medicineId===id);
      if(old)return {...old,quantity};
      const raw=this.db.prepare('SELECT * FROM medicines WHERE id=? AND active=1').get(id);const medicine=raw?medicineSchema.parse(raw):undefined;
      if(!medicine)throw new UserError('所选药品已停用，请重新选择');
      return {medicineId:id,name:medicine.name,standard:medicine.standard,brand:medicine.brand,unitCents:medicine.retailCents,quantity};
    });
    const subtotalCents=items.reduce((sum,line)=>sum+line.quantity*line.unitCents,0);
    let totalCents=subtotalCents;let basis:import('../../contracts').PricePreview['basis']='calculated';
    if(before&&JSON.stringify(items)===JSON.stringify(before.items)){totalCents=before.totalCents;basis='retained';}
    if(input.totalOverride!==undefined){totalCents=cents(input.totalOverride);basis='manual';}
    if(!Number.isSafeInteger(totalCents)||totalCents>999999999)throw new UserError('处方金额过大，请检查数量和价格');
    return {items,subtotalCents,totalCents,basis};
  }
  migrationStatus(){return {empty:Number(this.db.prepare('SELECT (SELECT count(*) FROM prescriptions)+(SELECT count(*) FROM medicines) n').get()!.n)===0,lastMigration:this.getSetting('lastMigration')};}
  summary(){const row=this.db.prepare('SELECT (SELECT count(*) FROM medicines) medicines,(SELECT count(*) FROM prescriptions) prescriptions,(SELECT count(*) FROM photos) photos,(SELECT COALESCE(sum(totalCents),0) FROM prescriptions) totalCents').get()!;return {medicines:Number(row.medicines),prescriptions:Number(row.prescriptions),photos:Number(row.photos),totalCents:Number(row.totalCents)};}
  dates(){const row=this.db.prepare('SELECT min(createdAt) firstDate,max(createdAt) lastDate FROM prescriptions').get()!;return {firstDate:String(row.firstDate??''),lastDate:String(row.lastDate??'')};}
  inspectBackup(path:string){ClinicStore.validateBackup(path,this.db);}
  applyPrepared(path:string,expected:import('../../contracts').MigrationSummary){
    this.inspectBackup(path);this.db.prepare('ATTACH DATABASE ? AS migration_source').run(path);
    try{this.transaction(()=>{
      if(!this.migrationStatus().empty)throw new UserError('新程序已经有药品或处方，不能直接覆盖。请联系维护者合并资料。');
      for(const table of ['medicines','prescriptions','items','photos'])this.db.exec('INSERT INTO main.'+table+' SELECT * FROM migration_source.'+table);
      const actual=this.summary();
      for(const key of ['medicines','prescriptions','photos','totalCents'] as const)if(actual[key]!==expected[key])throw new UserError('迁移数量与预览不一致，已回退本次迁移');
      this.setSetting('lastMigration',JSON.stringify({at:localTime(),...actual}));this.audit('legacy-import','in-app',JSON.stringify(actual));
    });}finally{this.db.exec('DETACH DATABASE migration_source');}
  }
  audit(action: string, target: string, before = '') { this.db.prepare('INSERT INTO audit(at,action,target,beforeJson) VALUES(?,?,?,?)').run(localTime(), action, target, before); }
  voidPrescription(id: string) {
    this.transaction(() => { const before = this.getPrescription(id); if (before.status === 'void') throw new UserError('该处方已经作废'); this.audit('void', id, JSON.stringify(before)); this.db.prepare("UPDATE prescriptions SET status='void' WHERE id=?").run(id); });
  }
  prescriptions(query: Query = {}): SearchResult {
    const where: string[] = [], args: (string | number)[] = [];
    const search = textValue(query.search ?? '', '搜索内容', 100);
    if (search) { where.push('(instr(name,?)>0 OR instr(id,?)>0)'); args.push(search, search); }
    if (query.from) { where.push('createdAt>=?'); args.push(dateValue(query.from)); }
    if (query.to) { where.push('createdAt<=?'); args.push(dateValue(query.to) + ' 23:59:59'); }
    if (query.from && query.to && query.from > query.to) throw new UserError('开始日期不能晚于结束日期');
    if (!query.includeVoided) where.push("status='active'");
    const condition = where.length ? ' WHERE ' + where.join(' AND ') : '';
    const count = Number(this.db.prepare('SELECT count(*) n FROM prescriptions' + condition).get(...args)!.n);
    const page = Math.min(integer(query.page ?? 1, '页码'), Math.max(1, Math.ceil(count / 50)));
    return { rows:z.array(prescriptionSchema).parse(this.db.prepare('SELECT * FROM prescriptions' + condition + ' ORDER BY createdAt DESC,id DESC LIMIT 50 OFFSET ?').all(...args, (page - 1) * 50) ), count, page };
  }
  month(month: string): MonthReport {
    if (typeof month !== 'string' || !/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month)) throw new UserError('请选择月份');
    const days=z.array(z.object({day:z.string(),count:z.number().int(),totalCents:z.number().int()})).parse(this.db.prepare("SELECT substr(createdAt,1,10) day,count(*) count,COALESCE(sum(totalCents),0) totalCents FROM prescriptions WHERE substr(createdAt,1,7)=? AND status='active' GROUP BY day ORDER BY day DESC").all(month) );
    return { count: days.reduce((n, day) => n + day.count, 0), totalCents: days.reduce((n, day) => n + day.totalCents, 0), days };
  }
  totals() {
    const row = this.db.prepare("SELECT count(*) n,COALESCE(sum(totalCents),0) total FROM prescriptions WHERE substr(createdAt,1,10)=? AND status='active'").get(localDate())!;
    return { todayCount: Number(row.n), todayCents: Number(row.total), medicineCount: Number(this.db.prepare('SELECT count(*) n FROM medicines WHERE active=1').get()!.n) };
  }
  backup(destination: string) {
    if (existsSync(destination)) throw new UserError('备份目标已经存在，请选择新的文件名');
    this.db.prepare('VACUUM INTO ?').run(destination);
    ClinicStore.validateBackup(destination, this.db);
  }
  static validateBackup(path: string, reference: DatabaseSync) {
    const size = statSync(path).size;
    if (size < 512) throw new UserError('备份文件无效');
    let backup: DatabaseSync | undefined;
    try {
      backup = new DatabaseSync(path, { readOnly: true });
      if (backup.prepare('PRAGMA user_version').get()!.user_version !== 1 || backup.prepare("SELECT value FROM settings WHERE key='application'").get()?.value !== 'clinic-desktop') throw new Error('format');
      if (backup.prepare('PRAGMA integrity_check').get()!.integrity_check !== 'ok' || backup.prepare('PRAGMA foreign_key_check').all().length) throw new Error('integrity');
      for (const table of TABLES) {
        const columns = (db: DatabaseSync) => JSON.stringify(db.prepare(`PRAGMA table_info(${table})`).all());
        if (columns(backup) !== columns(reference)) throw new Error('schema');
      }
    } catch { throw new UserError('备份损坏、格式不正确或版本不兼容，现有数据未更改'); } finally { backup?.close(); }
  }
  restore(source: string) {
    ClinicStore.validateBackup(source, this.db);
    this.db.prepare('ATTACH DATABASE ? AS restore_source').run(source);
    try {
      this.transaction(() => {
        for (const table of [...TABLES].reverse()) this.db.exec(`DELETE FROM main.${table}`);
        for (const table of TABLES) this.db.exec(`INSERT INTO main.${table} SELECT * FROM restore_source.${table}`);
        if (this.db.prepare('PRAGMA foreign_key_check').all().length) throw new UserError('备份关联校验失败');
        this.audit('restore', randomUUID());
      });
    } finally { this.db.exec('DETACH DATABASE restore_source'); }
  }
}

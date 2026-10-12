import {z} from 'zod';
import {legacySchema} from '../../contracts/legacy';
import { promises as fs } from 'node:fs';
import { resolve, relative, isAbsolute, sep, extname, basename } from 'node:path';
import type { MigrationConnection } from '../../contracts';
import type { LegacyExport } from '../../contracts/legacy';
import { UserError } from '../../contracts/errors';

export interface ReadConnection { query(options: { sql: string; timeout: number }, values?: unknown[]): Promise<[unknown, unknown]>; end(): Promise<void>; destroy(): void }
export type Connect = (config: MigrationConnection) => Promise<ReadConnection>;
const TABLES = ['medicine','user','prescription','prescriptionMedicine','prescriptionPhoto'];
const LIMIT = 100000;
export function connectionError(error: unknown): UserError {
  if (error instanceof UserError) return error;
  const parsed=z.object({code:z.string().optional()}).safeParse(error);const code=parsed.success?parsed.data.code:undefined;
  if (['ECONNREFUSED','ETIMEDOUT','EHOSTUNREACH','ENOTFOUND'].includes(code ?? '')) return new UserError('未连接到旧系统。请检查旧电脑是否开机；若旧资料在本机，可点击“检查旧服务”。');
  if (['ER_ACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(code ?? '')) return new UserError('旧系统账号或密码不正确，或没有读取权限。请让维护者检查高级连接设置。');
  if (['ER_NO_SUCH_TABLE','ER_BAD_DB_ERROR','ER_BAD_FIELD_ERROR'].includes(code ?? '')) return new UserError('所选资料与旧诊所系统的格式不同，请重新选择旧系统目录或让维护者核对。');
  if (['PROTOCOL_SEQUENCE_TIMEOUT','PROTOCOL_CONNECTION_LOST'].includes(code ?? '')) return new UserError('读取旧资料超时或连接中断。请保持旧电脑开机后重试。');
  return new UserError('旧资料读取未完成，请让维护者检查连接、读取权限和旧系统版本。原资料没有更改。');
}
export async function readLegacy(config: MigrationConnection, connect: Connect, progress: (stage: string) => void): Promise<LegacyExport> {
  let connection: ReadConnection | undefined, locked = false, transaction = false;
  let budget = 0;
  const consume = (value: unknown) => { budget += Buffer.byteLength(JSON.stringify(value)); if (budget > 256 * 1024 * 1024) throw new UserError('旧资料超过本次迁移支持的大小，请联系维护者安排完整迁移。没有导入部分资料。'); };
  try {
    progress('正在连接旧系统…');
    connection = await connect(config);
    const rows = async (sql: string, values?: unknown[]) => { const [result] = await connection!.query({sql,timeout:30000}, values); if (!Array.isArray(result)) throw new UserError('旧系统返回的资料格式不正确'); return z.array(z.record(z.string(),z.unknown())).parse(result); };
    const engines = await rows('SELECT TABLE_NAME name, ENGINE engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME IN (?,?,?,?,?)', [config.database,...TABLES]);
    if (engines.length !== TABLES.length) throw new UserError('没有找到完整的旧诊所资料表，请让维护者检查资料库名称。');
    if (engines.every(row => String(row.engine).toUpperCase() === 'INNODB')) {
      await rowsCommand(connection, 'SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      await rowsCommand(connection, 'START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY'); transaction = true;
    } else {
      progress('正在保护旧资料读取的一致性，请勿在旧程序录入…');
      await rowsCommand(connection, 'LOCK TABLES '+TABLES.map(table=>'`'+table+'` READ').join(',')); locked = true;
    }
    const read = async (sql: string) => { const result = await rows(sql+' LIMIT '+(LIMIT+1)); if(result.length>LIMIT)throw new UserError('单类旧资料超过 10 万条，请联系维护者安排完整迁移。');consume(result);return result; };
    progress('正在读取药品和医生资料…');
    const medicines = await read('SELECT id,name,acronym,brand,standard,purchase_price,retail_price FROM medicine ORDER BY id');
    const users = await read('SELECT id,username FROM user ORDER BY id');
    progress('正在读取处方记录…');
    const prescriptions = await read('SELECT id,name,sex,age,dianose,userid,allergic,address,`sum`,time FROM prescription ORDER BY id');
    const items = await read('SELECT prescriptionId,medicineId,num FROM prescriptionMedicine ORDER BY prescriptionId,medicineId');
    const photoRows = await read('SELECT prescriptionID AS prescriptionId,photoPath FROM prescriptionPhoto ORDER BY prescriptionID');
    // Database snapshot complete. The operator has stopped old-app writes, including attachment changes.
    if (locked) { await rowsCommand(connection, 'UNLOCK TABLES'); locked = false; }
    if (transaction) { await rowsCommand(connection, 'ROLLBACK'); transaction = false; }
    const photos: LegacyExport['photos'] = [];
    for (let i=0;i<photoRows.length;i++) {
      if (i%10===0) progress('正在核对照片 '+(i+1)+' / '+photoRows.length+'…');
      const row=z.object({photoPath:z.string(),prescriptionId:z.union([z.string(),z.number()])}).parse(photoRows[i]);
      if (!config.webroot || typeof row.photoPath !== 'string' || !row.photoPath) throw new UserError('旧处方包含照片，请点击“选择照片所在文件夹”，选择含 photos 子目录的旧程序目录。');
      let root: string, source: string;
      try { root = await fs.realpath(config.webroot); source = await fs.realpath(resolve(root,row.photoPath)); } catch { throw new UserError('找不到旧处方照片，请重新选择照片所在文件夹。全部照片核对完成前不会迁移。'); }
      const rel = relative(root,source);
      if (isAbsolute(rel)||rel==='..'||rel.startsWith('..'+sep)) throw new UserError('旧照片路径超出所选文件夹，请联系维护者检查。');
      const stat = await fs.stat(source);
      if (!stat.isFile()||stat.size>8*1024*1024)throw new UserError('旧照片无法读取或超过 8 MB，请联系维护者处理。');
      const type=({'.png':'png','.jpg':'jpeg','.jpeg':'jpeg','.webp':'webp'} as Record<string,string>)[extname(source).toLowerCase()];
      if(!type)throw new UserError('旧照片格式暂不支持，请联系维护者转换为 PNG 或 JPG 后重试。');
      const photo={prescriptionId:String(row.prescriptionId),name:basename(source),data:'data:image/'+type+';base64,'+(await fs.readFile(source)).toString('base64')}; consume(photo);photos.push(photo);
    }
    const amount=(value:unknown)=>{const n=Number(value);if(value==null||!Number.isFinite(n)||n<0||n>9999999.99)throw new UserError('旧资料中有无效金额，请联系维护者核对后重试。');return n.toFixed(2);};
    return legacySchema.parse({format:'hospital-legacy-v1',medicines:medicines.map(m=>({id:Number(m.id),name:m.name,acronym:m.acronym,brand:m.brand,standard:m.standard,purchase_price:amount(m.purchase_price),retail_price:amount(m.retail_price)})),users:users.map(u=>({id:Number(u.id),username:u.username})),prescriptions:prescriptions.map(p=>({id:String(p.id),name:p.name,sex:p.sex,age:String(p.age),dianose:p.dianose,userid:Number(p.userid),allergic:p.allergic,address:p.address,sum:amount(p.sum),time:String(p.time)})),items:items.map(i=>({prescriptionId:String(i.prescriptionId),medicineId:Number(i.medicineId),num:Number(i.num)})),photos});
  } catch(error) { throw connectionError(error); }
  finally { if(connection){try{if(locked)await rowsCommand(connection,'UNLOCK TABLES');if(transaction)await rowsCommand(connection,'ROLLBACK');await connection.end();}catch{connection.destroy();}} }
}
async function rowsCommand(connection: ReadConnection, sql: string) { await connection.query({sql,timeout:30000}); }

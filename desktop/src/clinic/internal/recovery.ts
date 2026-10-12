import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {ClinicStore} from './database';
import {localDate,localTime,UserError} from '../../contracts/errors';

export class BackupManager {
  private restorePlans=new Map<string,string>();
  private timer?: ReturnType<typeof setTimeout>;
  private lastBackup: string;
  private backupError: string;
  constructor(readonly store: ClinicStore, readonly directory: string, private readonly changed: () => void = () => {}) {
    mkdirSync(directory, { recursive: true });
    this.lastBackup = store.getSetting('lastBackup'); this.backupError = store.getSetting('backupError');
  }
  settings() { return {clinic:this.store.getSetting('clinic'),doctor:this.store.getSetting('doctor')}; }
  protection(){return {lastBackup:this.lastBackup,backupError:this.backupError,pending:Boolean(this.timer)};}
  private status(error = '') {
    this.backupError = error;
    if (!error) this.lastBackup = localTime();
    try { this.store.setSetting('lastBackup', this.lastBackup); this.store.setSetting('backupError', error); } catch { /* Status must remain visible even when the data disk cannot be written. */ }
    this.changed();
  }
  list() {
    return readdirSync(this.directory).filter(name => /^(auto|before-restore|before-import|manual)-[a-zA-Z0-9_-]+[.]clinic-backup$/.test(name)).map(name => ({ name, time: statSync(join(this.directory, name)).mtime.toISOString() })).sort((a, b) => b.time.localeCompare(a.time));
  }
  create(kind: 'auto' | 'before-restore' | 'before-import' | 'manual' = 'auto') {
    const name = `${kind}-${localDate()}-${Date.now()}-${randomUUID().slice(0, 8)}.clinic-backup`;
    const path = join(this.directory, name), temporary = path + '.partial';
    try {
      this.store.backup(temporary);
      renameSync(temporary, path);
      this.status();
      const automatic = this.list().filter(file => file.name.startsWith('auto-'));
      for (const old of automatic.slice(30)) rmSync(join(this.directory, old.name));
      return path;
    } catch (error) {
      this.status('自动备份未完成，请检查磁盘剩余空间，并在“备份与设置”中重试。');
      try { if (existsSync(temporary)) rmSync(temporary); } catch { /* Keep the original error and persistent/session warning. */ }
      throw error;
    }
  }
  daily() { if (!this.list().some(file => file.name.startsWith(`auto-${localDate()}-`))) this.create(); }
  schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = undefined; try { this.create(); } catch { /* Visible persistent backupError; never discard patient writes. */ } }, 1500);
    this.changed();
  }
  flush() { if (this.timer) { clearTimeout(this.timer); this.timer = undefined; this.create(); } }
  export(destination: string) {
    if (resolve(destination) === resolve(this.store.path)) throw new UserError('不能覆盖正在使用的数据文件');
    const temporary = destination + '.' + randomUUID() + '.partial';
    try { this.store.backup(temporary); renameSync(temporary, destination); this.status(); } finally { if (existsSync(temporary)) rmSync(temporary); }
  }
  inspectRestore(path:string){
    if(resolve(path)===resolve(this.store.path))throw new UserError('请选择备份文件，不能恢复正在使用的数据文件');
    const id=randomUUID(),staged=join(this.directory,'restore-plan-'+id+'.partial');
    copyFileSync(path,staged);
    try{this.store.inspectBackup(staged);this.restorePlans.set(id,staged);return id;}catch(error){rmSync(staged,{force:true});throw error;}
  }
  discardRestore(id:string){const staged=this.restorePlans.get(id);if(staged){rmSync(staged,{force:true});this.restorePlans.delete(id);}}
  close(){for(const id of this.restorePlans.keys())this.discardRestore(id);}
  restore(id: string) {
    const staged=this.restorePlans.get(id);if(!staged)throw new UserError('恢复预览已失效，请重新选择备份');
    try{
      const safety=this.create('before-restore');this.store.restore(staged);
      try{this.create('auto');}catch{}
      return safety;
    }finally{this.discardRestore(id);}
  }
}

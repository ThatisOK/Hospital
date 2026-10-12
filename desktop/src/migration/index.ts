import { Worker } from 'node:worker_threads';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {z} from 'zod';
import {summarySchema} from '../contracts';
import {UserError} from '../contracts/errors';
import type {LegacyImportTarget} from '../clinic';
import { inspectFolder, discoverFolders, validateConnection } from './internal/discovery';
import type { MigrationConnection, MigrationSource, MigrationPreview, MigrationState, MigrationUpdate } from '../contracts';

const workerMessage=z.discriminatedUnion('type',[z.object({type:z.literal('progress'),stage:z.string()}),z.object({type:z.literal('ready'),counts:summarySchema,firstDate:z.string(),lastDate:z.string()}),z.object({type:z.literal('error'),message:z.string()})]);
export class MigrationSession {
  private sources = new Map<string,{folder:string;config:MigrationConnection|null}>();
  private directory?: string;
  private worker?: Worker;
  private preview?: MigrationPreview;
  private preparing = false;
  private canceled = false;
  private current:MigrationState={kind:'selecting'};
  private sessionId=randomUUID();private revision=0;
  private listeners=new Set<(update:MigrationUpdate)=>void>();
  private preparation?:Promise<MigrationPreview>;
  private committing?:Promise<MigrationPreview>;
  private fingerprint?:string;
  constructor(private target:LegacyImportTarget) {}
  state():MigrationUpdate{return {sessionId:this.sessionId,revision:this.revision,state:this.current};}
  observe(listener:(value:MigrationUpdate)=>void){this.listeners.add(listener);listener(this.state());return()=>this.listeners.delete(listener);}
  private publish(state:MigrationState){this.current=state;this.revision++;for(const listener of this.listeners)listener(this.state());}
  private progress=(stage:string)=>{if(!this.canceled)this.publish({kind:'preparing',stage});};
  async begin(input:{kind:'source';sourceId:string;oldAppClosed:true}|{kind:'json';path:string;oldAppClosed:true}){if(this.preparing||this.committing)throw new UserError('正在处理旧资料，请稍候');this.preparing=true;this.canceled=false;this.preparation=this.prepare(input);void this.preparation.catch(()=>{});await Promise.resolve();}
  async beginCommit(token:string){if(this.preparing||this.committing)throw new UserError('正在处理旧资料，请稍候');this.committing=this.commit(token);void this.committing.catch(()=>{});await Promise.resolve();}

  async status(){const result=await this.target.status();if(result.kind==='rejected')throw new UserError(result.error);return result.value;}
  private async requireEmpty(){if(!(await this.status()).empty)throw new UserError('新程序已经有药品或处方，不能直接覆盖。请联系维护者合并资料。');}
  manual():MigrationSource { const id=randomUUID();this.sources.set(id,{folder:'手动连接',config:null});return {id,label:'手动连接旧系统',folder:'由维护者填写',configured:false,database:'',host:'127.0.0.1',needsPassword:true}; }
  async selectFolder(folder:string){
    const source=await inspectFolder(folder),id=randomUUID();this.sources.set(id,source);
    return {id,label:basename(source.folder),folder:source.folder,configured:Boolean(source.config),database:source.config?.database??'',host:source.config?.host??'127.0.0.1',needsPassword:!source.config} as MigrationSource;
  }
  async discover(){const result:MigrationSource[]=[];for(const folder of await discoverFolders())try{const source=await this.selectFolder(folder);if(source.configured)result.push(source);}catch{}return result;}
  configure(id:string,input:MigrationConnection){if(!this.sources.has(id))throw new UserError('请重新选择旧系统文件夹');this.sources.set(id,{folder:this.sources.get(id)!.folder,config:validateConnection(input)});}
  setPhotoFolder(id:string,webroot:string){const source=this.sources.get(id);if(!source?.config)throw new UserError('请先识别旧系统连接信息');source.config.webroot=webroot;}
  isLocal(id:string){const config=this.sources.get(id)?.config;return Boolean(config&&['localhost','127.0.0.1','::1','[::1]'].includes(config.host.toLowerCase()));}
  private async prepare(input:{kind:'source';sourceId:string;oldAppClosed:true}|{kind:'json';path:string;oldAppClosed:true}):Promise<MigrationPreview>{
    try{
      await this.requireEmpty();if(input.oldAppClosed!==true)throw new UserError('请先关闭旧程序的录入页面，并勾选确认。');
      this.publish({kind:'preparing',stage:'正在准备读取旧资料…'});
      await this.cleanup();
      if(this.canceled)throw new UserError('已取消本次准备，原资料没有更改。');
      const config=input.kind==='source'?this.sources.get(input.sourceId)?.config:undefined;
      if(input.kind==='source'&&!config)throw new UserError('还没有识别连接信息，请选择旧系统目录或填写高级设置。');
      this.directory=await fs.mkdtemp(join(tmpdir(),'clinic-migration-'));
      if(this.canceled)throw new UserError('已取消本次准备，原资料没有更改。');
      const directory=this.directory;
      const worker=new Worker(join(__dirname,'internal/preparation-worker.js'),{workerData:{directory,config,jsonPath:input.kind==='json'?input.path:undefined}});this.worker=worker;
      const result=await new Promise<{counts:import('../contracts').MigrationSummary;firstDate:string;lastDate:string}>((resolve,reject)=>{
        let done=false;const finish=(error?:Error,value?:{counts:import('../contracts').MigrationSummary;firstDate:string;lastDate:string})=>{if(done)return;done=true;clearTimeout(timer);if(error)reject(error);else if(value)resolve(value);};
        const timer=setTimeout(()=>{void worker.terminate();finish(new UserError('读取时间较长，已停止本次准备。旧资料没有更改，请联系维护者检查。'));},300000);
        worker.on('message',(raw:unknown)=>{const parsed=workerMessage.safeParse(raw);if(!parsed.success){finish(new UserError('旧资料返回格式不正确'));return;}const message=parsed.data;if(this.canceled)return;if(message.type==='progress')this.progress(message.stage);else if(message.type==='ready')finish(undefined,message);else if(message.type==='error')finish(new UserError(message.message));});
        worker.on('error',()=>finish(new UserError('资料准备未完成，请重试或联系维护者。')));
        worker.on('exit',()=>finish(new UserError('已取消本次准备，原资料没有更改。')));
      });
      await worker.terminate();this.worker=undefined;
      if(this.canceled)throw new UserError('已取消本次准备，原资料没有更改。');
      this.preview={token:randomUUID(),...result.counts,firstDate:result.firstDate,lastDate:result.lastDate,source:input.kind==='json'?'旧资料文件':this.sources.get(input.sourceId)!.folder};
      this.progress('正在核验预览文件…');
      this.fingerprint=createHash('sha256').update(await fs.readFile(join(directory,'prepared.clinic-backup'))).digest('hex');
      if(this.canceled)throw new UserError('已取消本次准备，原资料没有更改。');
      this.publish({kind:'reviewing',preview:this.preview!});return this.preview!;
    }catch(error){await this.cleanup().catch(()=>{});this.publish(this.canceled?{kind:'selecting'}:{kind:'failed',error:error instanceof UserError?error.message:'资料准备未完成，请重试'});throw error;}finally{this.preparing=false;}
  }
  async cancel(){if(this.committing)throw new UserError('正在导入，请等待完成');if(!this.preparing)return;this.canceled=true;this.publish({kind:'canceling',stage:'正在取消并清理…'});await this.worker?.terminate();await this.preparation?.catch(()=>{});}
  async clear(){if(this.committing)throw new UserError('正在导入，请等待完成');await this.cancel();await this.cleanup();this.sources.clear();this.sessionId=randomUUID();this.revision=0;this.publish({kind:'selecting'});}
  async dispose(){await this.committing?.catch(()=>{});await this.cancel();await this.cleanup();this.sources.clear();this.listeners.clear();}
  private async cleanup(){
    this.preview=undefined;
    if(this.worker){await this.worker.terminate();this.worker=undefined;}
    if(this.directory){const directory=resolve(this.directory);if(dirname(directory)!==resolve(tmpdir())||!basename(directory).startsWith('clinic-migration-'))throw new Error('Unexpected migration directory');await fs.rm(directory,{recursive:true,force:true});this.directory=undefined;}
  }
  private async commit(token:string){
    try{
      await this.requireEmpty();if(!this.preview||this.preview.token!==token||!this.directory)throw new UserError('预览已失效，请重新读取旧资料。');
      const preview=this.preview,prepared=join(this.directory,'prepared.clinic-backup');
      this.publish({kind:'committing',preview});
      const hash=createHash('sha256').update(await fs.readFile(prepared)).digest('hex');
      if(hash!==this.fingerprint)throw new UserError('预览资料发生变化，请重新读取');
      const result=await this.target.apply({path:prepared,expected:{medicines:preview.medicines,prescriptions:preview.prescriptions,photos:preview.photos,totalCents:preview.totalCents}});
      if(result.kind==='rejected')throw new UserError(result.error);
      this.preview=undefined;this.publish({kind:'completed',receipt:preview});
      await this.cleanup().catch(()=>{});return preview;
    }catch(error){this.publish({kind:'failed',error:error instanceof UserError?error.message:'迁移未完成，请重试'});throw error;}finally{this.committing=undefined;}
  }
}

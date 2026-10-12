import {Worker} from 'node:worker_threads';
import {join} from 'node:path';
import {z} from 'zod';
import type {ClinicBridge,Protection,Result,CommitResult,MigrationSummary} from '../contracts';
import type {Request} from './internal/requests';
import {result,commit,snapshotSchema,medicineSchema,priceSchema,prescriptionSchema,detailSchema,pageSchema,monthSchema,statusSchema,countsSchema} from '../contracts/responses';
export type LocalClinic=Omit<ClinicBridge['clinic'],'exportBackup'|'restore'>;
export interface LegacyImportTarget {status():Promise<Result<{empty:boolean;lastMigration:string}>>;apply(input:{path:string;expected:MigrationSummary}):Promise<CommitResult<MigrationSummary>>}
export interface ClinicHost {client:LocalClinic;importTarget:LegacyImportTarget;exportBackup(path:string):Promise<Result<null>>;inspectRestore(path:string):Promise<Result<string>>;discardRestore(plan:string):Promise<Result<null>>;restore(plan:string):Promise<Result<null>>;observe(listener:(status:Protection)=>void):()=>void;close():Promise<void>}
const protectionSchema=z.object({lastBackup:z.string(),backupError:z.string(),pending:z.boolean()});
const replySchema=z.discriminatedUnion('kind',[z.object({kind:z.literal('ok'),value:z.unknown()}),z.object({kind:z.literal('committed'),value:z.unknown(),protection:protectionSchema}),z.object({kind:z.literal('rejected'),error:z.string()})]);
export async function openClinicHost(options:{directory:string}):Promise<ClinicHost>{
 const worker=new Worker(join(__dirname,'internal/worker.js'),{workerData:options});
 let closing:Promise<void>|undefined;let sequence=0,closed=false,exclusive=false,status:Protection={lastBackup:'',backupError:'',pending:false};
 const listeners=new Set<(value:Protection)=>void>();
 const pending=new Map<number,{resolve:(value:unknown)=>void;reject:(error:Error)=>void}>();
 let readyResolve:()=>void=()=>{},readyReject:(error:Error)=>void=()=>{};
 const ready=new Promise<void>((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
 worker.on('message',(message:unknown)=>{
  if(!message||typeof message!=='object'||!('type'in message))return;
  if(message.type==='ready'&&'protection'in message){status=protectionSchema.parse(message.protection);readyResolve();}
  if(message.type==='protection'&&'value'in message){status=protectionSchema.parse(message.value);for(const listener of listeners)listener(status);}
  if(message.type==='reply'&&'id'in message&&typeof message.id==='number'&&'result'in message){const wait=pending.get(message.id);if(wait){pending.delete(message.id);wait.resolve(replySchema.parse(message.result));}}
 });
 const fail=(error:Error)=>{readyReject(error);for(const request of pending.values())request.reject(error);pending.clear();};
 worker.on('error',fail);worker.on('exit',()=>{if(pending.size||!closed)fail(new Error('本地资料模块已停止，退出后重新打开程序'));});
 await ready;
 const mutations=new Set<Request['operation']>(['saveMedicine','archiveMedicine','savePrescription','voidPrescription','settings','backup','export']);
 const request=(input:Request):Promise<unknown>=>{
  if(closed||(closing&&input.operation!=='close'))return Promise.reject(new Error('资料已关闭'));
  if(exclusive&&(mutations.has(input.operation)||input.operation==='restore'||input.operation==='applyPrepared'))return Promise.resolve({kind:'rejected',error:'正在导入或恢复资料，完成后再保存'});
  const ownsExclusive=input.operation==='restore'||input.operation==='applyPrepared';if(ownsExclusive)exclusive=true;
  const id=++sequence;const result=new Promise<unknown>((resolve,reject)=>{pending.set(id,{resolve,reject});worker.postMessage({id,request:input});});
  return ownsExclusive?result.finally(()=>{exclusive=false;}):result;
 };
 // Parse the response at the worker seam; callers cannot choose a response type.
 const call=async<T>(input:Request,schema:z.ZodType<T>):Promise<T>=>schema.parse(await request(input));
 const client:LocalClinic={
  overview:()=>call({operation:'overview'},result(snapshotSchema)),medicines:input=>call({operation:'medicines',input},result(z.array(medicineSchema))),saveMedicine:input=>call({operation:'saveMedicine',input},commit(z.number().int())),archiveMedicine:input=>call({operation:'archiveMedicine',input},commit(z.null())),quote:input=>call({operation:'quote',input},result(priceSchema)),savePrescription:input=>call({operation:'savePrescription',input},commit(prescriptionSchema)),prescriptions:input=>call({operation:'prescriptions',input},result(pageSchema)),prescription:input=>call({operation:'prescription',input},result(detailSchema)),voidPrescription:input=>call({operation:'voidPrescription',input},commit(z.null())),month:input=>call({operation:'month',input},result(monthSchema)),settings:input=>call({operation:'settings',input},commit(z.null())),backup:()=>call({operation:'backup'},result(z.null())),
 };
 return {client,importTarget:{status:()=>call({operation:'migrationStatus'},result(statusSchema)),apply:input=>call({operation:'applyPrepared',input},commit(countsSchema))},exportBackup:input=>call({operation:'export',input},result(z.null())),inspectRestore:input=>call({operation:'inspectRestore',input},result(z.string())),discardRestore:input=>call({operation:'discardRestore',input},result(z.null())),restore:input=>call({operation:'restore',input},result(z.null())),observe:listener=>{listeners.add(listener);listener(status);return()=>listeners.delete(listener);},close:()=>{if(closing)return closing;closing=(async()=>{if(closed)return;await request({operation:'close'});closed=true;await worker.terminate();listeners.clear();})();return closing;}};
}

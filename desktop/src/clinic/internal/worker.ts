import {parentPort,workerData} from 'node:worker_threads';
import {join} from 'node:path';
import {ClinicStore} from './database';
import {BackupManager} from './recovery';
import {requestSchema} from './requests';
import {UserError} from '../../contracts/errors';
import type {Request} from './requests';
const store=new ClinicStore(join(workerData.directory,'clinic.sqlite'));
const backups=new BackupManager(store,join(workerData.directory,'backups'),()=>parentPort!.postMessage({type:'protection',value:backups.protection()}));
try{backups.daily();}catch{}
function execute(request:Request):unknown{
 switch(request.operation){
  case 'overview':return {kind:'ok',value:{settings:backups.settings(),protection:backups.protection(),...store.totals(),dataPath:workerData.directory,backups:backups.list()}};
  case 'medicines':return {kind:'ok',value:store.medicines(request.input.search,request.input.includeArchived)};
  case 'saveMedicine':return committed(store.saveMedicine(request.input));
  case 'archiveMedicine':store.archiveMedicine(request.input.id,request.input.active);return committed(null);
  case 'quote':return {kind:'ok',value:store.quote(request.input)};
  case 'savePrescription':return committed(store.getPrescription(store.savePrescription(request.input)));
  case 'prescriptions':return {kind:'ok',value:store.prescriptions(request.input)};
  case 'prescription':return {kind:'ok',value:store.getPrescription(request.input)};
  case 'voidPrescription':store.voidPrescription(request.input);return committed(null);
  case 'month':return {kind:'ok',value:store.month(request.input)};
  case 'settings':store.saveSettings(request.input);return committed(null);
  case 'backup':backups.create('manual');return {kind:'ok',value:null};
  case 'export':backups.export(request.input);return {kind:'ok',value:null};
  case 'inspectRestore':return {kind:'ok',value:backups.inspectRestore(request.input)};
  case 'discardRestore':backups.discardRestore(request.input);return {kind:'ok',value:null};
  case 'restore':backups.restore(request.input);return {kind:'ok',value:null};
  case 'migrationStatus':return {kind:'ok',value:store.migrationStatus()};
  case 'applyPrepared':{
   backups.create('before-import');store.applyPrepared(request.input.path,request.input.expected);
   try{backups.create('manual');}catch{}
   return {kind:'committed',value:request.input.expected,protection:backups.protection()};
  }
  case 'close':try{backups.flush();}catch{}backups.close();store.close();return {kind:'ok',value:null};
  default:{const exhaustive:never=request;return exhaustive;}
 }
}
function committed(value:unknown){backups.schedule();return {kind:'committed',value,protection:backups.protection()};}
parentPort!.on('message',(message:unknown)=>{
 try{
  if(!message||typeof message!=='object'||!('id'in message)||typeof message.id!=='number'||!('request'in message))return;
  const parsed=requestSchema.safeParse(message.request);if(!parsed.success){parentPort!.postMessage({type:'reply',id:message.id,result:{kind:'rejected',error:'输入格式不正确，请检查后重试'}});return;}const request=parsed.data;
  let result:unknown;
  try{result=execute(request);}catch(error){result={kind:'rejected',error:error instanceof UserError?error.message:'操作未完成，请检查输入和磁盘空间后重试'};}
  parentPort!.postMessage({type:'reply',id:message.id,result});
  if(request.operation==='close')parentPort!.close();
 }catch{parentPort!.postMessage({type:'invalid-request'});}
});
parentPort!.postMessage({type:'ready',protection:backups.protection()});

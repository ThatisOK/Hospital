import { parentPort, workerData } from 'node:worker_threads';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import {prepareLegacySnapshot} from '../../clinic/preparation';
import {UserError} from '../../contracts/errors';
import {legacySchema,type LegacyExport} from '../../contracts/legacy';
import { readLegacy, type ReadConnection } from './mysql-reader';
import {connectionSchema} from '../../contracts';

async function main() {
  const progress = (stage: string) => parentPort!.postMessage({type:'progress',stage});
  let data: LegacyExport;
  if(workerData.jsonPath){
    progress('正在读取旧资料文件…');
    if((await fs.stat(workerData.jsonPath)).size>256*1024*1024)throw new UserError('资料文件超过 256 MB，请联系维护者安排完整迁移。');
    try{data=legacySchema.parse(JSON.parse(await fs.readFile(workerData.jsonPath,'utf8')));}catch{throw new UserError('这个文件不是旧系统导出资料，请重新选择。');}
  }else{
    const {createConnection}=await import('mysql2/promise');
    data=await readLegacy(connectionSchema.parse(workerData.config), async config => await createConnection({host:config.host,port:config.port,database:config.database,user:config.user,password:config.password,dateStrings:true,charset:'utf8mb4',supportBigNumbers:true,bigNumberStrings:true,multipleStatements:false,connectTimeout:10000}) as unknown as ReadConnection,progress);
  }
  progress('正在检查处方、金额和照片是否完整…');
  const result=prepareLegacySnapshot(join(workerData.directory,'staging.sqlite'),join(workerData.directory,'prepared.clinic-backup'),legacySchema.parse(data));
  parentPort!.postMessage({type:'ready',...result});
}
main().catch(error=>parentPort!.postMessage({type:'error',message:error instanceof UserError?error.message:'旧资料校验未通过，可能存在重复编号或缺少关联资料。请联系维护者核对，当前资料没有更改。'}));

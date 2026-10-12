const fs=require('node:fs/promises');
const {readLegacy}=require('../dist/migration/internal/mysql-reader');
const {createConnection}=require('mysql2/promise');
(async()=>{
 if(process.argv.includes('--help')){console.log('Set CLINIC_MYSQL_HOST, CLINIC_MYSQL_PORT, CLINIC_MYSQL_USER, CLINIC_MYSQL_PASSWORD, CLINIC_MYSQL_DATABASE, CLINIC_LEGACY_WEBROOT. Pause old writes, then npm run export:legacy -- output.json');return;}
 const output=process.argv[2];if(!output||!process.env.CLINIC_MYSQL_USER||!process.env.CLINIC_MYSQL_DATABASE)throw new Error('请提供输出文件并设置旧数据库账号和名称');
 const config={host:process.env.CLINIC_MYSQL_HOST||'127.0.0.1',port:Number(process.env.CLINIC_MYSQL_PORT||3306),user:process.env.CLINIC_MYSQL_USER,password:process.env.CLINIC_MYSQL_PASSWORD||'',database:process.env.CLINIC_MYSQL_DATABASE,webroot:process.env.CLINIC_LEGACY_WEBROOT||''};
 const data=await readLegacy(config,async settings=>createConnection({...settings,dateStrings:true,multipleStatements:false,connectTimeout:10000}),()=>{});
 const handle=await fs.open(output,'wx',0o600);try{await handle.writeFile(JSON.stringify(data));}finally{await handle.close();}
 console.log(JSON.stringify({medicines:data.medicines.length,prescriptions:data.prescriptions.length,photos:data.photos.length}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});

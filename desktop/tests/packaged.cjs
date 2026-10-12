const { _electron: electron }=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const data=fs.mkdtempSync(path.join(os.tmpdir(),'clinic-packaged-'));
const exe=path.resolve('release/win-unpacked/诊所助手.exe');
const env={...process.env,APPDATA:data,PATH:process.env.SystemRoot+'\\System32'};delete env.ELECTRON_RUN_AS_NODE;delete env.CLINIC_TEST_DATA;
let app;
(async()=>{
 app=await electron.launch({executablePath:exe,args:["--user-data-dir="+path.join(data,"ClinicAssistant")],env,timeout:30000});
 const page=await app.firstWindow();
 await page.getByRole('heading',{name:'开新处方',exact:true}).waitFor();
 const metadata=await app.evaluate(({app,BrowserWindow})=>{return {packaged:app.isPackaged,data:app.getPath('userData'),electron:process.versions.electron};});
 assert.equal(metadata.packaged,true);assert.equal(metadata.data,path.join(data,'ClinicAssistant'));
 const isolated=await page.evaluate(()=>({node:typeof require,bridge:typeof window.clinic.clinic.savePrescription}));assert.deepEqual(isolated,{node:'undefined',bridge:'function'});
 await page.getByRole('button',{name:'备份与设置'}).click();
 await page.getByLabel('常用医生姓名 *',{exact:true}).fill('打包验收医生');
 await page.getByRole('button',{name:'保存设置',exact:true}).click();
 await page.getByText('诊所信息已保存',{exact:true}).waitFor();
 await app.close();app=undefined;
 assert.ok(fs.existsSync(path.join(data,'ClinicAssistant','clinic.sqlite')));
 app=await electron.launch({executablePath:exe,args:["--user-data-dir="+path.join(data,"ClinicAssistant")],env,timeout:30000});
 const reopened=await app.firstWindow();
 await reopened.getByRole('heading',{name:'开新处方',exact:true}).waitFor();

 assert.equal(await reopened.getByLabel('医生姓名 *',{exact:true}).inputValue(),'打包验收医生');
 console.log('PASS packaged startup/restart with system-only PATH, embedded SQLite, isolated persistent data and sandboxed renderer; Electron '+metadata.electron);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(app){await app.evaluate(({app})=>app.exit()).catch(()=>{});await app.close().catch(()=>{});}fs.rmSync(data,{recursive:true,force:true});});

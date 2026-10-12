import { app, BrowserWindow, dialog, ipcMain, session, shell } from 'electron';
import { join, extname, basename, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readFileSync, statSync, appendFileSync } from 'node:fs';
import {localDate,UserError} from '../contracts/errors';
import {openClinicHost,type ClinicHost} from '../clinic';
import {MigrationSession} from '../migration';
import {listLegacyServices,startLegacyService} from './legacy-service';
import {transportSchema,type TransportRequest} from '../contracts/transport';
import type {Protection} from '../contracts';

app.setName('ClinicAssistant');
const dataOverride = app.commandLine.getSwitchValue('user-data-dir');
app.setPath('userData', dataOverride && isAbsolute(dataOverride) ? dataOverride : join(app.getPath('appData'), 'ClinicAssistant'));
if (process.env.CLINIC_TEST_DATA && !app.isPackaged) app.setPath('userData', process.env.CLINIC_TEST_DATA);
const root = app.getPath('userData');
const testMode = Boolean(process.env.CLINIC_TEST_DATA) && !app.isPackaged;
let window: BrowserWindow;
let clinic:ClinicHost;
let migration:MigrationSession;
let protection:Protection={lastBackup:'',backupError:'',pending:false};
let dirty = false;
let busy = false;
const entry = pathToFileURL(join(__dirname, '../../ui/index.html')).href;
const trusted = (url: string) => url === entry || url.startsWith(entry + '#');
function log(error: unknown) {
  // Never log SQL, patient data or imported file contents.
  try { appendFileSync(join(root, 'diagnostics.log'), new Date().toISOString() + ' ' + (error instanceof UserError ? 'validation' : error instanceof Error ? error.name : 'error') + String.fromCharCode(10)); } catch { /* Disk may be full. */ }
}
async function confirm(message: string, detail: string) { return (await dialog.showMessageBox(window, { type: 'warning', message, detail, buttons: ['取消', '确认继续'], defaultId: 0, cancelId: 0, noLink: true })).response === 1; }
async function action(request:TransportRequest):Promise<unknown>{
  switch(request.command){
    case 'confirmDiscard': return await confirm('资料尚未保存','继续后，本次尚未保存的填写内容会丢失。')?{kind:'ok',value:null}:{kind:'canceled'};
    case 'snapshot':return clinic.client.overview();
    case 'medicines':return clinic.client.medicines(request.payload);
    case 'saveMedicine':return clinic.client.saveMedicine(request.payload);
    case 'archiveMedicine':return clinic.client.archiveMedicine(request.payload);
    case 'quote':return clinic.client.quote(request.payload);
    case 'savePrescription':return clinic.client.savePrescription(request.payload);
    case 'prescriptions':return clinic.client.prescriptions(request.payload);
    case 'prescription':return clinic.client.prescription(request.payload);
    case 'voidPrescription':return clinic.client.voidPrescription(request.payload);
    case 'month':return clinic.client.month(request.payload);
    case 'settings':return clinic.client.settings(request.payload);
    case 'backup':return clinic.client.backup();
    case 'choosePhotos': {
      const result = await dialog.showOpenDialog(window, { title: '选择处方照片', properties: ['openFile', 'multiSelections'], filters: [{ name: '照片', extensions: ['png', 'jpg', 'jpeg', 'webp'] }] });
      if (result.canceled) return {kind:'canceled'};
      if (result.filePaths.length > 5) throw new UserError('一次最多选择 5 张照片');
      return {kind:'ok',value:result.filePaths.map(path => {
        if (statSync(path).size > 8 * 1024 * 1024) throw new UserError('每张照片不能超过 8 MB');
        const extension = extname(path).toLowerCase();
        const mime = extension === '.png' ? 'png' : extension === '.webp' ? 'webp' : extension === '.jpg' || extension === '.jpeg' ? 'jpeg' : '';
        if (!mime) throw new UserError('请选择 PNG、JPEG 或 WebP 照片');
        return { name: basename(path), data: `data:image/${mime};base64,${readFileSync(path).toString('base64')}` };
      })};
    }
    case 'exportBackup': {
      const result = await dialog.showSaveDialog(window, { title: '导出完整备份（可选择 U 盘）', defaultPath: `诊所备份-${localDate()}.clinic-backup`, filters: [{ name: '诊所完整备份', extensions: ['clinic-backup'] }] });
      if (result.canceled || !result.filePath) return {kind:'canceled'};
      return clinic.exportBackup(result.filePath);
    }
    case 'restore': {
      if (dirty) throw new UserError('请先保存或放弃正在填写的处方');
      const result = await dialog.showOpenDialog(window, { title: '选择要恢复的完整备份', defaultPath: join(root,'backups'), filters: [{ name: '诊所完整备份', extensions: ['clinic-backup'] }], properties: ['openFile'] });
      if (result.canceled) return {kind:'canceled'};
      const checked=await clinic.inspectRestore(result.filePaths[0]);if(checked.kind==='rejected')return checked;
      if (!await confirm('恢复后，当前资料将替换为备份中的资料', '程序会先保存一份当前资料，供需要时找回。确认选择了正确的备份日期后再继续。')){await clinic.discardRestore(checked.value);return {kind:'canceled'};}
      return clinic.restore(checked.value);
    }
    case 'migrationManual':return {kind:'ok',value:migration.manual()};
    case 'migrationStatus':return {kind:'ok',value:await migration.status()};
    case 'migrationDiscover':return {kind:'ok',value:await migration.discover()};
    case 'migrationChooseFolder': {
      const result=await dialog.showOpenDialog(window,{title:'选择旧诊所程序所在的文件夹',properties:['openDirectory']});
      return result.canceled?{kind:'canceled'}:{kind:'ok',value:await migration.selectFolder(result.filePaths[0])};
    }
    case 'migrationConfigure': migration.configure(request.payload.id,request.payload.config);return {kind:'ok',value:null};
    case 'migrationPhotoFolder': {
      const result=await dialog.showOpenDialog(window,{title:'选择含 photos 子目录的旧程序文件夹',properties:['openDirectory']});
      if(result.canceled)return {kind:'canceled'};migration.setPhotoFolder(request.payload,result.filePaths[0]);return {kind:'ok',value:null};
    }
    case 'migrationPrepare': {
      if(dirty)throw new UserError('请先保存或放弃正在填写的内容');
      await migration.begin({kind:'source',...request.payload});return {kind:'ok',value:null};
    }
    case 'migrationPrepareFile': {
      if(dirty)throw new UserError('请先保存或放弃正在填写的内容');
      const result=await dialog.showOpenDialog(window,{title:'选择已有的旧资料文件',filters:[{name:'旧资料文件',extensions:['json']}],properties:['openFile']});
      if(result.canceled)return {kind:'canceled'};await migration.begin({kind:'json',path:result.filePaths[0],oldAppClosed:true});return {kind:'ok',value:null};
    }
    case 'migrationClear': await migration.clear();return {kind:'ok',value:null};
    case 'migrationCancel': await migration.cancel();return {kind:'ok',value:null};
    case 'migrationCommit': {
      if(dirty)throw new UserError('请先保存或放弃正在填写的内容');
      if(!await confirm('确认将预览中的旧资料复制到新程序？','原系统的资料会保留。迁移完成后，请抽查处方和照片，再开始使用新程序。'))return {kind:'canceled'};
      await migration.beginCommit(request.payload);return {kind:'ok',value:null};
    }
    case 'migrationServices': {
      if(!migration.isLocal(request.payload))throw new UserError('旧资料不在本机，请在旧电脑上启动旧系统后重试。');
      return {kind:'ok',value:await listLegacyServices()};
    }
    case 'migrationStartService': {
      if(!migration.isLocal(request.payload?.sourceId))throw new UserError('只能启动本机检测到的旧服务');
      const services=await listLegacyServices(),service=services.find(item=>item.name===request.payload.name);
      if(!service)throw new UserError('该旧服务已不存在，请重新检查');
      if(service.running)return {kind:'ok',value:null};
      if(!await confirm('启动旧系统服务：'+service.label+'？','这次启动仅用于读取旧资料，不修改服务设置。新程序日常使用不需要它。'))return {kind:'canceled'};
      await startLegacyService(service.name);return {kind:'ok',value:null};
    }
    case 'openDataFolder': { const error = await shell.openPath(root); if (error) throw new UserError('无法打开数据文件夹，请联系维护者'); return {kind:'ok',value:null}; }
    case 'print': {
      const detail=await clinic.client.prescription(request.payload);if(detail.kind==='rejected')return detail;const p=detail.value;
      const overview=await clinic.client.overview();if(overview.kind==='rejected')return overview;
      const escape = (value: unknown) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
      const page = new BrowserWindow({ show: false, webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true, devTools: false } });
      const money = (value: number) => (value / 100).toFixed(2);
      const html = `<html lang=zh-CN><meta charset=utf-8><meta http-equiv=Content-Security-Policy content="default-src 'none'; style-src 'unsafe-inline'"><style>body{font-family:Microsoft YaHei,sans-serif;padding:30px;color:#111}h1{text-align:center;font-size:24px}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:10px;border-bottom:1px solid #aaa;text-align:left}p{line-height:1.8;white-space:pre-wrap}</style><h1>${escape(overview.value.settings.clinic)} · 处方</h1><p>编号：${escape(p.id)}　日期：${escape(p.createdAt)}${p.status === 'void' ? '　【已作废】' : ''}</p><p>姓名：${escape(p.name)}　性别：${escape(p.sex)}　年龄：${escape(p.age)}</p><p>诊断：${escape(p.diagnosis)}<br>过敏史：${escape(p.allergic)}</p><table><tr><th>药品</th><th>规格</th><th>单价</th><th>数量</th><th>金额</th></tr>${p.items.map(item => `<tr><td>${escape(item.name)}</td><td>${escape(item.standard)}</td><td>${money(item.unitCents)}</td><td>${item.quantity}</td><td>${money(item.unitCents * item.quantity)}</td></tr>`).join('')}</table><p>药品小计：¥ ${money(p.items.reduce((sum,line)=>sum+line.unitCents*line.quantity,0))}</p><p>合计：¥ ${money(p.totalCents)}　医生：${escape(p.doctor)}</p>${p.legacy ? '<p>旧系统迁移记录：旧药品明细为迁移时价格；未改药品时总额保留旧值，改药后重新计算。</p>' : ''}</html>`;
      try {
        await page.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
        await new Promise<void>((resolve, reject) => page.webContents.print({ silent: false, printBackground: false }, (success, reason) => success || reason === 'cancelled' || reason === 'Print job canceled' ? resolve() : reject(new UserError('打印未完成，请检查打印机连接'))));
      } finally { page.destroy(); }
      return {kind:'ok',value:null};
    }
    default: throw new UserError('不支持此操作');
  }
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
  app.whenReady().then(async () => {
    try {
      mkdirSync(root, { recursive: true });
      clinic=await openClinicHost({directory:root});
      clinic.observe(value=>{protection=value;if(window&&!window.isDestroyed())window.webContents.send('clinic:protection',value);});
      migration=new MigrationSession(clinic.importTarget);
      migration.observe(value=>{if(window&&!window.isDestroyed())window.webContents.send('clinic:migration',value);});
      session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => {
        if (!window || contents.id !== window.webContents.id || !trusted(contents.getURL()) || permission !== 'media' || !('mediaTypes' in details) || !details.mediaTypes?.length || details.mediaTypes.some((type: string) => type !== 'video')) { callback(false); return; }
        void dialog.showMessageBox(window, { type: 'question', message: '允许使用摄像头拍摄处方照片？', buttons: ['不允许', '允许'], defaultId: 0, cancelId: 0 }).then(result => callback(result.response === 1)).catch(() => callback(false));
      });
      session.defaultSession.setPermissionCheckHandler((contents, permission) => Boolean(contents && window && contents.id === window.webContents.id && trusted(contents.getURL()) && permission === 'media'));
      window = new BrowserWindow({ width: 1280, height: 850, minWidth: 1000, minHeight: 700, show: false, backgroundColor: '#f4f7f9', title: '诊所助手', autoHideMenuBar: true, webPreferences: { preload: join(__dirname, 'preload.js'), sandbox: true, contextIsolation: true, nodeIntegration: false, devTools: !app.isPackaged } });
      window.setMenu(null);
      window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      window.webContents.on('will-navigate', (event, url) => { if (!trusted(url)) event.preventDefault(); });
      window.on('close', event => {
        if (busy||['preparing','canceling','committing'].includes(migration?.state().state.kind)) { event.preventDefault(); void dialog.showMessageBox(window,{type:'info',message:'正在处理资料，请稍候',detail:'读取旧资料时，可先点击页面上的“取消本次读取”。保存或迁移完成后再关闭程序。',buttons:['知道了']}); return; }
        if (dirty && dialog.showMessageBoxSync(window, { type: 'warning', message: '资料尚未保存', detail: '关闭后，本次填写的内容会丢失。', buttons: ['继续填写', '放弃并关闭'], defaultId: 0, cancelId: 0 }) === 0) event.preventDefault();
      });
      ipcMain.on('clinic:dirty', (event, value) => { if (event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame && trusted(event.senderFrame.url)) dirty = value === true; });
      ipcMain.handle('clinic:call',async(event,raw:unknown)=>{
        if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || !trusted(event.senderFrame.url)) return {kind:'rejected',error:'请求来源无效'};
        const parsed=transportSchema.safeParse(raw);if(!parsed.success)return {kind:'rejected',error:'输入格式不正确，请检查后重试'};
        const request=parsed.data;
        if(request.command==='migrationCancel'){await migration.cancel();return {kind:'ok',value:null};}
        busy=true;
        try{return await action(request);}catch(error){log(error);return {kind:'rejected',error:error instanceof UserError?error.message:'操作未完成，请检查输入和磁盘空间后重试'};}finally{busy=false;}
      });
      await window.loadURL(entry);
      if (!testMode) window.show();
    } catch (error) {
      log(error);
      dialog.showErrorBox('诊所助手未能启动', `${error instanceof UserError ? error.message : '无法打开本机数据，请检查磁盘空间和文件访问权限。'} 资料不会自动清空或重建。请联系维护者，数据目录：${root}`);
      app.quit();
    }
  });
}
app.on('window-all-closed', () => app.quit());
let cleanedForQuit=false;let cleanupInProgress:Promise<void>|undefined;
app.on('before-quit',event=>{if(cleanedForQuit||!migration)return;event.preventDefault();if(cleanupInProgress)return;cleanupInProgress=(async()=>{await migration.dispose();await clinic.close();})();void cleanupInProgress.catch(()=>{}).finally(()=>{cleanedForQuit=true;app.quit();});});

ipcMain.on('clinic:protection:subscribe',event=>{if(window&&event.sender===window.webContents)event.sender.send('clinic:protection',protection);});
ipcMain.on('clinic:migration:subscribe',event=>{if(window&&event.sender===window.webContents&&migration)event.sender.send('clinic:migration',migration.state());});

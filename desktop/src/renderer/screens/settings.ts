import {value,choice,completed} from '../shell/client';
import {h,money,today,field,on,handle,type ScreenContext} from './context';
export function createSettingsScreen(ctx:ScreenContext){
const heading=ctx.heading,content=ctx.content,notify=ctx.notify,modal=ctx.modal,ask=ctx.ask,refresh=ctx.refresh,navigate=ctx.navigate;const safe=(work:()=>Promise<unknown>)=>handle(ctx,work);
function renderSettings() {
  heading('备份与设置','日常自动保存，定期导出一份备份到 U 盘更安心。');
  content().innerHTML=`<section class=card><h2>诊所信息</h2><form id=settings-form><div class=form-grid>${field('诊所名称 *','clinic',ctx.snapshot().settings.clinic,'required maxlength=80')}${field('常用医生姓名 *','doctor',ctx.snapshot().settings.doctor,'required maxlength=80')}</div><div class=actions><button class=primary>保存设置</button></div></form></section><section class=card><div class=card-heading><h2>资料备份</h2><span class=badge>${ctx.snapshot().protection.backupError?'需要处理':'自动备份已开启'}</span></div><p>每次保存后自动备份，保留最近 30 份。备份包含药品、处方和照片。</p><p class=muted>最近成功备份：${h(ctx.snapshot().protection.lastBackup)||'尚无'}。本机备份无法防止硬盘损坏，请定期导出到另一块磁盘或 U 盘。</p><div class=toolbar><button id=backup-now>立即备份</button><button id=export-backup class=primary>导出备份到 U 盘 / 文件夹</button><button id=restore-backup>从备份恢复</button></div><div class=backup-list>${ctx.snapshot().backups.slice(0,5).map(file=>`<div><span>${file.name.startsWith('before-restore')?'恢复前备份':file.name.startsWith('manual')?'手动备份':'自动备份'}</span><time>${h(new Date(file.time).toLocaleString('zh-CN'))}</time></div>`).join('')||'<p class=muted>暂无备份记录</p>'}</div></section><section class=card><h2>旧资料与维护</h2><p>有旧系统资料时，请使用程序内的迁移向导。按照提示选择旧系统、核对数量，再开始迁移。</p><div class=toolbar><button id=import-legacy>打开旧资料迁移向导</button><button id=open-folder>打开数据文件夹</button></div><p class=muted>数据位置：${h(ctx.snapshot().dataPath)}</p><p class=muted>诊所助手 1.2.0 · 无需 MySQL、Java 或联网登录</p></section>`;
  on('settings-form','input',()=>ctx.changed());
  on('settings-form','submit',event=>{event.preventDefault();void(async()=>{await value(window.clinic.clinic.settings({clinic:String(new FormData(event.target as HTMLFormElement).get('clinic')??''),doctor:String(new FormData(event.target as HTMLFormElement).get('doctor')??'')}));ctx.changed(false);await refresh();renderSettings();notify('诊所信息已保存');})().catch(error=>notify(error.message,true));});
  on('backup-now','click',safe(async()=>{if(ctx.dirty())throw new Error('请先保存上方的诊所信息');await value(window.clinic.clinic.backup());await refresh();renderSettings();notify('完整备份已保存');}));
  on('export-backup','click',safe(async()=>{if(ctx.dirty())throw new Error('请先保存上方的诊所信息');if(await completed(window.clinic.clinic.exportBackup())){await refresh();renderSettings();notify('备份已导出，包含全部处方和照片');}}));
  on('restore-backup','click',safe(async()=>{if(await completed(window.clinic.clinic.restore())){await refresh();renderSettings();notify('资料已恢复。恢复前的资料也已单独备份。');}}));
  on('import-legacy','click',safe(()=>navigate('migration')));
  on('open-folder','click',safe(()=>value(window.clinic.native.openDataFolder())));
}

return {render:renderSettings};}

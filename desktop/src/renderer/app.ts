import {createPrescriptionScreen} from './screens/prescription';
import {createCatalogScreen} from './screens/catalog';
import {createHistoryScreen} from './screens/history';
import {createReportsScreen} from './screens/reports';
import {createSettingsScreen} from './screens/settings';
import {value} from './shell/client';
import type {Snapshot} from '../contracts';
import './style.css';
import { helpContent } from './help/content';
import { renderMigration } from './screens/migration';

const root = document.querySelector<HTMLDivElement>('#app')!;
const h = (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll(String.fromCharCode(34), '&quot;').replaceAll(String.fromCharCode(39), '&#39;');
const money = (value: number) => (value / 100).toFixed(2);
const today = () => new Date().toLocaleDateString('sv-SE');
let snapshot: Snapshot;
let view = 'new';
let dirty = false;
let saving = false;

let migrationDispose:(()=>void)|undefined;

let messageTimer: ReturnType<typeof setTimeout>;
function changed(value=true){dirty=value;window.clinic.setDirty(value);}
function notify(message: string, error = false) {
  const box = document.querySelector<HTMLElement>('#notification')!;
  box.textContent = message; box.className = 'notification ' + (error ? 'error' : 'success'); box.hidden = false;
  clearTimeout(messageTimer); if (!error) messageTimer = setTimeout(() => box.hidden = true, 5000);
}
function handle(work: () => Promise<unknown>) { return () => { void work().catch(error => notify(error.message || '操作未完成', true)); }; }
function on(id: string, event: string, work: (event: Event) => void) { document.getElementById(id)?.addEventListener(event, work); }
function field(label: string, name: string, value = '', extra = '') { return `<label>${label}<input name="${name}" value="${h(value)}" ${extra}></label>`; }
function shell() {
  root.innerHTML = `<aside class=sidebar><div class=brand><span class=brand-mark>＋</span><div>诊所助手<small>日常诊疗，有条不紊</small></div></div><div class=nav-label>工作台</div><nav aria-label=主要功能>${[['new','＋','开新处方','F2'],['history','▤','处方记录','F3'],['medicines','▦','药品管理',''],['report','◷','月度汇总',''],['settings','⚙','备份与设置',''],['migration','⇥','迁移旧资料',''],['help','?','使用帮助','F1']].map(([id,icon,title,key]) => `<button data-view="${id}" class="nav-button ${view === id ? 'active' : ''}"><span>${icon}</span>${title}<kbd>${key}</kbd></button>`).join('')}</nav><div class=sidebar-foot><span class=status-dot></span>本机运行 · 无需联网<small>资料保存在这台电脑</small></div></aside><main><header><div><span class=eyebrow>CLINIC ASSISTANT</span><h1 id=page-title></h1><p id=page-description></p></div><div class=header-meta><strong>${h(snapshot.settings.clinic)}</strong><span>${h(today())}</span></div></header><div id=notification class=notification role=alert hidden></div><div id=backup-warning></div><section id=content></section></main><dialog id=modal aria-labelledby=modal-title></dialog>`;
  root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', handle(() => navigate(button.dataset.view!))));
  if (snapshot.protection.backupError) document.querySelector('#backup-warning')!.innerHTML = `<div class=warning role=alert>${h(snapshot.protection.backupError)}</div>`;
}
function heading(title: string, description: string) { document.getElementById('page-title')!.textContent = title; document.getElementById('page-description')!.textContent = description; }
function modal(html: string, beforeClose?: () => Promise<boolean>) {
  // Each dialog owns its event listeners; reusing the element leaks old button handlers.
  const previous = document.querySelector<HTMLDialogElement>('#modal')!;
  if (previous.open) previous.close();
  const dialog = document.createElement('dialog');
  dialog.id = 'modal'; dialog.setAttribute('aria-labelledby', 'modal-title'); previous.replaceWith(dialog);
  dialog.innerHTML = html; dialog.showModal();
  dialog.onclose = () => { prescription.stopCamera(); };
  const close = handle(async () => { if (!beforeClose || await beforeClose()) dialog.close(); });
  dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', close));
  if (beforeClose) dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  return dialog;
}
async function ask(title: string, detail: string, button = '确认') {
  const dialog = modal(`<h2 id=modal-title>${h(title)}</h2><p>${h(detail)}</p><div class=actions><button data-close>取消</button><button class=danger id=confirm-dialog>${h(button)}</button></div>`);
  return new Promise<boolean>(resolve => { let accepted = false; on('confirm-dialog', 'click', () => { accepted = true; dialog.close(); }); dialog.addEventListener('close', () => resolve(accepted), { once: true }); });
}
async function refresh() { snapshot = await value(window.clinic.clinic.overview()); }
async function navigate(next: string) {
  if (next === 'help') { if(!document.querySelector('dialog[open]'))modal(helpContent()); return; }
  if (saving) return;
  if (dirty && !await ask('资料尚未保存', '切换页面会放弃本次填写的内容。', '放弃并切换')) return;
  changed(false); migrationDispose?.();migrationDispose=undefined;prescription.dispose();if(view==='migration')await value(window.clinic.migration.clear()); await refresh(); view = next; if (view === 'new') prescription.blank(); shell(); await render();
}
async function render() {
  if (view === 'new') await prescription.render();
  else if (view === 'medicines') await catalog.render();
  else if (view === 'history') await history.render();
  else if (view === 'report') await reports.render();
  else if(view==='migration'){heading('迁移旧资料','一步一步，把旧系统的药品、处方和照片搬过来。');migrationDispose=await renderMigration(content(),{setBusy:value=>{saving=value;document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>button.disabled=value);},navigate});}
  else settings.render();
}
const content = () => document.getElementById('content')!;
const context:import('./screens/context').ScreenContext={snapshot:()=>snapshot,heading,content,notify,changed,dirty:()=>dirty,setBusy:value=>saving=value,busy:()=>saving,refresh,navigate,modal,ask,showNew:async record=>{await refresh();view='new';if(record)prescription.load(record);else prescription.blank();shell();await prescription.render();}};
const prescription=createPrescriptionScreen(context),catalog=createCatalogScreen(context),history=createHistoryScreen(context),reports=createReportsScreen(context),settings=createSettingsScreen(context);
window.clinic.observeProtection(protection=>{
  if(!snapshot)return;
  snapshot.protection=protection;
  const warning=document.getElementById('backup-warning');
  if(warning)warning.innerHTML=protection.backupError?`<div class=warning role=alert>${h(protection.backupError)}</div>`:'';
  const last=document.querySelector('.backup-stat strong');
  if(last)last.textContent=protection.lastBackup?protection.lastBackup.slice(5,16):'尚未备份';
});
window.addEventListener('keydown',event=>{
  if(event.key==='F1'){event.preventDefault();void navigate('help');return;}
  if(document.querySelector('dialog[open]'))return;
  if(event.key==='F2'||event.key==='F3'){event.preventDefault();void navigate(event.key==='F2'?'new':'history').catch(error=>notify(error.message,true));}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'&&view==='new'){event.preventDefault();void prescription.save();}
});
void(async()=>{await refresh();prescription.blank();shell();await render();})().catch(()=>{root.innerHTML='<div class=startup-error><h1>暂时无法打开诊所助手</h1><p>请关闭后重新打开。若仍无法使用，请联系维护者。已有资料不会被清空。</p></div>';});

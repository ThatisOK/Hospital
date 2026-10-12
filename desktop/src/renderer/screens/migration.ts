import {value,choice,completed} from '../shell/client';
import type {MigrationUpdate} from '../../contracts';
import type { MigrationSource, MigrationPreview, MigrationConnection, LegacyService } from '../../contracts';
const h=(value:unknown)=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll(String.fromCharCode(34),'&quot;').replaceAll(String.fromCharCode(39),'&#39;');
const money=(value:number)=>(value/100).toFixed(2);
export interface MigrationUI { setBusy(value:boolean):void; navigate(view:string):Promise<void> }
export async function renderMigration(container:HTMLElement,api:MigrationUI){
  let selected:MigrationSource|undefined, preview:MigrationPreview|undefined, running=false, completedFlag=false;
  const status=await value(window.clinic.migration.status());
  const button=(id:string,work:()=>Promise<unknown>)=>document.getElementById(id)?.addEventListener('click',()=>{void work().catch(error=>showError(error.message));});
  function showError(message:string){const box=document.getElementById('migration-error')!;box.textContent=message;box.hidden=false;box.focus();}
  function progress(stage:string){const element=document.getElementById('migration-progress');if(element)element.textContent=stage;}

  function setBusy(value:boolean){running=value;api.setBusy(value);container.querySelectorAll<HTMLButtonElement|HTMLInputElement>('button,input').forEach(element=>element.disabled=value);const cancel=document.getElementById('cancel-migration') as HTMLButtonElement|null;if(cancel){cancel.hidden=!value;cancel.disabled=false;}container.setAttribute('aria-busy',String(value));}
  function selectedCard(){
    document.getElementById('migration-source')!.innerHTML=selected?'<div class=source-card><strong>'+h(selected.label)+'</strong><p>'+h(selected.folder)+'</p><span class=badge>'+(selected.configured?'已识别旧系统连接':'需要维护者填写连接信息')+'</span></div>':'<p class=muted>尚未选择旧系统。先点击上方按钮查找。</p>';
    const ready=document.getElementById('read-migration') as HTMLButtonElement;ready.disabled=!selected?.configured;
    const advanced=document.getElementById('connection-options') as HTMLDetailsElement;advanced.hidden=!selected;
    if(selected){(document.getElementById('legacy-host') as HTMLInputElement).value=selected.host;(document.getElementById('legacy-database') as HTMLInputElement).value=selected.database;}
    const photo=document.getElementById('migration-photo-folder') as HTMLButtonElement;photo.disabled=!selected?.configured;
  }
  function previewCard(){
    const p=preview!;
    document.getElementById('migration-step-one')!.hidden=true;
    document.getElementById('migration-step-two')!.hidden=false;
    document.getElementById('migration-preview')!.innerHTML='<h2>核对找到的旧资料</h2><div class=migration-counts><div><span>药品</span><strong>'+p.medicines+' 种</strong></div><div><span>处方</span><strong>'+p.prescriptions+' 张</strong></div><div><span>照片</span><strong>'+p.photos+' 张</strong></div></div><p>处方日期：'+h(p.firstDate||'暂无')+' ～ '+h(p.lastDate||'暂无')+'</p><p>处方总金额：<strong>¥ '+money(p.totalCents)+'</strong></p><p class=muted>还没有写入新程序。若数量明显不对，请返回重新选择。旧系统未保存历史药价，将保留原处方总额并标注旧明细价格来源。</p>';
    document.getElementById('migration-step-two')!.scrollIntoView({block:'start'});
  }
  async function prepare(fromFile=false){
    if(!(document.getElementById('old-app-closed') as HTMLInputElement).checked)throw new Error('请先关闭旧程序的录入页面，再勾选确认。');
    document.getElementById('migration-error')!.hidden=true;setBusy(true);progress('正在准备读取旧资料…');
    try{
      if(fromFile){const result=await window.clinic.migration.prepareFile({oldAppClosed:true});if(result.kind==='canceled'){setBusy(false);selectedCard();progress('已取消选择文件。');return;}if(result.kind==='rejected')throw new Error(result.error);}
      else {if(!selected)throw new Error('请先选择旧系统');await value(window.clinic.migration.prepare({sourceId:selected.id,oldAppClosed:true}));}
    }catch(error){setBusy(false);selectedCard();throw error;}
  }
  container.innerHTML='<div class=migration-steps><span>1 找到旧资料</span><span>2 核对数量</span><span>3 完成迁移</span></div><div id=migration-error class=warning role=alert tabindex=-1 hidden></div><section class=card id=migration-step-one><h2>把旧诊所资料搬到这里</h2><p class=help-lead>只需做一次。原来的资料会保留，新程序不会再依赖旧服务。</p>'+(!status.empty?'<div class=warning>新程序已经有药品或处方，不能直接覆盖。请联系维护者合并资料。</div>':'')+'<div class=toolbar><button id=discover-migration class=primary>自动查找旧系统</button><button id=choose-migration>选择旧系统文件夹</button></div><div id=migration-source></div><div id=migration-found></div><details id=connection-options hidden><summary>高级连接设置（请维护者协助）</summary><p class=muted>已识别的密码不会显示在页面或保存到新程序。只有识别失败或连接信息改变时才需填写。</p><form id=legacy-connection><div class=form-grid><label>旧服务器地址<input id=legacy-host value=127.0.0.1 required maxlength=512></label><label>端口<input id=legacy-port type=number value=3306 min=1 max=65535 required></label><label>资料库名称<input id=legacy-database required maxlength=512></label><label>账号<input id=legacy-user required maxlength=512 autocomplete=off></label><label>数据库密码<input id=legacy-password type=password maxlength=512 autocomplete=off></label></div><div class=actions><button>使用这些连接信息</button></div></form></details><div class=toolbar><button id=migration-photo-folder disabled>选择照片文件夹</button><button id=migration-services>检查旧服务</button><button id=manual-migration>由维护者填写连接</button></div><div id=legacy-services></div><div class=info>先关闭旧程序的录入页面，暂停修改旧资料。旧数据库服务保持运行即可。</div><label class=checkbox><input id=old-app-closed type=checkbox>我已关闭旧程序的录入页面，暂时不再修改旧资料</label><div class=actions><button id=read-file-migration>已有旧资料文件</button><button id=read-migration class=primary disabled>读取并核对资料</button></div></section><div class=migration-progress role=status aria-live=polite><span id=migration-progress></span><button id=cancel-migration hidden>取消本次读取</button></div><section class=card id=migration-step-two hidden><div id=migration-preview></div><div class=actions><button id=migration-back>返回重新选择</button><button id=commit-migration class=primary>开始迁移</button></div></section><section class=card id=migration-complete hidden></section>';
  selectedCard();
  if(!status.empty){container.querySelectorAll<HTMLButtonElement|HTMLInputElement>('button,input').forEach(element=>element.disabled=true);return;}
  button('discover-migration',async()=>{setBusy(true);progress('正在查找常见安装位置…');try{const sources=await value(window.clinic.migration.discover());const found=document.getElementById('migration-found')!;if(!sources.length){progress('没有自动找到。请点击“选择旧系统文件夹”，不清楚位置时请联系帮助安装的人。');return;}found.innerHTML=sources.map((source,i)=>'<button data-source='+i+'>'+h(source.label)+' · '+h(source.folder)+'</button>').join('');found.querySelectorAll<HTMLButtonElement>('[data-source]').forEach(b=>b.onclick=()=>{selected=sources[Number(b.dataset.source)];selectedCard();});selected=sources[0];progress('已找到旧系统，请核对所选文件夹。');}finally{setBusy(false);selectedCard();}});
  button('choose-migration',async()=>{const source=await choice(window.clinic.migration.chooseFolder());if(source){selected=source;selectedCard();progress(source.configured?'已识别连接信息。请继续读取并核对资料。':'已选择文件夹，但未识别连接。请让维护者展开高级连接设置。');}});
  button('manual-migration',async()=>{selected=await value(window.clinic.migration.manual());selectedCard();(document.getElementById('connection-options') as HTMLDetailsElement).open=true;});
  document.getElementById('legacy-connection')!.addEventListener('submit',event=>{event.preventDefault();void(async()=>{if(!selected)return;const inputValue=(id:string)=>(document.getElementById(id) as HTMLInputElement).value;const config:MigrationConnection={host:inputValue('legacy-host'),port:Number(inputValue('legacy-port')),database:inputValue('legacy-database'),user:inputValue('legacy-user'),password:inputValue('legacy-password'),webroot:''};await value(window.clinic.migration.configure({id:selected.id,config}));selected={...selected,configured:true,host:config.host,database:config.database,needsPassword:false};(document.getElementById('legacy-password') as HTMLInputElement).value='';selectedCard();(document.getElementById('connection-options') as HTMLDetailsElement).open=false;progress('连接信息已暂存，仅用于本次迁移。含照片时请再选择照片文件夹。');})().catch(error=>showError(error.message));});
  button('migration-photo-folder',async()=>{if(selected&&await completed(window.clinic.migration.photoFolder(selected.id)))progress('照片文件夹已选择，读取时将逐张核对。');});
  button('migration-services',async()=>{if(!selected?.configured)throw new Error('请先选择旧系统或填写连接信息');const services=await value(window.clinic.migration.services(selected.id));const area=document.getElementById('legacy-services')!;area.innerHTML=services.length?services.map((service,i)=>'<div class=service-row><span>'+h(service.label)+' · '+(service.running?'已启动':'未启动')+'</span>'+(!service.running?'<button data-start-service='+i+'>启动这个旧服务</button>':'')+'</div>').join(''):'<p>没有找到可启动的旧服务，请让维护者协助启动旧数据库。</p>';area.querySelectorAll<HTMLButtonElement>('[data-start-service]').forEach(b=>b.onclick=()=>{void completed(window.clinic.migration.startService({sourceId:selected!.id,name:services[Number(b.dataset.startService)].name})).then(started=>{if(started){b.disabled=true;b.textContent='已启动';progress('旧服务已启动，可以点击“读取并核对资料”。');}}).catch(error=>showError(error.message));});});
  button('read-migration',()=>prepare());button('read-file-migration',()=>prepare(true));
  button('cancel-migration',async()=>{await value(window.clinic.migration.cancel());progress('正在取消，请稍候…');});
  button('migration-back',async()=>{preview=undefined;document.getElementById('migration-step-two')!.hidden=true;document.getElementById('migration-step-one')!.hidden=false;selectedCard();progress('可以重新选择旧资料。');});
  button('commit-migration',async()=>{if(!preview||completedFlag)return;await completedChoice(preview.token);});
  async function completedChoice(token:string){const accepted=await completed(window.clinic.migration.commit(token));if(!accepted)progress('已取消确认，尚未导入。');}
  let session='',revision=-1;
  const unsubscribe=window.clinic.observeMigration((update:MigrationUpdate)=>{
    if(session!==update.sessionId){session=update.sessionId;revision=-1;}
    if(update.revision<=revision)return;revision=update.revision;
    const state=update.state;
    setBusy(state.kind==='preparing'||state.kind==='canceling'||state.kind==='committing');
    const cancel=document.getElementById('cancel-migration') as HTMLButtonElement;
    cancel.hidden=state.kind!=='preparing';cancel.disabled=state.kind!=='preparing';
    if(state.kind==='preparing'||state.kind==='canceling')progress(state.stage);
    if(state.kind==='failed'){showError(state.error);selectedCard();}
    if(state.kind==='selecting'){selectedCard();}
    if(state.kind==='reviewing'){preview=state.preview;previewCard();}
    if(state.kind==='committing')progress('正在保存迁移前备份并导入，请勿关闭电脑…');
    if(state.kind==='completed'){
      const result=state.receipt;completedFlag=true;document.getElementById('migration-step-one')!.hidden=true;document.getElementById('migration-step-two')!.hidden=true;
      const card=document.getElementById('migration-complete')!;card.hidden=false;
      card.innerHTML='<h2>旧资料已迁移完成</h2><p class=help-lead>已复制 '+result.medicines+' 种药品、'+result.prescriptions+' 张处方、'+result.photos+' 张照片。</p><p>原系统资料仍然保留。请抽查几张处方和照片，再开始日常使用。</p><div class=actions><button id=migration-view-records class=primary>查看迁入的处方</button><button id=migration-backup>去备份资料</button></div>';
      button('migration-view-records',()=>api.navigate('history'));button('migration-backup',()=>api.navigate('settings'));progress('迁移完成。');
    }
  });
  return unsubscribe;
}

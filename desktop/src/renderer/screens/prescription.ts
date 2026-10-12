import type {Medicine,Line,PrescriptionInput,PrescriptionDetail} from '../../contracts';
import {value,choice,completed} from '../shell/client';
import {h,money,today,field,on,handle,type ScreenContext} from './context';
export function createPrescriptionScreen(ctx:ScreenContext){
const heading=ctx.heading,content=ctx.content,notify=ctx.notify,modal=ctx.modal,ask=ctx.ask,refresh=ctx.refresh,navigate=ctx.navigate;const safe=(work:()=>Promise<unknown>)=>handle(ctx,work);
let medicines:Medicine[]=[];let lines:Line[]=[];let draft:PrescriptionInput;let editingLegacy:PrescriptionDetail|undefined;let camera:MediaStream|undefined;let quoteRevision=0;let quotedTotal=0;let mounted=false;
function changed(){ctx.changed();draft.requestId=crypto.randomUUID();void updateQuote();}
function blank() {
  draft = { requestId: crypto.randomUUID(), name: '', sex: '男', age: '', diagnosis: '', allergic: '', address: '', doctor: ctx.snapshot().settings.doctor, items: [], photos: [] };
  lines = []; editingLegacy = undefined;quotedTotal=0;quoteRevision++; ctx.changed(false);
}
async function renderNew() {
  mounted=true;
  heading(draft.id ? '修改处方' : '开新处方', draft.id ? `处方 ${draft.id} · 保留原开方日期` : '填写患者信息，选择药品，确认后保存。');
  medicines = await value(window.clinic.clinic.medicines( { search: '' }));
  content().innerHTML = `<div class=stats><div><span>今日处方</span><strong>${ctx.snapshot().todayCount}<small> 张</small></strong></div><div><span>今日金额</span><strong><small>¥ </small>${money(ctx.snapshot().todayCents)}</strong></div><div><span>可用药品</span><strong>${ctx.snapshot().medicineCount}<small> 种</small></strong></div><div class=backup-stat><span>最近备份</span><strong>${ctx.snapshot().protection.lastBackup ? h(ctx.snapshot().protection.lastBackup.slice(5,16)) : '尚未备份'}</strong></div></div>${!ctx.snapshot().settings.doctor ? '<div class=info>首次使用：在下方填写医生姓名，也可前往“备份与设置”保存常用姓名。</div>' : ''}${!ctx.snapshot().medicineCount ? '<div class=info>药品目录还是空的。有旧资料时，请先点击左侧“迁移旧资料”；首次使用可到“药品管理”添加药品。</div>' : ''}${editingLegacy?.legacy ? '<div class=warning>这是旧系统记录。明细使用迁移时的药价；不改药品和数量时保留原总额，修改后将重新计算。</div>' : ''}<form id=prescription-form><section class=card><div class=card-heading><h2><span class=step>1</span>患者信息</h2><span class=muted>标有 * 的项目必填</span></div><div class=form-grid>${field('患者姓名 *','name',draft.name,'required maxlength=100 autocomplete=off autofocus')}<label>性别<select name=sex>${['男','女','未记录'].map(sex=>`<option ${draft.sex===sex?'selected':''}>${sex}</option>`).join('')}</select></label>${field('年龄（岁） *','age',draft.age,'required type=number min=0 max=150 step=0.01')}${field('医生姓名 *','doctor',draft.doctor,'required maxlength=100')}${field('诊断 *','diagnosis',draft.diagnosis,'required maxlength=2000')}${field('过敏史 *','allergic',draft.allergic,'required maxlength=1000 placeholder=请填写无、具体过敏史或不详')}${field('地址','address',draft.address,'maxlength=500')}</div></section><section class=card><div class=card-heading><h2><span class=step>2</span>处方药品</h2><span class=muted>支持药名和拼音简称</span></div><div class=medicine-picker><label>查找药品<input id=medicine-search placeholder=输入药名或简称 autocomplete=off></label><button type=button id=find-medicine>查找</button><label class=grow>选择药品<select id=medicine-select></select></label><button type=button id=add-line class=secondary>＋ 添加到处方</button></div><div id=lines></div></section><section class=card><div class=card-heading><h2><span class=step>3</span>处方照片</h2><span class=muted>选填 · 最多 5 张</span></div><div class=toolbar><button type=button id=choose-photos>选择照片</button><button type=button id=camera>使用摄像头</button></div><div id=photos class=photos></div></section><footer class=save-bar><div><span class=muted>处方合计</span><strong id=total></strong></div><div class=total-adjust><label class=checkbox><input type=checkbox id=adjust-total>调整合计</label><input id=adjusted-total aria-label=调整后的合计金额 type=number min=0 step=0.01 hidden disabled></div><div class=actions><span class=muted>Ctrl + S 保存</span><button type=submit id=save-prescription class=primary>保存处方</button></div></footer></form>`;
  const form = document.querySelector<HTMLFormElement>('#prescription-form')!;
  form.addEventListener('input', event => { const target=event.target;if(!(target instanceof HTMLInputElement||target instanceof HTMLSelectElement))return;switch(target.name){case 'name':draft.name=target.value;break;case 'sex':draft.sex=target.value==='男'||target.value==='女'?target.value:'未记录';break;case 'age':draft.age=target.value;break;case 'doctor':draft.doctor=target.value;break;case 'diagnosis':draft.diagnosis=target.value;break;case 'allergic':draft.allergic=target.value;break;case 'address':draft.address=target.value;break;default:return;}changed(); });
  form.addEventListener('submit', event => { event.preventDefault(); void savePrescription(); });
  on('find-medicine','click',safe(async()=>{ medicines = await value(window.clinic.clinic.medicines({search:(document.getElementById('medicine-search') as HTMLInputElement).value})); renderOptions(); }));
  on('medicine-search','keydown',event=>{ if ((event as KeyboardEvent).key==='Enter') { event.preventDefault(); document.getElementById('find-medicine')!.click(); } });
  on('add-line','click',()=>{ const id=Number((document.getElementById('medicine-select') as HTMLSelectElement).value); const med=medicines.find(m=>m.id===id); if(!med) {notify('请先选择药品',true);return;} const existing=lines.find(line=>line.medicineId===id); if(existing) existing.quantity++; else lines.push({medicineId:id,name:med.name,standard:med.standard,brand:med.brand,unitCents:med.retailCents,quantity:1}); changed(); renderLines(); });
  on('choose-photos','click',safe(async()=>{ const added=(await choice(window.clinic.native.choosePhotos())) ?? []; if(draft.photos.length+added.length>5) throw new Error('最多保存 5 张照片，请先移除不需要的照片'); draft.photos.push(...added); if(added.length) changed(); renderPhotos(); }));
  on('camera','click',safe(openCamera));
  on('adjust-total','change',()=>{const checked=(document.getElementById('adjust-total') as HTMLInputElement).checked;const input=document.getElementById('adjusted-total') as HTMLInputElement;input.hidden=!checked;input.disabled=!checked;if(checked){input.value=money(displayTotal());draft.totalOverride=input.value;}else delete draft.totalOverride;changed();document.getElementById('total')!.textContent='¥ '+money(displayTotal());});
  on('adjusted-total','input',()=>{draft.totalOverride=(document.getElementById('adjusted-total') as HTMLInputElement).value;changed();document.getElementById('total')!.textContent='¥ '+money(displayTotal());});
  renderOptions(); renderLines(); renderPhotos(); form.elements.namedItem('name') && (form.elements.namedItem('name') as HTMLInputElement).focus();
}
function renderOptions() {
  const select=document.getElementById('medicine-select') as HTMLSelectElement;
  select.innerHTML=medicines.length ? medicines.map(m=>`<option value=${m.id}>${h(m.name)} · ${h(m.standard)} · ¥${money(m.retailCents)}</option>`).join('') : '<option value="">没有匹配的药品</option>';
}
function displayTotal(){return quotedTotal;}
async function updateQuote(){
  const revision=++quoteRevision;
  const request={id:draft.id,items:lines.map(line=>({medicineId:line.medicineId,quantity:line.quantity})),totalOverride:draft.totalOverride};
  try{const result=await value(window.clinic.clinic.quote(request));if(revision!==quoteRevision||!mounted)return;quotedTotal=result.totalCents;const total=document.getElementById('total');if(total)total.textContent='¥ '+money(quotedTotal);}catch{if(revision===quoteRevision){const total=document.getElementById('total');if(total)total.textContent='请检查数量和金额';}}
}
function renderLines() {
  document.getElementById('lines')!.innerHTML=lines.length ? `<table><thead><tr><th>药品 / 规格</th><th>单价</th><th>数量</th><th>金额</th><th></th></tr></thead><tbody>${lines.map((line,i)=>`<tr><td><strong>${h(line.name)}</strong><small>${h(line.standard)} ${h(line.brand)}</small></td><td>¥${money(line.unitCents)}</td><td><input aria-label="${h(line.name)}数量" class=quantity data-quantity=${i} type=number min=1 max=10000 step=1 value=${line.quantity}></td><td>¥<span data-subtotal=${i}>${money(line.quantity*line.unitCents)}</span></td><td><button type=button class=text-button data-remove=${i}>移除</button></td></tr>`).join('')}</tbody></table>` : '<div class=empty><span>＋</span><p>从上方选择药品，开始填写处方</p></div>';
  document.querySelectorAll<HTMLInputElement>('[data-quantity]').forEach(input=>input.addEventListener('input',()=>{const index=Number(input.dataset.quantity);lines[index].quantity=Number(input.value);changed();document.querySelector(`[data-subtotal="${index}"]`)!.textContent=money(lines[index].unitCents*lines[index].quantity);document.getElementById('total')!.textContent='¥ '+money(displayTotal());}));
  document.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach(button=>button.onclick=()=>{lines.splice(Number(button.dataset.remove),1);changed();renderLines();});
  document.getElementById('total')!.textContent='¥ '+money(displayTotal());void updateQuote();
}
function renderPhotos() {
  document.getElementById('photos')!.innerHTML=draft.photos.map((photo,i)=>`<figure><img src="${h(photo.data)}" alt="${h(photo.name)}"><figcaption>${h(photo.name)}<button type=button class=text-button data-remove-photo=${i}>移除</button></figcaption></figure>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-remove-photo]').forEach(button=>button.onclick=()=>{draft.photos.splice(Number(button.dataset.removePhoto),1);changed();renderPhotos();});
}
async function openCamera() {
  if(draft.photos.length>=5) throw new Error('最多保存 5 张照片');
  const dialog=modal('<h2 id=modal-title>拍摄处方照片</h2><video id=camera-preview autoplay playsinline></video><p id=camera-status>正在连接摄像头…</p><div class=actions><button data-close>取消</button><button id=capture class=primary disabled>拍照并添加</button></div>');
  try {
    camera=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
    if(!dialog.open){camera.getTracks().forEach(track=>track.stop());camera=undefined;return;}
    const video=document.getElementById('camera-preview') as HTMLVideoElement;video.srcObject=camera;
    video.onloadeddata=()=>{(document.getElementById('capture') as HTMLButtonElement).disabled=false;document.getElementById('camera-status')!.textContent='将纸质处方放在画面中央，确认清晰后拍照。';};
    on('capture','click',()=>{const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d')!.drawImage(video,0,0);draft.photos.push({name:`处方照片-${today()}.jpg`,data:canvas.toDataURL('image/jpeg',0.85)});changed();dialog.close();renderPhotos();});
  } catch { dialog.close(); throw new Error('无法使用摄像头，请检查连接和相机权限，也可以点击“选择照片”'); }
}
async function savePrescription() {
  if(ctx.busy()) return;
  const form=document.querySelector<HTMLFormElement>('#prescription-form');if(!form?.reportValidity())return;
  ctx.setBusy(true);const button=document.getElementById('save-prescription') as HTMLButtonElement;button.disabled=true;button.textContent='正在保存…';
  let savedId:string;
  try {
    draft.items=lines.map(line=>({medicineId:line.medicineId,quantity:line.quantity}));
    const saved=await value(window.clinic.clinic.savePrescription(draft));savedId=saved.id;
  } catch(error) {notify(error instanceof Error?error.message:'保存未完成',true);button.disabled=false;button.textContent='重试保存';ctx.setBusy(false);return;}
  // A committed prescription is finished even if the following display refresh fails.
  ctx.changed(false);blank();
  try{await refresh();await renderNew();notify('处方 '+savedId+' 已保存。可以继续填写下一位患者。');}
  catch{await renderNew().catch(()=>{});notify('处方 '+savedId+' 已保存，但页面信息暂未刷新。可到处方记录核对，勿重复录入。',true);}
  finally{ctx.setBusy(false);}

}

return {blank,render:renderNew,save:savePrescription,load(record:PrescriptionDetail){draft={requestId:crypto.randomUUID(),id:record.id,name:record.name,sex:record.sex==='男'||record.sex==='女'?record.sex:'未记录',age:record.age,diagnosis:record.diagnosis,allergic:record.allergic,address:record.address,doctor:record.doctor,items:record.items.map(item=>({medicineId:item.medicineId,quantity:item.quantity})),photos:record.photos};lines=record.items.map(line=>({...line}));editingLegacy=record;ctx.changed(false);},dispose(){mounted=false;quoteRevision++;camera?.getTracks().forEach(track=>track.stop());camera=undefined;},stopCamera(){camera?.getTracks().forEach(track=>track.stop());camera=undefined;}};
}

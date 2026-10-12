import {medicineInputSchema} from '../../contracts';
import type {Medicine,MedicineInput} from '../../contracts';
import {value,choice,completed} from '../shell/client';
import {h,money,today,field,on,handle,type ScreenContext} from './context';
export function createCatalogScreen(ctx:ScreenContext){
const heading=ctx.heading,content=ctx.content,notify=ctx.notify,modal=ctx.modal,ask=ctx.ask,refresh=ctx.refresh,navigate=ctx.navigate;const safe=(work:()=>Promise<unknown>)=>handle(ctx,work);
async function renderMedicines(search='') {
  heading('药品管理','维护常用药品和价格，调价不会改变已保存处方的价格。');
  const rows=await value(window.clinic.clinic.medicines({search,includeArchived:true}));
  content().innerHTML=`<section class=card><div class=card-heading><h2>药品目录</h2><button id=new-medicine class=primary>＋ 添加药品</button></div><form id=medicine-filter class=toolbar><label class=grow>搜索药品<input name=search value="${h(search)}" placeholder=药品名称、拼音简称或厂家></label><button>搜索</button></form>${rows.length?`<table><thead><tr><th>药品</th><th>规格 / 厂家</th><th>进价</th><th>售价</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows.map(m=>`<tr><td><strong>${h(m.name)}</strong><small>${h(m.acronym)}</small></td><td>${h(m.standard)}<small>${h(m.brand)}</small></td><td>¥${money(m.purchaseCents)}</td><td>¥${money(m.retailCents)}</td><td><span class="badge ${m.active?'':'neutral'}">${m.active?'使用中':'已停用'}</span></td><td><button class=text-button data-edit-medicine=${m.id}>编辑</button><button class=text-button data-archive=${m.id}>${m.active?'停用':'启用'}</button></td></tr>`).join('')}</tbody></table>`:'<div class=empty><span>▦</span><p>还没有药品，点击右上角“添加药品”</p></div>'}<p class=muted>最多显示 500 项，可通过搜索缩小范围。停用药品仍保留历史处方记录。</p></section>`;
  on('new-medicine','click',()=>editMedicine());
  on('medicine-filter','submit',event=>{event.preventDefault();void renderMedicines(String(new FormData(event.target as HTMLFormElement).get('search'))).catch(error=>notify(error.message,true));});
  document.querySelectorAll<HTMLButtonElement>('[data-edit-medicine]').forEach(button=>button.onclick=()=>editMedicine(rows.find(m=>m.id===Number(button.dataset.editMedicine))));
  document.querySelectorAll<HTMLButtonElement>('[data-archive]').forEach(button=>button.onclick=safe(async()=>{const m=rows.find(m=>m.id===Number(button.dataset.archive))!;if(m.active&&!await ask('停用此药品？','已保存的处方不受影响，之后可以重新启用。','确认停用'))return;await value(window.clinic.clinic.archiveMedicine({id:m.id,active:!m.active}));await renderMedicines(search);notify(m.active?'药品已停用':'药品已启用');}));
}
function editMedicine(m?:Medicine) {
  const dialog=modal(`<h2 id=modal-title>${m?'编辑药品':'添加药品'}</h2><form id=medicine-form><div class=form-grid>${field('药品名称 *','name',m?.name,'required maxlength=200')}${field('拼音简称','acronym',m?.acronym,'maxlength=100 placeholder=例如AMXL')}${field('规格 *','standard',m?.standard,'required maxlength=200 placeholder=例如0.25g×24粒')}${field('厂家','brand',m?.brand,'maxlength=200')}${field('进价（元） *','purchase',money(m?.purchaseCents??0),'required type=number min=0 step=0.01')}${field('售价（元） *','retail',money(m?.retailCents??0),'required type=number min=0 step=0.01')}</div><p class=inline-error id=medicine-error role=alert></p><div class=actions><button type=button data-close>取消</button><button class=primary>保存药品</button></div></form>`, async () => !ctx.dirty() || await completed(window.clinic.native.confirmDiscard()));
  on('medicine-form','input',()=>ctx.changed());
  dialog.addEventListener('close',()=>ctx.changed(false),{once:true});
  on('medicine-form','submit',event=>{event.preventDefault();const form=event.target as HTMLFormElement;const button=form.querySelector<HTMLButtonElement>('button.primary')!;button.disabled=true;void(async()=>{try{const input=medicineInputSchema.parse(Object.fromEntries(new FormData(form)));input.id=m?.id;await value(window.clinic.clinic.saveMedicine(input));ctx.changed(false);dialog.close();await renderMedicines();notify('药品已保存');}catch(error){document.getElementById('medicine-error')!.textContent=(error as Error).message;button.disabled=false;}})();});
}

return {render:renderMedicines};}

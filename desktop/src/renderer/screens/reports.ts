import type {MonthReport} from '../../contracts';
import {value,choice,completed} from '../shell/client';
import {h,money,today,field,on,handle,type ScreenContext} from './context';
export function createReportsScreen(ctx:ScreenContext){
const heading=ctx.heading,content=ctx.content,notify=ctx.notify,modal=ctx.modal,ask=ctx.ask,refresh=ctx.refresh,navigate=ctx.navigate;const safe=(work:()=>Promise<unknown>)=>handle(ctx,work);
async function renderReport(month=today().slice(0,7)) {
  heading('月度汇总','按处方开具日期汇总金额，不包含已作废处方。');
  const report=await value(window.clinic.clinic.month(month));
  content().innerHTML=`<section class=card><form id=report-filter class=toolbar>${field('选择月份','month',month,'type=month required')}<button>查看汇总</button></form><div class=report-stats><div><span>处方张数</span><strong>${report.count}<small> 张</small></strong></div><div><span>处方总金额</span><strong>¥ ${money(report.totalCents)}</strong></div></div>${report.days.length?`<table><thead><tr><th>日期</th><th>处方张数</th><th>金额</th></tr></thead><tbody>${report.days.map(day=>`<tr><td>${day.day}</td><td>${day.count}</td><td>¥${money(day.totalCents)}</td></tr>`).join('')}</tbody></table>`:'<div class=empty><p>这个月还没有处方</p></div>'}<p class=muted>这是处方金额汇总，不表示已收款或利润。</p></section>`;
  on('report-filter','submit',event=>{event.preventDefault();void renderReport(String(new FormData(event.target as HTMLFormElement).get('month'))).catch(error=>notify(error.message,true));});
}

return {render:renderReport};}

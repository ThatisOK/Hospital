import type {Snapshot,PrescriptionDetail} from '../../contracts';
export interface ScreenContext {
 snapshot():Snapshot;
 heading(title:string,description:string):void;
 content():HTMLElement;
 notify(message:string,error?:boolean):void;
 changed(value?:boolean):void;
 dirty():boolean;
 setBusy(value:boolean):void;
 busy():boolean;
 refresh():Promise<void>;
 navigate(view:string):Promise<void>;
 showNew(record?:PrescriptionDetail):Promise<void>;
 modal(html:string,beforeClose?:()=>Promise<boolean>):HTMLDialogElement;
 ask(title:string,detail:string,button?:string):Promise<boolean>;
}
export const h=(value:unknown)=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll(String.fromCharCode(34),'&quot;').replaceAll(String.fromCharCode(39),'&#39;');
export const money=(value:number)=>(value/100).toFixed(2);
export const today=()=>new Date().toLocaleDateString('sv-SE');
export function field(label:string,name:string,value='',extra=''){return '<label>'+label+'<input name='+name+' value='+String.fromCharCode(34)+h(value)+String.fromCharCode(34)+' '+extra+'></label>';}
export function on(id:string,event:string,work:(event:Event)=>void){document.getElementById(id)?.addEventListener(event,work);}
export function handle(ctx:ScreenContext,work:()=>Promise<unknown>){return ()=>{void work().catch(error=>ctx.notify(error instanceof Error?error.message:'操作未完成',true));};}

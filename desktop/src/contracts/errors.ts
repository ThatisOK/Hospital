export class UserError extends Error {}
export const localDate=(date=new Date())=>date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
export const localTime=()=>localDate()+' '+new Date().toTimeString().slice(0,8);

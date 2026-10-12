import {ClinicStore} from './internal/database';
import type {LegacyExport} from '../contracts/legacy';
/** Preparation workers own a disposable database, never the active clinic connection. */
export function prepareLegacySnapshot(database:string,destination:string,data:LegacyExport){
  const store=new ClinicStore(database);
  try{const counts=store.importLegacy(data),dates=store.dates();store.backup(destination);return {counts,...dates};}finally{store.close();}
}

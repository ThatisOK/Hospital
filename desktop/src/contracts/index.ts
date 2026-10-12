import { z } from 'zod';

const label = (max = 200) => z.string().max(max).refine(value => !value.includes(String.fromCharCode(0))).transform(value => value.trim());
export const idSchema = label(100).refine(Boolean);
export const medicineIdSchema = z.number().int().positive().max(1000000000);
export const photoSchema = z.object({name:label(200),data:z.string().max(12*1024*1024)}).strict();
export const medicineInputSchema = z.object({id:medicineIdSchema.optional(),name:label(200),acronym:label(100),brand:label(200),standard:label(200),purchase:label(20),retail:label(20)}).strict();
export const lineInputSchema = z.object({medicineId:medicineIdSchema,quantity:z.number().int().positive().max(10000)}).strict();
export const prescriptionInputSchema = z.object({requestId:idSchema,id:idSchema.optional(),name:label(100),sex:z.enum(['男','女','未记录']),age:label(20),diagnosis:label(2000),allergic:label(1000),address:label(500),doctor:label(100),items:z.array(lineInputSchema).max(100),photos:z.array(photoSchema).max(5),totalOverride:label(20).optional()}).strict();
export const quoteSchema=prescriptionInputSchema.pick({id:true,items:true,totalOverride:true});
export const querySchema=z.object({search:label(100).optional(),from:label(10).optional(),to:label(10).optional(),includeVoided:z.boolean().optional(),page:z.number().int().positive().optional()}).strict();
export const settingsSchema=z.object({clinic:label(80),doctor:label(80)}).strict();
export const connectionSchema=z.object({host:label(512),port:z.number().int().min(1).max(65535),database:label(512),user:label(512),password:z.string().max(512),webroot:label(2048)}).strict();
export const summarySchema=z.object({medicines:z.number().int().nonnegative(),prescriptions:z.number().int().nonnegative(),photos:z.number().int().nonnegative(),totalCents:z.number().int().nonnegative()}).strict();
export type MedicineInput=z.infer<typeof medicineInputSchema>;
export type PrescriptionInput=z.infer<typeof prescriptionInputSchema>;
export type QuoteInput=z.infer<typeof quoteSchema>;
export type Query=z.infer<typeof querySchema>;
export type Settings=z.infer<typeof settingsSchema>;
export type MigrationConnection=z.infer<typeof connectionSchema>;
export type MigrationSummary=z.infer<typeof summarySchema>;
export type PhotoInput=z.infer<typeof photoSchema>;
export type LineInput=z.infer<typeof lineInputSchema>;
export interface Medicine {id:number;name:string;acronym:string;brand:string;standard:string;purchaseCents:number;retailCents:number;active:number}
export interface Line {medicineId:number;name:string;standard:string;brand:string;unitCents:number;quantity:number}
export interface Prescription {id:string;name:string;sex:string;age:string;diagnosis:string;allergic:string;address:string;doctor:string;createdAt:string;totalCents:number;status:'active'|'void';legacy:number}
export interface PrescriptionDetail extends Prescription {items:Line[];photos:PhotoInput[]}
export interface SearchResult {rows:Prescription[];count:number;page:number}
export interface MonthReport {count:number;totalCents:number;days:{day:string;count:number;totalCents:number}[]}
export interface PricePreview {items:Line[];subtotalCents:number;totalCents:number;basis:'calculated'|'retained'|'manual'}
export interface Protection {lastBackup:string;backupError:string;pending:boolean}
export interface Snapshot {settings:Settings;protection:Protection;todayCount:number;todayCents:number;medicineCount:number;dataPath:string;backups:{name:string;time:string}[]}
export type Result<T>={kind:'ok';value:T}|{kind:'rejected';error:string};
export type CommitResult<T>={kind:'committed';value:T;protection:Protection}|{kind:'rejected';error:string};
export type Choice<T>=Result<T>|{kind:'canceled'};
export interface MigrationSource {id:string;label:string;folder:string;configured:boolean;database:string;host:string;needsPassword:boolean}
export interface MigrationPreview extends MigrationSummary {token:string;firstDate:string;lastDate:string;source:string}
export interface LegacyService {name:string;label:string;running:boolean}
export type MigrationState=
 |{kind:'selecting'}
 |{kind:'preparing';stage:string}
 |{kind:'canceling';stage:string}
 |{kind:'reviewing';preview:MigrationPreview}
 |{kind:'committing';preview:MigrationPreview}
 |{kind:'completed';receipt:MigrationPreview}
 |{kind:'failed';error:string};
export interface MigrationUpdate {sessionId:string;revision:number;state:MigrationState}
export interface ClinicBridge {
 clinic:{
  overview():Promise<Result<Snapshot>>;
  medicines(input:{search:string;includeArchived?:boolean}):Promise<Result<Medicine[]>>;
  saveMedicine(input:MedicineInput):Promise<CommitResult<number>>;
  archiveMedicine(input:{id:number;active:boolean}):Promise<CommitResult<null>>;
  quote(input:QuoteInput):Promise<Result<PricePreview>>;
  savePrescription(input:PrescriptionInput):Promise<CommitResult<Prescription>>;
  prescriptions(input:Query):Promise<Result<SearchResult>>;
  prescription(id:string):Promise<Result<PrescriptionDetail>>;
  voidPrescription(id:string):Promise<CommitResult<null>>;
  month(month:string):Promise<Result<MonthReport>>;
  settings(input:Settings):Promise<CommitResult<null>>;
  backup():Promise<Result<null>>;
  exportBackup():Promise<Choice<null>>;
  restore():Promise<Choice<null>>;
 };
 migration:{
  status():Promise<Result<{empty:boolean;lastMigration:string}>>;
  manual():Promise<Result<MigrationSource>>;
  discover():Promise<Result<MigrationSource[]>>;
  chooseFolder():Promise<Choice<MigrationSource>>;
  configure(input:{id:string;config:MigrationConnection}):Promise<Result<null>>;
  photoFolder(id:string):Promise<Choice<null>>;
  prepare(input:{sourceId:string;oldAppClosed:true}):Promise<Result<null>>;
  prepareFile(input:{oldAppClosed:true}):Promise<Choice<null>>;
  commit(token:string):Promise<Choice<null>>;
  cancel():Promise<Result<null>>;
  clear():Promise<Result<null>>;
  services(id:string):Promise<Result<LegacyService[]>>;
  startService(input:{sourceId:string;name:string}):Promise<Choice<null>>;
 };
 native:{choosePhotos():Promise<Choice<PhotoInput[]>>;print(id:string):Promise<Choice<null>>;openDataFolder():Promise<Result<null>>;confirmDiscard():Promise<Choice<null>>};
 setDirty(value:boolean):void;
 observeProtection(listener:(status:Protection)=>void):()=>void;
 observeMigration(listener:(update:MigrationUpdate)=>void):()=>void;
}
declare global {interface Window {clinic:ClinicBridge}}

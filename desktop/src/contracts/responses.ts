import {z} from 'zod';
export const protectionSchema=z.object({lastBackup:z.string(),backupError:z.string(),pending:z.boolean()});
export const medicineSchema=z.object({id:z.number().int(),name:z.string(),acronym:z.string(),brand:z.string(),standard:z.string(),purchaseCents:z.number().int(),retailCents:z.number().int(),active:z.number().int()});
export const lineSchema=z.object({medicineId:z.number().int(),name:z.string(),standard:z.string(),brand:z.string(),unitCents:z.number().int(),quantity:z.number().int()});
export const prescriptionSchema=z.object({id:z.string(),name:z.string(),sex:z.string(),age:z.string(),diagnosis:z.string(),allergic:z.string(),address:z.string(),doctor:z.string(),createdAt:z.string(),totalCents:z.number().int(),status:z.enum(['active','void']),legacy:z.number().int()});
export const detailSchema=prescriptionSchema.extend({items:z.array(lineSchema),photos:z.array(z.object({name:z.string(),data:z.string()}))});
export const snapshotSchema=z.object({settings:z.object({clinic:z.string(),doctor:z.string()}),protection:protectionSchema,todayCount:z.number().int(),todayCents:z.number().int(),medicineCount:z.number().int(),dataPath:z.string(),backups:z.array(z.object({name:z.string(),time:z.string()}))});
export const pageSchema=z.object({rows:z.array(prescriptionSchema),count:z.number().int(),page:z.number().int()});
export const monthSchema=z.object({count:z.number().int(),totalCents:z.number().int(),days:z.array(z.object({day:z.string(),count:z.number().int(),totalCents:z.number().int()}))});
export const priceSchema=z.object({items:z.array(lineSchema),subtotalCents:z.number().int(),totalCents:z.number().int(),basis:z.enum(['calculated','retained','manual'])});
export const statusSchema=z.object({empty:z.boolean(),lastMigration:z.string()});
export const countsSchema=z.object({medicines:z.number().int(),prescriptions:z.number().int(),photos:z.number().int(),totalCents:z.number().int()});
export function result<T>(value:z.ZodType<T>){return z.discriminatedUnion('kind',[z.object({kind:z.literal('ok'),value}),z.object({kind:z.literal('rejected'),error:z.string()})]);}
export function commit<T>(value:z.ZodType<T>){return z.discriminatedUnion('kind',[z.object({kind:z.literal('committed'),value,protection:protectionSchema}),z.object({kind:z.literal('rejected'),error:z.string()})]);}

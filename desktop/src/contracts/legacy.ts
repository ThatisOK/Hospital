import {z} from 'zod';
const text=z.union([z.string(),z.number(),z.null()]).transform(value=>value==null?'':String(value));
const id=z.number().int().positive();
export const legacySchema=z.object({
 format:z.literal('hospital-legacy-v1'),
 medicines:z.array(z.object({id,name:text,acronym:text,brand:text,standard:text,purchase_price:text,retail_price:text})).max(100000),
 users:z.array(z.object({id,username:text})).max(100000),
 prescriptions:z.array(z.object({id:text,name:text,sex:text,age:text,dianose:text,userid:id,allergic:text,address:text,sum:text,time:text})).max(100000),
 items:z.array(z.object({prescriptionId:text,medicineId:id,num:z.number().int().positive().max(10000)})).max(100000),
 photos:z.array(z.object({prescriptionId:text,name:text,data:z.string().max(12*1024*1024)})).max(100000),
});
export type LegacyExport=z.infer<typeof legacySchema>;

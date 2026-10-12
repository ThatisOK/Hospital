import {z} from 'zod';
import {medicineInputSchema,prescriptionInputSchema,quoteSchema,querySchema,settingsSchema,idSchema,summarySchema} from '../../contracts';
export const requestSchema=z.discriminatedUnion('operation',[
 z.object({operation:z.literal('overview')}),
 z.object({operation:z.literal('medicines'),input:z.object({search:z.string(),includeArchived:z.boolean().optional()})}),
 z.object({operation:z.literal('saveMedicine'),input:medicineInputSchema}),
 z.object({operation:z.literal('archiveMedicine'),input:z.object({id:z.number().int().positive(),active:z.boolean()})}),
 z.object({operation:z.literal('quote'),input:quoteSchema}),
 z.object({operation:z.literal('savePrescription'),input:prescriptionInputSchema}),
 z.object({operation:z.literal('prescriptions'),input:querySchema}),
 z.object({operation:z.literal('prescription'),input:idSchema}),
 z.object({operation:z.literal('voidPrescription'),input:idSchema}),
 z.object({operation:z.literal('month'),input:z.string()}),
 z.object({operation:z.literal('settings'),input:settingsSchema}),
 z.object({operation:z.literal('backup')}),
 z.object({operation:z.literal('export'),input:z.string()}),
 z.object({operation:z.literal('inspectRestore'),input:z.string()}),
 z.object({operation:z.literal('restore'),input:z.string()}),
 z.object({operation:z.literal('discardRestore'),input:z.string()}),
 z.object({operation:z.literal('migrationStatus')}),
 z.object({operation:z.literal('applyPrepared'),input:z.object({path:z.string(),expected:summarySchema})}),
 z.object({operation:z.literal('close')}),
]);
export type Request=z.infer<typeof requestSchema>;
export interface Envelope {id:number;request:Request}

import {z} from 'zod';
import {medicineInputSchema,prescriptionInputSchema,quoteSchema,querySchema,settingsSchema,connectionSchema,idSchema} from './index';
export const transportSchema=z.discriminatedUnion('command',[
 z.object({command:z.literal('snapshot')}),z.object({command:z.literal('medicines'),payload:z.object({search:z.string(),includeArchived:z.boolean().optional()})}),
 z.object({command:z.literal('saveMedicine'),payload:medicineInputSchema}),z.object({command:z.literal('archiveMedicine'),payload:z.object({id:z.number().int().positive(),active:z.boolean()})}),
 z.object({command:z.literal('quote'),payload:quoteSchema}),z.object({command:z.literal('savePrescription'),payload:prescriptionInputSchema}),z.object({command:z.literal('prescriptions'),payload:querySchema}),
 z.object({command:z.literal('prescription'),payload:idSchema}),z.object({command:z.literal('voidPrescription'),payload:idSchema}),z.object({command:z.literal('month'),payload:idSchema}),z.object({command:z.literal('print'),payload:idSchema}),z.object({command:z.literal('migrationCommit'),payload:idSchema}),z.object({command:z.literal('migrationServices'),payload:idSchema}),z.object({command:z.literal('migrationPhotoFolder'),payload:idSchema}),
 z.object({command:z.literal('settings'),payload:settingsSchema}),
 z.object({command:z.literal('backup')}),z.object({command:z.literal('exportBackup')}),z.object({command:z.literal('restore')}),z.object({command:z.literal('choosePhotos')}),z.object({command:z.literal('openDataFolder')}),z.object({command:z.literal('confirmDiscard')}),z.object({command:z.literal('migrationManual')}),z.object({command:z.literal('migrationStatus')}),z.object({command:z.literal('migrationDiscover')}),z.object({command:z.literal('migrationChooseFolder')}),z.object({command:z.literal('migrationClear')}),z.object({command:z.literal('migrationCancel')}),
 z.object({command:z.literal('migrationConfigure'),payload:z.object({id:idSchema,config:connectionSchema})}),
 z.object({command:z.literal('migrationPrepare'),payload:z.object({sourceId:idSchema,oldAppClosed:z.literal(true)})}),
 z.object({command:z.literal('migrationPrepareFile'),payload:z.object({oldAppClosed:z.literal(true)})}),
 z.object({command:z.literal('migrationStartService'),payload:z.object({sourceId:idSchema,name:idSchema})}),
]);
export type TransportRequest=z.infer<typeof transportSchema>;

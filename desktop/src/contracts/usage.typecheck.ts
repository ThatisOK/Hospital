import type {ClinicBridge,PrescriptionInput} from './index';
declare const app:ClinicBridge;
declare const draft:PrescriptionInput;
app.clinic.savePrescription(draft);
// @ts-expect-error A caller cannot select an unrelated result type.
app.clinic.savePrescription<string>(draft);
// @ts-expect-error Renderer has no raw database handle.
app.clinic.db.exec('DELETE FROM prescriptions');
// @ts-expect-error Input quantities are numbers.
app.clinic.quote({items:[{medicineId:1,quantity:'two'}]});
// @ts-expect-error Old raw command dispatcher is not exposed.
app.call('savePrescription',draft);
// @ts-expect-error Confirmation of paused old input is required.
app.migration.prepare({sourceId:'id',oldAppClosed:false});

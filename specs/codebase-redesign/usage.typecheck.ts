import type {
  ClinicDesktop, Cents, PrescriptionDraft, SubmissionId, MedicineId,
  PrescriptionId, PreviewId, SourceId, BackupFileId, BackupDestinationId,
  MigrationSummary, LegacyImportTarget, PreparedSnapshotId, MigrationState,
  LegacyServiceId, MigrationUpdate,
} from './contracts';

declare const app: ClinicDesktop;
declare const draft: PrescriptionDraft;
declare const submissionId: SubmissionId;
declare const cents: Cents;
declare const medicineId: MedicineId;
declare const prescriptionId: PrescriptionId;
declare const preview: PreviewId;
declare const source: SourceId;
declare const legacyService: LegacyServiceId;
declare const backup: BackupFileId;
declare const destination: BackupDestinationId;
declare const importer: LegacyImportTarget;
declare const snapshot: PreparedSnapshotId;
declare const summary: MigrationSummary;

async function commonCaller() {
  const result = await app.clinic.savePrescription({ submissionId, draft });
  if (result.kind === 'committed') {
    const savedId: PrescriptionId = result.value.id;
    // The caller clears its draft on commit, even when later backup health needs attention.
    return { savedId, protection: result.protection };
  }
  return { unchangedDraft: draft, problem: result.problem };
}
async function migrationCaller() {
  const mountedSession = app.migration.state().sessionId;
  let revision = -1;
  const unsubscribe = app.migration.observe((update: MigrationUpdate) => {
    if (update.sessionId !== mountedSession || update.revision <= revision) return;
    revision = update.revision;
    const state = update.state;
    if (state.kind === 'preparing') return state.stage;
    if (state.kind === 'reviewing') return state.preview.summary;
    return state.kind;
  });
  await app.migration.dispatch({ kind: 'prepare', source, oldApplicationClosed: true });
  return unsubscribe;
}
async function onUserConfirmObservedPreview(update: MigrationUpdate) {
  // Separate user action after observe has delivered a reviewing state.
  if (update.state.kind !== 'reviewing') return;
  await app.migration.dispatch({ kind: 'commit', preview: update.state.preview.id, confirmed: true });
}
async function onUserConfirmServiceStart() {
  // Preparation is a later user action after observing that the source is ready.
  await app.migration.dispatch({ kind: 'start-local-service', source, service: legacyService, confirmed: true });
}
async function recoveryCaller() {
  await app.clinic.backup({ kind: 'export', destination });
  const result = await app.clinic.inspectRestore({ file: backup });
  if (result.kind === 'ok') await app.clinic.restore({ plan: result.value.planId, confirmed: true });
  await importer.apply({ snapshot, expected: summary });
}

// These examples are compile-time assertions, not executable tests.
// @ts-expect-error A caller cannot pick an unrelated response type.
app.clinic.savePrescription<string>({ submissionId, draft });
// @ts-expect-error No public SQL connection exists.
app.clinic.db.exec('DELETE FROM prescriptions');
// @ts-expect-error Raw paths are not native-selected backup handles.
app.clinic.inspectRestore({ file: 'C:/arbitrary.sqlite' });
// @ts-expect-error Import capability is not exposed through the desktop bridge.
app.importer.apply({ snapshot, expected: summary });
// @ts-expect-error Medicine and prescription identifiers cannot be mixed.
app.clinic.getPrescription({ id: medicineId });
// @ts-expect-error Preview identifiers cannot be substituted for source identifiers.
app.migration.dispatch({ kind: 'prepare', source: preview, oldApplicationClosed: true });
// @ts-expect-error A command cannot carry both a JSON source and connection credentials.
app.migration.dispatch({ kind: 'choose-source', choice: { kind: 'json-picker', connection: {} } });
// @ts-expect-error Confirmation is required in the commit request.
app.migration.dispatch({ kind: 'commit', preview, confirmed: false });
// @ts-expect-error Unparsed numbers are not money.
const rawMoney: Cents = 1.001;
// @ts-expect-error Arbitrary service names are not verified service handles.
app.migration.dispatch({ kind: 'start-local-service', source, service: 'unrelated-service', confirmed: true });
// @ts-expect-error The source status does not expose credentials.
app.migration.state().state.password;
// @ts-expect-error Committing cannot claim reading is cancelable.
const invalidState: MigrationState = { kind: 'committing', preview: { id: preview, source: { id: source, label: 'old', connection: 'ready', location: 'file' }, summary }, cancellation: 'available' };
const adjusted = { ...draft, amount: { kind: 'manual', total: cents } } satisfies PrescriptionDraft;
void [commonCaller, migrationCaller, onUserConfirmObservedPreview, onUserConfirmServiceStart, recoveryCaller, prescriptionId, adjusted];

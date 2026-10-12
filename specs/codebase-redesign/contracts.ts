/** Target interface sketch only. Not imported by the running application. */
export type Id<Name extends string> = string & { readonly __id: Name };
export type PrescriptionId = Id<'Prescription'>;
export type MedicineId = Id<'Medicine'>;
export type SubmissionId = Id<'Submission'>;
export type SourceId = Id<'MigrationSource'>;
export type LegacyServiceId = Id<'VerifiedLegacyService'>;
export type PreviewId = Id<'MigrationPreview'>;
export type BackupFileId = Id<'SelectedBackup'>;
export type BackupDestinationId = Id<'BackupDestination'>;
export type RestorePlanId = Id<'RestorePlan'>;
export type MigrationSessionId = Id<'MigrationSession'>;
export type Cents = number & { readonly __unit: 'Cents' };
export type Quantity = number & { readonly __unit: 'PositiveWholeQuantity' };
export type LocalDate = string & { readonly __format: 'LocalDate' };
export type LocalMonth = string & { readonly __format: 'LocalMonth' };
export type Unsubscribe = () => void;

export type Problem =
  | { kind: 'invalid-input'; fields: Readonly<Record<string, string>> }
  | { kind: 'not-found'; message: string }
  | { kind: 'stale-preview'; message: string }
  | { kind: 'data-in-use'; activity: 'importing' | 'restoring' }
  | { kind: 'storage-unavailable'; message: string }
  | { kind: 'legacy-unavailable'; action: 'check-service' | 'check-connection' | 'choose-photos'; message: string };
export type Result<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'rejected'; problem: Problem };
export type Choice<T> = Result<T> | { kind: 'canceled' };

export type ProtectionState =
  | { kind: 'not-yet-backed-up' }
  | { kind: 'scheduled'; lastSuccessfulAt: string | null }
  | { kind: 'healthy'; lastSuccessfulAt: string }
  | { kind: 'attention'; lastSuccessfulAt: string | null; message: string };
/** Only rejected means the domain change did not commit. */
export type CommitResult<T> =
  | { kind: 'committed'; value: T; protection: ProtectionState }
  | { kind: 'rejected'; problem: Problem };
export interface ClinicSettings { clinicName: string; defaultDoctorName: string }
export interface PatientEntry {
  name: string;
  sex: 'male' | 'female' | 'unrecorded';
  age: string;
  diagnosis: string;
  allergyHistory: string;
  address: string;
}
export interface PhotoEntry { name: string; dataUrl: string }
export interface MedicineSelection { medicineId: MedicineId; quantity: Quantity }
export interface MedicineFields {
  name: string;
  acronym: string;
  manufacturer: string;
  specification: string;
  purchasePrice: Cents;
  retailPrice: Cents;
}
export type MedicineChange =
  | { kind: 'create'; values: MedicineFields }
  | { kind: 'edit'; id: MedicineId; values: MedicineFields };
export interface Medicine extends MedicineFields { id: MedicineId; availability: 'active' | 'archived' }
export type AmountChoice = { kind: 'default' } | { kind: 'manual'; total: Cents };
export type PrescriptionContext =
  | { kind: 'new' }
  | { kind: 'existing'; id: PrescriptionId };
export interface PriceRequest {
  context: PrescriptionContext;
  medicines: readonly MedicineSelection[];
  amount: AmountChoice;
}
export interface PrescriptionDraft extends PriceRequest {
  patient: PatientEntry;
  doctorName: string;
  photos: readonly PhotoEntry[];
}
export interface PriceLine {
  medicineId: MedicineId;
  name: string;
  specification: string;
  manufacturer: string;
  unitPrice: Cents;
  quantity: Quantity;
  subtotal: Cents;
}
export interface PricePreview {
  lines: readonly PriceLine[];
  medicineSubtotal: Cents;
  total: Cents;
  totalBasis: 'calculated' | 'manual-this-submission' | 'retained-recorded-total';
  historicalPriceDisclosure: 'none' | 'migration-prices';
}
export interface SavedPrescription {
  id: PrescriptionId;
  recordedAt: string;
  status: 'active' | 'void';
  total: Cents;
}
export interface PrescriptionDetail extends SavedPrescription {
  patient: PatientEntry;
  doctorName: string;
  lines: readonly PriceLine[];
  photos: readonly PhotoEntry[];
  historicalPriceDisclosure: 'none' | 'migration-prices';
}
export interface HistoryQuery {
  search: string;
  period:
    | { kind: 'all' }
    | { kind: 'since'; from: LocalDate }
    | { kind: 'until'; to: LocalDate }
    | { kind: 'between'; from: LocalDate; to: LocalDate };
  includeVoided: boolean;
  page: number;
}
export interface PrescriptionHistoryRow extends SavedPrescription { patientName: string; diagnosis: string; doctorName: string }
export interface PrescriptionPage { records: readonly PrescriptionHistoryRow[]; totalRecords: number; page: number }
export interface MonthlySummary { month: LocalMonth; count: number; total: Cents; days: readonly { date: LocalDate; count: number; total: Cents }[] }
export interface Overview { settings: ClinicSettings; today: { count: number; total: Cents }; activeMedicines: number; protection: ProtectionState }
export interface RecoveryReceipt { operationId: string; beforeBackup: string; completedAt: string }
export interface RestorePreview { planId: RestorePlanId; createdAt: string; records: number; photos: number }
export interface ClinicStatus { revision: number; activity: 'ready' | 'importing' | 'restoring'; protection: ProtectionState }

/** Business operations plus their durable-data guarantees. No raw SQL, path or transaction handle. */
export interface LocalClinic {
  overview(): Promise<Result<Overview>>;
  findMedicines(query: { text: string; includeArchived: boolean }): Promise<Result<readonly Medicine[]>>;
  saveMedicine(change: MedicineChange): Promise<CommitResult<Medicine>>;
  setMedicineAvailability(input: { id: MedicineId; availability: Medicine['availability'] }): Promise<CommitResult<Medicine>>;
  quote(request: PriceRequest): Promise<Result<PricePreview>>;
  savePrescription(input: { submissionId: SubmissionId; draft: PrescriptionDraft }): Promise<CommitResult<SavedPrescription>>;
  getPrescription(input: { id: PrescriptionId }): Promise<Result<PrescriptionDetail>>;
  findPrescriptions(query: HistoryQuery): Promise<Result<PrescriptionPage>>;
  voidPrescription(input: { id: PrescriptionId }): Promise<CommitResult<SavedPrescription>>;
  month(input: { month: LocalMonth }): Promise<Result<MonthlySummary>>;
  saveSettings(settings: ClinicSettings): Promise<CommitResult<ClinicSettings>>;
  backup(input: { kind: 'local' } | { kind: 'export'; destination: BackupDestinationId }): Promise<Result<{ completedAt: string }>>;
  inspectRestore(input: { file: BackupFileId }): Promise<Result<RestorePreview>>;
  restore(input: { plan: RestorePlanId; confirmed: true }): Promise<CommitResult<RecoveryReceipt>>;
  observe(listener: (state: ClinicStatus) => void): Unsubscribe;
}

/** Main-process configuration only. Never included in SourceSummary or progress events. */
export interface LegacyConnectionInput { host: string; port: number; database: string; username: string; password: string }
export type SourceChoice =
  | { kind: 'discover' }
  | { kind: 'folder-picker' }
  | { kind: 'json-picker' }
  | { kind: 'manual'; connection: LegacyConnectionInput };
export interface SourceSummary { id: SourceId; label: string; connection: 'ready' | 'needs-details'; location: 'local' | 'remote' | 'file' }
export interface MigrationSummary {
  medicines: number;
  prescriptions: number;
  photos: number;
  total: Cents;
  dates: { kind: 'empty' } | { kind: 'range'; first: string; last: string };
}
export interface MigrationPreview { id: PreviewId; source: SourceSummary; summary: MigrationSummary }
export interface MigrationReceipt extends RecoveryReceipt { summary: MigrationSummary; protection: ProtectionState }
export type SourceRecovery =
  | { kind: 'unchecked' }
  | { kind: 'unavailable'; message: string }
  | { kind: 'local-services'; services: readonly { id: LegacyServiceId; label: string; status: 'running' | 'stopped' }[] };
export type MigrationState =
  | { kind: 'selecting'; sources: readonly SourceSummary[] }
  | { kind: 'source-ready'; source: SourceSummary; recovery: SourceRecovery }
  | { kind: 'preparing'; source: SourceSummary; stage: string; cancellation: 'available' }
  | { kind: 'canceling'; source: SourceSummary }
  | { kind: 'reviewing'; preview: MigrationPreview }
  | { kind: 'committing'; preview: MigrationPreview; cancellation: 'unavailable' }
  | { kind: 'completed'; receipt: MigrationReceipt }
  | { kind: 'failed'; problem: Problem; retry: 'select-source' | 'prepare-again' };
export type MigrationAction =
  | { kind: 'choose-source'; choice: SourceChoice }
  | { kind: 'configure'; source: SourceId; connection: LegacyConnectionInput }
  | { kind: 'choose-photos'; source: SourceId }
  | { kind: 'check-local-services'; source: SourceId }
  | { kind: 'start-local-service'; source: SourceId; service: LegacyServiceId; confirmed: true }
  | { kind: 'prepare'; source: SourceId; oldApplicationClosed: true }
  | { kind: 'cancel-read' }
  | { kind: 'commit'; preview: PreviewId; confirmed: true }
  | { kind: 'reset' };
export interface MigrationUpdate { sessionId: MigrationSessionId; revision: number; state: MigrationState }
export type DispatchReceipt = { kind: 'accepted'; sessionId: MigrationSessionId } | { kind: 'canceled' } | { kind: 'rejected'; problem: Problem };
export interface MigrationSession {
  state(): MigrationUpdate;
  dispatch(action: MigrationAction): Promise<DispatchReceipt>;
  observe(listener: (update: MigrationUpdate) => void): Unsubscribe;
  dispose(): Promise<Result<void>>;
}
export interface DesktopNative {
  choosePhotos(): Promise<Choice<readonly PhotoEntry[]>>;
  chooseBackup(): Promise<Choice<BackupFileId>>;
  chooseBackupDestination(): Promise<Choice<BackupDestinationId>>;
  printPrescription(input: { id: PrescriptionId }): Promise<Choice<void>>;
}
export interface ClinicDesktop { clinic: LocalClinic; migration: MigrationSession; native: DesktopNative }

/** Private composition seam, omitted from the renderer's ClinicDesktop interface. */
export type PreparedSnapshotId = Id<'PreparedSnapshot'>;
export interface LegacyImportTarget {
  apply(input: { snapshot: PreparedSnapshotId; expected: MigrationSummary }): Promise<CommitResult<MigrationReceipt>>;
}

/** The composition root owns this handle; it is not sent over IPC. */
export interface ClinicHost {
  client: LocalClinic;
  importTarget: LegacyImportTarget;
  close(): Promise<Result<void>>;
}

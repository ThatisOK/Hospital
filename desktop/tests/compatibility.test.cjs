const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const {openClinicHost}=require('../dist/clinic');
test('opens and restores a genuine 1.1.0 database and backup',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'clinic-v1-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 fs.writeFileSync(path.join(directory,'clinic.sqlite'),Buffer.from(fs.readFileSync(path.join(__dirname,'fixtures/clinic-v1.sqlite.base64'),'ascii').trim(),'base64'));
 const oldBackup=path.join(directory,'old.clinic-backup');fs.writeFileSync(oldBackup,Buffer.from(fs.readFileSync(path.join(__dirname,'fixtures/clinic-v1.clinic-backup.base64'),'ascii').trim(),'base64'));
 const host=await openClinicHost({directory});try{
  const record=await host.client.prescription('201812310001');assert.equal(record.kind,'ok');assert.equal(record.value.totalCents,600);assert.equal(record.value.photos.length,1);
  await host.client.voidPrescription(record.value.id);const restored=await host.restore((await host.inspectRestore(oldBackup)).value);assert.equal(restored.kind,'ok');assert.equal((await host.client.prescription(record.value.id)).value.status,'active');
 }finally{await host.close();}
});

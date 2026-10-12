const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {openClinicHost}=require('../dist/clinic');
test('LocalClinic saves once, reports final money, and reopens without exposing SQL',async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'local-clinic-'));
  let host=await openClinicHost({directory});
  t.after(async()=>{await host.close();fs.rmSync(directory,{recursive:true,force:true});});
  assert.equal('db' in host.client,false);
  const medicine=await host.client.saveMedicine({name:'测试药品',acronym:'CS',brand:'厂家',standard:'盒',purchase:'1.00',retail:'12.30'});
  assert.equal(medicine.kind,'committed');
  const draft={requestId:randomUUID(),name:'患者',sex:'女',age:'35',diagnosis:'测试',allergic:'不详',address:'',doctor:'医生',items:[{medicineId:medicine.value,quantity:2}],photos:[],totalOverride:'20.00'};
  const saved=await host.client.savePrescription(draft);
  assert.equal(saved.kind,'committed');assert.equal(saved.value.totalCents,2000);
  assert.equal((await host.client.savePrescription(draft)).value.id,saved.value.id);
  assert.equal((await host.client.savePrescription({...draft,name:'不同内容'})).kind,'rejected');
  await host.close();host=await openClinicHost({directory});
  const record=await host.client.prescription(saved.value.id);
  assert.equal(record.kind,'ok');assert.equal(record.value.totalCents,2000);assert.equal(record.value.items[0].unitCents,1230);
});

test('concurrent close calls settle once and later data operations are rejected',async t=>{const directory=fs.mkdtempSync(path.join(os.tmpdir(),'clinic-close-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));const host=await openClinicHost({directory});const results=await Promise.allSettled([host.close(),host.close(),host.close()]);assert.ok(results.every(result=>result.status==='fulfilled'));await assert.rejects(host.client.overview(),/关闭/);await host.close();});

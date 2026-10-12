const mysql=require('mysql2');
const path=require('node:path');
const photo=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=','base64');
async function fixtureServer(){
 const server=mysql.createServer();const sockets=[];const queries=[];
 server.on('connection',connection=>{
  sockets.push(connection);connection.on('error',()=>{});
  connection.serverHandshake({protocolVersion:10,serverVersion:'5.7.44-fixture',connectionId:1,statusFlags:2,characterSet:45,capabilityFlags:0x00088201,authCallback:(params,done)=>{done(null);connection.sequenceId=0;}});
  connection.on('stmt_prepare',sql=>{queries.push(sql);connection.sequenceId=1;connection.writeOk();connection.sequenceId=0;});
  connection.on('query',sql=>{
   connection.sequenceId=1;
   queries.push(sql);
   let rows;
   if(sql.includes('information_schema.TABLES'))rows=['medicine','user','prescription','prescriptionMedicine','prescriptionPhoto'].map(name=>({name,engine:'InnoDB'}));
   else if(sql.includes('FROM medicine '))rows=[{id:'8',name:'迁移测试药品',acronym:'QYCS',brand:'测试厂家',standard:'盒',purchase_price:'2.00',retail_price:'3.50'}];
   else if(sql.includes('FROM user '))rows=[{id:'1',username:'旧医生'}];
   else if(sql.includes('FROM prescription '))rows=[{id:'201812310001',name:'迁移测试患者',sex:'男',age:'42',dianose:'合成旧诊断',userid:'1',allergic:'无',address:'测试地址',sum:'6.00',time:'2018-12-31 23:59:59'}];
   else if(sql.includes('FROM prescriptionMedicine '))rows=[{prescriptionId:'201812310001',medicineId:'8',num:'2'}];
   else if(sql.includes('FROM prescriptionPhoto '))rows=[{prescriptionId:'201812310001',photoPath:'photos/fixture.png'}];
   else {connection.writeOk();connection.sequenceId=0;return;}
   const columns=Object.keys(rows[0]).map(name=>({catalog:'def',schema:'clinic',table:'fixture',orgTable:'fixture',name,orgName:name,characterSet:45,columnLength:1024,columnType:mysql.Types.VAR_STRING,flags:0,decimals:0}));
   connection.writeColumns(columns);for(const row of rows)connection.writeTextRow(columns.map(column=>row[column.name]));connection.writeEof();connection.sequenceId=0;
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {port:server._server.address().port,queries,async close(){for(const connection of sockets)connection.destroy();await new Promise(resolve=>server.close(resolve));}};
}
module.exports={fixtureServer,photo};

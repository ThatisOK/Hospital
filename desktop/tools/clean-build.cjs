const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const output=path.join(root,'dist');
if(path.dirname(output)!==root||path.basename(output)!=='dist')throw new Error('Unexpected output directory');
fs.rmSync(output,{recursive:true,force:true});

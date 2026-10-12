const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');
const root=path.resolve(__dirname,'../src');
const failures=[];
function walk(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):[path.join(directory,entry.name)]);}
for(const file of walk(root).filter(file=>file.endsWith('.ts'))){
 const owner=path.relative(root,file).replaceAll('\\','/');const text=fs.readFileSync(file,'utf8');const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
 function inspect(node){
  let dependency;
  if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier))dependency=node.moduleSpecifier.text;
  if(ts.isCallExpression(node)&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||(ts.isIdentifier(node.expression)&&node.expression.text==='require'))&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0]))dependency=node.arguments[0].text;
  if(dependency){
   const target=dependency.startsWith('.')?path.relative(root,path.resolve(path.dirname(file),dependency)).replaceAll('\\','/'):dependency;
   if(owner.startsWith('renderer/')&&(target.startsWith('node:')||target==='electron'||target.startsWith('mysql2')||target.startsWith('clinic/')||target.startsWith('migration/')||target.startsWith('electron/')))failures.push(owner+' imports '+target);
   if(owner.startsWith('contracts/')&&(target.startsWith('node:')||target==='electron'||target.startsWith('mysql2')))failures.push(owner+' imports runtime '+target);
   if(!owner.startsWith('clinic/')&&target.startsWith('clinic/internal/'))failures.push(owner+' imports private storage '+target);
   if(owner.startsWith('clinic/')&&target.startsWith('electron/'))failures.push(owner+' imports native '+target);
  }
  if(node.kind===ts.SyntaxKind.AnyKeyword)failures.push(owner+' uses any');
  ts.forEachChild(node,inspect);
 }inspect(source);
}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log('PASS module imports and unknown input discipline');

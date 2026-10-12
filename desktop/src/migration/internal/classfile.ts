import type { MigrationConnection } from '../../contracts';
import { parseJdbc } from './jdbc';
type Entry={tag:number;value?:string;a?:number;b?:number};
// Resolve the literal arguments at the actual DriverManager.getConnection invocation.
// A repeated ldc resolves the same constant twice; constant-pool ordering is not meaningful.
export function readDaoClass(bytes:Buffer,webroot=''):MigrationConnection|null{
 try{
  let p=0;const u1=()=>{if(p>=bytes.length)throw new Error();return bytes[p++];};const u2=()=>{const n=bytes.readUInt16BE(p);p+=2;return n;};const u4=()=>{const n=bytes.readUInt32BE(p);p+=4;return n;};const skip=(n:number)=>{p+=n;if(p>bytes.length)throw new Error();};
  if(u4()!==0xcafebabe)return null;skip(4);const count=u2(),pool:Entry[]=[];
  for(let i=1;i<count;i++){const tag=u1();if(tag===1){const len=u2();pool[i]={tag,value:bytes.toString('utf8',p,p+len)};skip(len);}else if([7,8,16,19,20].includes(tag))pool[i]={tag,a:u2()};else if([9,10,11,12,17,18].includes(tag))pool[i]={tag,a:u2(),b:u2()};else if([3,4].includes(tag)){skip(4);pool[i]={tag};}else if([5,6].includes(tag)){skip(8);pool[i]={tag};i++;}else if(tag===15){skip(3);pool[i]={tag};}else return null;}
  const utf=(index:number|undefined)=>index?pool[index]?.value:undefined;
  const literal=(index:number)=>pool[index]?.tag===8?utf(pool[index].a):undefined;
  const method=(index:number)=>{const ref=pool[index],name=pool[ref?.b??0];return {owner:utf(pool[ref?.a??0]?.a),name:utf(name?.a),descriptor:utf(name?.b)};};
  skip(6);skip(u2()*2);
  const skipAttributes=()=>{for(let n=u2();n>0;n--){skip(2);skip(u4());}};
  for(let n=u2();n>0;n--){skip(6);skipAttributes();}
  for(let n=u2();n>0;n--){skip(2);const name=utf(u2());skip(2);const attributes=u2();
   for(let a=0;a<attributes;a++){const attribute=utf(u2()),length=u4(),end=p+length;if(end>bytes.length)return null;
    if(name==='getConn'&&attribute==='Code'){
     skip(4);const codeLength=u4(),code=bytes.subarray(p,p+codeLength);if(code.length!==codeLength)return null;
     const stack:(string|undefined)[]=[],locals=new Map<number,string|undefined>();
     for(let pc=0;pc<code.length;){const op=code[pc++];
      if(op===0x12)stack.push(literal(code[pc++]));
      else if(op===0x13){stack.push(literal(code.readUInt16BE(pc)));pc+=2;}
      else if(op===0x19)stack.push(locals.get(code[pc++]));
      else if(op>=0x2a&&op<=0x2d)stack.push(locals.get(op-0x2a));
      else if(op===0x3a)locals.set(code[pc++],stack.pop());
      else if(op>=0x4b&&op<=0x4e)locals.set(op-0x4b,stack.pop());
      else if(op===0x57)stack.pop();
      else if(op===0xb8){const ref=method(code.readUInt16BE(pc));pc+=2;
       if(ref.owner==='java/sql/DriverManager'&&ref.name==='getConnection'&&ref.descriptor==='(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)Ljava/sql/Connection;'){
        const password=stack.pop(),user=stack.pop(),url=stack.pop();return url!==undefined&&user!==undefined&&password!==undefined?parseJdbc(url,user,password,webroot):null;
       }
       if(ref.owner==='java/lang/Class'&&ref.name==='forName'&&ref.descriptor==='(Ljava/lang/String;)Ljava/lang/Class;'){stack.pop();stack.push(undefined);}else return null;
      }else if(op===0x00){}else return null; // Only support this legacy straight-line method; never guess.
     }
    }
    p=end;
   }
  }
  return null;
 }catch{return null;}
}

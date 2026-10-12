import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import type { LegacyService } from '../contracts';
import { UserError } from '../contracts/errors';
const exec = promisify(execFile);
export type ServiceRecord = { Name: string; DisplayName: string; State: string; PathName: string };
export function isLegacyService(service: ServiceRecord): boolean {
  if(typeof service?.Name!=='string'||!/^[A-Za-z0-9_.-]{1,100}$/.test(service.Name)||typeof service.PathName!=='string')return false;
  const text=service.PathName.trim();
  const executable=text.startsWith(String.fromCharCode(34))?text.slice(1,text.indexOf(String.fromCharCode(34),1)):text.split(/[ \t]/)[0];
  return /(?:^|[\\/])(?:mysqld|mariadbd)[.]exe$/i.test(executable);
}
async function powershell(script: string) {
  if(process.platform!=='win32')throw new UserError('此功能仅支持 Windows，仍可手动启动旧系统后重试。');
  const executable=join(process.env.SystemRoot??'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe');
  const result=await exec(executable,['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout:35000,maxBuffer:1024*1024});return result.stdout.trim();
}
export async function listLegacyServices():Promise<LegacyService[]> {
  try{
    const text=await powershell("[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; @(Get-CimInstance Win32_Service | Where-Object { $_.PathName -match '(mysqld|mariadbd)[.]exe' } | Select-Object Name,DisplayName,State,PathName) | ConvertTo-Json -Compress");
    const records=text?JSON.parse(text):[];
    return (Array.isArray(records)?records:[records]).filter(isLegacyService).map(service=>({name:service.Name,label:service.DisplayName,running:service.State==='Running'}));
  }catch{throw new UserError('无法检查旧系统服务。请让维护者启动旧系统，再点击“重新读取”。');}
}
export async function startLegacyService(name:string, run=powershell):Promise<void>{
  if(typeof name!=='string'||!/^[A-Za-z0-9_.-]{1,100}$/.test(name))throw new UserError('请选择检测到的旧系统服务');
  // Revalidate executable identity within the same process immediately before Start-Service.
  const quote = String.fromCharCode(34);
  const script = "$ErrorActionPreference='Stop'; $service=Get-CimInstance Win32_Service -Filter " + quote + "Name='"+name+"'" + quote + "; if(-not $service){throw 'Missing service'}; $path=$service.PathName.Trim(); if($path.StartsWith([string][char]34)){$exe=($path -split [char]34)[1]}else{$exe=($path -split ' ')[0]}; if([System.IO.Path]::GetFileName($exe) -notin @('mysqld.exe','mariadbd.exe')){throw 'Not a legacy database service'}; Start-Service -Name '"+name+"'; (Get-Service -Name '"+name+"').WaitForStatus('Running',[TimeSpan]::FromSeconds(20))";
  try{await run(script);}catch{throw new UserError('旧服务未能启动，可能需要管理员权限。请让维护者协助启动一次，再回到此处重试；新程序日常使用不需要旧服务。');}
}

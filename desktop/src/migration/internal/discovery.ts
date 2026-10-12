import {parseJdbc} from './jdbc';
import { promises as fs } from 'node:fs';
import { join, dirname, resolve, relative, isAbsolute } from 'node:path';
import type { MigrationConnection } from '../../contracts';
import { UserError } from '../../contracts/errors';
import { readDaoClass } from './classfile';

const MAX_CONFIG = 2 * 1024 * 1024;
function javaString(raw: string) { const value:unknown=JSON.parse(String.fromCharCode(34)+raw+String.fromCharCode(34));if(typeof value!=='string')throw new Error('Invalid string');return value; }
export function parseJavaConfig(source: string, webroot = ''): MigrationConnection | null {
  const quote = String.fromCharCode(34);
  const literals = quote + '([^' + quote + ']*)' + quote;
  const url = new RegExp('String[ \t]+url[ \t]*=[ \t]*' + literals).exec(source);
  const call = new RegExp('DriverManager[.]getConnection[ \t]*[(][ \t]*url[ \t]*,[ \t]*' + literals + '[ \t]*,[ \t]*' + literals + '[ \t]*[)]').exec(source);
  if (!url || !call) return null;
  try { return parseJdbc(javaString(url[1]), javaString(call[1]), javaString(call[2]), webroot); } catch { return null; }
}
// Read only the JVM constant pool; never execute classes or scripts from the selected directory.
export function classStrings(buffer: Buffer): string[] {
  if (buffer.length < 10 || buffer.readUInt32BE(0) !== 0xcafebabe) return [];
  const result: string[] = []; let offset = 10;
  try {
    for (let i = 1, count = buffer.readUInt16BE(8); i < count; i++) {
      const tag = buffer[offset++];
      if (tag === 1) { const length = buffer.readUInt16BE(offset); offset += 2; if (offset + length > buffer.length) return []; result.push(buffer.toString('utf8', offset, offset + length)); offset += length; }
      else if ([3,4,9,10,11,12,17,18].includes(tag)) offset += 4;
      else if ([5,6].includes(tag)) { offset += 8; i++; }
      else if ([7,8,16,19,20].includes(tag)) offset += 2;
      else if (tag === 15) offset += 3;
      else return [];
      if (offset > buffer.length) return [];
    }
    return result;
  } catch { return []; }
}
export function parseClassConfig(bytes: Buffer, webroot = ''): MigrationConnection | null {
  return readDaoClass(bytes,webroot);
}
export async function inspectFolder(folder: string): Promise<{ folder: string; config: MigrationConnection | null }> {
  const actual = await fs.realpath(folder);
  if (!(await fs.stat(actual)).isDirectory()) throw new UserError('请选择旧系统所在的文件夹');
  const roots = [actual, join(actual, 'Hospital'), join(actual, 'webapps', 'Hospital'), join(actual, 'WebContent')];
  for (const root of roots) {
    for (const name of ['src/user/UserDao.java', 'WEB-INF/classes/user/UserDao.class']) {
      const path = join(root, name);
      try {
        const real = await fs.realpath(path), rel = relative(actual, real);
        if (isAbsolute(rel) || rel === '..' || rel.startsWith('..' + require('node:path').sep)) continue;
        if ((await fs.stat(real)).size > MAX_CONFIG) continue;
        const bytes = await fs.readFile(real);
        const webroot = name.startsWith('src/') ? join(root, 'WebContent') : root;
        const config = name.endsWith('.java') ? parseJavaConfig(bytes.toString('utf8'), webroot) : parseClassConfig(bytes, webroot);
        if (config) return { folder: actual, config };
      } catch { /* Unknown/missing candidate; keep the picker usable. */ }
    }
  }
  return { folder: actual, config: null };
}
export async function discoverFolders(): Promise<string[]> {
  const roots = new Set<string>();
  for (const candidate of [process.env.CATALINA_BASE, process.env.CATALINA_HOME, 'C:/Tomcat', 'C:/Hospital']) if (candidate) roots.add(resolve(candidate));
  for (const base of [process.env.ProgramFiles, process.env['ProgramFiles(x86)']]) {
    if (!base) continue;
    const apache = join(base, 'Apache Software Foundation');
    try { for (const item of (await fs.readdir(apache, { withFileTypes: true })).slice(0, 50)) if (item.isDirectory() && /^Tomcat/i.test(item.name)) roots.add(join(apache, item.name)); } catch { /* Not installed here. */ }
  }
  const found: string[] = [];
  for (const root of roots) try { if ((await fs.stat(root)).isDirectory()) found.push(root); } catch { /* Skip absent roots. */ }
  return found;
}
export function validateConnection(input: MigrationConnection): MigrationConnection {
  if (!input || typeof input !== 'object') throw new UserError('请填写旧系统连接信息');
  for (const key of ['host','database','user','password','webroot'] as const) if (typeof input[key] !== 'string' || input[key].length > (key === 'webroot' ? 2048 : 512) || input[key].includes(String.fromCharCode(0))) throw new UserError('连接信息格式不正确');
  if (!input.host.trim() || !input.database.trim() || !input.user.trim() || !Number.isInteger(input.port) || input.port < 1 || input.port > 65535) throw new UserError('请检查服务器地址、端口、资料库名称和账号');
  return { ...input, host: input.host.trim(), database: input.database.trim(), user: input.user.trim() };
}

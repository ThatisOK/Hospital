import type {MigrationConnection} from '../../contracts';
export function parseJdbc(url: string, user: string, password: string, webroot = ''): MigrationConnection | null {
  try {
    if (!url.startsWith('jdbc:mysql://')) return null;
    const parsed = new URL(url.slice(5));
    const database = decodeURIComponent(parsed.pathname.slice(1));
    if (!parsed.hostname || !database || database.includes('/') || parsed.username || parsed.password) return null;
    return { host: parsed.hostname, port: Number(parsed.port || 3306), database, user, password, webroot };
  } catch { return null; }
}

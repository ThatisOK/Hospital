// Type-check the proposal without importing it into the shipped application.
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const folder = __dirname;
const repository = path.resolve(folder, '../..');
const compiler = path.join(repository, 'desktop/node_modules/typescript/bin/tsc');
const result = spawnSync(process.execPath, [compiler, '--noEmit', '--strict', '--skipLibCheck', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--lib', 'ES2022', path.join(folder, 'contracts.ts'), path.join(folder, 'usage.typecheck.ts')], { cwd: repository, stdio: 'inherit', windowsHide: true });
if (result.error) { console.error(result.error.message); process.exitCode = 1; }
else { process.exitCode = result.status ?? 1; if (!process.exitCode) console.log('PASS: proposal contracts, caller examples and rejected invalid calls'); }

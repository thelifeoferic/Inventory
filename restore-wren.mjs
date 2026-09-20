import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const parts = (await readdir(root)).filter(n => /^wren-part-\d+\.json$/.test(n)).sort();
if (!parts.length) throw new Error('Wren upload parts are missing. Upload all files.');
const data = (await Promise.all(parts.map(async n => JSON.parse(await readFile(resolve(root,n),'utf8')).data))).join('');
const files = JSON.parse(gunzipSync(Buffer.from(data,'base64')));
const maintainedSources = new Set(["app/inventory.tsx", "lib/inventory-data.ts"]);
for (const [name, content] of Object.entries(files)) {
  if (maintainedSources.has(name)) continue;
  const target = resolve(root, name);
  if (!target.startsWith(resolve(root) + sep)) throw new Error('Invalid source path');
  await mkdir(dirname(target), {recursive:true});
  await writeFile(target, Buffer.from(content,'base64'));
}
console.log(`Restored ${Object.keys(files).length} Wren source files.`);

// Older GitHub uploads can contain partial copies of the application.
// Type-check the active application, not archived upload folders.
const configPath = resolve(root, 'tsconfig.json');
const config = JSON.parse(await readFile(configPath, 'utf8'));
config.include = ['next-env.d.ts', 'app/**/*.ts', 'app/**/*.tsx', 'lib/**/*.ts', 'server/**/*.ts', 'types/**/*.d.ts', '.next/types/**/*.ts', '.next/dev/types/**/*.ts'];
await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');

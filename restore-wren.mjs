import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const parts = (await readdir(root)).filter(n => /^wren-part-\d+\.json$/.test(n)).sort();
if (!parts.length) throw new Error('Wren upload parts are missing. Upload all files.');
const data = (await Promise.all(parts.map(async n => JSON.parse(await readFile(resolve(root,n),'utf8')).data))).join('');
const files = JSON.parse(gunzipSync(Buffer.from(data,'base64')));
for (const [name, content] of Object.entries(files)) {
  const target = resolve(root, name);
  if (!target.startsWith(resolve(root) + sep)) throw new Error('Invalid source path');
  await mkdir(dirname(target), {recursive:true});
  await writeFile(target, Buffer.from(content,'base64'));
}
console.log(`Restored ${Object.keys(files).length} Wren source files.`);

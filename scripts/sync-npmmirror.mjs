import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const pkg = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../package.json'), 'utf-8'));
const pkgName = encodeURIComponent(pkg.name);
const url = `https://registry-direct.npmmirror.com/-/package/${pkgName}/syncs`;

console.log(`Syncing ${pkg.name}@${pkg.version} to npmmirror...`);

const res = await fetch(url, { method: 'PUT' });
const data = await res.json().catch(() => ({}));

if (res.ok) {
  console.log('Sync triggered successfully:', data);
} else {
  console.error('Sync failed:', res.status, data);
  process.exit(1);
}

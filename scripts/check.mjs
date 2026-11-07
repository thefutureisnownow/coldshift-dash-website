// Checks the built site: every local link, image and inline url() resolves (anchors too), every page has its
// metadata, nothing needs what the Content-Security-Policy in _headers blocks (inline styles or scripts, or anything
// from another site), no file is over Cloudflare Pages' 25 MiB, and the downloads' addresses and checksums are well
// formed. It lists the placeholders still waiting on content.
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const LIMIT = 25 * 1024 * 1024;
async function walk(dir) {
  const entries = await readdir(dir);
  return (await Promise.all(entries.map(async name => {
    const p = path.join(dir, name);
    return (await stat(p)).isDirectory() ? walk(p) : p;
  }))).flat();
}

const files = await walk(root);
const errors = [];
const placeholders = new Set();
let checked = 0;
for (const file of files) {
  const size = (await stat(file)).size;
  if (size > LIMIT) errors.push(`${file}: ${(size / 1048576).toFixed(1)} MiB, over Cloudflare Pages' 25 MiB (host it elsewhere, a GitHub release say, and give its full https address)`);
}
for (const file of files.filter(f => /\.(html|css)$/.test(f))) {
  const content = await readFile(file, 'utf8');
  const html = file.endsWith('.html');
  const refs = [
    ...(html ? [...content.matchAll(/(?:href|src|srcset|poster)="([^"]+)"/g)].map(m => m[1]) : []),
    ...[...content.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)].map(m => m[1]),
  ];
  for (const ref of refs) {
    if (/^(?:https?:|mailto:)/.test(ref)) continue;
    if (ref.startsWith('data:')) continue;
    const [where, hash] = decodeURIComponent(ref).split('#');
    const name = where.split('?')[0];
    let target = name.startsWith('/') ? path.join(root, name) : path.resolve(path.dirname(file), name || path.basename(file));
    try {
      if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
      await stat(target);
      checked++;
      if (hash && target.endsWith('.html')) {
        const text = await readFile(target, 'utf8');
        if (!text.includes(`id="${hash}"`)) errors.push(`${file}: missing anchor ${ref}`);
      }
    } catch {
      errors.push(`${file}: missing file ${ref}`);
    }
  }
  if (!html) continue;
  if (!(content.includes('<title>') && content.includes('name="description"') && content.includes('lang="en"') && content.includes('rel="canonical"')))
    errors.push(`${file}: missing metadata`);
  // What the CSP would block: things the page loads from another site, inline styles and inline scripts.
  for (const m of content.matchAll(/<(?:img|script|link|source|iframe|video|audio)\b[^>]*\b(?:src|href)="(https?:[^"]+)"/g))
    if (!m[0].startsWith('<link rel="canonical"')) errors.push(`${file}: loads ${m[1]} from another site`);
  if (/\sstyle="/.test(content) || /<style[\s>]/.test(content)) errors.push(`${file}: an inline style (the CSP allows only styles.css)`);
  if (/<script(?![^>]*\ssrc=)[^>]*>/.test(content)) errors.push(`${file}: an inline script (the CSP allows only scripts from this site)`);
  for (const m of content.matchAll(/<!-- PLACEHOLDER: ([^>]+?) -->/g)) placeholders.add(m[1]);
}

const c = JSON.parse(await readFile('src/content.json', 'utf8'));
const dl = c.downloads;
for (const [key, href] of [['play', dl.play], ['latest', dl.latest], ['releases', dl.releases]])
  if (href && !href.startsWith('https://')) errors.push(`content.json downloads.${key}: should be an https address`);
for (const a of dl.apks) {
  const where = `content.json downloads.apks: ${a.id}`;
  if (!/^[\w.-]+\.apk$/.test(a.file || '')) errors.push(`${where}: its file should be the APK's name in the release`);
  if (a.sha256 && !/^[0-9a-f]{64}$/.test(a.sha256)) errors.push(`${where}: its sha256 should be 64 hex characters`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Checked ${checked} local references in ${files.length} files; every page has its metadata, nothing breaks the CSP, and every file fits.`);
if (placeholders.size) console.log(`Placeholders still waiting on content: ${[...placeholders].join(', ')}.`);

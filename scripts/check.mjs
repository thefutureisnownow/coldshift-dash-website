// Checks the built site: every local link, image and inline url() resolves (anchors too), every page has its
// metadata, nothing needs what the Content-Security-Policy in _headers blocks (inline styles or scripts, or anything
// from another site), no file is over Cloudflare Pages' 25 MiB, and every download with a url has its size and
// sha256 (a local one matching its file). It lists the placeholders still waiting on content.
import { readdir, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
for (const b of c.downloads.builds) {
  if (!b.url) continue;
  const where = `content.json downloads: ${b.id}`;
  if (b.store) continue;
  if (!/^[0-9a-f]{64}$/.test(b.sha256 || '') && !b.url.startsWith('/')) errors.push(`${where}: no sha256`);
  if (!b.size && !b.url.startsWith('/')) errors.push(`${where}: no size`);
  if (b.url.startsWith('/')) {
    try {
      const bytes = await readFile(path.join(root, b.url));
      if (b.sha256 && createHash('sha256').update(bytes).digest('hex') !== b.sha256) errors.push(`${where}: ${b.url}'s sha256 isn't the listed one`);
      checked++;
    } catch {
      errors.push(`${where}: missing ${b.url}`);
    }
  } else if (!b.url.startsWith('https://')) errors.push(`${where}: its url should be https`);
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Checked ${checked} local references in ${files.length} files; every page has its metadata, nothing breaks the CSP, and every file fits.`);
if (placeholders.size) console.log(`Placeholders still waiting on content: ${[...placeholders].join(', ')}.`);

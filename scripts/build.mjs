// Renders every page into dist/: the templates are here, the copy in src/content.json, the hero's map in
// src/quiet-map.svg, and public/ is copied as it is.
import { readFile, writeFile, mkdir, cp, rm, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const c = JSON.parse(await readFile('src/content.json', 'utf8'));

const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const ext = (href, label, cls = '') => `<a${cls ? ` class="${cls}"` : ''} href="${esc(href)}" rel="noopener">${label}</a>`;
const button = (href, label, kind = '') => `<a class="button${kind ? ' ' + kind : ''}" href="${esc(href)}"${href.includes('://') ? ' rel="noopener"' : ''}>${label}</a>`;
const repoName = href => href.replace('https://github.com/', '');
const mail = `<a href="mailto:${esc(c.contact.email)}">${esc(c.contact.email)}</a>`;
const keep = c.convoy.keep;

// The stylesheet's address carries a hash of what's in it, so a browser that kept the old one fetches it again
// when it changes.
const version = async file => createHash('sha256').update(await readFile(file)).digest('hex').slice(0, 10);
const styles = `/styles.css?v=${await version('public/styles.css')}`;
const trailerJs = `/trailer.js?v=${await version('public/trailer.js')}`;

// A section's label over a row of shift lights, the dash logo's own: `lit` of nine on (five white, then red).
const lights = lit => `<span class="lights" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<i${i < lit ? ` class="${i < 5 ? 'on' : 'red'}"` : ''}></i>`).join('')}</span>`;
const eyebrow = (label, lit = 5) => `<p class="eyebrow">${lights(lit)}<span>${label}</span></p>`;
const heading = (label, lit, title, lede = '') => `<header class="page-head">${eyebrow(label, lit)}<h1>${title}</h1>${lede ? `<p class="lede">${lede}</p>` : ''}</header>`;

// Line icons, drawn like the Convoy site's: 24 px, round ends, in the text's colour. No car makers' shapes.
const ICONS = {
  maps: '<path d="M9 4 3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  dashcam: '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="m16 11 5-3v8l-5-3"/><circle cx="7" cy="10" r="1" fill="currentColor"/>',
  media: '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  engine: '<path d="M4.5 17a8.5 8.5 0 1 1 15 0"/><path d="m12 13 4-5"/><circle cx="12" cy="13" r="1.2" fill="currentColor"/>',
  logbook: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>',
  track: '<circle cx="12" cy="13" r="7.5"/><path d="M12 13V9M10 3h4M18.5 6.5l1.5-1.5"/>',
  convoy: '<path d="M4 18c5 0 4-10 9-10s4 7 7 7"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="15" r="2"/>',
  vehicle: '<path d="M4 15.5v-3l2-5h12l2 5v3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 15.5z"/><path d="M4 12.5h16"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/>',
  cloud: '<path d="M7 18a5 5 0 0 1-.5-10A6 6 0 0 1 18 9.5a4.3 4.3 0 0 1-.5 8.5z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
};
const icon = (name, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

const nav = [['', 'Home'], ['convoy/', 'Convoy'], ['source/', 'Source'], ['support/', 'Support']];

function layout(route, { title, description, body, noindex = false }) {
  const full = title ? `${title} | ${c.site.name}` : `${c.site.name}: ${c.site.tagline}`;
  const canonical = `${c.site.url}/${route}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(c.site.name)}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${c.site.url}/assets/brand/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#f3f5f9" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#12161b" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/assets/brand/icon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/brand/icon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="${styles}">
${route === '' && c.trailer.youtube ? `<script src="${trailerJs}" defer></script>\n` : ''}</head>
<body>
<a class="skip" href="#main">Skip to the page</a>
<header class="site-head">
  <div class="shell head-row">
    <a class="brand" href="/"><img src="/assets/brand/logo.svg" width="30" height="32" alt=""><span>Coldshift <b>Dash</b></span></a>
    <nav class="site-nav" aria-label="Main">
      ${nav.map(([href, label]) => `<a href="/${href}"${(href === '' ? route === '' : route.startsWith(href)) ? ' aria-current="page"' : ''}>${label}</a>`).join('\n      ')}
    </nav>
    <a class="button small head-cta"${route.startsWith('download/') ? ' aria-current="page"' : ''} href="/download/">Download</a>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-foot">
  <div class="shell foot-row">
    <a class="studio" href="${esc(c.contact.studioUrl)}" rel="noopener"><img src="/assets/studio/tfinn.webp" width="256" height="256" alt="" loading="lazy"><span><strong>A ${esc(c.contact.studio)} production</strong><small>${esc(c.contact.company)}</small></span></a>
    <div>
      <nav aria-label="More">
        <a href="/download/">Download</a><a href="/convoy/">Convoy</a><a href="/source/">Source</a><a href="/support/">Support</a><a href="/privacy/">Privacy</a><a href="/credits/">Credits</a>
      </nav>
      <p class="small">Made in Knysna, South Africa. &copy; 2026 ${esc(c.contact.company)}. Free and open source under the MIT licence. ${mail}</p>
      <p class="small dim">No cookies, no tracking. Map data &copy; OpenStreetMap contributors.</p>
    </div>
  </div>
</footer>
</body>
</html>
`;
}

// ---- Home

// The hero's map, inlined so the page's theme colours it (its own style block is the dark default, for tools
// that draw it without the page, such as scripts/brand-icons.py).
const quietMap = (await readFile('src/quiet-map.svg', 'utf8'))
  .replace(/<!--[\s\S]*?-->/g, '').replace(/<style>[\s\S]*?<\/style>/, '')
  .replace('<svg ', '<svg class="hero-map" aria-hidden="true" focusable="false" ').replace(/\s*\n\s*/g, '');

// A screenshot in a phone held sideways (the app is landscape, 1280 x 720). Until there's a picture
// (`screens[].src` in content.json), the frame is a marked placeholder.
const screen = (s, cls = '') => `<figure class="device${cls ? ' ' + cls : ''}">
        <div class="screen${s.src ? '' : ' placeholder'}">${s.src
          ? `<img src="/${esc(s.src)}" width="1280" height="720" alt="${esc(s.caption)}" loading="lazy">`
          : `<!-- PLACEHOLDER: screenshot "${esc(s.id)}" --><span>${icon(s.id === 'convoy' ? 'convoy' : s.id)}<b>Screenshot to come</b><small>${esc(s.id)}</small></span>`}</div>
        <figcaption>${esc(s.caption)}</figcaption>
      </figure>`;

// Downloads: the APKs attached to coldshift-dash's latest GitHub release (tools/release.sh puts both APKs and a
// SHA256SUMS there), live once `downloads.published` is true; and the desktop app's .dmg from its own releases.
const dl = c.downloads;
const apkUrl = a => dl.published ? `${dl.latest}/download/${a.file}` : '';
const dk = dl.desktop;
const anyLive = Boolean(dl.published);

// The trailer: our own picture until it's pressed, then YouTube's privacy-enhanced player in its place
// (public/trailer.js; without JavaScript it's a link to YouTube). Shown once content.json's trailer.youtube is set.
const trailer = c.trailer.youtube ? `<section class="band alt" id="trailer" aria-labelledby="trailer-title">
  <div class="shell">
    ${eyebrow('The trailer', 4)}
    <h2 id="trailer-title">See it on the road</h2>
    <p class="lede">A minute along the lagoon in Knysna, with Angie from VisTok.</p>
    <a class="trailer" href="https://www.youtube.com/watch?v=${esc(c.trailer.youtube)}" rel="noopener" data-youtube="${esc(c.trailer.youtube)}" data-title="${esc(c.site.name)}: the trailer"><img src="/assets/trailer.webp" width="1280" height="720" alt="" loading="lazy"><span class="play-icon" aria-hidden="true"></span><span class="trailer-label">${esc(c.trailer.title)}<small>Plays from YouTube</small></span></a>
  </div>
</section>

` : '';

const home = `<section class="hero">
  ${quietMap}
  <div class="shell hero-copy">
    <img class="hero-logo" src="/assets/brand/logo.svg" width="745" height="801" alt="">
    <div>
      ${eyebrow('For the phone in your dash', 9)}
      <h1>Coldshift Dash</h1>
      <p class="pitch">${esc(c.site.pitch)}</p>
      <p class="hero-text">${esc(c.site.hero)}</p>
      <p class="actions">${button('/download/', anyLive ? 'Download' : 'Download (coming soon)')}${button('/convoy/', 'Drive in a convoy', 'ghost')}</p>
      <ul class="chips"><li>Android 4.4 and later</li><li>Works offline</li><li>No account</li><li>Free and open source</li></ul>
    </div>
  </div>
</section>

${trailer}<section class="band" id="screens" aria-labelledby="screens-title">
  <div class="shell">
    ${eyebrow('On the screen', 3)}
    <h2 id="screens-title">Made to read at a glance</h2>
    <p class="lede">A landscape dashboard with big targets, dark by default and as calm as its map. Every page is a tap away along the bottom, and the title bar keeps the time and the battery in view.</p>
    <div class="screens">
      ${c.screens.map((s, i) => screen(s, i === 0 ? 'lead' : '')).join('\n      ')}
    </div>
  </div>
</section>

<section class="band alt" aria-labelledby="features-title">
  <div class="shell">
    ${eyebrow('What it does', 5)}
    <h2 id="features-title">Everything the car needs, on one phone</h2>
    <ul class="features">
      ${c.features.map(f => `<li class="card feature" id="${esc(f.id)}">${icon(f.id, 'ic tile')}<h3>${esc(f.name)}</h3><p>${esc(f.text)}</p>${f.link ? `<p><a href="/${esc(f.link)}">More about ${esc(f.name)} &rarr;</a></p>` : ''}</li>`).join('\n      ')}
    </ul>
  </div>
</section>

<section class="band" aria-labelledby="old-title">
  <div class="shell split">
    <div>
      ${eyebrow('Old phones welcome', 6)}
      <h2 id="old-title">The phone in the drawer is a dashboard</h2>
      <p>Coldshift Dash was first built for a Huawei Ascend G7 from 2014, and it still runs on one. There are two builds from one source: one for Android 4.4, and one for Android 6 up to the newest.</p>
      <p>Nothing needs the internet. The map, the routes, the search, the music and the voice prompts are all on the phone's card, and the dashcam, the log book and the track times stay there too.</p>
      <p class="actions">${button('/download/', 'Which one is mine?', 'ghost')}</p>
    </div>
    <ul class="builds-mini">
      ${dl.apks.map(a => `<li class="card">${icon('phone', 'ic tile')}<div><h3>${esc(a.name)}</h3><p class="meta">${esc(a.detail)}</p><p class="mono small">${esc(a.file)}</p></div></li>`).join('\n      ')}
    </ul>
  </div>
</section>

<section class="band alt convoy-band" aria-labelledby="convoy-title">
  <div class="shell split">
    <div>
      ${eyebrow('Convoy', 7)}
      <h2 id="convoy-title">Drive together, stay together</h2>
      <p>Cars in a convoy see each other on the map, how far ahead or behind and how fast. Send a quick message with one tap, or hold Talk and say it. Friends join by scanning a QR code; anyone following along watches in a browser. It runs on a relay of your own, or on one phone with no internet at all.</p>
      <p class="actions">${button('/convoy/', 'How Convoy works')}${button(c.convoy.guide, 'Run your own relay', 'ghost')}</p>
    </div>
    <ul class="points">
      <li>${icon('convoy', 'ic tile')}<div><b>Every car on one map</b><span>Positions, speed and heading, live.</span></div></li>
      <li>${icon('mic', 'ic tile')}<div><b>Push to talk</b><span>Voice notes play as they arrive, with the music paused.</span></div></li>
      <li>${icon('wifi', 'ic tile')}<div><b>No signal? No problem</b><span>One phone hosts, the others join its hotspot.</span></div></li>
    </ul>
  </div>
</section>

<section class="band" aria-labelledby="open-title">
  <div class="shell split">
    <div>
      ${eyebrow('Open source', 8)}
      <h2 id="open-title">Yours to read, change and run</h2>
      <p>The app, the desktop companion and the Convoy host are open source under the MIT licence. Build them yourself, run your own Convoy host, or make the dash your car's own.</p>
      <p class="actions">${button('/source/', 'The source')}</p>
    </div>
    <ul class="points">
      <li>${icon('code', 'ic tile')}<div><b>${esc(repoName(c.repos.app))}</b><span>The Android app.</span></div></li>
      <li>${icon('code', 'ic tile')}<div><b>${esc(repoName(c.repos.desktop))}</b><span>The desktop companion.</span></div></li>
      <li>${icon('cloud', 'ic tile')}<div><b>${esc(repoName(c.repos.convoy))}</b><span>The Convoy host, for Cloudflare or your own computer.</span></div></li>
    </ul>
  </div>
</section>`;

// ---- Download

// The Android card: the APKs from GitHub, each with its file, size and sha256 (from
// content.json, once filled in) and how to install it, or "Coming soon" until the release is up.
const apk = a => `<li class="apk${apkUrl(a) ? '' : ' soon'}" id="${esc(a.id)}">
          <h4>${esc(a.name)}</h4>
          <p class="meta">${esc(a.detail)}</p>
          ${apkUrl(a)
            ? `<p>${ext(apkUrl(a), `Download${a.size ? ` (${esc(a.size)})` : ''}`, 'button small ghost')}</p>
          <p class="mono small">${esc(a.file)}${a.sha256 ? `<br>SHA-256 ${esc(a.sha256)}` : ''}</p>`
            : `<!-- PLACEHOLDER: download "${esc(a.id)}" --><p class="tag">Coming soon</p>
          <p class="mono small dim">${esc(a.file)}</p>`}
          ${a.note ? `<p class="small">${esc(a.note)}</p>` : ''}
          ${a.steps?.length ? `<details><summary>How to install</summary><ol class="steps">${a.steps.map(t => `<li>${esc(t)}</li>`).join('')}</ol></details>` : ''}
        </li>`;

const download = `<div class="shell page">
  ${heading('Download', 9, 'Get Coldshift Dash', `Free, with no ads and no account${dl.version ? `: version ${esc(dl.version)}` : ''}, for Android phones from 4.4 KitKat to the newest.`)}
  <section class="card build android${anyLive ? '' : ' soon'}" id="android" aria-labelledby="android-title">
    <div class="android-head">
      ${icon('phone', 'device')}
      <div><h2 id="android-title">Android</h2><p class="meta">Android 4.4 and later</p></div>
    </div>
    <ul class="apks">
        ${dl.apks.map(apk).join('\n        ')}
    </ul>
    <p class="small dim">${dl.published ? `${ext(dl.latest, 'Release notes')} &middot; ${ext(`${dl.latest}/download/SHA256SUMS`, 'SHA256SUMS')} &middot; ` : ''}${ext(dl.releases, 'Every release')} on GitHub. Android's Settings, About phone shows your version. Both are signed with the project's key, whose certificate's SHA-256 is <span class="mono">${esc(c.releaseKey)}</span>: an APK signed with anything else isn't ours.</p>
  </section>
  <section class="card build desktop${dk.published ? '' : ' soon'}" id="desktop" aria-labelledby="desktop-title">
    <div class="android-head">
      ${icon('code', 'device')}
      <div><h2 id="desktop-title">The desktop companion</h2><p class="meta">${esc(dk.name)}: ${esc(dk.detail)}</p></div>
    </div>
    <p>${esc(dk.note)}</p>
    ${dk.published
      ? `<p>${ext(dk.latest, 'Download for Mac', 'button small ghost')}</p>`
      : '<!-- PLACEHOLDER: download "desktop" --><p class="tag">Coming soon</p>'}
    <details><summary>How to install</summary><ol class="steps">${dk.steps.map(t => `<li>${esc(t)}</li>`).join('')}</ol></details>
    <p class="small dim">${ext(dk.releases, 'Every release')} on GitHub, signed with TFINN's Apple Developer ID and notarised by Apple. ${ext(c.repos.desktop, 'Its source')}.</p>
  </section>
</div>`;

// ---- Convoy

const convoy = `<div class="shell page">
  ${heading('Convoy', 7, 'Drive together, stay together', 'Cars driving together see each other on the map and talk to each other, through a relay you run yourself, or through one of the phones. No accounts: a convoy is a link, and a password if you give it one.')}
  <ul class="features three">
    <li class="card feature">${icon('convoy', 'ic tile')}<h3>Each other on the map</h3><p>The others' cars, drawn as their own pictures and turned the way they're going, with their names. The Convoy page lists who's ahead and who's behind, how far, how fast, and who has dropped out.</p></li>
    <li class="card feature">${icon('chat', 'ic tile')}<h3>Messages at a tap</h3><p>Six quick ones (Stopping for fuel, Pull over, All good, Wait for me, Slow down, Take the lead), or type one when you've stopped. A message to one car keeps the shared feed tidy.</p></li>
    <li class="card feature">${icon('mic', 'ic tile')}<h3>Push to talk</h3><p>Hold Talk and speak; let go to send. Voice notes play as they arrive, one after another, with the music paused. Nothing said is lost on a bad connection: it goes when the signal comes back.</p></li>
  </ul>

  <section aria-labelledby="hosts-title">
    <h2 id="hosts-title">Where it runs</h2>
    <p class="lede">The app comes with no host of its own: a convoy runs on a relay you choose, or on one of the phones.</p>
    <ul class="features">
      <li class="card feature" id="own">${icon('cloud', 'ic tile')}<h3>Run your own relay</h3><p>Put a relay on Cloudflare's free plan, for your club, your friends or just your cars. Give it a start key, so only the phones you give the key to can start convoys on it; joining one needs only its QR code or link, and its password.</p><p class="actions">${ext(c.convoy.guide, 'Run your own relay', 'button small')}${ext(c.repos.convoy, 'The relay\'s source', 'button small ghost')}</p></li>
      <li class="card feature" id="nearby">${icon('wifi', 'ic tile')}<h3>Host on this phone</h3><p>Out of signal, or with no relay at all, one phone hosts the convoy itself: choose <b>Host on this phone</b> and start one. The others join its hotspot or the same Wi-Fi and find it under <b>Convoys nearby</b>, with no code. On a local network the connection is plain HTTP, readable by anyone on that network.</p></li>
    </ul>
  </section>

  <section class="split" aria-labelledby="start-title">
    <div>
      <h2 id="start-title">Starting one</h2>
      <ol class="how">
        <li><b>1</b><p>On the Convoy page, choose <b>Change host</b> and type your relay's address. When it wants a start key, the app asks for it once and keeps it. No key is ever built into the app.</p></li>
        <li><b>2</b><p>Choose <b>Start a convoy</b>, give it a name and, better, a password.</p></li>
        <li><b>3</b><p>The others choose <b>Scan to join</b> and point their phone at your screen's QR code.</p></li>
        <li><b>4</b><p>Anyone following along, at home or in the support car, opens the convoy's link in a browser: a live map, the messages and the voice notes.</p></li>
        <li><b>5</b><p>When the drive is done, <b>End for everyone</b>. Or just leave it: it ends by itself after ${keep.idleHours} hours with no one in it.</p></li>
      </ol>
    </div>
    <div class="card">${icon('qr', 'ic tile')}<h3>What keeps it private</h3><p>The convoy's link is unguessable, and knowing it is what lets you in. The password is a second lock, so a link passed on isn't enough, and the start key keeps strangers from starting convoys on your relay. Messages, private ones too, aren't end-to-end encrypted: the relay passes them on, and can read them. The <a href="/privacy/#convoy">privacy policy</a> says what's kept, and for how long.</p></div>
  </section>
</div>`;

// ---- Source

const source = `<div class="shell page">
  ${heading('Source', 8, 'Open source, MIT', 'Every part of Coldshift Dash is open source under the MIT licence: use it, change it, share it, sell it, as long as the licence and its copyright notice go with it. It comes with no warranty.')}
  <ul class="repos">
    <li class="card repo">${icon('code', 'ic tile')}<div><h2>${ext(c.repos.app, esc(repoName(c.repos.app)))}</h2><p>The Android app, in plain Java with no Gradle: <span class="mono">build.sh</span> makes both APKs from one source. How to build it is in its README.</p><p class="actions">${button(c.repos.app, 'On GitHub', 'ghost')}</p></div></li>
    <li class="card repo">${icon('code', 'ic tile')}<div><h2>${ext(c.repos.desktop, esc(repoName(c.repos.desktop)))}</h2><p>The desktop companion, in Python with Qt: the map, music, the car's look and convoys onto the phone, backups off it. Its README covers running it from source and building the signed Mac app.</p><p class="actions">${button(c.repos.desktop, 'On GitHub', 'ghost')}</p></div></li>
    <li class="card repo">${icon('cloud', 'ic tile')}<div><h2>${ext(c.repos.convoy, esc(repoName(c.repos.convoy)))}</h2><p>The Convoy host: the protocol, a Cloudflare Worker, a Python host for laptops and local networks, the page where convoys are followed in a browser, and the tests every host passes. Its guide covers running your own securely.</p><p class="actions">${button(c.repos.convoy, 'On GitHub', 'ghost')}</p></div></li>
  </ul>
  <section class="split" aria-labelledby="licence-title">
    <div>
      <h2 id="licence-title">The licence</h2>
      <p>MIT, copyright ${esc(c.contact.company)}. The libraries the app uses keep their own licences, listed on the <a href="/credits/">credits</a> page and in each repository's NOTICE file. Map data is &copy; OpenStreetMap contributors, under the ODbL.</p>
    </div>
    <div class="card">
      <h3>Found a bug?</h3>
      <p>Open an issue on the repository it's in, or email ${mail} with your phone, its Android version and what happened.</p>
    </div>
  </section>
</div>`;

// ---- Support

const faq = [
  ['Which download is mine?', 'On Android 6 or later, <span class="mono">dash-modern.apk</span>; on Android 4.4, <span class="mono">dash-legacy.apk</span>. On a Mac, the desktop companion too, to put maps and music on the phone. The <a href="/download/">Download</a> page has them all.'],
  ['The map is empty.', 'The maps aren\'t in the app: it draws Mapsforge maps (a <span class="mono">.map</span> file for your region, from download.mapsforge.org) from the <span class="mono">maps</span> folder in its <span class="mono">coldshift.dash</span> folder on the phone\'s card.'],
  ['Which OBD2 adapters work?', 'ELM327-style Bluetooth adapters, Classic or Bluetooth LE. Pair it with the phone, then Settings, Devices: choose it for Engine and press Test.'],
  ['Which convoy host do I use?', `The app has none built in. <a href="/convoy/#own">Run your own relay</a> on Cloudflare's free plan and choose it on the Convoy page (Change host), or choose <b>Host on this phone</b> and have the others join its hotspot. A relay with a start key asks for it when you start a convoy; joining needs only the QR code or link, and the password.`],
  ['Is anything sent anywhere?', 'Only what you send in a convoy, and only to the convoy host you choose. Everything else stays on the phone. The <a href="/privacy/">privacy policy</a> has the details.'],
];
const support = `<div class="shell page">
  ${heading('Support', 2, 'Help on the road', 'The questions people ask most, and how to reach us when something goes wrong.')}
  <div class="support-row">
    <div class="faq">${faq.map(([q, a], i) => `<details class="card"${i ? '' : ' open'}><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
    <aside class="card help">
      <h2>Something wrong?</h2>
      <p>Email ${mail} with your phone's model, its Android version, which download you have and what happened. A screenshot helps.</p>
      <p>Bugs and ideas are welcome on ${ext(c.repos.app, 'GitHub')} too.</p>
    </aside>
  </div>
</div>`;

// ---- Privacy (keep it in step with the app)

const privacy = `<div class="shell page narrow prose">
  ${heading('Privacy', 1, 'Privacy policy', `Effective ${esc(c.contact.effective)}; updated ${esc(c.contact.updated)}.`)}
  <p>Coldshift Dash is made by ${esc(c.contact.company)} (${esc(c.contact.studio)}), in South Africa, which is responsible for this policy. It covers the Coldshift Dash app, its desktop companion and this website.</p>
  <h2 id="short">In short</h2>
  <ul>
    <li>No accounts, no ads, no analytics and no tracking.</li>
    <li>Your location, the camera and the microphone are used on the phone, and what they record stays on the phone.</li>
    <li>Only when you're in a convoy does anything leave it: your position, name, car picture, messages and voice notes, to the convoy host you chose, and nowhere else.</li>
  </ul>
  <h2 id="app">The app</h2>
  <p>The app keeps everything it makes on your phone: settings, places, the log book, track times, dashcam clips and recordings. It sends none of it to us or anyone else. Its permissions are used like this:</p>
  <ul>
    <li><b>Location</b>: for the map, navigation, the log book's trips, track timing and the dashcam's speed and position. It's kept only on the phone, and leaves it only as your position in a convoy.</li>
    <li><b>Camera</b>: for the dashcam and the interior photo, and to scan a convoy's QR code. Clips and photos are saved on the phone.</li>
    <li><b>Microphone</b>: for voice notes in a convoy (sent only when you send one), the dashcam's sound if you turn it on, and the sound recorder. Recordings are saved on the phone.</li>
    <li><b>Bluetooth</b>: to read the engine through an OBD2 adapter, and other devices you choose. The readings stay on the phone.</li>
    <li><b>Files</b>: to read the maps, music and settings in its <span class="mono">coldshift.dash</span> folder on the phone's card.</li>
    <li><b>Notifications</b>: for the music and the services that keep running while you drive.</li>
  </ul>
  <p>The app connects to the internet only for Convoy. Maps, routes, search and voice prompts all work from the phone.</p>
  <h2 id="convoy">Convoy</h2>
  <p>When you start or join a convoy, the app sends the convoy host you chose: your position, speed and heading while you're in it, the name you give, your car's picture, and the messages and voice notes you send. The host passes them to the others in that convoy, and to anyone who opens its link and knows its password.</p>
  <ul>
    <li><b>The host is yours to choose.</b> The app has no host built in and sends nothing until you choose one: a relay you or someone you trust runs, or a phone in the convoy. Whoever runs the relay is responsible for what it keeps; we don't run a public one, and don't receive what you send.</li>
    <li><b>What the relay keeps</b>, as ${ext(c.repos.convoy, 'coldshift-dash-convoy')} is made: positions only in memory while you're connected. The convoy's name, its members' names and car pictures, its latest ${keep.messages} messages and latest ${keep.voiceNotes} voice notes are kept until the convoy ends: when its starter ends it, or after ${keep.idleHours} hours with no one connected. Then all of it is deleted. Your IP address is used to limit how many convoys are started and wrong passwords tried from one address.</li>
    <li><b>Encryption</b>: the connection to a relay on the internet is encrypted (TLS), but messages aren't end-to-end encrypted: the relay, and the service it runs on (such as Cloudflare), can read what passes through. Private messages to one car are kept from the other cars, not from the relay.</li>
    <li><b>Hosts on a local network</b> (a phone hosting with no internet, or a computer on the same Wi-Fi) use plain HTTP: anyone on that network could read what's sent.</li>
    <li><b>Following in a browser</b>: the convoy's web page draws its map with tiles from OpenFreeMap, which sees an ordinary request from your browser.</li>
  </ul>
  <h2 id="website">This website</h2>
  <p>No cookies, no analytics and no third-party requests until you press play on the trailer: the pictures are served from here, and the downloads come from GitHub, when you choose one. The trailer shows our own picture until it's pressed; then YouTube's privacy-enhanced player loads from youtube-nocookie.com, under YouTube's privacy policy (without JavaScript, the trailer is a link to YouTube). The site is hosted on Cloudflare, whose servers handle each request (including your IP address) to deliver the page, under Cloudflare's privacy policy.</p>
  <h2 id="deleting">Deleting your data</h2>
  <p>There's no account, and nothing about you on our servers. To delete what the app keeps, use Android's Clear storage for the app, or uninstall it; the maps and music you put in its <span class="mono">coldshift.dash</span> folder on the card stay until you delete them. A convoy is deleted from its relay when it ends.</p>
  <h2 id="children">Children</h2>
  <p>Coldshift Dash is made for drivers and isn't directed at children. It collects nothing from anyone.</p>
  <h2 id="contact">Contact</h2>
  <p>Questions about this policy: ${mail}. If it changes, the new version is posted here with its date.</p>
</div>`;

// ---- Credits

const credits = `<div class="shell page narrow">
  ${heading('Credits', 5, `A ${esc(c.contact.studio)} production`)}
  <p>App, Convoy and website by ${esc(c.contact.studio)} (${esc(c.contact.company)}), made in Knysna and tested on the Garden Route's roads in two cars. ${ext(c.contact.studioUrl, esc(c.contact.studioUrl.replace(/^https:\/\//, '')))} / ${mail}</p>
  <p>The app's art and its built-in voice, Angie, are ${esc(c.contact.studio)}'s own, made with generative tools. The app stands on these:</p>
  <ul class="credits">
    ${c.credits.map(cr => `<li><b>${ext(cr.url, esc(cr.name))}</b><span>${esc(cr.what)}</span></li>`).join('\n    ')}
  </ul>
  <p class="small">Map data &copy; OpenStreetMap contributors, available under the Open Database Licence. The full licence texts are in each repository's NOTICE file.</p>
</div>`;

const notFound = `<div class="shell page narrow lost">
  ${heading('Rerouting', 9, 'Wrong turn', 'This page isn\'t on the map. Turn around when possible.')}
  <p class="actions">${button('/', 'Back to the start')}${button('/download/', 'Download', 'ghost')}</p>
</div>`;

// ---- Write

const pages = [
  ['', { description: c.site.description, body: home }],
  ['download/', { title: 'Download', description: 'Get Coldshift Dash for Android, as an APK for Android 6 and later or Android 4.4, and its desktop companion for the Mac.', body: download }],
  ['convoy/', { title: 'Convoy', description: 'Convoy: cars driving together see each other on the map, with quick messages and push-to-talk voice notes. No accounts; run your own host if you like.', body: convoy }],
  ['source/', { title: 'Source', description: 'Coldshift Dash is open source under the MIT licence: the Android app, the desktop companion and the Convoy host.', body: source }],
  ['support/', { title: 'Support', description: 'Help with Coldshift Dash: which download, maps, OBD2 adapters, Convoy, and how to reach us.', body: support }],
  ['privacy/', { title: 'Privacy', description: 'Coldshift Dash keeps your location, camera and microphone on the phone. No accounts or analytics; Convoy sends only to the host you choose.', body: privacy }],
  ['credits/', { title: 'Credits', description: 'Who and what made Coldshift Dash, and the open-source libraries it uses.', body: credits }],
];

await rm('dist', { recursive: true, force: true });
await cp('public', 'dist', { recursive: true });
for (const [route, page] of pages) {
  await mkdir(path.join('dist', route), { recursive: true });
  await writeFile(path.join('dist', route, 'index.html'), layout(route, page));
}
await writeFile('dist/404.html', layout('404.html', { title: 'Wrong turn', description: 'This page is not on the map.', body: notFound, noindex: true }));
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.filter(([, p]) => !p.noindex).map(([r]) => `  <url><loc>${c.site.url}/${r}</loc></url>`).join('\n')}\n</urlset>\n`);
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${c.site.url}/sitemap.xml\n`);
const waiting = [...(dk.published ? [] : ['download desktop']), ...dl.apks.filter(a => !apkUrl(a)).map(a => `download ${a.id}`), ...c.screens.filter(s => !s.src).map(s => `screenshot ${s.id}`)];
console.log(`Built ${pages.length + 1} pages into dist/.${waiting.length ? ` Placeholders still waiting on content: ${waiting.join(', ')}.` : ''}`);

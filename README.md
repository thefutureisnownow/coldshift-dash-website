# Coldshift Dash website

The app's site, https://dash.coldshift.racing: a static site in the dash's own look (the Quiet map's charcoal and greys, the app's navy panels with their thin blue edge, its blue accent and gold highlight, and the dash logo's shift lights as section labels), light or dark by the browser's setting.

Requires Node.js 22 or later. No dependencies.

```sh
npm run dev      # builds, then serves dist/ at http://127.0.0.1:4174
npm run build    # renders every page into dist/, and lists the placeholders still waiting on content
npm run check    # every local link and image resolves; every page has metadata; nothing breaks the CSP; no file over 25 MiB; the download addresses and checksums are well formed
```

## Pages

- `/`: the Quiet map behind the logo and the pitch; the screens (in phones held sideways); what it does; old phones and the two builds; Convoy; open source.
- `/download/`: one Android card with `dash-modern.apk` (Android 6 and later) and `dash-legacy.apk` (Android 4.4) from coldshift-dash's latest GitHub release, each with its file, size and sha256 and how to install it, and links to the release notes and `SHA256SUMS`. One line says a desktop companion is coming; the desktop app is otherwise left off the site for now.
- `/convoy/`: what Convoy is, where it runs (a relay of your own on Cloudflare's free plan, from `thefutureisnownow/coldshift-dash-convoy`'s guide, or a phone hosting with no internet) and how to start one. There's no public host: the app has none built in.
- `/source/`: the two repositories (the Android app; Convoy), MIT.
- `/privacy/`: the privacy policy. Keep it in step with the app.
- `/support/`, `/credits/`, `404.html`, `sitemap.xml`, `robots.txt`.

The pages are templates in `scripts/build.mjs`, with a `layout()` they share; the styles are `public/styles.css`. There's no JavaScript.

## Content

- `src/content.json`: the copy: the pitch, the screens' captions (and pictures), the features, the downloads, the relay guide's address and what a relay keeps (`convoy.guide`, `convoy.keep`, used by the Convoy and privacy pages), the studio's details and the credits.
- `src/quiet-map.svg`: a made-up stretch of coast in the app's Quiet map theme (`android/car/assets/maptheme/quiet.xml` in the app), inlined in the home page's hero and coloured by the page's theme. Its own style block is the dark version, for tools that draw it without the page.
- `public/assets/brand/`: the dash logo as SVG (`logo.svg`, cropped to the art, and `icon.svg`, square), from `scripts/brand-logo.mjs`, which draws it as the app's `gen_dash_brand.py` does (the coldshift tile, then nine shift lights); the PNG icons and the share picture `og.png`, from `scripts/brand-icons.py` (PySide6).
- `public/assets/studio/tfinn.webp`: the TFINN logo in the footer, as on coldshift.racing.

### Placeholders

`npm run build` and `npm run check` list what's still waiting:

- **Screenshots**: each of `screens` in content.json shows a marked "Screenshot to come" frame until it has a `src`. Put a 1280 x 720 picture in `public/assets/screens/` (webp, from a phone running a demo profile: no car makers' badges, no album covers, no map of anyone's home) and set `src` to `assets/screens/<name>.webp`.
- **Downloads** (`downloads` in content.json): the APKs come from GitHub Releases, never from files on Pages. coldshift-dash's `tools/release.sh --upload` attaches `dash-legacy.apk`, `dash-modern.apk` and a `SHA256SUMS` to each release, and the cards link to `https://github.com/thefutureisnownow/coldshift-dash/releases/latest/download/<file>`.
  - `desktop`: the desktop companion's card, linking to coldshift-dash-desktop's latest release (its `.dmg`); set its `published` to `true` once the first one is up.
  - `published`: set it to `true` once the first release with both APKs is up. Until then each APK says "Coming soon".
  - `apks[].size` and `apks[].sha256`: copy them from the release (`SHA256SUMS`) when it's made; each shows once filled in. `version`: the release's version.

### Desktop screenshots

`desktopScreens` in content.json: the desktop companion's Overview, Maps, Music and Look pages, in `public/assets/desktop/` at 1600 px wide. `scripts/capture-desktop.py` takes them from the desktop app run against a throwaway setup (its own `HOME`, `DASHSYNC_CONFIG` and `DASHSYNC_CACHE`), with demo vehicles and demo music, so no real car, phone or place appears.

## Privacy

No cookies, analytics, tracking or third-party requests: the pictures are served from here, and the fonts are the system's. `public/_headers` sets a Content-Security-Policy that allows only this site's own files (and `check` fails on a page that would need more), so a Cloudflare feature that injects a script from elsewhere is blocked rather than tracking anyone.

## Hosting

https://dash.coldshift.racing is served by Cloudflare from the built site's files (a Worker with static assets,
`wrangler.jsonc`), deployed with wrangler; nothing deploys from GitHub:

    npm run deploy      # builds, checks, and puts dist/ live on dash.coldshift.racing

The custom domain is in `wrangler.jsonc` (`routes`), so every deploy keeps it; the workers.dev address is off.
Workers Logs are off too, so the site keeps no record of its visitors.

GitHub Actions (`.github/workflows/check.yml`) builds and checks every push and pull request.

## Licence

MIT (`LICENSE`), for the code. The Coldshift and TFINN logos and the app's art are TFINN's and aren't covered by it.

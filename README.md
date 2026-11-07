# Coldshift Dash website

The app's site, https://dash.coldshift.racing: a static site in the dash's own look (the Quiet map's charcoal and greys, the app's navy panels with their thin blue edge, its blue accent and gold highlight, and the dash logo's shift lights as section labels), light or dark by the browser's setting. Built like the game sites (coldshift.racing, snoekem.co.za).

Requires Node.js 22 or later. No dependencies.

```sh
npm run dev      # builds, then serves dist/ at http://127.0.0.1:4174
npm run build    # renders every page into dist/, and lists the placeholders still waiting on content
npm run check    # every local link and image resolves; every page has metadata; nothing breaks the CSP; no file over 25 MiB; every download with a url has its size and sha256
```

## Pages

- `/`: the Quiet map behind the logo and the pitch; the screens (in phones held sideways); what it does; old phones and the two builds; the desktop tool; Convoy; open source.
- `/download/`: Google Play, `dash-modern.apk` (Android 6 and later), `dash-legacy.apk` (Android 4.4) and the desktop tool for Mac, Windows and Linux, each card in coldshift.racing's `buildCard` shape: "Coming soon" until it has a `url`, then its file, size and sha256.
- `/convoy/`: what Convoy is, how to start one, and where it runs: our host (`https://convoy.coldshift.racing`), your own (`stained/coldshift-dash-convoy`), or a phone with no internet.
- `/source/`: the two repositories, MIT.
- `/privacy/`: the privacy policy, also the Google Play listing's. Keep it in step with the app and Play's Data safety form.
- `/support/`, `/credits/`, `404.html`, `sitemap.xml`, `robots.txt`.

The pages are templates in `scripts/build.mjs`, with a `layout()` they share; the styles are `public/styles.css`. There's no JavaScript.

## Content

- `src/content.json`: the copy: the pitch, the screens' captions (and pictures), the features, the desktop tool's jobs, the downloads, Convoy's host and what it keeps (`convoy.keep`, used by the Convoy and privacy pages), the studio's details and the credits.
- `src/quiet-map.svg`: a made-up stretch of coast in the app's Quiet map theme (`android/car/assets/maptheme/quiet.xml` in the app), inlined in the home page's hero and coloured by the page's theme. Its own style block is the dark version, for tools that draw it without the page.
- `public/assets/brand/`: the dash logo as SVG (`logo.svg`, cropped to the art, and `icon.svg`, square), from `scripts/brand-logo.mjs`, which draws it as the app's `gen_dash_brand.py` does (the coldshift tile, then nine shift lights); the PNG icons and the share picture `og.png`, from `scripts/brand-icons.py` (PySide6).
- `public/assets/studio/tfinn.webp`: the TFINN logo in the footer, as on coldshift.racing.

### Placeholders

`npm run build` and `npm run check` list what's still waiting:

- **Screenshots**: each of `screens` in content.json shows a marked "Screenshot to come" frame until it has a `src`. Put a 1280 x 720 picture in `public/assets/screens/` (webp, from a phone running a demo profile: no car makers' badges, no album covers, no map of anyone's home) and set `src` to `assets/screens/<name>.webp`.
- **Downloads**: each of `downloads.builds` is "Coming soon" until it has a `url`:
  - **Google Play**: the store link, once the listing is live.
  - **An APK served here**: put it in `public/downloads/` and set `url` to `/downloads/dash-modern.apk`. The build works out its size and sha256 (a `sha256` given in content.json must match). Cloudflare Pages takes files up to 25 MiB.
  - **One hosted elsewhere** (a GitHub release: `https://github.com/stained/coldshift-dash/releases/latest/download/<file>`): give its `file`, `size` and `sha256` too; `check` fails without them.
  - Set `downloads.version` when there's a release.

## Privacy

No cookies, analytics, tracking or third-party requests: the pictures are served from here, and the fonts are the system's. `public/_headers` sets a Content-Security-Policy that allows only this site's own files (and `check` fails on a page that would need more), so a Cloudflare feature that injects a script from elsewhere is blocked rather than tracking anyone.

## Cloudflare Pages (not set up yet)

To publish, as with coldshift.racing:

- A Pages project connected to this repository through its Git integration, so every push to `main` goes live.
- Production branch `main`; framework preset None; build command `npm run build`; output directory `dist`; environment variable `NODE_VERSION` = `22`.
- Custom domain `dash.coldshift.racing` (a proxied CNAME in the coldshift.racing zone).

GitHub Actions (`.github/workflows/check.yml`) builds and checks every push and pull request.

## Licence

MIT (`LICENSE`), for the code. The Coldshift and TFINN logos and the app's art are TFINN's and aren't covered by it.

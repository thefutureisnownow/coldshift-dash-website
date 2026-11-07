// The dash logo as SVG, drawn as the app's gen_dash_brand.py draws its PNG: the coldshift tile (brand/coldshift-logo.svg
// in the app's repository) with a row of shift lights. Writes the square icon and the logo cropped to the art:
//   node scripts/brand-logo.mjs <coldshift-logo.svg> public/assets/brand/icon.svg public/assets/brand/logo.svg
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync(process.argv[2], 'utf8');
const inner = src.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
const N = 1024, scale = N / 520 * 0.86;
const tileW = 380 * scale, tileH = 391 * scale;
const ledW = N * 0.058, ledH = N * 0.044, gap = N * 0.015, count = 9, pad = ledH * 0.55, barH = ledH + 2 * pad;
const top = (N - (tileH + N * 0.035 + barH)) / 2;
const rowW = count * ledW + (count - 1) * gap, barW = rowW + 2 * pad * 1.6, barTop = top + tileH + N * 0.035, x0 = (N - rowW) / 2;
const f = n => +n.toFixed(2);
const leds = Array.from({ length: count }, (_, i) => `<rect x="${f(x0 + i * (ledW + gap))}" y="${f(barTop + pad)}" width="${f(ledW)}" height="${f(ledH)}" rx="${f(ledH / 2.6)}" fill="${i < 5 ? '#fdfdfd' : '#ff0000'}"/>`).join('');
const body = `<g transform="translate(${f((N - tileW) / 2 - 70 * scale)} ${f(top - 64 * scale)}) scale(${f(scale * 1e4) / 1e4})">${inner}</g><rect x="${f((N - barW) / 2)}" y="${f(barTop)}" width="${f(barW)}" height="${f(barH)}" rx="${f(barH / 2.4)}"/>${leds}`;
// square, for the icon; and cropped to the art, for the header
writeFileSync(process.argv[3], `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" width="${N}" height="${N}">${body}</svg>\n`);
const l = f((N - barW) / 2 - 4), t = f(top - 4), w = f(barW + 8), h = f(barTop + barH - top + 8);
writeFileSync(process.argv[4], `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${l} ${t} ${w} ${h}" width="${w}" height="${h}">${body}</svg>\n`);
console.log('tight', w, h);

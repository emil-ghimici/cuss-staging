// Open Graph images (design spec section 7): one 1200×630 PNG per page, generated at build time from the same
// SVG system as the site (night-city colours, street line art, CREW). Text is turned into outlines with fontkit
// from the self-hosted fonts, so resvg needs no fonts and the result is the same on every machine.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as fontkit from 'fontkit';
import { Resvg } from '@resvg/resvg-js';

const FS = 'node_modules/@fontsource';
let fonts = null;
function loadFonts() {
  if (fonts) return fonts;
  fonts = {
    display: fontkit.openSync(`${FS}/chakra-petch/files/chakra-petch-latin-600-normal.woff`),
    sans: fontkit.openSync(`${FS}/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-700-normal.woff`),
    mono: fontkit.openSync(`${FS}/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff`),
  };
  return fonts;
}
const C = { bg: '#0b0f14', s2: '#1a2230', ink: '#e8edf2', muted: '#9fb0c0', signal: '#3ee6e0', amber: '#ffb547', hazard: '#c6ff3d', divider: '#2a3442', contact: '#ff4fa3' };

function width(font, text, size) { return font.layout(text).advanceWidth * size / font.unitsPerEm; }
// Text as SVG paths, left-aligned at (x, baseline y)
function textPath(font, text, size, x, y, fill, tracking = 0) {
  const run = font.layout(text), k = size / font.unitsPerEm;
  let cx = x, d = '';
  run.glyphs.forEach((g, i) => {
    const p = run.positions[i];
    const gp = g.path.scale(k, -k).translate(cx + p.xOffset * k, y - p.yOffset * k);
    d += gp.toSVG();
    cx += p.xAdvance * k + tracking;
  });
  return `<path d="${d}" fill="${fill}"/>`;
}
function wrap(font, text, size, max) {
  const words = text.split(/\s+/), lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (width(font, t, size) > max && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function crewSvg() {
  // The site's CREW drawing, with the eye coloured for the night theme
  return fs.readFileSync('src/_includes/svg/crew.njk', 'utf8')
    .replace(/<svg[^>]*>/, '').replace('</svg>', '')
    .replace('class="eye"', `fill="${C.signal}"`)
    .replace(/<g class="mug">[\s\S]*?<\/g><\/g>/, '</g>');
}

export function ogSvg({ title, eyebrow }) {
  const f = loadFonts();
  let size = 76, lines = wrap(f.display, title, size, 760);
  while (lines.length > 3 && size > 52) { size -= 6; lines = wrap(f.display, title, size, 760); }
  const lh = size * 1.1, top = 315 - (lines.length * lh) / 2 + size * 0.8;
  const titleSvg = lines.map((l, i) => textPath(f.display, l, size, 80, top + i * lh, C.ink, size * 0.01)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${C.bg}"/>
<path d="M0 520V420h90V360h80v100h60V330h120v190M820 520V380h90v-60h70v80h80V300h140v220" fill="none" stroke="${C.divider}" stroke-width="3"/>
<path d="M0 60Q300 160 620 70T1200 90" fill="none" stroke="${C.muted}" stroke-opacity=".35" stroke-width="3"/>
<path d="M930 150h200" stroke="${C.signal}" stroke-width="6" stroke-linecap="round"/>
<path d="M950 130v20M1110 130v20" stroke="${C.divider}" stroke-width="3"/>
<path d="M0 520h1200" stroke="${C.divider}" stroke-width="3"/>
<rect x="0" y="590" width="1200" height="40" fill="${C.hazard}"/>
<path d="${Array.from({ length: 40 }, (_, i) => `M${i * 36 - 20} 630l24-40h18l-24 40z`).join('')}" fill="${C.bg}"/>
<rect x="80" y="74" width="20" height="20" fill="${C.signal}"/>
${textPath(f.display, 'CuSS', 40, 114, 98, C.ink)}
${textPath(f.mono, eyebrow.toUpperCase(), 22, 80, 168, C.muted, 1.2)}
${titleSvg}
<g transform="translate(965 300) scale(2.6)">${crewSvg()}</g>
</svg>`;
}

// Renders every page's image after the build; skips images whose title hasn't changed.
const CACHE = 'node_modules/.cache/cuss-og';   // what each image was made from (kept out of the site)
export async function writeOgImages(outDir, pages) {
  const dir = path.join(outDir, 'assets', 'og');
  fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(CACHE, { recursive: true });
  for (const p of pages) {
    const svg = ogSvg(p);
    const hash = crypto.createHash('sha1').update(svg).digest('hex').slice(0, 10);
    const file = path.join(dir, `${p.slug}.png`), stamp = path.join(CACHE, `${p.slug}.hash`);
    if (fs.existsSync(file) && fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === hash) continue;
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
    fs.writeFileSync(file, png);
    fs.writeFileSync(stamp, hash);
  }
}
export function ogSlug(url) {
  const s = String(url).replace(/^\/|\/$/g, '').replace(/\.html$/, '').replace(/\//g, '-');
  return s || 'home';
}

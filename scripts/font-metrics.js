// Works out fallback-font overrides (size-adjust, ascent/descent/line-gap) so the system font
// takes the same space as the web font, and nothing shifts when the web font arrives.
// Run once on a machine that has the fallback fonts (Windows): node scripts/font-metrics.js
// Writes src/_data/fontMetrics.json, which the build reads.
import * as fontkit from 'fontkit';
import fs from 'node:fs';

const FS = 'node_modules/@fontsource';
const SYS = process.env.SYSFONTS || 'C:/Windows/Fonts';
const sample = 'The quick brown fox jumps over the lazy dog. Custom software that fits the way your business works, 0123456789';

// Display headings are matched on heading-like text: mixed case, short words, few digits. Matching them on the
// body sample left the fallback ~1% too wide, and an H1 that wraps to 3 lines instead of 2 shifts the page when the
// web font arrives. Check with scripts/dev/font-swap.mjs.
const headingSample = 'Automation for small businesses in Ireland. Things we’ve built. Tell us what you need. Running a business shouldn’t mean doing the computer’s job. Six tools that don’t talk to each other. Questions about websites';
function avgWidth(font, text = sample) {
  const run = font.layout(text);
  const w = run.glyphs.reduce((s, g) => s + g.advanceWidth, 0);
  return w / text.length / font.unitsPerEm;
}
function metrics(webFile, fallbackFile, fallbackName, text = sample) {
  const web = fontkit.openSync(webFile), fb = fontkit.openSync(fallbackFile);
  const sizeAdjust = avgWidth(web, text) / avgWidth(fb, text);
  const upm = web.unitsPerEm;
  const pct = (v) => (v * 100).toFixed(2) + '%';
  return {
    fallback: fallbackName,
    sizeAdjust: pct(sizeAdjust),
    ascent: pct(web.ascent / upm / sizeAdjust),
    descent: pct(Math.abs(web.descent) / upm / sizeAdjust),
    lineGap: pct((web.lineGap || 0) / upm / sizeAdjust),
  };
}
const out = {
  display: metrics(`${FS}/chakra-petch/files/chakra-petch-latin-600-normal.woff2`, `${SYS}/arialbd.ttf`, 'Arial Bold', headingSample),
  sans: metrics(`${FS}/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-400-normal.woff2`, `${SYS}/arial.ttf`, 'Arial'),
  sansBold: metrics(`${FS}/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-700-normal.woff2`, `${SYS}/arialbd.ttf`, 'Arial Bold'),
  mono: metrics(`${FS}/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2`, `${SYS}/cour.ttf`, 'Courier New'),
  // The bakery demos' headings (Fraunces, demo pages only), matched on heading-like text
  serif: metrics(`${FS}/fraunces/files/fraunces-latin-600-normal.woff2`, `${SYS}/georgiab.ttf`, 'Georgia Bold', 'Fresh bread on Main Street from 7am. This week at Shutter & Crumb. Opening hours. Pastries and scones. Wholesale orders for cafés and shops. Find us'),
};
fs.writeFileSync('src/_data/fontMetrics.json', JSON.stringify(out, null, 2) + '\n');
console.log(out);

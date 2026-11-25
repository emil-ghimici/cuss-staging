// Inlines the whole stylesheet into each page: one request less, nothing render-blocking.
import fs from 'node:fs';
import { tokensCss, demoFontsCss } from './tokens.js';

// Always inlined; a page adds the parts it uses with `css` in its data (hero, room, bands, lost).
const FILES = ['base', 'layout', 'components', 'world', 'junk', 'pages'];
const PARTS = ['hero', 'room', 'bands', 'lost'];
export const minify = (css) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,>])\s*/g, '$1')
    .replace(/:\s+/g, ':')
    .replace(/;}/g, '}')
    .trim();

// The bakery demo pages (/work/demo-bakery-*/) carry none of the site's world pieces (no valve strip, kerb, junk
// strips or CREW): only the tokens, the base rules, the CuSS bar and the bakery's own look, plus the page's part.
const DEMO_FILES = ['base', 'demo'];
const DEMO_PARTS = ['demo-site', 'demo-tool', 'demo-dash', 'demo-roster'];
export function inlineDemoCss(prefix = '/', parts = []) {
  let css = tokensCss() + demoFontsCss();
  for (const f of DEMO_FILES.concat(DEMO_PARTS.filter((p) => (parts || []).includes(p)))) {
    const p = `src/assets/css/${f}.css`;
    if (fs.existsSync(p)) css += fs.readFileSync(p, 'utf8');
  }
  css = minify(css);
  if (prefix !== '/') css = css.replace(/url\(\/assets\//g, `url(${prefix}assets/`);
  return css;
}

export function inlineCss(prefix = '/', parts = []) {
  let css = tokensCss();
  for (const f of FILES.concat(PARTS.filter((p) => (parts || []).includes(p)))) {
    const p = `src/assets/css/${f}.css`;
    if (fs.existsSync(p)) css += fs.readFileSync(p, 'utf8');
  }
  css = minify(css);
  if (prefix !== '/') css = css.replace(/url\(\/assets\//g, `url(${prefix}assets/`);
  return css;
}

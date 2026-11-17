// Inlines the whole stylesheet into each page: one request less, nothing render-blocking.
import fs from 'node:fs';
import { tokensCss } from './tokens.js';

const FILES = ['base', 'layout', 'components', 'world', 'pages'];
const minify = (css) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,>])\s*/g, '$1')
    .replace(/:\s+/g, ':')
    .replace(/;}/g, '}')
    .trim();

export function inlineCss(prefix = '/') {
  let css = tokensCss();
  for (const f of FILES) {
    const p = `src/assets/css/${f}.css`;
    if (fs.existsSync(p)) css += fs.readFileSync(p, 'utf8');
  }
  css = minify(css);
  if (prefix !== '/') css = css.replace(/url\(\/assets\//g, `url(${prefix}assets/`);
  return css;
}

// Lucide icons (ISC licence), inlined at build time from lucide-static: only the icons a page uses
// end up in it, with no extra request. 24 px, 1.75 px stroke, currentColor (design spec section 7).
import fs from 'node:fs';

const DIR = 'node_modules/lucide-static/icons';
const cache = new Map();
export const usedIcons = new Set();

function inner(name) {
  if (!cache.has(name)) {
    const file = `${DIR}/${name}.svg`;
    if (!fs.existsSync(file)) throw new Error(`Unknown Lucide icon: ${name}`);
    const svg = fs.readFileSync(file, 'utf8');
    const body = svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>'));
    cache.set(name, body.replace(/\s*\n\s*/g, '').replace(/\s*\/>/g, '/>'));
  }
  return cache.get(name);
}

export function icon(name, cls = '') {
  usedIcons.add(name);
  return `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${inner(name)}</svg>`;
}

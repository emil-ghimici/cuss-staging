// Build check for design README rule 9: motion follows ONE flag (html.still), set before first paint by the head script
// in each layout from the device's reduced-motion setting and the visitor's switch. Anything else that reads the media
// query directly would ignore the switch, so the build fails naming the file and line.
// It also proves it looked: it must reach hero.js, catch a planted break, and every allow-list entry must still match.
import fs from 'node:fs';
import path from 'node:path';

const PATTERN = /prefers-reduced-motion/;
const ROOT = 'src';
const EXT = /\.(js|css|njk|html|md)$/;

// The only places allowed to read the media query, each with its reason.
const ALLOW = [
  { file: 'src/_includes/layouts/base.njk', why: 'the head script that sets html.still for the main site' },
  { file: 'src/_includes/layouts/demo.njk', why: 'the same head script for the demo pages' },
  { file: 'src/assets/css/base.css', why: 'the no-JavaScript fallback (html:not(.js)), where there is no switch' },
  { file: 'src/_lib/motion-guard.js', why: 'this check itself' },
];
const MUST_SCAN = 'src/assets/js/hero.js';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.posix.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT.test(e.name)) out.push(p);
  }
  return out;
}

export function findBreaks(files, read = (f) => fs.readFileSync(f, 'utf8')) {
  const breaks = [];
  const hits = new Set();
  for (const f of files) {
    read(f).split('\n').forEach((line, i) => {
      if (!PATTERN.test(line)) return;
      if (ALLOW.some((a) => a.file === f)) { hits.add(f); return; }
      breaks.push(`${f}:${i + 1}: ${line.trim().slice(0, 100)}`);
    });
  }
  return { breaks, hits };
}

export function checkMotionGuard() {
  const files = walk(ROOT);
  if (!files.includes(MUST_SCAN)) throw new Error(`Motion check: did not reach ${MUST_SCAN}; the scan is broken.`);
  // A planted break must be caught, or the pattern has stopped matching anything.
  const planted = findBreaks(['planted.css'], () => '@media (prefers-reduced-motion: reduce){.x{animation:none}}');
  if (planted.breaks.length !== 1) throw new Error('Motion check: the planted break was not caught; the pattern is broken.');
  const { breaks, hits } = findBreaks(files);
  const stale = ALLOW.filter((a) => !hits.has(a.file)).map((a) => `${a.file} (${a.why})`);
  if (stale.length) throw new Error('Motion check: allow-list entries that no longer match anything:\n' + stale.join('\n'));
  if (breaks.length) throw new Error('Read the shared motion flag (html.still) instead of prefers-reduced-motion (design README rule 9):\n' + breaks.join('\n'));
}

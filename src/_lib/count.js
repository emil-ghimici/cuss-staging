// One count helper for the demos (2026-11-27): "1 invoice", "8 invoices", "1 hour’s rest", "7 hours’ rest".
// It is written once, in the browser script demo.js (window.BK.count); the build reads that very function from the
// file and uses it for the templates (the `count` filter), so the page's first render and the script's later updates
// can never word a count differently. The count guard (count-guard.js) keeps counts from being built by hand.
import fs from 'node:fs';
import * as acorn from 'acorn';

const SOURCE = 'src/assets/js/demo.js';

function load() {
  const code = fs.readFileSync(SOURCE, 'utf8');
  let fn = null;
  (function visit(n) {
    if (fn || !n || typeof n.type !== 'string') return;
    if (n.type === 'FunctionDeclaration' && n.id && n.id.name === 'count') { fn = code.slice(n.start, n.end); return; }
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v.type === 'string') visit(v);
    }
  })(acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script' }));
  if (!fn) throw new Error(`Count helper: no "function count" found in ${SOURCE}.`);
  return new Function(fn + '\nreturn count;')();
}

export const count = load();

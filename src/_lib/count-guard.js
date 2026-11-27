// Build check (2026-11-27): no count is built by hand on the demos. Every count goes through the one helper
// (BK.count in demo.js, the `count` filter in templates, src/_lib/count.js), so "1 hour's rest" can't come out as
// "1 hours' rest", and a count the data holds is never typed again ("8 invoices" goes stale when the data changes).
// Two kinds of break, named with file and line:
//   typed  — a number typed in front of a plural noun in a template's text or a script's string ("8 invoices");
//   joined — a script joining a value to a plural noun by hand (fmtH(gap) + ' hours’ rest').
// Fixed facts that are not counts of anything in the data (the law's figures, a story fact) sit on the allow-list,
// each with its reason. Like the other guards it proves it looked: it must reach the dashboard and the roster script,
// catch planted breaks of both kinds, and every allow-list entry must still match something.
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';

const FILES = () => [
  ...fs.readdirSync('src/pages').filter((n) => /^demo-.*\.njk$/.test(n)).map((n) => path.posix.join('src/pages', n)),
  ...fs.readdirSync('src/assets/js').filter((n) => /^demo.*\.js$/.test(n)).map((n) => path.posix.join('src/assets/js', n)),
];
const MUST_SCAN = ['src/pages/demo-bakery-dashboard.njk', 'src/assets/js/demo-roster.js'];

// A plural noun: a word ending in s, with or without a possessive mark ("hours’"). Units (h, min) aren't plural words.
const TYPED = /(?<![\w.,:€£#/½-])(\d+(?:\.\d+)?½?|½) ([a-z]+s)(?=[’']|\b)/g;
// Joined by hand: a value followed by one of the nouns the demos count, singular or plural.
const JOINED = /^ (hours?|days?|weeks?|months?|years?|minutes?|invoices?|orders?|shifts?|bakers?|bags?|items?|people|persons?)(?=[’'\s.,)]|$)/;

// Each entry: the file, the text that must appear in the break, and why it is not a count to build.
const ALLOW = [
  { file: 'src/pages/demo-bakery-dashboard.njk', text: '11 bags', why: 'a story fact (flour left), shared with the Control room' },
  { file: 'src/pages/demo-bakery-dashboard.njk', text: '3 days', why: 'a story fact (days of baking left)' },
  { file: 'src/pages/demo-bakery-roster.njk', text: '3 years', why: 'the law: records kept 3 years (OWTA s.25)' },
  { file: 'src/assets/js/demo-roster.js', text: '3 years', why: 'the law: records kept 3 years (OWTA s.25)' },
  { file: 'src/assets/js/demo-roster.js', text: '6 hours', why: 'the law: break rules (OWTA s.12, S.I. 57/1998)' },
  { file: 'src/assets/js/demo-roster.js', text: '30 minutes', why: 'the law: break rules (OWTA s.12)' },
  { file: 'src/assets/js/demo-roster.js', text: '4½ hours', why: 'the law: break rules (OWTA s.12, PYPEA s.6)' },
  { file: 'src/assets/js/demo-roster.js', text: '8 hours', why: 'the law: under-18s’ daily limit (PYPEA s.6)' },
  { file: 'src/assets/js/demo-roster.js', text: '40 hours', why: 'the law: under-18s’ weekly limit (PYPEA s.6)' },
  { file: 'src/assets/js/demo-roster.js', text: '12 hours', why: 'the law: under-18s’ daily rest (PYPEA s.6)' },
  { file: 'src/assets/js/demo-roster.js', text: '11 hours', why: 'the law: daily rest (OWTA s.11)' },
  { file: 'src/assets/js/demo-roster.js', text: '48 hours', why: 'the law: the 48-hour average (OWTA s.15)' },
  { file: 'src/assets/js/demo-roster.js', text: '4 months', why: 'the law: the reference period (OWTA s.15)' },
  { file: 'src/assets/js/demo-roster.js', text: '24 hours', why: 'the law: weekly rest and notice (OWTA s.13, s.17)' },
  { file: 'src/assets/js/demo-roster.js', text: '2 days', why: 'the law: under-18s’ two days off in every 7 (PYPEA s.6)' },
  { file: 'src/assets/js/demo-roster.js', text: '2 bakers', why: 'a story fact: Saturday’s wholesale orders need two bakers' },
];

const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

// Templates: the text outside {{ }}, {% %} and {# #}.
function scanTemplate(file, text, out) {
  const blank = text.replace(/\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}|\{#[\s\S]*?#\}/g, (m) => m.replace(/[^\n]/g, ' '));
  for (const m of blank.matchAll(TYPED)) out.push({ file, line: lineOf(text, m.index), kind: 'typed', text: m[0] });
}

// Scripts: the string literals, and `value + ' nouns'` joins.
function scanScript(file, text, out) {
  const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  (function visit(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Literal' && typeof n.value === 'string') {
      for (const m of n.value.matchAll(TYPED)) out.push({ file, line: n.loc.start.line, kind: 'typed', text: m[0] });
    }
    if (n.type === 'BinaryExpression' && n.operator === '+' && n.right.type === 'Literal' && typeof n.right.value === 'string') {
      const left = n.left.type === 'BinaryExpression' ? n.left.right : n.left;
      const j = n.right.value.match(JOINED);
      if (j && left.type !== 'Literal') out.push({ file, line: n.loc.start.line, kind: 'joined', text: '… + \'' + n.right.value.slice(0, 30) + '\'' });
    }
    for (const k of Object.keys(n)) {
      if (k === 'loc') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v.type === 'string') visit(v);
    }
  })(ast);
}

export function findCountBreaks(files, read = (f) => fs.readFileSync(f, 'utf8')) {
  const found = [];
  for (const f of files) {
    const text = read(f).replace(/\r\n/g, '\n');
    try { (f.endsWith('.js') ? scanScript : scanTemplate)(f, text, found); }
    catch (e) { found.push({ file: f, line: 0, kind: 'unreadable', text: e.message }); }
  }
  const hits = new Set();
  const breaks = found.filter((b) => {
    const a = b.kind === 'typed' && ALLOW.find((x) => x.file === b.file && b.text === x.text);
    if (a) hits.add(a);
    return !a;
  });
  return { breaks, hits };
}

export function checkCountGuard() {
  const files = FILES();
  for (const f of MUST_SCAN) if (!files.includes(f)) throw new Error(`Count check: did not reach ${f}; the scan is broken.`);
  // Planted breaks must be caught, or the check has stopped finding anything.
  const planted = findCountBreaks(['planted.js', 'planted.njk'], (f) => f.endsWith('.js')
    ? "var s = 'Only ' + fmtH(gap) + ' hours’ rest';"
    : '<p class="ts">8 invoices · {{ x }}</p>');
  if (planted.breaks.length !== 2) throw new Error('Count check: the planted breaks were not both caught; the check is broken.\n' + JSON.stringify(planted.breaks));
  const { breaks, hits } = findCountBreaks(files);
  const stale = ALLOW.filter((a) => !hits.has(a)).map((a) => `${a.file} "${a.text}" (${a.why})`);
  if (stale.length) throw new Error('Count check: allow-list entries that no longer match anything:\n' + stale.join('\n'));
  if (breaks.length) throw new Error('Counts built by hand on the demos; use the count helper (BK.count, or the `count` filter):\n' + breaks.map((b) => `${b.file}:${b.line}: ${b.kind} ${b.text}`).join('\n'));
}

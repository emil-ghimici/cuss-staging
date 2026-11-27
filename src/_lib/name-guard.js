// Build check (2026-11-27): in the browser scripts, a function and a variable (or a parameter, or a second function)
// must never share a name in the same function scope. Hoisting lets the variable overwrite the function, and the
// browser then ignores a listener given something that isn't a function, without an error. That is how CREW could be
// picked up but never let go: hero.js kept the dripping pipe's drop element in `drop`, which replaced the release
// handler `function drop(e)`. The build fails naming the file, line and name.
// It also proves it looked: it must reach hero.js, catch a planted break, and every allow-list entry must still match.
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';

const ROOT = 'src/assets/js';
const MUST_SCAN = 'src/assets/js/hero.js';
// Known exceptions, each with its reason (none today).
const ALLOW = [];

const isFn = (n) => n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression';

function patternNames(p, out) {
  if (!p) return out;
  if (p.type === 'Identifier') out.push(p);
  else if (p.type === 'AssignmentPattern') patternNames(p.left, out);
  else if (p.type === 'RestElement') patternNames(p.argument, out);
  else if (p.type === 'ArrayPattern') p.elements.forEach((e) => patternNames(e, out));
  else if (p.type === 'ObjectPattern') p.properties.forEach((q) => patternNames(q.type === 'RestElement' ? q : q.value, out));
  return out;
}

// One function scope: its parameters, its `var`s (anywhere inside, not in nested functions) and the functions declared
// directly in its body. Nested functions are scopes of their own.
function checkScope(file, fnNode, breaks) {
  const decl = new Map();   // name -> [{kind, line}]
  const add = (id, kind) => { if (!decl.has(id.name)) decl.set(id.name, []); decl.get(id.name).push({ kind, line: id.loc.start.line }); };
  const nested = [];
  if (fnNode.params) fnNode.params.forEach((p) => patternNames(p, []).forEach((id) => add(id, 'parameter')));
  const body = fnNode.type === 'Program' ? fnNode.body : fnNode.body.type === 'BlockStatement' ? fnNode.body.body : [];
  body.forEach((s) => { if (s.type === 'FunctionDeclaration' && s.id) add(s.id, 'function'); });
  (function visit(n, top) {
    if (!n || typeof n.type !== 'string') return;
    if (isFn(n) && !top) { nested.push(n); return; }
    if (n.type === 'VariableDeclaration' && n.kind === 'var') n.declarations.forEach((d) => patternNames(d.id, []).forEach((id) => add(id, 'var')));
    for (const k of Object.keys(n)) {
      if (k === 'loc') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach((c) => visit(c, false));
      else if (v && typeof v.type === 'string') visit(v, false);
    }
  })(fnNode, true);
  for (const [name, list] of decl) {
    const fns = list.filter((d) => d.kind === 'function');
    if (fns.length && list.length > 1) breaks.push(`${file}:${fns[0].line}: "${name}" is a function and also ${list.filter((d) => d !== fns[0]).map((d) => `a ${d.kind} (line ${d.line})`).join(', ')}`);
  }
  nested.forEach((f) => checkScope(file, f, breaks));
}

export function findBreaks(files, read = (f) => fs.readFileSync(f, 'utf8')) {
  const breaks = [];
  for (const f of files) {
    let ast;
    try { ast = acorn.parse(read(f), { ecmaVersion: 'latest', sourceType: 'script', locations: true }); }
    catch (e) { breaks.push(`${f}: could not be read by the name check (${e.message})`); continue; }
    checkScope(f, ast, breaks);
  }
  const hits = new Set();
  const left = breaks.filter((b) => { const a = ALLOW.find((x) => b.startsWith(x.file + ':') && b.includes(`"${x.name}"`)); if (a) hits.add(a); return !a; });
  return { breaks: left, hits };
}

export function checkNameGuard() {
  const files = fs.readdirSync(ROOT).filter((n) => n.endsWith('.js')).map((n) => path.posix.join(ROOT, n));
  if (!files.includes(MUST_SCAN)) throw new Error(`Name check: did not reach ${MUST_SCAN}; the scan is broken.`);
  // A planted break must be caught, or the check has stopped finding anything.
  const planted = findBreaks(['planted.js'], () => '(function(){var drop=1;function drop(e){}document.addEventListener("pointerup",drop)})();');
  if (planted.breaks.length !== 1) throw new Error('Name check: the planted break was not caught; the check is broken.');
  const { breaks, hits } = findBreaks(files);
  const stale = ALLOW.filter((a) => !hits.has(a)).map((a) => `${a.file} "${a.name}" (${a.why})`);
  if (stale.length) throw new Error('Name check: allow-list entries that no longer match anything:\n' + stale.join('\n'));
  if (breaks.length) throw new Error('A function and another declaration share a name in one scope; the later one overwrites the function:\n' + breaks.join('\n'));
}

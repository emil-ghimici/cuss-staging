// Contrast of the open settings-gear panel (2026-11-27), both themes, motion on and off (both labels), each button at
// rest, on hover and with keyboard focus. Text 4.5:1 (3:1 large); icons, button outlines, the panel's edge and the gear's
// outline 3:1 (WCAG 1.4.11). The panel has the page's background, so its edge is what sets it apart from the page.
// node scripts/dev/contrast-gear.mjs <base-url> <width>      MIN=21 makes everything fail (a sanity run)
import { spawn } from 'node:child_process';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open({ width }) {
  const port = 9300 + Math.floor(Math.random() * 600);
  const chrome = spawn(process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, `--window-size=${Math.max(500, width)},900`, '--hide-scrollbars', `--user-data-dir=${process.env.TEMP}/cdp-gear-${port}`, 'about:blank'], { stdio: 'ignore' });
  let tabs; for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); } }
  const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 761 });
  await send('Page.enable');
  return {
    send,
    navigate: async (url, wait = 1500) => { await send('Page.navigate', { url }); await sleep(wait); },
    evaluate: async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; },
    close: () => { ws.close(); chrome.kill(); },
  };
}
const [base, width] = process.argv.slice(2);
const MIN = +process.env.MIN || 0;
function probe(MIN) {
  const parse = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const blend = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const bgOf = (el) => { const L = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { L.push(c); if (c.a >= 1) break; } } let o = { r: 255, g: 255, b: 255, a: 1 }; for (let i = L.length - 1; i >= 0; i--) o = blend(L[i], o); return o; };
  const ratio = (fg, bg) => { const c = blend(fg, bg), a = lum(c), b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const rows = [];
  const check = (what, fg, bg, need) => { const r = ratio(fg, bg); rows.push({ what, r: +r.toFixed(2), need: MIN || need, fg: hex(blend(fg, bg)), bg: hex(bg), ok: r >= (MIN || need) }); };
  const panel = document.getElementById('hdr-panel'), gear = document.querySelector('[data-settings]');
  if (!panel || panel.hidden) return 'panel not open';
  const pr = panel.getBoundingClientRect();
  // Panel edge against what's behind it (the page under the panel): sample the element under the panel's left edge, outside it
  const pcs = getComputedStyle(panel);
  const pbg = bgOf(panel);
  panel.style.visibility = 'hidden';
  const under = document.elementFromPoint(Math.max(1, pr.left + 4), Math.min(innerHeight - 2, pr.top + 4));
  panel.style.visibility = '';
  const pageBg = under ? bgOf(under) : { r: 0, g: 0, b: 0, a: 1 };
  check('panel border vs panel bg', parse(pcs.borderTopColor), pbg, 3);
  check('panel border vs page behind', parse(pcs.borderTopColor), pageBg, 3);
  check('panel bg vs page behind', pbg, pageBg, 1);  // informational: edge of the floating panel
  for (const b of panel.querySelectorAll('button')) {
    const cs = getComputedStyle(b), bbg = bgOf(b), lbl = b.querySelector('[data-lbl]');
    const name = '"' + lbl.textContent.trim() + '"';
    const lcs = getComputedStyle(lbl), size = parseFloat(lcs.fontSize), large = size >= 24 || (+lcs.fontWeight >= 700 && size >= 18.66);
    check(name + ' text ' + size + 'px', parse(lcs.color), bgOf(lbl), large ? 3 : 4.5);
    for (const ic of b.querySelectorAll('svg')) { const s = getComputedStyle(ic); if (s.display === 'none' || !ic.getBoundingClientRect().width) continue; check(name + ' icon', parse(s.stroke !== 'none' ? s.stroke : s.color), bbg, 3); }
    check(name + ' outline vs panel', parse(cs.borderTopColor), pbg, 3);
    if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) check(name + ' focus outline vs panel', parse(cs.outlineColor), pbg, 3);
  }
  const gcs = getComputedStyle(gear), gbg = bgOf(gear.parentElement);
  check('gear outline (open) vs header', parse(gcs.borderTopColor), gbg, 3);
  for (const ic of gear.querySelectorAll('svg')) { const s = getComputedStyle(ic); check('gear icon', parse(s.stroke !== 'none' ? s.stroke : s.color), bgOf(gear), 3); }
  return { theme: document.documentElement.getAttribute('data-theme') || '(system)', panel: [Math.round(pr.left), Math.round(pr.right)], rows };
}
const b = await open({ width: +width });
await b.send('DOM.enable'); await b.send('CSS.enable');
const force = async (sel, states) => { const d = await b.send('DOM.getDocument', { depth: -1 }); const q = await b.send('DOM.querySelectorAll', { nodeId: d.result.root.nodeId, selector: sel }); for (const n of q.result.nodeIds) await b.send('CSS.forcePseudoState', { nodeId: n, forcedPseudoClasses: states }); };
let fails = 0;
for (const theme of ['dark', 'light']) for (const motion of ['play', 'still']) {
  await b.navigate(base + '/', 300);
  await b.evaluate(`localStorage.setItem('cuss-theme','${theme}');localStorage.setItem('cuss-motion','${motion}')`);
  await b.navigate(base + '/', 1500);
  await b.evaluate("document.querySelector('[data-settings]').click()");
  await sleep(300);
  for (const state of [[], ['hover'], ['focus', 'focus-visible']]) {
    await force('#hdr-panel button, [data-settings]', state);
    await sleep(250);  // let transitions finish
    const r = await b.evaluate('(' + probe + ')(' + MIN + ')');
    if (typeof r === 'string') { console.log(theme, motion, r); fails++; continue; }
    console.log(`\n${theme} · motion ${motion} · ${state.join('+') || 'rest'} · width ${width} · panel x ${r.panel.join('–')}`);
    for (const x of r.rows) { if (!x.ok && x.need > 1) fails++; console.log(`  ${x.ok || x.need === 1 ? 'ok  ' : 'FAIL'} ${x.r.toFixed(2).padStart(5)} / ${x.need}  ${x.what}  (${x.fg} on ${x.bg})`); }
  }
  await force('#hdr-panel button, [data-settings]', []);
}
console.log('\nrule breaks:', fails);
b.close(); process.exit(fails ? 1 : 0);

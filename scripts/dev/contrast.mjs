// Text contrast on every page in both themes (WCAG: 4.5:1, or 3:1 for large text ≥ 24 px / ≥ 18.66 px bold).
// Walks visible text elements, takes their colour and the first opaque background behind them (alpha blended).
// node scripts/dev/contrast.mjs <base-url> <width> <path>...   (exit 1 when anything fails)
import { spawn } from 'node:child_process';
const [base, width, ...paths] = process.argv.slice(2);
const port = 9530 + Math.floor(Math.random() * 30);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, '--user-data-dir=' + process.env.TEMP + '/cdp-c-' + port, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: +width, height: 900, deviceScaleFactor: 1, mobile: +width < 761 });
await send('Page.enable');
function probe(MIN) {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const blend = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let out = { r: 255, g: 255, b: 255, a: 1 }; for (let i = layers.length - 1; i >= 0; i--) out = blend(layers[i], out); return out; };
  const out = [], seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
    if (el.closest('svg, [hidden], .sr, .skip, [aria-hidden="true"]')) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const fg = parse(cs.color), bg = bgOf(el); if (!fg) { out.push('unparsed colour ' + cs.color); continue; }
    const c = blend(fg, bg);
    const L1 = lum(c), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700, large = size >= 24 || (bold && size >= 18.66);
    const need = MIN || (large ? 3 : 4.5);
    if (!(ratio >= need)) out.push(ratio.toFixed(2) + ' < ' + need + '  ' + size + 'px ' + el.tagName.toLowerCase() + '.' + [...el.classList].join('.') + ' "' + n.textContent.trim().slice(0, 40) + '"');
  }
  return out;
}
const PROBE = '(' + probe.toString() + ')(' + (+process.env.MIN || 0) + ')';
let fails = 0;
for (const scheme of ['dark', 'light']) {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  for (const p of paths) {
    await send('Page.navigate', { url: base + p }); await sleep(1500);
    // open every FAQ and the phone menu's content is hidden anyway; JS-only rows are visible with JS on
    await send('Runtime.evaluate', { expression: "document.querySelectorAll('details').forEach(d=>d.open=true)" });
    const r = (await send('Runtime.evaluate', { expression: PROBE, returnByValue: true })).result.result.value || ['probe failed'];
    fails += r.length;
    console.log(scheme, width, p, r.length ? '\n   ' + r.join('\n   ') : 'ok');
  }
}
ws.close(); chrome.kill(); process.exit(fails ? 1 : 0);

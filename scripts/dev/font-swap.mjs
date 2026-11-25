// Do headings wrap the same with the fallback fonts as with the web fonts? (a mismatch = a layout shift when fonts arrive)
// node scripts/dev/font-swap.mjs <base-url> <width> <path>...
import { spawn } from 'node:child_process';
const [base, width, ...paths] = process.argv.slice(2);
const port = 9480 + Math.floor(Math.random() * 15);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, '--user-data-dir=' + process.env.TEMP + '/cdp-fs-' + port, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: +width, height: 900, deviceScaleFactor: 1, mobile: +width < 761 });
await send('Page.enable');
const EXPR = "[...document.querySelectorAll('main h1, main h2, main h3, .lead, .hdr')].map(e=>Math.round(e.getBoundingClientRect().height))";
let bad = 0;
for (const p of paths) {
  const get = async (block) => { await send('Network.setBlockedURLs', { urls: block ? ['*.woff2'] : [] }); await send('Page.navigate', { url: base + p }); await sleep(1800); return (await send('Runtime.evaluate', { expression: EXPR, returnByValue: true })).result.result.value; };
  const a = await get(false), b = await get(true);
  const diff = a.map((h, i) => h !== b[i] ? i + ':' + h + '→' + b[i] : '').filter(Boolean);
  if (diff.length) bad++;
  console.log(width, p, diff.length ? 'MISMATCH ' + diff.join(' ') : 'same');
}
ws.close(); chrome.kill(); process.exit(bad ? 1 : 0);

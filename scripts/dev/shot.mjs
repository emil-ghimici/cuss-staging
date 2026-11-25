// Screenshot a page in headless Chrome over the DevTools protocol (no packages).
// node scripts/dev/shot.mjs <url> <out.png> [width=1280] [light|dark] [waitMs=4000] [scrollY=0] [height=900] [js]
// Animation runs in real time here (the app's browser pane throttles it). Optional js runs before the shot.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const [url, out, width = '1280', scheme = 'dark', wait = '4000', scrollY = '0', height = '900', js = ''] = process.argv.slice(2);
const port = 9340 + Math.floor(Math.random() * 50);
const chrome = spawn(process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', `--remote-debugging-port=${port}`, `--window-size=${width},${height}`, '--hide-scrollbars', '--user-data-dir=' + process.env.TEMP + '/cdp-shot-' + port, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const features = [{ name: 'prefers-color-scheme', value: scheme === 'light' ? 'light' : 'dark' }];
if (process.env.REDUCE) features.push({ name: 'prefers-reduced-motion', value: 'reduce' });
await send('Emulation.setEmulatedMedia', { features });
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.enable'); await send('Page.navigate', { url }); await sleep(1200);
if (+scrollY) await send('Runtime.evaluate', { expression: `scrollTo(0, ${+scrollY})` });
if (js) await send('Runtime.evaluate', { expression: js, awaitPromise: true });
await sleep(+wait);
const r = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(out, Buffer.from(r.result.data, 'base64'));
ws.close(); chrome.kill();
console.log('saved', out);

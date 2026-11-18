// Profiles a page load with a 4x slower CPU and prints the heaviest functions inside long tasks (> 50 ms).
// node scripts/dev/longtasks.mjs <url> [width=412]
import { spawn } from 'node:child_process';
const [url, width = '412'] = process.argv.slice(2);
const port = 9500 + Math.floor(Math.random() * 30);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, '--user-data-dir=' + process.env.TEMP + '/cdp-lt-' + port, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: +width, height: 823, deviceScaleFactor: 2, mobile: +width < 761 });
await send('Emulation.setCPUThrottlingRate', { rate: 4 });
await send('Profiler.enable'); await send('Profiler.setSamplingInterval', { interval: 200 }); await send('Profiler.start');
await send('Page.enable'); await send('Page.navigate', { url }); await sleep(7000);
const { result: { profile } } = await send('Profiler.stop');
const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]));
const dt = profile.timeDeltas; profile.samples.forEach((s, i) => { const n = byId.get(s); const cf = n.callFrame; const k = (cf.functionName || '(anon)') + ' ' + (cf.url.split('/').pop() || '') + ':' + cf.lineNumber; self.set(k, (self.get(k) || 0) + (dt[i] || 0) / 1000); });
console.log([...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => Math.round(v) + ' ms  ' + k).join('\n'));
ws.close(); chrome.kill();

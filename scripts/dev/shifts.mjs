// Logs layout shifts (with what moved) on a phone-sized viewport, with a slow CPU like Lighthouse mobile.
// node scripts/dev/shifts.mjs <url> [width=412] [height=823]
import { spawn } from 'node:child_process';
const [url, width = '412', height = '823'] = process.argv.slice(2);
const port = 9400 + Math.floor(Math.random() * 50);
const chrome = spawn(process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', `--remote-debugging-port=${port}`, '--user-data-dir=' + process.env.TEMP + '/cdp-shifts-' + port, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: +width, height: +height, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setCPUThrottlingRate', { rate: 4 });
await send('Page.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__shifts=[];new PerformanceObserver(l=>{for(const e of l.getEntries()){window.__shifts.push({t:Math.round(e.startTime),v:+e.value.toFixed(4),src:e.sources.map(s=>{const n=s.node;const d=n&&n.nodeType===1?n.tagName.toLowerCase()+'.'+[...n.classList].join('.'):String(n&&n.nodeName);return d+' '+JSON.stringify([s.previousRect.y,s.currentRect.y,s.previousRect.height,s.currentRect.height])})})}}).observe({type:'layout-shift',buffered:true});` });
await send('Page.navigate', { url }); await sleep(8000);
const r = await send('Runtime.evaluate', { expression: 'JSON.stringify(window.__shifts,null,1)', returnByValue: true });
console.log(r.result.result.value);
ws.close(); chrome.kill();

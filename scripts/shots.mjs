// Screenshots of the bakery demos for the Work cards (demo step 11b): npm run shots
// Builds the site into a temporary folder, serves it, and drives headless Chrome over the DevTools protocol
// (no packages). The clock is fixed at Thursday 10:30 Irish time; the CuSS bar and the demo notes are hidden (?shot);
// nothing is moving. Each image is encoded with ffmpeg as AVIF and WebP at two widths, into src/assets/img/work/.
// The images are committed (not built in CI): rerun this whenever a demo changes.
// Needs Chrome (CHROME=<path> to override) and ffmpeg with libaom-av1 and libwebp on the PATH.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

const ROOT = process.cwd();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cuss-shots-'));
const SITE = path.join(TMP, 'site');
const OUT = path.join(ROOT, 'src/assets/img/work');
const W = 1280, H = 726; // the monitor frame's 300:170
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. Build
const b = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/@11ty/eleventy/cmd.cjs'), `--output=${SITE}`, '--quiet'], { stdio: 'inherit', cwd: ROOT });
if (b.status !== 0) process.exit(1);

// 2. Serve the build on a free port
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webp': 'image/webp', '.avif': 'image/avif' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(SITE, p);
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

// 3. Chrome
const port = 9500 + Math.floor(Math.random() * 300);
const chrome = spawn(process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', `--remote-debugging-port=${port}`, '--hide-scrollbars', '--force-color-profile=srgb', `--user-data-dir=${path.join(TMP, 'chrome')}`, 'about:blank'], { stdio: 'ignore' });
let tabs; for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable');
// Thursday 26 November 2026, 10:30 in Ireland (GMT in winter): the demos' own moment
await send('Page.addScriptToEvaluateOnNewDocument', { source: `(function(){var T=Date.UTC(2026,10,26,10,30);var R=Date;function D(){return arguments.length?new (Function.prototype.bind.apply(R,[null].concat([].slice.call(arguments))))():new R(T)}D.now=function(){return T};D.UTC=R.UTC;D.parse=R.parse;D.prototype=R.prototype;Date=D;})();` });

async function capture(url, { width, height, scheme, mobile = false }) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await send('Page.navigate', { url: base + url });
  await sleep(1500);
  await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(()=>{scrollTo(0,0)})', awaitPromise: true });
  await sleep(300);
  const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 } });
  return Buffer.from(r.result.data, 'base64');
}
// The website card: the desktop first screen, with the phone view overlapping its bottom-right corner
async function compose(desk, phone) {
  const html = `<!doctype html><html><body style="margin:0;width:${W}px;height:${H}px;position:relative;overflow:hidden;background:#fbf6ec">
<img src="data:image/png;base64,${desk.toString('base64')}" style="position:absolute;inset:0;width:${W}px;height:${H}px;object-fit:cover;object-position:top">
<div style="position:absolute;right:28px;bottom:-190px;width:240px;height:620px;border:12px solid #1f2a4a;border-radius:36px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.35);background:#fbf6ec">
<img src="data:image/png;base64,${phone.toString('base64')}" style="width:100%;display:block"></div></body></html>`;
  const f = path.join(TMP, 'compose.html'); fs.writeFileSync(f, html);
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await send('Page.navigate', { url: 'file:///' + f.replace(/\\/g, '/') });
  await sleep(800);
  const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
  return Buffer.from(r.result.data, 'base64');
}
function encode(png, name) {
  const src = path.join(TMP, name + '.png'); fs.writeFileSync(src, png);
  for (const w of [1280, 640]) {
    const vf = `scale=${w}:-2:flags=lanczos`;
    const a = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', vf + ',format=yuv420p', '-c:v', 'libaom-av1', '-still-picture', '1', '-crf', '30', '-cpu-used', '4', path.join(OUT, `${name}-${w}.avif`)]);
    const v = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', vf, '-c:v', 'libwebp', '-quality', '80', path.join(OUT, `${name}-${w}.webp`)]);
    if (a.status || v.status) { console.error(String(a.stderr || ''), String(v.stderr || '')); process.exit(1); }
  }
  console.log('wrote', name);
}

fs.mkdirSync(OUT, { recursive: true });
const desk = await capture('/work/demo-bakery-website/?shot', { width: W, height: H, scheme: 'light' });
const phone = await capture('/work/demo-bakery-website/?shot', { width: 390, height: 844, scheme: 'light', mobile: true });
encode(await compose(desk, phone), 'bakery-website-light');
for (const scheme of ['dark', 'light']) {
  encode(await capture('/work/demo-bakery-dashboard/?shot', { width: W, height: H, scheme }), `bakery-dashboard-${scheme}`);
  encode(await capture('/work/demo-bakery-roster/?shot', { width: W, height: H, scheme }), `bakery-roster-${scheme}`);
}
ws.close(); chrome.kill(); server.close();
await sleep(500);
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}

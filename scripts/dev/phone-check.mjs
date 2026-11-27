// Phone check (2026-11-27): on a phone, text is at least 14 px and everything tappable is at least 48 × 48 px.
// Runs each page at 360 and 375 px, in both themes, with touch on, and names every break (element, size, text).
//   node scripts/dev/phone-check.mjs <base-url> <path>[|<js to run first>]...      (exit 1 when anything fails)
// The js runs in the page before measuring (open a panel, switch a view), e.g. '/work/demo-bakery-roster/|document.querySelector("[data-view=staff]").click()'.
// Allowed on purpose: a link inside a sentence (the rule "text links as real buttons" leaves running text alone:
// turning a word mid-sentence into a button breaks the sentence; agreed 2026-11-27), and visually hidden inputs whose
// label is the real tap area (the contact chips). SVG text is measured by the dashboard's own chart check.
import { spawn } from 'node:child_process';
const [base, ...specs] = process.argv.slice(2);
const port = 9640 + Math.floor(Math.random() * 30);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, '--user-data-dir=' + process.env.TEMP + '/cdp-ph-' + port, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

function probe() {
  const out = [];
  const shown = (e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !e.closest('[hidden]'); };
  const name = (e) => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '');
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = tw.nextNode());) {
    if (!n.textContent.trim()) continue;
    const e = n.parentElement; if (!e || e.closest('svg, .sr, .cbar') || !shown(e)) continue;
    const s = parseFloat(getComputedStyle(e).fontSize);
    if (s < 14) out.push(`text ${s}px ${name(e)} "${n.textContent.trim().slice(0, 30)}"`);
  }
  document.querySelectorAll('a[href], button, input, select, textarea, summary, [role=button]').forEach((e) => {
    if (!shown(e) || e.closest('.cbar')) return;
    const r = e.getBoundingClientRect();
    if (e.tagName === 'INPUT' && r.width <= 2 && r.height <= 2) return;           // visually hidden; its label is the target
    if (e.tagName === 'A') {                                                       // a link inside a sentence
      const p = e.parentElement; const own = p.textContent.replace(e.textContent, '').trim();
      if (/^(P|LI|SPAN|STRONG|EM|SMALL)$/.test(p.tagName) && own.length > 2 && getComputedStyle(e).display === 'inline') return;
    }
    if (r.width < 47.5 || r.height < 47.5) out.push(`tap ${Math.round(r.width)}×${Math.round(r.height)} ${name(e)} "${(e.textContent || e.value || '').trim().slice(0, 30)}"`);
  });
  return [...new Set(out)];
}
let fails = 0;
for (const scheme of ['dark', 'light']) for (const width of [360, 375]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  for (const spec of specs) {
    const [p, pre] = spec.split('|');
    await send('Page.navigate', { url: base + p }); await sleep(1500);
    if (pre) { await send('Runtime.evaluate', { expression: pre, awaitPromise: true }); await sleep(400); }
    const r = (await send('Runtime.evaluate', { expression: '(' + probe.toString() + ')()', returnByValue: true })).result.result.value || ['probe failed'];
    fails += r.length;
    console.log(scheme, width, spec.slice(0, 70), r.length ? '\n   ' + r.join('\n   ') : 'ok');
  }
}
ws.close(); chrome.kill(); process.exit(fails ? 1 : 0);

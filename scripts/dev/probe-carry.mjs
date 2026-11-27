// Carrying CREW (2026-11-27): real mouse presses, drags and releases over the DevTools protocol (a probe inside the
// page can't make a real press-and-drag, and the old probe-drag.js never let go, so it missed that he couldn't be).
// Picks him up in his home scene and wherever the site guide has him, lets go in every kind of place, and counts the
// rule breaks: still held after letting go, hanging or mid-move 4 s later, not on the box that was under him,
// not back home after being let go over his home scene, floating above the hero's floor.
// node scripts/dev/probe-carry.mjs <base-url> [width]     e.g. http://localhost:8090 1280   (desktop only: phones don't carry)
import { spawn } from 'node:child_process';
const [base, width = '1280'] = process.argv.slice(2);
const W = +width, H = 900;
const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', `--remote-debugging-port=${port}`, `--window-size=${W},${H}`, '--hide-scrollbars', `--user-data-dir=${process.env.TEMP}/cdp-carry-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.enable');
const mouse = (type, x, y, down) => send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !down ? 'none' : 'left', buttons: down ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 });

// What the page shows (painted rects, not flags): the guide's CREW, the home CREW, his mode and seat
const STATE = `(() => {
  const g = document.querySelector('.g-crew'), h = document.querySelector('[data-hero] .crew, [data-crew-home] .crew'), f = document.querySelector('[data-guide]');
  const vis = (el) => el && !el.hidden && getComputedStyle(el).visibility !== 'hidden' && el.getBoundingClientRect().width > 0;
  const r = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom) }; };
  const s = f && f.crewState ? f.crewState() : {};
  return { mode: s.mode, perch: s.perch, held: !!(g && g.classList.contains('held')) || document.documentElement.classList.contains('crew-held'),
    guide: vis(g) ? r(g) : null, home: vis(h) ? r(h) : null, homeY: h ? getComputedStyle(h).getPropertyValue('--y').trim() : '',
    scene: h ? r(h.parentElement) : null, sy: Math.round(scrollY) };
})()`;
const PERCHES = `document.body.getAttribute('data-crew-perches') || '.info, .card, .steps li, .vsteps li, .faq details, .crt, .mon, [data-crew-stop]'`;
// The box straight under a point (centre x, feet y) on screen, as a visitor would see it: the nearest top below the feet
const UNDER = (cx, feet) => `(() => {
  let best = null, bt = 1e9;
  document.querySelectorAll(${PERCHES}).forEach((el) => {
    if (el.closest('[data-crew-home], [data-hero], [data-shop], .g-doc') || el.offsetParent === null || el.closest('[data-crew-never]')) return;
    const b = el.getBoundingClientRect();
    if (${cx} > b.left + 6 && ${cx} < b.right - 6 && b.top >= ${feet} - 40 && b.top < innerHeight - 24 && b.top < bt) { bt = b.top; best = el; }
  });
  return best ? (best.className || best.tagName) : null;
})()`;

let breaks = 0; const out = [];
const fail = (what) => { breaks++; out.push('  BREAK ' + what); };
async function load(path, sy = 0) {
  await send('Page.navigate', { url: base + path }); await sleep(1800);
  if (sy) { await ev(`scrollTo(0, ${sy})`); await sleep(2600); }
}
async function waitFor(fn, ms = 8000) { const t0 = Date.now(); let s; while (Date.now() - t0 < ms) { s = await ev(STATE); if (fn(s)) return s; await sleep(150); } return s; }
// Press on the element's rect, drag in 12 steps to (tx, ty), and release there (or not, when release is false)
async function drag(rect, tx, ty, release = true) {
  const sx = rect.x + rect.w / 2, sy = rect.y + rect.h * 0.4;
  await mouse('mouseMoved', sx, sy, false); await mouse('mousePressed', sx, sy, true);
  for (let i = 1; i <= 12; i++) { await mouse('mouseMoved', sx + (tx - sx) * i / 12, sy + (ty - sy) * i / 12, true); await sleep(25); }
  const held = await ev(STATE);
  if (release) await mouse('mouseReleased', tx, ty, false);
  return held;
}
// Somewhere on screen with no box under it: scans columns for one
const EMPTY_X = `(() => { for (let x = 50; x < innerWidth - 50; x += 20) { const u = ${UNDER('x', '200')}; if (!u) return x; } return null; })()`;

// A. Home: picked up in the hero, let go over the hero → back home, on its floor
{
  out.push('A  hero → let go over the hero');
  await load('/');
  const s0 = await waitFor((s) => s.home && s.mode === 'home' && s.home.x > 40 && s.home.x + s.home.w < W - 40);
  const tx = s0.scene.x + s0.scene.w * (s0.home.x + s0.home.w / 2 > s0.scene.x + s0.scene.w / 2 ? 0.25 : 0.75), ty = s0.home.y - 40;   // inside the scene
  const h = await drag(s0.home, tx, ty);
  if (!h.held) fail('not picked up (held: ' + JSON.stringify(h) + ')');
  if (h.home) fail('the hero still shows its CREW while he is carried');
  const s1 = await waitFor((s) => !s.held && s.mode === 'home' && s.home && s.homeY === '0px', 3000);
  if (s1.held) fail('still held after letting go'); else if (s1.mode !== 'home' || !s1.home) fail('not back in the hero: ' + JSON.stringify(s1));
  else if (s1.homeY !== '0px') fail('floating above the hero floor: --y ' + s1.homeY);
  out.push('   after: ' + JSON.stringify({ mode: s1.mode, held: s1.held, homeY: s1.homeY }));
}
// B. Home: picked up in the hero, carried down out of it and let go over a box
{
  out.push('B  hero → carried out, let go over a box');
  await load('/');
  const s0 = await waitFor((s) => s.home && s.mode === 'home' && s.home.x > 40 && s.home.x + s.home.w < W - 40);
  const s1 = await ev(STATE);                                            // the first strip shows just under the hero
  if (s1.mode !== 'home' || !s1.home || s1.scene.bottom > H - 160) fail('no room under the hero on this screen to test: ' + JSON.stringify(s1.scene));
  else {
    const ty = s1.scene.bottom + 40, tx = W * 0.3;
    const h = await drag(s1.home, tx, ty, false);
    const g = (await ev(STATE)).guide;
    const want = g && await ev(UNDER(g.x + g.w / 2, g.bottom - 22));
    await mouse('mouseReleased', tx, ty, false);
    const s2 = await waitFor((s) => !s.held && s.mode === 'perch', 4000);
    if (!h.held) fail('not picked up: ' + JSON.stringify({ pressed: s1.home, then: h.home, mode: h.mode }));
    if (s2.held) fail('still held after letting go');
    else if (want && s2.mode !== 'perch') fail('did not land on the box under him (' + want + '): ' + s2.mode);
    else if (want && s2.perch !== want) fail(`landed on ${s2.perch}, the box under him was ${want}`);
    out.push('   box under him: ' + want + ' · after: ' + JSON.stringify({ mode: s2.mode, perch: s2.perch }));
  }
}
// Scrolls down the page a screen at a time until the guide sits on a box in view
async function seated(path) {
  await load(path);
  let s;
  for (let y = 0; y < 6000; y += 700) { await ev(`scrollTo(0, ${y})`); s = await waitFor((q) => q.mode === 'perch' && q.guide && q.guide.y > 80 && q.guide.bottom < H, 5000); if (s.mode === 'perch' && s.guide) return s; }
  return s;
}
// C. The guide's CREW on a box: picked up, let go over another box; then over nothing (the top bar, then solid ground)
{
  out.push('C  guide on a box → let go over a box, then over nothing');
  let s0 = await seated('/');
  if (s0.mode !== 'perch') fail('the guide never sat on a box after scrolling: ' + s0.mode);
  else {
    const tx = s0.guide.x > W / 2 ? W * 0.25 : W * 0.7, ty = 300;
    await drag(s0.guide, tx, ty, false);
    const g = (await ev(STATE)).guide;
    const want = g && await ev(UNDER(g.x + g.w / 2, g.bottom - 22));
    await mouse('mouseReleased', tx, ty, false);
    const s1 = await waitFor((s) => !s.held && s.mode === 'perch', 4000);
    if (s1.held) fail('still held after letting go');
    else if (want && s1.perch !== want) fail(`landed on ${s1.perch}, the box under him was ${want}`);
    else if (!want && (s1.mode === 'hang' || s1.mode === 'move')) fail('nothing under him and still ' + s1.mode + ' 4 s later');
    out.push('   box under him: ' + want + ' · after: ' + JSON.stringify({ mode: s1.mode, perch: s1.perch }));
  }
}
// C2. Over nothing: Contact, where the CRT is his only box. Let go far from it: the top bar above him, then he
// pulls himself to solid ground as usual (the CRT, or his band while it's in view). Picked up from the band at the top.
{
  out.push('C2 /contact/: let go over nothing');
  await load('/contact/');
  const s0 = await waitFor((s) => s.home && s.mode === 'home', 6000);
  const ty = 520, ex = await ev(`(() => { for (let x = 60; x < innerWidth - 60; x += 20) { const u = ${UNDER('x', String(ty + 60))}; if (!u) return x; } return null; })()`);
  if (!s0.home) fail('no band CREW on Contact to pick up');
  else if (ex === null) fail('no empty column on Contact to test over nothing');
  else {
    {
      await drag(s0.home, ex, ty);
      const s2 = await ev(STATE);
      await sleep(4000);
      const s3 = await ev(STATE);
      out.push(`   over nothing at x ${ex}: just after ${s2.mode}, 4 s later ${s3.mode} ${s3.perch || ''}`);
      if (s2.held) fail('still held after letting go over nothing');
      if (s3.mode === 'hang' || s3.mode === 'move' || s3.mode === 'held') fail('over nothing: still ' + s3.mode + ' 4 s later (never stuck)');
      if (s2.mode !== 'hang') fail('over nothing: not on the top bar right after letting go (' + s2.mode + ')');
    }
  }
}
// D. Let go outside the window, and the window losing focus mid-carry
{
  out.push('D  let go outside the window; window loses focus');
  let s0 = await seated('/');
  if (s0.guide) {
    await drag(s0.guide, W + 200, 300);
    const s1 = await waitFor((s) => !s.held, 1500);
    if (s1.held) fail('still held after letting go outside the window');
    s0 = await waitFor((s) => (s.mode === 'perch' || s.mode === 'tucked') && s.guide, 8000);
    await drag(s0.guide, W / 2, 320, false);
    await ev(`window.dispatchEvent(new Event('blur'))`);
    const s2 = await waitFor((s) => !s.held, 1500);
    await mouse('mouseReleased', W / 2, 320, false);
    if (s2.held) fail('still held after the window lost focus');
    out.push('   after release outside: held ' + s1.held + ' · after blur: held ' + s2.held);
  }
}
// E. An inner page: the band's CREW picked up and let go over the band → back at his spot; the guide over a box
{
  out.push('E  /services/automation/: band → let go over the band');
  await load('/services/automation/');
  const s0 = await waitFor((s) => s.home && s.mode === 'home', 6000);
  if (!s0.home) out.push('   (no band CREW on screen)');
  else {
    const h = await drag(s0.home, s0.home.x + 120, s0.home.y + 10);
    if (!h.held) fail('band CREW not picked up');
    const s1 = await waitFor((s) => !s.held && s.mode === 'home' && s.home, 3000);
    if (s1.held) fail('still held after letting go'); else if (s1.mode !== 'home') fail('not back in the band: ' + s1.mode);
    out.push('   after: ' + JSON.stringify({ mode: s1.mode, held: s1.held }));
  }
}
out.forEach((l) => console.log(l));
console.log('rule breaks:', breaks);
ws.close(); chrome.kill();
process.exit(breaks ? 1 : 0);

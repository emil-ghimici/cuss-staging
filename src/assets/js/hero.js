/* CuSS home hero: the broken TV and the crew who fixes it (design spec section 2).
   Evolved from the old dot field: phosphor specks confined to the TV screen, three signal levels.
     broken  – pointer/finger moving over the hero, and on first load: full static, rolling picture
     weak    – after ~1 s of stillness: "CuSS" forms, noise crawling through it
     tuned   – after the crew twists the dial: "Custom / Software / Solutions", Cu S S lit
   One requestAnimationFrame loop drives the picture and the crew's clock. Everything stops when the
   hero is off screen or the tab is hidden, and when the crew sits down for tea (zero CPU).
   Reduced motion: one still frame, the full name showing and the crew's hand on the dial. No sound, ever. */
(function () {
  'use strict';
  var doc = document;
  var hero = doc.querySelector('[data-hero]');
  if (!hero) return;
  var scene = hero.querySelector('.scene'), tv = scene.querySelector('.tv'), screenEl = tv.querySelector('.tv-screen');
  var canvas = screenEl.querySelector('canvas'), ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;
  var crewEl = scene.querySelector('.crew'), dial = tv.querySelector('.dial.d1');
  var tube = scene.querySelector('[data-tube]'), spark = scene.querySelector('[data-spark]'), sign = scene.querySelector('[data-sign]');
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var BG = '#05080a', PH = '62,230,224';           // the screen and phosphor tokens (screens stay dark in both themes)
  var FONT = '"Chakra Petch", "Chakra Petch Fallback", sans-serif';
  var SPRING = 0.09, DAMPING = 0.78;               // from the dot field: pull to target, velocity kept per frame
  var FRAME_MS = 1000 / 30;                        // a CRT doesn't need 60 fps; half the work

  /* ---------------- The picture ---------------- */
  var W = 0, H = 0, phone = false, parts = [], ptsC = [], ptsF = [];
  var state = 'broken', lastMove = 0, roll = 0, jolt = 0;

  function sample(lines, initials) {
    var c = doc.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d', { willReadFrequently: true });
    x.font = '600 100px ' + FONT;
    var widest = 0;
    lines.forEach(function (l) { widest = Math.max(widest, x.measureText(l).width); });
    var size = Math.min((W * 0.86) / widest * 100, (H * 0.8) / (lines.length * 1.04));
    x.font = '600 ' + size + 'px ' + FONT; x.textBaseline = 'middle'; x.fillStyle = '#fff';
    var lh = size * 1.04, y0 = H / 2 - (lines.length - 1) * lh / 2, left = (W - widest * size / 100) / 2;
    lines.forEach(function (l, i) { x.fillText(l, lines.length > 1 ? left : W / 2 - x.measureText(l).width / 2, y0 + i * lh); });
    var full = x.getImageData(0, 0, W, H).data, hi = null;
    if (initials) {
      x.clearRect(0, 0, W, H);
      lines.forEach(function (l, i) { x.fillText(l.slice(0, initials[i]), left, y0 + i * lh); });
      hi = x.getImageData(0, 0, W, H).data;
    }
    var step = Math.max(3, Math.round(size / (lines.length > 1 ? 13 : 16))), out = [];
    for (var yy = step / 2 | 0; yy < H; yy += step) for (var xx = step / 2 | 0; xx < W; xx += step) {
      var k = (yy * W + xx) * 4 + 3;
      if (full[k] > 120) out.push({ x: xx, y: yy, h: hi ? hi[k] > 120 : true });
    }
    out.sort(function (a, b) { return a.x - b.x || a.y - b.y; });   // pair left to right, so specks travel a short way
    out.step = step;
    return out;
  }
  function build() {
    var r = screenEl.getBoundingClientRect();
    W = Math.max(40, Math.round(r.width)); H = Math.max(40, Math.round(r.height));
    phone = scene.clientWidth < 520;
    canvas.width = W; canvas.height = H;                   // low resolution on purpose: a CRT, and cheap
    ptsC = sample(['CuSS'], null);
    ptsF = sample(['Custom', 'Software', 'Solutions'], [2, 1, 1]);
    var n = Math.max(ptsC.length, ptsF.length);
    var old = parts; parts = [];
    for (var i = 0; i < n; i++) {
      var p = old[i] || { x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0 };
      p.c = ptsC[Math.floor(i * ptsC.length / n)]; p.f = ptsF[Math.floor(i * ptsF.length / n)];
      p.tx = p.x; p.ty = p.y;
      // Several specks can share a letter point; only the first one lights it
      p.cd = i > 0 && parts[i - 1].c === p.c; p.fd = i > 0 && parts[i - 1].f === p.f;
      parts.push(p);
    }
  }
  function setState(s) { state = s; }

  // Static is a pre-drawn noise texture, shown at a random offset each frame: one drawImage, not thousands of rects
  var noiseTex = null, noisePat = null;
  function makeNoise() {
    noiseTex = doc.createElement('canvas');
    noiseTex.width = W; noiseTex.height = H;
    var x = noiseTex.getContext('2d'), img = x.createImageData(W, H), d = img.data;
    for (var n = (W * H * 0.06) | 0; n > 0; n--) {
      var i = ((Math.random() * W * H) | 0) * 4, v = 150 + Math.random() * 105;
      d[i] = v * 0.8; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 40 + Math.random() * 150;
    }
    x.putImageData(img, 0, 0);
    noisePat = ctx.createPattern(noiseTex, "repeat");
  }
  // A few fixed phosphor shades, so a frame sets fillStyle a handful of times instead of once per speck
  var SHADES = [], i0;
  for (i0 = 0; i0 < 8; i0++) SHADES.push('rgba(' + PH + ',' + (0.24 + i0 * 0.1).toFixed(2) + ')');

  function draw(dt) {
    var noise = state === 'broken' ? 1 : state === 'weak' ? 0.5 : 0.16;
    // Phosphor persistence: fade the last frame instead of clearing it
    ctx.globalAlpha = 1;
    ctx.fillStyle = state === 'broken' ? 'rgba(5,8,10,.7)' : 'rgba(5,8,10,.55)';
    ctx.fillRect(0, 0, W, H);
    // Static at a level brightness (no flashing): the texture's density does the work
    if (noisePat) {
      var ox = (Math.random() * W) | 0, oy = (Math.random() * H) | 0;
      ctx.globalAlpha = noise;
      ctx.translate(-ox, -oy); ctx.fillStyle = noisePat; ctx.fillRect(ox, oy, W, H); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
    }

    // Horizontal roll while the picture is broken; a jolt rolls through once
    if (state === 'broken' && performance.now() - lastMove < 400) roll = (roll + 17 * dt) % H;
    else roll *= 0.8;
    if (jolt > 0) { jolt -= dt; roll = (roll + 31 * dt) % H; }
    var rollOff = roll | 0;

    var set = state === 'weak' ? 'c' : state === 'tuned' ? 'f' : null;
    var amp = state === 'weak' ? 1.6 : 0.5, size = phone ? 2.5 : 3;
    var damp = Math.pow(DAMPING, dt), pull = SPRING * dt;
    var lit = [[], [], [], [], [], [], [], []];
    for (var j = 0; j < parts.length; j++) {
      var p = parts[j], q = set ? p[set] : null;
      if (q) { p.tx = q.x; p.ty = q.y; }
      else if (Math.random() < 0.05) { p.tx = Math.random() * W; p.ty = Math.random() * H; }
      p.vx = (p.vx + (p.tx - p.x) * pull) * damp; p.vy = (p.vy + (p.ty - p.y) * pull) * damp;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (!q || (set === 'c' ? p.cd : p.fd)) continue;
      if (state === 'weak' && Math.random() < 0.1) continue;          // dropouts: noise crawling through the letters
      // shade 0–7: weak shimmers across the range, tuned keeps the initials bright and the rest dim
      var s = state === 'weak' ? 1 + ((Math.random() * 6) | 0) : (q.h ? 6 + (Math.random() * 2 | 0) : (Math.random() * 2) | 0);
      lit[s].push(p.x + (Math.random() * 2 - 1) * amp, (p.y + rollOff) % H);
    }
    for (var b = 0; b < 8; b++) {
      var L = lit[b]; if (!L.length) continue;
      ctx.fillStyle = SHADES[b];
      for (var m = 0; m < L.length; m += 2) ctx.fillRect(L[m], L[m + 1], size, size);
    }
    // A faint tear line now and then
    if (Math.random() < (state === 'broken' ? 0.3 : 0.04)) {
      ctx.fillStyle = 'rgba(200,240,240,.08)';
      ctx.fillRect(0, (Math.random() * H) | 0, W, 2 + Math.random() * 5);
    }
  }
  function stillFrame() {
    setState('tuned');
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(200,240,240,.07)';
    for (var i = 0; i < W * H / 260; i++) ctx.fillRect((Math.random() * W) | 0, (Math.random() * H) | 0, 2, 2);
    ptsF.forEach(function (q) {
      ctx.fillStyle = 'rgba(' + PH + ',' + (q.h ? 0.95 : 0.4) + ')';
      ctx.fillRect(q.x, q.y, phone ? 2.5 : 3, phone ? 2.5 : 3);
    });
  }

  /* ---------------- One loop, one clock ---------------- */
  // The crew's timers run on this clock, so they freeze with everything else when the hero is paused.
  var clock = 0, waits = [], raf = 0, lastT = 0, acc = 0, running = false, onScreen = false, resting = false;
  function wait(ms) { return new Promise(function (r) { waits.push({ t: clock + ms, r: r }); }); }
  function loop(t) {
    raf = requestAnimationFrame(loop);
    var el = lastT ? Math.min(250, t - lastT) : FRAME_MS; lastT = t;
    clock += el; acc += el;
    if (waits.length) {
      var due = waits.filter(function (w) { return w.t <= clock; });
      if (due.length) { waits = waits.filter(function (w) { return w.t > clock; }); due.forEach(function (w) { w.r(); }); }
    }
    if (acc < FRAME_MS) return;
    var dt = Math.min(3, acc / 16.667); acc = 0;
    if (state === 'broken' && performance.now() - lastMove > 1000) setState('weak');
    draw(dt);
  }
  function start() { if (!raf) { lastT = 0; raf = requestAnimationFrame(loop); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  function sync() {
    running = onScreen && !doc.hidden && !resting;
    if (running) start(); else stop();
    scene.classList.toggle('paused', !running);
  }

  /* ---------------- The crew ---------------- */
  var crew = { x: 0, needTV: true, wake: null };
  function sceneW() { return scene.clientWidth; }
  // A point of the street drawing (viewBox 640×520, "xMidYMax slice") in scene pixels
  function vx(x) { var w = sceneW(), h = scene.clientHeight, s = Math.max(w / 640, h / 520); return (x - 320) * s + w / 2; }
  function crewW() { return crewEl.offsetWidth; }
  function offRight() { return hero.getBoundingClientRect().right - scene.getBoundingClientRect().left + 20; }
  function besideTV() { return tv.offsetLeft + tv.offsetWidth + 2; }
  function nearTV() { return Math.abs(crew.x - besideTV()) < 140; }
  function spots() {
    return [
      { id: 'tube', x: vx(550) - crewW() / 2, act: 'up' },
      { id: 'junction', x: Math.min(sceneW() - crewW(), vx(586) - crewW() / 2), act: 'reach' },
      { id: 'sign', x: Math.max(0, vx(75) - crewW() / 2), act: 'up' },
      { id: 'off', act: 'off' }
    ];
  }
  function place(x, dur) {
    crewEl.style.transition = dur ? 'transform ' + dur + 's linear' : 'none';
    crewEl.style.setProperty('--x', Math.round(x) + 'px');
    crew.x = x;
  }
  function walkTo(x) {
    var d = Math.abs(x - crew.x), dur = Math.max(0.3, d / 90);     // slow, a trundle
    crewEl.classList.toggle('flip', x < crew.x);
    place(x, dur);
    return wait(dur * 1000 + 60);
  }
  function act(cls, ms) { crewEl.classList.add(cls); return wait(ms).then(function () { crewEl.classList.remove(cls); }); }
  function twist() {
    crewEl.classList.add('reach');
    return wait(450)
      .then(function () { dial.classList.add('turn'); return wait(380); })
      .then(function () { dial.classList.remove('turn'); return wait(250); })
      .then(function () { dial.classList.add('turn'); return wait(300); })
      .then(function () {
        setState('tuned'); crew.needTV = false;
        crewEl.classList.remove('reach'); dial.classList.remove('turn');
        return wait(300);
      })
      .then(function () { return act('flinch', 320); });              // the nod
  }
  function untilWeak() { return state === 'broken' ? wait(200).then(untilWeak) : Promise.resolve(); }
  function fixTV() {
    var go = phone ? Promise.resolve() : walkTo(besideTV()).then(function () { crewEl.classList.add('flip'); });
    return go.then(untilWeak).then(twist);
  }
  function job(s) {
    if (s.act === 'off') {
      // Out by the street's right-hand edge, back in from the left (the scene clips its left edge)
      var w = sceneW(), exit = offRight();
      return walkTo(exit)
        .then(function () { return wait(2500 + Math.random() * 2000); })
        .then(function () { if (spark) { spark.classList.remove('on'); void spark.getBBox(); spark.classList.add('on'); } return wait(800 + Math.random() * 1000); })
        .then(function () { place(-crewW() - 10, 0); void crewEl.offsetWidth; return walkTo(Math.min(w * 0.12, tv.offsetLeft - crewW())); });
    }
    return walkTo(s.x)
      .then(function () { return act(s.act, 700); })
      .then(function () { return wait(250); })
      .then(function () { return act(s.act, 700); })
      .then(function () {
        if (s.id === 'tube' && tube) { tube.classList.add('fixed'); wait(25000).then(function () { tube.classList.remove('fixed'); }); }
        if (s.id === 'junction' && spark) spark.classList.remove('on');
        if (s.id === 'sign' && sign) sign.setAttribute('transform', 'rotate(0 75 270)');
      });
  }
  // A pause between jobs, cut short (after 2–6 s) if the picture breaks meanwhile
  function pause(ms) {
    var end = clock + ms;
    function tick() {
      if (crew.needTV) return wait(2000 + Math.random() * 4000);
      return clock >= end ? Promise.resolve() : wait(250).then(tick);
    }
    return tick();
  }
  function rest() {
    var sit = phone ? Promise.resolve() : walkTo(vx(481) - crewW() / 2);
    return sit.then(function () {
      crewEl.classList.add('tea'); if (!phone) crewEl.classList.add('sit');
      resting = true; sync();
      return new Promise(function (r) { crew.wake = r; });
    }).then(function () {
      crewEl.classList.remove('tea', 'sit');
      resting = false; sync();
    });
  }
  var lastAny = 0;
  function life() {
    return pause(4000 + Math.random() * 4000).then(function () {
      if (crew.needTV) return fixTV();
      if (performance.now() - lastAny > 45000) return rest();
      if (phone) {
        return act('up', 900).then(function () { if (tube) { tube.classList.add('fixed'); wait(25000).then(function () { tube.classList.remove('fixed'); }); } });
      }
      var list = spots(), s = list[(Math.random() * list.length) | 0];
      return job(s).then(function () { if (crew.needTV) return wait(2000 + Math.random() * 4000).then(fixTV); });
    }).then(life);
  }
  function firstEntrance() {
    return wait(2500).then(untilWeak).then(function () {
      crewEl.classList.remove('reach', 'flip');
      if (phone) return twist();
      place(offRight(), 0); void crewEl.offsetWidth;
      return fixTV();
    }).then(life);
  }

  /* ---------------- Visitors ---------------- */
  function poke() {
    lastAny = performance.now();
    if (crew.wake) { var w = crew.wake; crew.wake = null; w(); }
  }
  function breakIt() {
    poke();
    if (state !== 'broken') { setState('broken'); crew.needTV = true; }
    lastMove = performance.now();
  }
  function thump() {
    poke();
    tv.classList.remove('jolt'); void tv.offsetWidth; tv.classList.add('jolt');
    jolt = 8;
    if (nearTV() || phone) act('flinch', 320);
  }
  hero.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' || e.buttons) breakIt(); }, { passive: true });
  hero.addEventListener('touchmove', breakIt, { passive: true });
  hero.addEventListener('pointerdown', function (e) {
    if (e.target.closest('a,button')) return poke();
    thump(); breakIt(); lastMove = performance.now() - 600;
  });
  hero.addEventListener('focusin', thump);

  /* ---------------- Start ---------------- */
  // The show never delays the message: wait for the fonts (so the letters sample in Chakra Petch)
  // and for the page to settle, then build the picture and let the crew in.
  function begin() {
    build();
    if (reduced) { stillFrame(); return; }
    whenIdle(makeNoise);   // the crew keeps the markup's still pose: hand on the dial
    if (!phone) { crewEl.style.left = '0'; place(offRight(), 0); }
    crewEl.classList.add('live');
    lastMove = lastAny = performance.now();
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; sync(); }).observe(hero);
    } else { onScreen = true; sync(); }
    doc.addEventListener('visibilitychange', sync);

    var lastW = scene.clientWidth;
    window.addEventListener('resize', function () {
      if (Math.abs(scene.clientWidth - lastW) < 30) return;
      lastW = scene.clientWidth; build(); makeNoise();
    });
    if (spark) setInterval(function () { if (running && !spark.classList.contains('on') && Math.random() < 0.3) spark.classList.add('on'); }, 9000);
    firstEntrance();
  }
  function whenIdle(fn) {
    var go = function () { if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 2000 }); else setTimeout(fn, 300); };
    if (doc.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }
  var fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 3000); })]).then(function () { whenIdle(begin); });
})();

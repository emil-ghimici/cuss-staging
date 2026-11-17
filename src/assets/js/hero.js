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

  // What the crew says when you hover over him (tap on phones), by what he's doing.
  // DRAFT lines, to be approved before the site goes live. Plain, warm, a bit dry; no doom.
  var LINES = {
    tv: ['Mind the screen, it’s older than me.', 'Who’s been touching the telly?', 'Hang on, I’ll give it a twist.', 'Signal’s gone again. Back in a sec.', 'It’s grand. A twist and it’ll come back.'],
    job: ['Somebody has to keep the lights on.', 'One thing at a time.', 'Nearly there. Nearly.', 'If it’s broken, I’m on it.'],
    // one more line for the job in hand
    tube: ['This light’s been flickering all week.'],
    junction: ['Don’t touch that box. Seriously.'],
    sign: ['This sign’s been loose since Tuesday.'],
    off: ['Just popping out. Back in a tick.'],
    tea: ['Back in a minute, the kettle’s on.', 'Tea break. The telly can mind itself.', 'Ten minutes. Union rules.', 'Don’t tell the boss.'],
    idle: ['Got something that needs fixing? That’s the Contact button.', 'We fix things. That’s the whole job.', 'Spreadsheets held together with tape? Seen worse.', 'The first call’s free, by the way.', 'All quiet. Suspiciously quiet.']
  };
  var BG = '#05080a', PH = '62,230,224';           // the screen and phosphor tokens (screens stay dark in both themes)
  var FONT = '"Chakra Petch", "Chakra Petch Fallback", sans-serif';
  var SPRING = 0.09, DAMPING = 0.78;               // from the dot field: pull to target, velocity kept per frame
  var FRAME_MS = 1000 / 30;                        // a CRT doesn't need 60 fps; half the work

  /* ---------------- The picture ---------------- */
  var W = 0, H = 0, phone = false, parts = [], ptsC = [], ptsF = [];
  var mqPhone = window.matchMedia('(max-width: 760px)');
  var state = 'broken', lastMove = 0, roll = 0, jolt = 0;
  var shown = null;          // the words last on screen ('c' CuSS or 'f' full name): breaking disturbs them, it doesn't wipe them
  var ptr = null;            // the pointer or finger on the screen, in canvas pixels

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
    phone = mqPhone.matches;                              // the same breakpoint as the CSS
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
  function setState(s) { if (s !== 'broken') shown = s === 'weak' ? 'c' : 'f'; state = s; }

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
    var R = Math.min(W, H) * 0.3;
    if (noisePat) {
      var ox = (Math.random() * W) | 0, oy = (Math.random() * H) | 0;
      ctx.globalAlpha = noise;
      ctx.translate(-ox, -oy); ctx.fillStyle = noisePat; ctx.fillRect(ox, oy, W, H); ctx.setTransform(1, 0, 0, 1, 0, 0);
      // Like a finger on a real set: the static gathers and brightens around the pointer
      if (ptr) {
        ctx.save(); ctx.beginPath(); ctx.arc(ptr.x, ptr.y, R, 0, 6.2832); ctx.clip();
        ctx.globalAlpha = 1;
        for (var pass = 0; pass < 2; pass++) {
          var px = (Math.random() * W) | 0, py = (Math.random() * H) | 0;
          ctx.translate(-px, -py); ctx.fillRect(px, py, W, H); ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    if (ptr) {
      var g = ctx.createRadialGradient(ptr.x, ptr.y, 0, ptr.x, ptr.y, R);
      g.addColorStop(0, 'rgba(200,240,240,.14)'); g.addColorStop(1, 'rgba(200,240,240,0)');
      ctx.fillStyle = g; ctx.fillRect(ptr.x - R, ptr.y - R, R * 2, R * 2);
    }

    // Horizontal roll while the picture is broken; a jolt rolls through once
    if (state === 'broken' && performance.now() - lastMove < 400) roll = (roll + 17 * dt) % H;
    else roll *= 0.8;
    if (jolt > 0) { jolt -= dt; roll = (roll + 31 * dt) % H; }
    var rollOff = roll | 0;

    var broken = state === 'broken';
    var set = state === 'weak' ? 'c' : state === 'tuned' ? 'f' : shown;   // broken keeps the last words, disturbed
    var amp = broken ? 3.5 : state === 'weak' ? 1.6 : 0.5, size = phone ? 2.5 : 3;
    var R2 = R * R;
    var damp = Math.pow(DAMPING, dt), pull = SPRING * dt;
    var lit = [[], [], [], [], [], [], [], []];
    for (var j = 0; j < parts.length; j++) {
      var p = parts[j], q = set ? p[set] : null;
      if (q) {
        p.tx = q.x; p.ty = q.y;
        if (broken && ptr) {                        // pushed about by the pointer, like the old dot field
          var dx = q.x - ptr.x, dy = q.y - ptr.y, d2 = dx * dx + dy * dy;
          if (d2 < R2) { var d = Math.sqrt(d2) || 1, k = (1 - d / R); k = k * k * R * 0.5; p.tx += dx / d * k + (Math.random() - 0.5) * 10; p.ty += dy / d * k + (Math.random() - 0.5) * 10; }
        }
      }
      else if (Math.random() < 0.05) { p.tx = Math.random() * W; p.ty = Math.random() * H; }
      p.vx = (p.vx + (p.tx - p.x) * pull) * damp; p.vy = (p.vy + (p.ty - p.y) * pull) * damp;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (!q || (set === 'c' ? p.cd : p.fd)) continue;
      if ((state === 'weak' && Math.random() < 0.1) || (broken && Math.random() < 0.3)) continue;   // dropouts: noise crawling through
      // shade 0–7: broken sinks into the static, weak shimmers across the range, tuned keeps the initials bright
      var s = broken ? (Math.random() * 4) | 0 : state === 'weak' ? 1 + ((Math.random() * 6) | 0) : (q.h ? 6 + (Math.random() * 2 | 0) : (Math.random() * 2) | 0);
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
  var chatting = false, clock = 0, waits = [], raf = 0, lastT = 0, acc = 0, running = false, onScreen = false, resting = false;
  function wait(ms) { return new Promise(function (r) { waits.push({ t: clock + ms, r: r }); }); }
  function loop(t) {
    raf = requestAnimationFrame(loop);
    var el = lastT ? Math.min(250, t - lastT) : FRAME_MS; lastT = t;
    if (!chatting) clock += el;   // he stops what he's doing while you talk to him
    acc += el;
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
  function vy(y) { var w = sceneW(), h = scene.clientHeight, s = Math.max(w / 640, h / 520); return (y - 520) * s + h; }
  function crewW() { return crewEl.offsetWidth; }
  // The telescopic arm, so he can reach whatever needs fixing from where he stands
  var armEl = doc.createElement('span'), handEl = doc.createElement('span');
  armEl.className = 'reach-arm'; handEl.className = 'reach-hand';
  armEl.setAttribute('aria-hidden', 'true'); handEl.setAttribute('aria-hidden', 'true');
  scene.appendChild(armEl); scene.appendChild(handEl);
  function rel(el) { var r = el.getBoundingClientRect(), s = scene.getBoundingClientRect(); return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 }; }
  function reachTo(x, y, instant) {
    var sr = scene.getBoundingClientRect(), cr = crewEl.getBoundingClientRect();
    var left = x < cr.left - sr.left + cr.width / 2;
    crewEl.classList.toggle('flip', left);                     // face the job (the sprite faces right)
    var sx = cr.left - sr.left + (left ? 26 : 52) / 78 * cr.width, sy = cr.top - sr.top + 52 / 104 * cr.height;
    var len = Math.hypot(x - sx, y - sy), ang = Math.atan2(y - sy, x - sx);
    [armEl, handEl].forEach(function (el) {
      el.classList.remove('out'); el.classList.toggle('still', !!instant);
      el.style.setProperty('--sx', sx + 'px'); el.style.setProperty('--sy', sy + 'px');
      el.style.setProperty('--tx', x + 'px'); el.style.setProperty('--ty', y + 'px');
    });
    armEl.style.width = len + 'px'; armEl.style.setProperty('--ang', ang + 'rad');
    crewEl.classList.add('extend');
    armEl.classList.add('on'); handEl.classList.add('on');
    void armEl.offsetWidth;
    armEl.classList.add('out'); handEl.classList.add('out');
    return instant ? Promise.resolve() : wait(470);
  }
  function retract() {
    armEl.classList.remove('out'); handEl.classList.remove('out');
    return wait(470).then(function () { armEl.classList.remove('on'); handEl.classList.remove('on'); crewEl.classList.remove('extend'); });
  }
  function tap(x, y) {
    return reachTo(x, y).then(function () { return wait(600); }).then(retract)
      .then(function () { return wait(200); }).then(function () { return reachTo(x, y); })
      .then(function () { return wait(600); }).then(retract);
  }
  function offRight() { return hero.getBoundingClientRect().right - scene.getBoundingClientRect().left + 20; }
  function besideTV() { return tv.offsetLeft + tv.offsetWidth + 2; }
  function nearTV() { return Math.abs(crew.x - besideTV()) < 140; }
  function spots() {
    return [
      { id: 'tube', x: vx(560) - crewW() / 2, at: [550, 96] },
      { id: 'junction', x: Math.min(sceneW() - crewW(), vx(560) - crewW() / 2), at: [586, 352] },
      { id: 'sign', x: Math.max(0, vx(100) - crewW() / 2), at: [72, 270] },
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
    var d = rel(dial);
    return reachTo(d.x, d.y)
      .then(function () { dial.classList.add('turn'); return wait(380); })
      .then(function () { dial.classList.remove('turn'); return wait(250); })
      .then(function () { dial.classList.add('turn'); return wait(300); })
      .then(function () {
        setState('tuned'); crew.needTV = false;
        dial.classList.remove('turn');
        return retract();
      })
      .then(function () { return act('flinch', 320); });              // the nod
  }
  function untilWeak() { return state === 'broken' ? wait(200).then(untilWeak) : Promise.resolve(); }
  function fixTV() {
    var go = phone ? Promise.resolve() : walkTo(besideTV()).then(function () { crewEl.classList.add('flip'); });
    return go.then(untilWeak).then(twist);
  }
  function job(s) {
    crew.busy = s.id;
    return jobInner(s).then(function () { crew.busy = false; });
  }
  function jobInner(s) {
    if (s.act === 'off') {
      // Out by the street's right-hand edge, back in from the left (the scene clips its left edge)
      var w = sceneW(), exit = offRight();
      return walkTo(exit)
        .then(function () { return wait(2500 + Math.random() * 2000); })
        .then(function () { if (spark) { spark.classList.remove('on'); void spark.getBBox(); spark.classList.add('on'); } return wait(800 + Math.random() * 1000); })
        .then(function () { place(-crewW() - 10, 0); void crewEl.offsetWidth; return walkTo(Math.min(w * 0.12, tv.offsetLeft - crewW())); });
    }
    return walkTo(s.x)
      .then(function () { return tap(vx(s.at[0]), vy(s.at[1])); })
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
        return tap(vx(550), vy(96)).then(function () { if (tube) { tube.classList.add('fixed'); wait(25000).then(function () { tube.classList.remove('fixed'); }); } });
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

  /* ---------------- Talking to the crew ---------------- */
  var bubble = doc.createElement('div'), bubbleText = doc.createElement('p'), lastLine = {}, bubbleTimer = 0, walkTarget = null;
  bubble.className = 'crew-bubble'; bubble.setAttribute('aria-hidden', 'true'); bubble.hidden = true;
  bubble.appendChild(bubbleText); scene.appendChild(bubble);
  function situation() {
    if (resting) return 'tea';
    if (crew.needTV || state === 'broken') return 'tv';
    if (crew.busy) return 'job';
    return 'idle';
  }
  function pick(kind) {
    var list = kind === 'job' ? LINES.job.concat(LINES[crew.busy] || []) : LINES[kind], i;
    do { i = (Math.random() * list.length) | 0; } while (list.length > 1 && i === lastLine[kind]);
    lastLine[kind] = i;
    return list[i];
  }
  function freezeWalk() {
    // Stop him where he is: read his current position off the running transition
    var m = new DOMMatrixReadOnly(getComputedStyle(crewEl).transform), x = m.m41;
    if (Math.abs(x - crew.x) > 1) { walkTarget = crew.x; place(x, 0); crew.x = x; }
  }
  function resumeWalk() {
    if (walkTarget === null) return;
    var d = Math.abs(walkTarget - crew.x); place(walkTarget, Math.max(0.2, d / 90)); walkTarget = null;
  }
  function say() {
    var sr = scene.getBoundingClientRect(), cr = crewEl.getBoundingClientRect();
    bubbleText.textContent = pick(situation());
    bubble.hidden = false;
    var bw = bubble.offsetWidth, cx = cr.left - sr.left + cr.width / 2;
    var left = Math.max(bw / 2 + 4, Math.min(sr.width - bw / 2 - 4, cx));
    bubble.style.left = left + 'px';
    bubble.style.top = (cr.top - sr.top - 8) + 'px';
    bubble.style.setProperty('--tail', (cx - left) + 'px');
    void bubble.offsetWidth; bubble.classList.add('on');
  }
  function openChat() {
    clearTimeout(bubbleTimer);
    if (!chatting) { chatting = true; freezeWalk(); say(); }
    bubbleTimer = setTimeout(closeChat, 5000);
  }
  function closeChat() {
    clearTimeout(bubbleTimer);
    if (!chatting) return;
    chatting = false; bubble.classList.remove('on'); bubble.hidden = true;
    resumeWalk();
  }
  crewEl.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') openChat(); });
  crewEl.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { clearTimeout(bubbleTimer); bubbleTimer = setTimeout(closeChat, 300); } });
  crewEl.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    e.stopPropagation();
    chatting ? closeChat() : openChat();
  });
  doc.addEventListener('pointerdown', function (e) { if (chatting && !crewEl.contains(e.target)) closeChat(); });

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
  function onScreenAt(cx, cy) {
    var r = canvas.getBoundingClientRect();
    ptr = { x: (cx - r.left) * W / r.width, y: (cy - r.top) * H / r.height };
    breakIt();
  }
  // Only a pointer or finger on the TV screen breaks the picture; anywhere in the hero still wakes the crew
  hero.addEventListener('pointermove', function (e) { if (!crewEl.contains(e.target)) poke(); }, { passive: true });
  screenEl.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' || e.buttons) onScreenAt(e.clientX, e.clientY); }, { passive: true });
  screenEl.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) onScreenAt(t.clientX, t.clientY); }, { passive: true });
  screenEl.addEventListener('pointerleave', function () { ptr = null; });
  screenEl.addEventListener('touchend', function () { ptr = null; }, { passive: true });
  tv.addEventListener('pointerdown', function (e) { thump(); onScreenAt(e.clientX, e.clientY); lastMove = performance.now() - 600; });

  /* ---------------- Start ---------------- */
  // The show never delays the message: wait for the fonts (so the letters sample in Chakra Petch)
  // and for the page to settle, then build the picture and let the crew in.
  function begin() {
    build();
    if (reduced) {
      stillFrame();
      crewEl.classList.remove('reach');
      var d = rel(dial); reachTo(d.x, d.y, true);
      return;
    }
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
      lastW = scene.clientWidth;
      var wasPhone = phone;
      build(); makeNoise();
      if (phone !== wasPhone) {                    // crossed the breakpoint: put him where this layout wants him
        armEl.classList.remove('on', 'out'); crewEl.classList.remove('extend', 'sit');
        crewEl.style.left = phone ? '' : '0';
        place(phone ? 0 : besideTV(), 0);
        crew.needTV = true;
      }
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

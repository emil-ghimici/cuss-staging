/* CREW in an inner page's street band (design spec sections 2 and 7): he starts here, does the page's one
   job once when the page is idle, then idles. The header catches him as you scroll (guide.js takes him with
   'crew:left'); while the guide has him, the band shows the job done. Hover (tap on phones): the band's tip.
   Also the 404 scene: he sweeps the broken glyphs into a pile that settles into "404", then points at
   "Back to home" without covering it. Transform only; nothing runs off screen. Reduced motion: the done still. */
(function () {
  'use strict';
  var doc = document;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, reduced ? 0 : ms); }); }
  function whenIdle(fn) {
    var go = function () { if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 2000 }); else setTimeout(fn, 300); };
    if (doc.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }

  /* ---------- His telescopic arm (shares the hero's .reach-arm/.reach-hand look) ---------- */
  function makeArm(scene, crew) {
    var arm = doc.createElement('span'), hand = doc.createElement('span');
    arm.className = 'reach-arm'; hand.className = 'reach-hand';
    scene.appendChild(arm); scene.appendChild(hand);
    function reach(target) {
      var sr = scene.getBoundingClientRect(), cr = crew.getBoundingClientRect(), tr = target.getBoundingClientRect();
      var x = tr.left - sr.left + tr.width / 2, y = tr.top - sr.top + tr.height / 2;
      var left = x < cr.left - sr.left + cr.width / 2;
      crew.classList.toggle('flip', left);
      var sx = cr.left - sr.left + (left ? 26 : 52) / 78 * cr.width, sy = cr.top - sr.top + 52 / 104 * cr.height;
      [arm, hand].forEach(function (el) {
        el.classList.add('still'); el.classList.remove('out');
        el.style.setProperty('--sx', sx + 'px'); el.style.setProperty('--sy', sy + 'px');
        el.style.setProperty('--tx', x + 'px'); el.style.setProperty('--ty', y + 'px');
      });
      arm.style.width = Math.hypot(x - sx, y - sy) + 'px'; arm.style.setProperty('--ang', Math.atan2(y - sy, x - sx) + 'rad');
      crew.classList.add('extend'); arm.classList.add('on'); hand.classList.add('on');
      void arm.offsetWidth;
      if (!reduced) { arm.classList.remove('still'); hand.classList.remove('still'); }
      arm.classList.add('out'); hand.classList.add('out');
      return sleep(470);
    }
    function back() {
      arm.classList.remove('out'); hand.classList.remove('out');
      return sleep(470).then(function () { [arm, hand].forEach(function (el) { el.classList.remove('on'); }); crew.classList.remove('extend'); });
    }
    function off() { [arm, hand].forEach(function (el) { el.classList.remove('on', 'out'); }); crew.classList.remove('extend'); }
    return { reach: reach, back: back, off: off };
  }

  /* ---------- His bubble: beside his head (the band is short), a little screen ---------- */
  function makeBubble(scene, crew, lineOf) {
    var b = doc.createElement('div'), who = doc.createElement('span'), p = doc.createElement('p'), t = 0;
    b.className = 'crew-bubble side left'; b.hidden = true;
    who.className = 'who'; who.textContent = 'CREW';
    b.appendChild(who); b.appendChild(p); scene.appendChild(b);
    function show() {
      clearTimeout(t); p.textContent = lineOf();
      var sr = scene.getBoundingClientRect(), cr = crew.getBoundingClientRect();
      b.hidden = false;
      b.style.left = (cr.left - sr.left - 10) + 'px';
      b.style.top = Math.max(4, cr.top - sr.top + 4) + 'px';
      void b.offsetWidth; b.classList.add('on');
      t = setTimeout(hide, 5000);
    }
    function hide() { clearTimeout(t); b.classList.remove('on'); b.hidden = true; }
    crew.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') show(); });
    crew.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { clearTimeout(t); t = setTimeout(hide, 300); } });
    crew.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { e.stopPropagation(); b.hidden ? show() : hide(); } });
    doc.addEventListener('pointerdown', function (e) { if (!b.hidden && !crew.contains(e.target)) hide(); });
    doc.addEventListener('crew:left', hide);
    return { show: show, hide: hide };
  }

  // Steps per page: reach the target, hold, add a class; `taps` reaches twice (tightening, turning)
  var JOBS = {
    'custom-software': [{ t: '[data-job]', taps: 2 }],
    automation: [{ t: '[data-job]' }],
    dashboards: [{ t: '[data-job]' }],
    websites: [{ t: '[data-job]', hold: 900 }],
    'cloud-it-consulting': [{ t: '[data-job]', taps: 2 }],
    'ai-data': [{ t: '[data-job]', hold: 900 }],
    work: [{ t: '[data-job]', hold: 500 }],
    about: [{ t: '[data-job]' }],
    contact: [{ t: '[data-job]', hold: 1000 }],
    privacy: [{ t: '[data-job="drawer"]', cls: 'step1' }, { t: '[data-job="key"]', taps: 2 }]
  };

  var band = doc.querySelector('[data-band]');
  if (band) {
    var scene = band.querySelector('.band-scene'), crew = scene.querySelector('.crew');
    var arm = makeArm(scene, crew), id = band.getAttribute('data-band'), tipLine = band.getAttribute('data-crew-tip');
    makeBubble(scene, crew, function () { return tipLine; });
    var finished = false;
    function finish() { if (finished) return; finished = true; arm.off(); band.classList.add('done'); }
    // The guide took him: the band shows the job done
    doc.addEventListener('crew:left', finish);
    // Nothing runs while the band is off screen
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { band.classList.toggle('paused', !es[0].isIntersecting); }).observe(band);
    var run = function () {
      crew.classList.add('live');
      if (reduced) { finish(); return; }
      var steps = JOBS[id] || [], chain = sleep(600);
      steps.forEach(function (s) {
        var target = scene.querySelector(s.t);
        if (!target) return;
        for (var i = 0; i < (s.taps || 1); i++) {
          chain = chain.then(function () { if (!finished) return arm.reach(target); })
            .then(function () { return sleep(s.hold || 600); })
            .then(function () { if (!finished) return arm.back(); })
            .then(function () { return sleep(150); });
        }
        if (s.cls) chain = chain.then(function () { band.classList.add(s.cls); return sleep(300); });
      });
      chain.then(function () {
        if (finished) return;
        band.classList.add('done'); finished = true;
        crew.classList.add('flinch'); setTimeout(function () { crew.classList.remove('flinch'); }, 320);   // the nod
      });
    };
    (window.cussLate || Promise.resolve()).then(function () { whenIdle(run); });
  }

  /* ---------- 404 ---------- */
  var lost = doc.querySelector('[data-lost]');
  if (lost) {
    var ls = lost.querySelector('.lost-scene'), lcrew = ls.querySelector('.crew'), broom = ls.querySelector('.broom');
    var home = lost.querySelector('[data-home]'), glyphs = ls.querySelectorAll('.glyph');
    var lines = (lost.getAttribute('data-crew-tip') || '').split(' · ');
    var n = 0;
    makeBubble(ls, lcrew, function () { return lines[n++ % lines.length]; });
    // Scatter the glyphs across the floor of the scene
    var w = ls.clientWidth, h = ls.clientHeight;
    glyphs.forEach(function (g, i) {
      g.style.setProperty('--x', (w * (0.08 + 0.7 * ((i * 37) % 11) / 11)) + 'px');
      g.style.setProperty('--y', (h - 60 - ((i * 53) % 5) * 22) + 'px');
      g.style.setProperty('--r', (((i * 71) % 9) - 4) * 9 + 'deg');
    });
    function swept() { lost.classList.add('swept'); lost.classList.remove('sweeping'); }
    if (reduced) { swept(); return; }
    (window.cussLate || Promise.resolve()).then(function () { whenIdle(function () {
      sleep(800).then(function () {
        // He sweeps towards the middle; the glyphs gather into a pile, which settles into "404"
        lost.classList.add('sweeping');
        var dx = -(w * 0.35);
        lcrew.style.setProperty('--x', dx + 'px'); broom.style.setProperty('--x', dx + 'px');
        glyphs.forEach(function (g, i) {
          g.style.setProperty('--x', (w * 0.42 + (i % 4) * 14) + 'px');
          g.style.setProperty('--y', (h - 80 - Math.floor(i / 4) * 16) + 'px');
          g.style.setProperty('--r', '0deg');
        });
        return sleep(1500);
      }).then(function () {
        swept();
        return sleep(900);
      }).then(function () {
        // He turns and points at "Back to home" from where he stands, never reaching over or covering it
        if (!home) return;
        var hr = home.getBoundingClientRect(), cr = lcrew.getBoundingClientRect();
        lcrew.classList.toggle('flip', hr.left + hr.width / 2 < cr.left);
        lcrew.classList.add('point');
      });
    }); });
  }
})();

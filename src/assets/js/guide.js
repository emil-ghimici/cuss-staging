/* CREW, the site guide (design spec section 2, "How CREW travels").
   He hangs from the bottom of the sticky header on his telescopic arm, like a rope, and travels with the visitor:
   - parked: in the right-hand margin on wide screens, sitting in the header on narrower desktops,
     hanging in the right gutter on phones; never over the reading text
   - while scrolling he swings and lets out a little rope, then settles
   - showpiece sections ([data-crew-stop]) pull him down on his rope to do a job there
   - on the home page he stays up in the header while the hero is in view (the hero's own CREW is on stage)
   - hover or tap: a tip about the section in view ([data-crew-tip])
   Transform only; one requestAnimationFrame loop that runs only while something is moving.
   Reduced motion: no parking or swinging; he simply appears, still, at each showpiece section. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var guide = doc.querySelector('[data-guide]');
  if (!guide || !('IntersectionObserver' in window)) return;
  var swing = guide.querySelector('.guide-swing'), rope = guide.querySelector('.guide-rope'), crewEl = guide.querySelector('.guide-crew');
  var bubble = guide.querySelector('.guide-bubble'), bubbleText = bubble.querySelector('p');
  var hdr = doc.querySelector('.hdr'), hdrEnd = doc.querySelector('.hdr-end'), heroEl = doc.querySelector('[data-hero]');
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mqPhone = matchMedia('(max-width: 760px)');

  // Lines when no section has a tip of its own (approved idle lines)
  var IDLE = ['We fix things. That’s the whole job.', 'The first call’s free, by the way.', 'Got something that needs fixing? That’s the Contact button.'];
  // What he says at each showpiece stop (DRAFT, to be approved)
  var STOP_LINES = { open: 'Hang on, I’ll straighten that.', workshop: 'Mind the tape.' };

  /* ---------- Where he should be ---------- */
  var heroOn = !!heroEl, stop = null, visible = false;
  function mode() {
    if (mqPhone.matches) return 'phone';
    var margin = (innerWidth - Math.min(innerWidth, 1200)) / 2 + 32;
    return margin >= 84 ? 'wide' : 'sit';
  }
  function size() { return { w: crewEl.offsetWidth, h: crewEl.offsetHeight }; }
  // A point in a divider's drawing (viewBox 1280×120, "xMidYMid slice") on screen
  function stopPoint(el, vbx, vby) {
    var r = el.getBoundingClientRect(), s = Math.max(r.width / 1280, r.height / 120);
    return { x: r.left + (vbx - 640) * s + r.width / 2, y: r.top + (vby - 60) * s + r.height / 2 };
  }
  var STOPS = { open: { at: [790, 70] }, workshop: { at: [800, 50] } };
  function target() {
    var m = mode(), c = size(), hh = hdr.offsetHeight, t = { x: 0, len: 0, sit: false };
    if (stop) {
      var k = stop.getAttribute('data-crew-stop'), p = stopPoint(stop, STOPS[k].at[0], STOPS[k].at[1]);
      t.x = Math.min(innerWidth - c.w * 0.5, Math.max(c.w, p.x));
      t.len = p.y - hh - c.h / 2;
      return t;
    }
    if (heroOn || reduced) { t.x = innerWidth - c.w; t.len = -c.h - 12; return t; }   // up in the header, out of sight
    if (m === 'wide') { var margin = (innerWidth - 1200) / 2 + 32; t.x = innerWidth - margin / 2 + c.w * 0.12; t.len = 26; }
    else if (m === 'sit') { var e = hdrEnd.getBoundingClientRect(); t.x = e.left - 32; t.len = -c.h - 2; t.sit = true; }
    else { t.x = innerWidth - 16; t.len = 4; }
    return t;
  }

  /* ---------- Springs: x, rope length, swing angle ---------- */
  var st = { x: innerWidth, len: -200, ang: 0, vx: 0, vlen: 0, vang: 0 }, raf = 0, lastY = scrollY, scrollV = 0, lastT = 0;
  function render() {
    var c = size(), hand = c.w * 0.62;
    swing.style.transform = 'translate(' + st.x.toFixed(1) + 'px,0) rotate(' + st.ang.toFixed(2) + 'deg)';
    var ropeLen = Math.max(0, st.len + 6);
    rope.style.transform = 'scaleY(' + (ropeLen / 100).toFixed(3) + ')';
    crewEl.style.transform = 'translate(' + (-hand).toFixed(1) + 'px,' + st.len.toFixed(1) + 'px)';
  }
  function step(t) {
    raf = 0;
    var dt = lastT ? Math.min(3, (t - lastT) / 16.667) : 1; lastT = t;
    var g = target();
    guide.classList.toggle('sit', g.sit);
    // Scrolling lets out a little rope and swings him; the springs bring him back
    var extra = Math.min(40, Math.abs(scrollV) * 1.2);
    var k = 0.08 * dt, d = Math.pow(0.78, dt);
    st.vx = (st.vx + (g.x - st.x) * k) * d; st.x += st.vx * dt;
    st.vlen = (st.vlen + (g.len + (g.sit || stop ? 0 : extra) - st.len) * k) * d; st.len += st.vlen * dt;
    var angT = g.sit ? 0 : Math.max(-14, Math.min(14, scrollV * 0.5));
    st.vang = (st.vang + (angT - st.ang) * 0.06 * dt) * Math.pow(0.9, dt); st.ang += st.vang * dt;
    scrollV *= Math.pow(0.85, dt);
    render();
    var moving = Math.abs(g.x - st.x) > 0.5 || Math.abs(g.len - st.len) > 0.5 || Math.abs(st.ang) > 0.1 || Math.abs(scrollV) > 0.1 ||
      Math.abs(st.vx) + Math.abs(st.vlen) + Math.abs(st.vang) > 0.05;
    if (moving) raf = requestAnimationFrame(step); else { lastT = 0; arrived(); }
    placeBubble();
  }
  function kick() { if (!raf) { lastT = 0; raf = requestAnimationFrame(step); } }
  function jump() { var g = target(); st.x = g.x; st.len = g.len; st.ang = 0; guide.classList.toggle('sit', g.sit); render(); }

  /* ---------- Jobs at the showpiece stops ---------- */
  var done = {};
  function arrived() {
    if (!stop) return;
    var k = stop.getAttribute('data-crew-stop');
    if (done[k]) return;
    done[k] = true;
    say(STOP_LINES[k], 3000);
    crewEl.classList.add('tapping');
    setTimeout(function () {
      crewEl.classList.remove('tapping');
      if (k === 'open') stop.classList.add('fixed');
      var neon = stop.querySelector('[data-neon]');
      if (neon && !reduced) { neon.classList.remove('ignite'); void neon.getBBox(); neon.classList.add('ignite'); }
    }, reduced ? 0 : 450);
  }

  /* ---------- His tips ---------- */
  var bubbleTimer = 0;
  function placeBubble() {
    if (bubble.hidden) return;
    var r = crewEl.getBoundingClientRect();
    bubble.style.left = (r.left - 10) + 'px';
    bubble.style.top = Math.max(hdr.offsetHeight + 4, r.top + 4) + 'px';
  }
  function say(text, ms) {
    clearTimeout(bubbleTimer);
    bubbleText.textContent = text;
    bubble.hidden = false; placeBubble();
    void bubble.offsetWidth; bubble.classList.add('on');
    bubbleTimer = setTimeout(hush, ms || 5000);
  }
  function hush() { clearTimeout(bubbleTimer); bubble.classList.remove('on'); bubble.hidden = true; }
  function tip() {
    if (stop) return STOP_LINES[stop.getAttribute('data-crew-stop')];
    var y = innerHeight * 0.4, best = null;
    doc.querySelectorAll('[data-crew-tip]').forEach(function (s) {
      var r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom >= y) best = s;
    });
    return best ? best.getAttribute('data-crew-tip') : IDLE[(Math.random() * IDLE.length) | 0];
  }
  crewEl.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') say(tip()); });
  crewEl.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { clearTimeout(bubbleTimer); bubbleTimer = setTimeout(hush, 300); } });
  crewEl.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { e.stopPropagation(); bubble.hidden ? say(tip()) : hush(); } });
  doc.addEventListener('pointerdown', function (e) { if (!bubble.hidden && !crewEl.contains(e.target)) hush(); });

  /* ---------- Watching the page ---------- */
  function show(on) {
    visible = on;
    guide.hidden = !on;
  }
  function begin() {
    show(!reduced);
    if (heroEl) {
      new IntersectionObserver(function (es) { heroOn = es[0].isIntersecting; if (reduced) return; kick(); }, { threshold: 0.35 }).observe(heroEl);
    }
    var stopIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) stop = e.target;
        else if (stop === e.target) stop = null;
      });
      if (reduced) { show(!!stop); if (stop) { jump(); arrived(); } return; }
      kick();
    }, { rootMargin: '-30% 0px -30% 0px' });
    doc.querySelectorAll('[data-crew-stop]').forEach(function (s) { stopIO.observe(s); });
    window.addEventListener('scroll', function () {
      var y = scrollY; scrollV = Math.max(-40, Math.min(40, scrollV + (y - lastY) * 0.25)); lastY = y;
      if (reduced) { if (stop) jump(); return; }
      kick();
    }, { passive: true });
    window.addEventListener('resize', function () { reduced ? jump() : kick(); });
    // Arrival: he rappels down out of the header
    st.x = target().x; st.len = -size().h - 12; render();
    if (!reduced) kick();
  }
  function whenIdle(fn) {
    var go = function () { if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 2000 }); else setTimeout(fn, 300); };
    if (doc.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }
  whenIdle(begin);
})();

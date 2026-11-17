/* CREW, the site guide: one character, the same size as in the hero (design spec section 2, "How CREW travels").
   - Caught where he is: as the page scrolls up, the header's bottom edge reaches him and he grabs it right there,
     hanging from it on his arm-rope.
   - Rappels: he lets out rope to the nearest box below him. If the box isn't straight below, he fires his second
     arm at it and pulls himself across. He sits on the box's top edge, lets go, and the rope zips back up.
   - Rides with the page while perched (he is part of the document then: no work while you scroll).
   - Scrolling back up: when his box leaves the bottom of the screen, he grabs the top of the first box above him,
     from where he went out, and pulls himself up onto it.
   - Home page: he starts as the hero's CREW and goes back to the hero when you scroll back up to it.
   - Showpiece signs ([data-crew-stop]) are boxes too, with a job when he lands on them.
   - Hover or tap: the tip for the section he's sitting in.
   Transform only. Reduced motion: no rappelling; he simply appears, still, on a box near what's on screen. */
(function () {
  'use strict';
  var doc = document;
  var fixedEl = doc.querySelector('[data-guide]');
  if (!fixedEl) return;
  var docEl = doc.querySelector('.g-doc'), crewEl = docEl.querySelector('.g-crew');
  var rope = fixedEl.querySelector('.g-rope'), arm = fixedEl.querySelector('.g-arm'), grip = fixedEl.querySelector('.g-grip');
  var bubble = crewEl.querySelector('.g-bubble'), bubbleText = bubble.querySelector('p');
  var hdr = doc.querySelector('.hdr');
  var heroEl = doc.querySelector('[data-hero]'), heroCrew = heroEl && heroEl.querySelector('.scene .crew');
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mqPhone = matchMedia('(max-width: 760px)');

  var IDLE = ['We fix things. That’s the whole job.', 'The first call’s free, by the way.', 'Got something that needs fixing? That’s the Contact button.'];
  // What he says at each showpiece stop (approved 2026-11-17)
  var STOP_LINES = { open: 'Hang on, I’ll straighten that.', workshop: 'Mind the tape.' };
  // Where he sits on each sign: a point of the divider drawing (viewBox 1280×120, "xMidYMid slice")
  var STOP_SEAT = { open: [700, 40], workshop: [700, 22] };
  var PERCHES = '.info, .card, .steps li, .faq details, .crt, .mon, [data-crew-stop]';

  function hh() { return hdr.offsetHeight; }
  function cw() { return crewEl.offsetWidth; }
  function ch() { return crewEl.offsetHeight; }
  function dangle() { return ch() * 0.2; }                 // his tracks hang into the box's top padding

  /* ---------- Where he is: perched in the page, or in the fixed layer while moving ---------- */
  var done = {};                                           // sign jobs done on this page
  var perch = null, perchDoc = { x: 0, y: 0 }, pos = { x: 0, y: 0 };   // pos: screen coords while in the fixed layer
  function putFixed(x, y) {
    if (crewEl.parentNode !== fixedEl) { fixedEl.appendChild(crewEl); fixedEl.classList.add('on'); }
    pos.x = x; pos.y = y;
    crewEl.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
  }
  function putDoc(x, y) {                                   // document coords
    if (crewEl.parentNode !== docEl) { docEl.appendChild(crewEl); fixedEl.classList.remove('on'); }
    perchDoc.x = x; perchDoc.y = y;
    crewEl.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
  }
  function line(el, x1, y1, x2, y2) {
    var len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
    el.style.transform = 'translate(' + x1.toFixed(1) + 'px,' + y1.toFixed(1) + 'px) rotate(' + ang.toFixed(4) + 'rad) scaleX(' + (len / 100).toFixed(3) + ')';
  }
  function flipped() { return crewEl.classList.contains('flip'); }
  function handAt() { return { x: pos.x + cw() * (flipped() ? 0.38 : 0.62), y: pos.y + ch() * 0.04 }; }
  function shoulderAt() { return { x: pos.x + cw() * (flipped() ? 0.34 : 0.66), y: pos.y + ch() * 0.5 }; }

  /* ---------- Boxes he can sit on ---------- */
  function seatOf(el) {
    var r = el.getBoundingClientRect(), k = el.getAttribute('data-crew-stop');
    if (k) {
      var s = Math.max(r.width / 1280, r.height / 120), p = STOP_SEAT[k];
      return { x: r.left + (p[0] - 640) * s + r.width / 2 - cw() / 2, top: r.top + (p[1] - 60) * s + r.height / 2, el: el };
    }
    return { left: r.left, right: r.right, top: r.top, el: el };
  }
  function seatX(seat, nearX) {
    if (seat.x !== undefined) return seat.x;
    var lo = seat.left + 6, hi = seat.right - cw() - 6;
    if (hi < lo) return lo;
    if (mqPhone.matches) return hi;                         // phones: the right-hand end keeps most text clear
    return Math.max(lo, Math.min(hi, nearX - cw() / 2));
  }
  function candidates() {
    var out = [], minTop = hh() + ch() * 0.6, maxTop = innerHeight - 24;
    doc.querySelectorAll(PERCHES).forEach(function (el) {
      if (el.closest('.panel, .menu, [data-hero], .g-doc') || el.offsetParent === null) return;
      var s = seatOf(el);
      if (s.top >= minTop && s.top <= maxTop) out.push(s);
    });
    return out;
  }
  function nearestBelow(fromX, fromY) {
    var best = null, bd = Infinity;
    candidates().forEach(function (s) {
      if (s.top < fromY + ch() * 0.5) return;
      var x = seatX(s, fromX), d = Math.abs(x + cw() / 2 - fromX) + (s.top - fromY) * 0.5;
      var k = s.el.getAttribute('data-crew-stop');
      if (k && !done[k]) d *= 0.2;                                   // a sign with a job waiting pulls him in
      if (d < bd) { bd = d; best = s; }
    });
    return best;
  }
  // The first box above him, as close to straight up from where he went out as possible
  function firstAbove(docY, atX) {
    var best = null, bd = Infinity;
    candidates().forEach(function (s) {
      var up = docY - (s.top + scrollY);
      if (up <= 0) return;
      var d = up + Math.abs(seatX(s, atX) + cw() / 2 - atX) * 1.5;
      if (d < bd) { bd = d; best = s; }
    });
    return best;
  }

  /* ---------- Tweens (one rAF loop, only while he's moving) ---------- */
  var busy = false;
  function tween(ms, fn) {
    return new Promise(function (res) {
      var t0 = 0;
      function f(t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        fn(e, k);
        if (k < 1) requestAnimationFrame(f); else res();
      }
      requestAnimationFrame(f);
    });
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Second arm: fire it at the seat's edge, pull himself there, let go
  function pullTo(tx, ty, alongside) {
    var sx = pos.x, sy = pos.y, gx = tx + cw() * 0.5, gy = ty + ch() * 0.8;
    crewEl.classList.toggle('flip', tx < sx);
    arm.classList.add('on'); grip.classList.add('on');
    return tween(220, function (e) {                                 // shoot the arm out
      var s = shoulderAt(), x = s.x + (gx - s.x) * e, y = s.y + (gy - s.y) * e;
      line(arm, s.x, s.y, x, y); grip.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      if (alongside) alongside();
    }).then(function () {
      return tween(Math.min(900, 300 + Math.hypot(tx - sx, ty - sy) * 1.2), function (e) {   // pull himself in
        putFixed(sx + (tx - sx) * e, sy + (ty - sy) * e);
        var s = shoulderAt(); line(arm, s.x, s.y, gx, gy);
        if (alongside) alongside();
      });
    }).then(function () { arm.classList.remove('on'); grip.classList.remove('on'); });
  }

  /* ---------- The moves ---------- */
  var anchorX = 0;
  function ropeLine() { var h = handAt(); line(rope, anchorX, hh(), h.x, h.y); }
  // Caught by the header where he is; rappel to the next box below
  function caught() {
    busy = true; perch = null; hush();
    var r = crewEl.getBoundingClientRect();
    putFixed(r.left, Math.max(hh() - ch() * 0.05, r.top));
    crewEl.classList.add('hang');
    anchorX = handAt().x; rope.classList.add('on'); ropeLine();
    return descend();
  }
  function descend() {
    var seat = null;
    function look() { ropeLine(); seat = nearestBelow(anchorX, pos.y); return seat ? go() : sleep(250).then(look); }
    return look();
    function go() {
      var x = seatX(seat, anchorX), straight = Math.abs(x - pos.x) < 24, y0 = pos.y;
      // Let out rope straight down to the height of the box (tracking it if the page moves)
      return tween(Math.min(1100, 250 + Math.abs(seat.el.getBoundingClientRect().top - y0) * 0.9), function (e) {
        var s = seatOf(seat.el), ty = s.top - ch() + dangle();
        putFixed(pos.x, y0 + (ty - y0) * e); ropeLine();
      }).then(function () {
        var s = seatOf(seat.el), tx = seatX(s, anchorX), ty = s.top - ch() + dangle();
        return straight ? null : pullTo(tx, ty, ropeLine);           // second arm pulls him across
      }).then(function () { land(seat.el); });
    }
  }
  function land(el) {
    var s = seatOf(el), x = seatX(s, pos.x + cw() / 2), y = s.top - ch() + dangle();
    crewEl.classList.remove('hang');
    if (rope.classList.contains('on')) {                              // the rope zips back up to the header
      var h = handAt();
      tween(250, function (e) { line(rope, anchorX, hh(), h.x + (anchorX - h.x) * e, h.y + (hh() - h.y) * e); })
        .then(function () { rope.classList.remove('on'); });
    }
    putDoc(x + scrollX, y + scrollY);
    perch = el; busy = false;
    var k = el.getAttribute('data-crew-stop');
    if (k) job(k, el);
    check();
  }
  // His box went off the bottom: grab the top of the first box above, from where he went out, and pull up onto it
  function climb() {
    var outX = perchDoc.x - scrollX + cw() / 2, seat = firstAbove(perchDoc.y + ch(), outX);
    if (!seat) return;
    busy = true; perch = null; hush();
    putFixed(perchDoc.x - scrollX, innerHeight);
    var tx = seatX(seat, outX), ty = seat.top - ch() + dangle();
    return pullTo(tx, ty).then(function () { land(seat.el); });
  }

  /* ---------- Jobs at the signs ---------- */
  function job(k, el) {
    if (done[k]) return;
    done[k] = true;
    say(STOP_LINES[k], 3000);
    crewEl.classList.add('tapping');
    setTimeout(function () {
      crewEl.classList.remove('tapping');
      if (k === 'open') el.classList.add('fixed');
      var neon = el.querySelector('[data-neon]');
      if (neon && !reduced) { neon.classList.remove('ignite'); void neon.getBBox(); neon.classList.add('ignite'); }
    }, reduced ? 0 : 450);
  }

  /* ---------- Tips ---------- */
  var bubbleTimer = 0;
  function say(text, ms) {
    clearTimeout(bubbleTimer);
    bubbleText.textContent = text;
    bubble.hidden = false;
    bubble.classList.toggle('right', crewEl.getBoundingClientRect().left < Math.min(250, innerWidth / 2));
    void bubble.offsetWidth; bubble.classList.add('on');
    bubbleTimer = setTimeout(hush, ms || 5000);
  }
  function hush() { clearTimeout(bubbleTimer); bubble.classList.remove('on'); bubble.hidden = true; }
  function tip() {
    if (perch && perch.getAttribute('data-crew-stop')) return STOP_LINES[perch.getAttribute('data-crew-stop')];
    var sec = perch && perch.closest('[data-crew-tip]');
    return sec ? sec.getAttribute('data-crew-tip') : IDLE[(Math.random() * IDLE.length) | 0];
  }
  crewEl.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') say(tip()); });
  crewEl.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { clearTimeout(bubbleTimer); bubbleTimer = setTimeout(hush, 300); } });
  crewEl.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { e.stopPropagation(); bubble.hidden ? say(tip()) : hush(); } });
  doc.addEventListener('pointerdown', function (e) { if (!bubble.hidden && !crewEl.contains(e.target)) hush(); });

  /* ---------- The hero hands him over, and gets him back ---------- */
  var withHero = !!heroCrew;
  function heroRect() { return heroCrew.getBoundingClientRect(); }
  function takeFromHero() {
    var r = heroRect();
    withHero = false;
    heroCrew.classList.add('away');
    crewEl.hidden = false;
    crewEl.classList.toggle('flip', heroCrew.classList.contains('flip'));
    putFixed(r.left, r.top);
    caught();
  }
  function giveToHero() {
    busy = true; perch = null; hush();
    var r = crewEl.getBoundingClientRect(), h = heroRect();
    putFixed(r.left, r.top);
    pullTo(h.left, h.top).then(function () {
      crewEl.hidden = true; heroCrew.classList.remove('away');
      withHero = true; busy = false;
    });
  }

  /* ---------- Watching the scroll ---------- */
  function check() {
    if (busy) return;
    if (withHero) {
      if (heroCrew.classList.contains('live') && heroRect().top <= hh()) takeFromHero();
      return;
    }
    if (heroCrew && heroEl.getBoundingClientRect().bottom > innerHeight * 0.75 && heroRect().top > hh() + 10) { giveToHero(); return; }
    if (!perch) return;
    var top = perchDoc.y - scrollY;
    if (top <= hh()) caught();                                       // the header has reached him
    else if (perch.getBoundingClientRect().top > innerHeight) climb();   // his box went off the bottom
  }
  var ticking = false;
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; check(); }); } }

  // Reduced motion: no moves; after scrolling settles he simply sits, still, on a box near what's on screen
  var settle = 0;
  function sitStill() {
    // one CREW at a time: while the hero's CREW is on screen, he stays there
    if (heroCrew && heroRect().bottom > hh()) { crewEl.hidden = true; heroCrew.classList.remove('away'); return; }
    var pick = null;
    candidates().forEach(function (s) { if (!pick || Math.abs(s.top - innerHeight * 0.4) < Math.abs(pick.top - innerHeight * 0.4)) pick = s; });
    if (!pick) return;
    if (heroCrew) heroCrew.classList.add('away');
    crewEl.hidden = false;
    putDoc(seatX(pick, innerWidth * 0.75) + scrollX, pick.top - ch() + dangle() + scrollY);
    perch = pick.el;
    var k = pick.el.getAttribute('data-crew-stop'); if (k) job(k, pick.el);
  }

  function begin() {
    fixedEl.hidden = false;
    if (reduced) {
      window.addEventListener('scroll', function () { clearTimeout(settle); settle = setTimeout(sitStill, 150); }, { passive: true });
      sitStill();
      return;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () {
      if (perch && !busy) { var s = seatOf(perch); putDoc(seatX(s, perchDoc.x - scrollX + cw() / 2) + scrollX, s.top - ch() + dangle() + scrollY); }
    });
    if (!heroCrew) {
      // Other pages: he arrives on his rope out of the header, three-quarters across
      crewEl.hidden = false;
      putFixed(innerWidth * 0.75 - cw() / 2, hh() - ch());
      crewEl.classList.add('hang');
      anchorX = handAt().x; rope.classList.add('on'); busy = true;
      descend();
    } else check();
  }
  function whenIdle(fn) {
    var go = function () { if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 2000 }); else setTimeout(fn, 300); };
    if (doc.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }
  whenIdle(begin);
})();

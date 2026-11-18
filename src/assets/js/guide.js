/* CREW, the site guide: one character, the same size as in the hero (design spec section 2, "How CREW travels").
   - Grab (during the scroll): the header's bottom edge reaches him and he clamps it with his telescopic arm, right
     where he is. The top bar is his ONLY point of contact for rappelling.
   - Hang: dead still in the fixed layer while the page scrolls under him; his eye watches it pass.
   - He never moves while the page moves. "Scrolling stopped" = no movement for CREW_STILL_MS, or `scrollend`;
     a finger on the screen counts as scrolling. Then, after CREW_DELAY_MS:
       straight down: the arm telescopes out to the box below; he lands with a squash; the arm retracts.
       off to one side: the second arm hooks the box's top edge and reels him across.
       no box below but one on screen: he reels himself up his arm to it; none on screen: up into the top bar.
     Scrolling again mid-move freezes him where he is (he re-clamps the top bar); he picks afresh next time.
   - Scrolling up: his box takes him out of view; after the stop and delay he rappels from the top bar to a box in view.
   - He sits on a box's top edge and rides with the page until the header catches him again.
   - Home: he starts as the hero's (or a page band's) CREW and goes back there when you scroll back up to it.
   - Showpiece signs ([data-crew-stop]) are boxes too, with a job when he lands on them.
   Transform only. Reduced motion: no moves; after the same stop and delay he simply appears, still, on a box. */
(function () {
  'use strict';
  var doc = document;
  var fixedEl = doc.querySelector('[data-guide]');
  if (!fixedEl) return;

  /* Tunable (README section 2, decided 2026-11-17; to be tested on staging, a longer delay is expected to suit) */
  var CREW_STILL_MS = 150;     // no page movement for this long = scrolling stopped
  var CREW_DELAY_MS = 600;     // then he waits this long before he moves
  var GRAB_MS = 150, JOLT_MS = 400, PEEK_AFTER_MS = 4000, FIRE_MS = 200, RETRACT_MS = 250, SQUASH_PX = 2;
  function travelMs(px) { return Math.min(1200, 400 + Math.abs(px)); }   // 400 ms + 1 ms per px, max 1200 ms

  var docEl = doc.querySelector('.g-doc'), crewEl = docEl.querySelector('.g-crew'), svg = crewEl.querySelector('svg');
  var arm1 = fixedEl.querySelector('.g-arm1'), arm2 = fixedEl.querySelector('.g-arm2');
  var hand1 = fixedEl.querySelector('.g-hand1'), grip = fixedEl.querySelector('.g-hand2');
  var bubble = crewEl.querySelector('.g-bubble'), bubbleText = bubble.querySelector('p');
  var hdr = doc.querySelector('.hdr');
  // His home: the home hero, or an inner page's street band
  var homeEl = doc.querySelector('[data-crew-home], [data-hero]'), homeCrew = homeEl && homeEl.querySelector('.crew');
  // The Control room's storefront (room.js): a scene of its own, like the hero. He's handed in on its pavement.
  var shopEl = doc.querySelector('[data-shop]'), shopCrew = shopEl && shopEl.querySelector('.shop-crew');
  if (homeEl && homeEl.hasAttribute('data-crew-stay')) return;            // Privacy, 404: he stays in the band
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mqPhone = matchMedia('(max-width: 760px)');

  var IDLE = ['We fix things. That’s the whole job.', 'The first call’s free, by the way.', 'Got something that needs fixing? That’s the Contact button.'];
  // What he says at each showpiece stop (approved 2026-11-17)
  var STOP_LINES = { open: 'Hang on, I’ll straighten that.', workshop: 'Mind the tape.' };
  // Where he sits on each sign: a point of the divider drawing (viewBox 1280×120, "xMidYMid slice")
  var STOP_SEAT = { open: [700, 40], workshop: [700, 22] };
  // Boxes he sits on; a page can narrow them (Contact: only the CRT preview; Work: the work cards)
  var PERCHES = doc.body.getAttribute('data-crew-perches') || '.info, .card, .steps li, .vsteps li, .faq details, .crt, .mon, [data-crew-stop]';

  function hh() { return hdr.offsetHeight; }
  function cw() { return crewEl.offsetWidth; }
  function ch() { return crewEl.offsetHeight; }
  function dangle() { return ch() * 0.2; }                 // his tracks hang into the box's top padding
  function hangGap() { return ch() * 0.16; }               // how far below the top bar he hangs when caught
  function lerp(a, b, e) { return a + (b - a) * e; }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  function easeInOut(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }

  /* ---------- Where he is ---------- */
  // mode: 'home' (in the hero/band), 'perch' (sitting on a box, part of the page), 'hang' (from the top bar),
  //       'move' (on his way somewhere; fixed layer), 'tucked' (up in the top bar, out of view, near a Contact button),
  //       'shop' (in the Control room's storefront, which runs him),
  //       'below' (fell out past the bottom of the screen; fixed layer, out of view, comes back up from there)
  var mode = 'home', perch = null, perchDoc = { x: 0, y: 0 }, pos = { x: 0, y: 0 };
  var lastFrame = 0;                                       // the last frame any move of his ran (the "never stuck" check)
  var done = {};                                           // sign jobs done on this page
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
  // A telescopic arm from (x1,y1) to (x2,y2): the bar grows in length (its segments keep their size, never
  // stretched) and its round hand sits at the far end. It lives in the fixed layer, so its width costs no page layout.
  function bar(el, hand, x1, y1, x2, y2) {
    var len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
    el.style.width = len.toFixed(1) + 'px';
    el.style.transform = 'translate(' + x1.toFixed(1) + 'px,' + y1.toFixed(1) + 'px) rotate(' + ang.toFixed(4) + 'rad)';
    if (hand) hand.style.transform = 'translate(' + x2.toFixed(1) + 'px,' + y2.toFixed(1) + 'px)';
  }
  function flipped() { return crewEl.classList.contains('flip'); }
  // Where he is on screen right now: in the fixed layer that's pos; sitting on a box he's part of the page
  function at() { if (crewEl.parentNode === fixedEl) return pos; var r = crewEl.getBoundingClientRect(); return { x: r.left, y: r.top }; }
  function handAt() { return { x: pos.x + cw() * (flipped() ? 0.38 : 0.62), y: pos.y + ch() * 0.04 }; }
  // His main arm's shoulder (the same point the hero's telescopic arm grows from) and the second arm's (the stub on his other side)
  function shoulder1() { var p = at(); return { x: p.x + cw() * (flipped() ? 12 : 66) / 78, y: p.y + ch() * 54 / 104 }; }   // body's edge: straight up clears his head
  function shoulderAt() { var p = at(); return { x: p.x + cw() * (flipped() ? 65.5 : 12.5) / 78, y: p.y + ch() * 54 / 104 }; }
  function tilt(deg) { svg.style.rotate = deg ? deg.toFixed(2) + 'deg' : ''; }

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
  function seatY(seat) { return seat.top - ch() + dangle(); }
  function candidates() {
    var out = [], minTop = hh() + ch() - dangle() + hangGap() + 2, maxTop = innerHeight - 24;   // seated, he's fully below the header
    doc.querySelectorAll(PERCHES).forEach(function (el) {
      if (el.closest('[data-crew-home], [data-hero], [data-shop], .g-doc') || el.offsetParent === null) return;
      if (el.closest('[data-crew-never]')) return;
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

  /* ---------- Tweens: one rAF loop, only while he's moving. A move can be frozen mid-way. ---------- */
  var moveTok = null;
  function tween(ms, ease, fn) {
    var tok = moveTok = { dead: false };
    return new Promise(function (res) {
      var t0 = 0;
      function f(t) {
        if (tok.dead) return res(false);
        if (!t0) t0 = t;
        lastFrame = performance.now();
        var k = Math.min(1, (t - t0) / ms);
        fn(ease(k), k);
        if (k < 1) requestAnimationFrame(f); else res(true);
      }
      requestAnimationFrame(f);
    });
  }
  // Decorations that may outlive a move (an arm retracting): stop if their own generation changed
  function anim(ms, fn, still) {
    return new Promise(function (res) {
      var t0 = 0;
      function f(t) {
        if (still && !still()) return res(false);
        if (!t0) t0 = t;
        lastFrame = performance.now();
        var k = Math.min(1, (t - t0) / ms);
        fn(k);
        if (k < 1) requestAnimationFrame(f); else res(true);
      }
      requestAnimationFrame(f);
    });
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- His arms ---------- */
  var anchorX = 0, arm1Gen = 0;
  function arm1Line() { var s = shoulder1(); bar(arm1, hand1, s.x, s.y, anchorX, hh()); }
  function arm1On() { arm1.classList.add('on'); hand1.classList.add('on'); crewEl.classList.add('extend'); }   // his own arm folds away
  function arm1Off() { arm1.classList.remove('on'); hand1.classList.remove('on'); crewEl.classList.remove('extend'); }
  // Shoots up from his hand and clamps the top bar
  function clampTopBar() {
    var g = ++arm1Gen, h = shoulder1();
    anchorX = h.x;
    arm1On(); crewEl.classList.add('hang');
    return anim(reduced ? 0 : GRAB_MS, function (k) { var s = shoulder1(); bar(arm1, hand1, s.x, s.y, anchorX, lerp(s.y, hh(), easeOut(k))); }, function () { return g === arm1Gen; });
  }
  // Unclamps and retracts into his shoulder
  function retractArm1() {
    if (!arm1.classList.contains('on')) return;
    var g = ++arm1Gen, ax = anchorX, ay = hh();
    anim(RETRACT_MS, function (k) { var e = easeOut(k), s = shoulder1(); bar(arm1, hand1, s.x, s.y, lerp(ax, s.x, e), lerp(ay, s.y, e)); }, function () { return g === arm1Gen; })
      .then(function (ok) { if (ok) arm1Off(); });
  }
  function dropArm2() { arm2.classList.remove('on'); grip.classList.remove('on'); }
  function jolt() {
    if (reduced) return;
    crewEl.classList.remove('jolt'); void crewEl.offsetWidth; crewEl.classList.add('jolt');
    setTimeout(function () { crewEl.classList.remove('jolt'); }, JOLT_MS);
  }
  function squash() {
    crewEl.style.setProperty('--squash', (1 - SQUASH_PX / ch()).toFixed(4));
    crewEl.classList.remove('land'); void crewEl.offsetWidth; crewEl.classList.add('land');
    setTimeout(function () { crewEl.classList.remove('land'); }, 220);
  }

  /* ---------- Never on, over or beside a Contact button (hard rule: the world never sits between a visitor
     and the Contact button). Hanging there, he pulls himself up into the top bar, out of the way. ---------- */
  var NEVER = 'main .btn-contact, [data-crew-never]', NEVER_GAP = 32;
  function nearNever() {
    var r = crewEl.getBoundingClientRect();
    return Array.prototype.some.call(doc.querySelectorAll(NEVER), function (el) {
      var b = el.getBoundingClientRect();
      return b.width > 0 && r.left < b.right + NEVER_GAP && r.right > b.left - NEVER_GAP && r.top < b.bottom + NEVER_GAP && r.bottom > b.top - NEVER_GAP;
    });
  }
  function tuck() {
    if (moveTok) moveTok.dead = true;
    mode = 'tucked'; tilt(0); dropArm2(); hush(); clearTimeout(peekT);
    var x0 = pos.x, y0 = pos.y, y1 = hh() - ch();
    return tween(reduced ? 1 : 200, easeOut, function (e) { putFixed(x0, lerp(y0, y1, e)); if (arm1.classList.contains('on')) arm1Line(); })
      .then(function () { arm1Off(); });
  }

  /* ---------- Hanging from the top bar ---------- */
  var peekT = 0;
  function startHang() {
    mode = 'hang'; perch = null;
    clearTimeout(peekT);
    peekT = setTimeout(function peek() {                     // after 4 s he lifts one track to check his footing
      if (mode !== 'hang') return;
      crewEl.classList.add('peek');
      setTimeout(function () { crewEl.classList.remove('peek'); }, 700);
    }, PEEK_AFTER_MS);
  }
  // Grab: caught by the header where he is (during the scroll)
  function grab(x, y) {
    hush(); tilt(0); dropArm2();
    putFixed(x, y);
    startHang();
    clampTopBar(); jolt();
  }
  // Scrolling resumed mid-move: hold still on screen, clamp the top bar again
  function freeze() {
    if (moveTok) moveTok.dead = true;
    if (mode !== 'move') return;
    tilt(0); dropArm2();
    startHang();
    clampTopBar();
  }

  /* ---------- The moves (after the stop and the delay) ---------- */
  // To a seat ({x?|left,right, top, el}) or home (el === null)
  function rappelTo(seat, toHome) {
    mode = 'move'; hush();
    // tx: where he wants to end up (wantX: a set spot, like a monitor's middle); he gets there by pulling, then rolling
    var tx = toHome ? seat.x : seat.wantX !== undefined ? seat.wantX : seatX(seat, handAt().x), ty = toHome ? seat.y : seatY(seat);
    var x0 = pos.x, y0 = pos.y;
    // The nearest spot on the box he can sit on, from where he is
    var landX = toHome ? tx : seat.x !== undefined ? seat.x : Math.max(seat.left + 6, Math.min(Math.max(seat.left + 6, seat.right - cw() - 6), x0));
    if (Math.abs(landX - x0) < 24 && arm1.classList.contains('on')) {
      // Straight up or down: on the arm clamped to the top bar (his only grappling point, up or down), ease-out;
      // then he rolls along the box to where he wants to be
      if (Math.abs(ty - y0) < 2) { putFixed(landX, ty); return arrive(seat, toHome, tx); }
      return tween(travelMs(ty - y0), easeOut, function (e) { putFixed(lerp(x0, landX, e), lerp(y0, ty, e)); arm1Line(); })
        .then(function (ok) { if (ok) return arrive(seat, toHome, tx); });
    }
    // Off to one side: a grappling hook, never a pole. He lands at the nearest spot on the box he can sit on, and the
    // second arm hooks the top edge right where his leading shoulder will end up, so it only ever pulls him towards
    // the hook. Anything further along, he covers on his tracks (roll).
    crewEl.classList.toggle('flip', landX < x0);
    var lead = cw() * (flipped() ? 12 : 66) / 78;                   // his leading shoulder, in the direction of the pull
    var hook = { x: landX + lead, y: toHome ? ty + ch() * 54 / 104 : seat.top };
    var land = { x: landX, y: ty };
    arm2.classList.add('on'); grip.classList.add('on');
    var s0 = shoulderAt();
    return tween(FIRE_MS, easeOut, function (e) {
      var x = lerp(s0.x, hook.x, e), y = lerp(s0.y, hook.y, e);
      bar(arm2, grip, s0.x, s0.y, x, y);
    }).then(function (ok) {
      if (!ok) return false;
      retractArm1();                                               // the first arm lets go
      crewEl.classList.remove('hang');
      var dir = land.x > x0 ? 1 : -1, d = Math.hypot(land.x - x0, land.y - y0);
      // Reeled in diagonally, tilted into the pull and straightening as he sits
      return tween(travelMs(d), easeInOut, function (e) {
        putFixed(lerp(x0, land.x, e), lerp(y0, land.y, e));
        var s = shoulderAt(); bar(arm2, grip, s.x, s.y, hook.x, hook.y);
        tilt(dir * 10 * (1 - e));
      });
    }).then(function (ok) { if (ok) { dropArm2(); return arrive(seat, toHome, tx); } });
  }
  function arrive(seat, toHome, wantX) {
    tilt(0); crewEl.classList.remove('hang');
    var armOut = arm1.classList.contains('on');
    retractArm1();
    // Home: the arm comes all the way in before the hero's (or band's, or the shop's) CREW takes over, never left floating
    if (toHome) return sleep(armOut ? RETRACT_MS + 30 : 0).then(toHome === 'shop' ? intoShop : backHome);
    squash();
    return sitOn(seat.el, wantX);
  }
  // Sits exactly where he landed (never moved on the spot); if he wants to be further along the box, he rolls
  // there on his tracks, once his arm is back in
  function sitOn(el, wantX) {
    var s = seatOf(el), lo = s.x !== undefined ? s.x : s.left + 6, hi = s.x !== undefined ? s.x : Math.max(lo, s.right - cw() - 6);
    var x = Math.max(lo, Math.min(hi, pos.x)), y = seatY(s);
    putDoc(x + scrollX, y + scrollY);
    perch = el; mode = 'perch'; clearTimeout(peekT);
    var go = wantX !== undefined && Math.abs(wantX - x) > 4 && !reduced
      ? sleep(arm1.classList.contains('on') ? RETRACT_MS + 30 : 0).then(function () { return perch === el ? roll(wantX - x) : null; })
      : Promise.resolve();
    return go.then(function () {
      if (perch !== el) return;
      var k = el.getAttribute('data-crew-stop');
      if (k) job(k, el);
    });
  }
  // Rolling along the top of a box (part of the page, so it rides with it): about 90 px a second, tracks turning
  var ROLL_PX_S = 90;
  function roll(dx) {
    var x0 = perchDoc.x, y = perchDoc.y;
    crewEl.classList.toggle('flip', dx < 0);
    crewEl.classList.add('rolling');
    return tween(Math.abs(dx) / ROLL_PX_S * 1000, function (k) { return k; }, function (e) { putDoc(x0 + dx * e, y); })
      .then(function () { crewEl.classList.remove('rolling'); });
  }

  /* ---------- Losing his footing (README section 2, 2026-11-18): the page moves under him while he sits (an FAQ
     above his box opens or closes, the web font rewraps a heading). His box drops away: his tracks wobble, he falls
     straight down onto the nearest box under him on screen and lands with a squash; nothing under him on screen: he
     falls out past the bottom edge and comes back up from there later. His box rises: it simply lifts him. ---------- */
  var SLIP_MS = 400, FALL_G = 2600;                         // the wobble; gravity in px/s²
  function checkFooting() {
    if (mode !== 'perch' || !perch) return;
    if (perch.offsetParent === null) return loseFooting();  // his box is gone
    var want = seatY(seatOf(perch)) + scrollY, dy = want - perchDoc.y;
    if (Math.abs(dy) <= 2) return;
    if (dy < 0) { putDoc(perchDoc.x, want); jolt(); return; }   // it rose: it lifts him
    loseFooting();
  }
  // The box straight under him on screen whose top is nearest below his tracks
  function boxUnder(x, feetY) {
    var best = null;
    candidates().forEach(function (s) {
      var mid = x + cw() / 2, over = s.x !== undefined ? Math.abs(s.x - x) < cw() / 2 : mid > s.left + 6 && mid < s.right - 6;
      if (over && s.top >= feetY - 2 && (!best || s.top < best.top)) best = s;
    });
    return best;
  }
  function landAt(s, x) { return s.x !== undefined ? s.x : Math.max(s.left + 6, Math.min(Math.max(s.left + 6, s.right - cw() - 6), x)); }
  var slipGen = 0;
  function loseFooting() {
    if (moveTok) moveTok.dead = true;                       // a roll along the box stops
    crewEl.classList.remove('rolling'); hush(); clearTimeout(peekT); tilt(0);
    var r = crewEl.getBoundingClientRect(), x = r.left, y = r.top, g = ++slipGen;
    perch = null; mode = 'move';
    putFixed(x, y);
    var under = boxUnder(x, y + ch() - dangle());
    if (reduced) {                                          // no wobble, no fall: he's on that box at once
      if (under) { pos.x = landAt(under, x); sitOn(under.el); } else { crewEl.hidden = true; mode = 'below'; }
      return;
    }
    crewEl.classList.add('slip');
    sleep(SLIP_MS).then(function () {
      crewEl.classList.remove('slip');
      if (g !== slipGen || mode !== 'move') return;          // scrolling caught him meanwhile
      under = boxUnder(x, pos.y + ch() - dangle());
      var x1 = under ? landAt(under, x) : x;
      var target = function () { return under ? seatY(seatOf(under.el)) : innerHeight + 4; };   // re-read: it may still be moving
      var ms = Math.min(900, Math.max(120, Math.sqrt(2 * Math.max(0, target() - y) / FALL_G) * 1000));
      return tween(ms, function (k) { return k * k; }, function (e) { putFixed(lerp(x, x1, e), lerp(y, target(), e)); })
        .then(function (ok) {
          if (!ok || mode !== 'move') return;
          if (under) { squash(); return sitOn(under.el); }
          mode = 'below';                                   // out of view under the screen; back up after the next stop
        });
    });
  }
  // Just below the bottom edge, where his box took him out of view
  function fromBelow(x) {
    hush(); tilt(0); arm1Off(); dropArm2(); clearTimeout(peekT);
    crewEl.hidden = false;
    putFixed(Math.max(8, Math.min(innerWidth - cw() - 8, x)), innerHeight + 4);
    mode = 'move';
  }
  // Up from below the screen: the arm shoots up and clamps the top bar, then reels him up to the box's height
  // (ease-out, the same timing as going down); a sideways finish is the usual second-arm pull
  function riseTo(seat, toHome) {
    mode = 'move';
    return clampTopBar().then(function () {
      if (mode !== 'move') return;                            // scrolling again froze him meanwhile
      var x0 = pos.x, y0 = pos.y, ty = toHome ? seat.y : seatY(seat);
      return tween(travelMs(y0 - ty), easeOut, function (e) { putFixed(x0, lerp(y0, ty, e)); arm1Line(); })
        .then(function (ok) { if (ok) return rappelTo(toHome ? seat : seatOf(seat.el), toHome); });   // there, or a sideways pull
    });
  }
  // Hanging on his arm with nothing below him: he reels himself up the arm to a box above, then the usual finish
  function reelUp(seat) {
    if (!arm1.classList.contains('on')) return riseTo(seat);
    mode = 'move'; hush(); tilt(0); clearTimeout(peekT);
    var x0 = pos.x, y0 = pos.y, ty = seatY(seat);
    return tween(travelMs(y0 - ty), easeOut, function (e) { putFixed(x0, lerp(y0, ty, e)); arm1Line(); })
      .then(function (ok) { if (ok) return rappelTo(seatOf(seat.el)); });
  }
  // The box in view nearest to where he went out at the bottom: close to his column, low on the screen
  function nearestAbove(fromX) {
    var best = null, bd = Infinity;
    candidates().forEach(function (s) {
      var d = Math.abs(seatX(s, fromX) + cw() / 2 - fromX) + (innerHeight - s.top) * 0.5;
      if (d < bd) { bd = d; best = s; }
    });
    return best;
  }
  // Out of view in the top bar (tucked, or a page without a home): he comes down from it
  function fromTopBar(x) {
    hush(); tilt(0);
    putFixed(Math.max(8, Math.min(innerWidth - cw() - 8, x)), hh() - ch());   // tucked under the header
    startHang();
    anchorX = shoulder1().x; arm1On(); arm1Line(); ++arm1Gen;
  }

  /* ---------- The telly, fixed from wherever he is (added 2026-11-18). He's the top layer, with full access: his
     arm may reach over anything on the page. When the hero's picture breaks while he's away and its dial is on
     screen, he gets to it in 2–6 s (as on the TV), reaches the dial, twists it twice and pulls the arm back in.
     Scrolling meanwhile: the arm comes back at once and he tries again after the next stop. ---------- */
  var tvWant = false, tvBusy = false, tvGen = 0;
  var TV_LINES = ['Hang on, I’ll give it a twist.', 'Who’s been touching the telly?', 'It’s grand. A twist and it’ll come back.'];
  doc.addEventListener('tv:needs-fix', function () { tvWant = true; setTimeout(tryTvFix, 2000 + Math.random() * 4000); });
  function dialEl() { return doc.querySelector('[data-hero] .dial.d1'); }
  function tryTvFix() {
    if (!tvWant || tvBusy || mode === 'home') return;
    var dial = dialEl(); if (!dial) return;
    var d = dial.getBoundingClientRect();
    if (!(mode === 'perch' || mode === 'hang') || scrolling || touching || d.top < hh() || d.bottom > innerHeight) { setTimeout(tryTvFix, 1000); return; }
    tvBusy = true; var g = ++tvGen;
    var useArm1Side = !arm1.classList.contains('on');            // his free shoulder: the main one unless he's hanging from it
    if (useArm1Side) crewEl.classList.toggle('flip', d.left + d.width / 2 < at().x + cw() / 2);
    var from = function () { return useArm1Side ? shoulder1() : shoulderAt(); };
    var target = function () { var r = dialEl().getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    if (useArm1Side) crewEl.classList.add('extend');
    arm2.classList.add('on'); grip.classList.add('on');
    say(TV_LINES[(Math.random() * TV_LINES.length) | 0], 3000);
    var alive = function () { return g === tvGen; };
    anim(reduced ? 0 : 450, function (k) { var s0 = from(), t = target(), e = easeOut(k); bar(arm2, grip, s0.x, s0.y, lerp(s0.x, t.x, e), lerp(s0.y, t.y, e)); }, alive)
      .then(function (ok) {
        if (!ok) return;
        var s0 = from(), t = target(); bar(arm2, grip, s0.x, s0.y, t.x, t.y);
        doc.addEventListener('tv:fixed', function done() {
          if (!alive()) return;
          setTimeout(function () { if (alive()) tvRetract(g, from); }, 300);
        }, { once: true });
        doc.dispatchEvent(new CustomEvent('tv:twist'));
      });
  }
  function tvRetract(g, from) {
    var t0 = grip.getBoundingClientRect(), tx = t0.left + t0.width / 2, ty = t0.top + t0.height / 2;
    anim(reduced ? 0 : RETRACT_MS, function (k) { var s0 = from(), e = easeOut(k); bar(arm2, grip, s0.x, s0.y, lerp(tx, s0.x, e), lerp(ty, s0.y, e)); }, function () { return g === tvGen; })
      .then(function () { tvDone(); });
  }
  function tvDone() { dropArm2(); if (!arm1.classList.contains('on')) crewEl.classList.remove('extend'); tvBusy = false; tvWant = false; }
  doc.addEventListener('tv:fixed', function () { tvWant = false; });
  // Scrolling, a move or going home interrupts him: the arm comes straight back, and he tries again later
  function tvAbort() {
    if (!tvBusy) return;
    ++tvGen; dropArm2(); if (!arm1.classList.contains('on')) crewEl.classList.remove('extend'); tvBusy = false;
    if (tvWant) setTimeout(tryTvFix, 1500);
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

  /* ---------- The Control room's storefront (added 2026-11-18): a scene of its own, like the hero ----------
     While it wants him (its story isn't finished) and it's on screen, he's brought down onto its pavement once
     scrolling stops, and the shop's CREW takes over. Outside the shop (on the pavement, or inside with the shutter
     up) the header catches him as usual. Behind the shutter it never does: he stays in until the shop leaves the
     screen, then comes in from the top bar (scrolled down past it) or up from below (scrolled up past it). */
  function shopWants() { return !!(shopCrew && shopEl.hasAttribute('data-want')); }
  function shopInside() { return shopEl.classList.contains('crew-inside'); }
  function shopRect() { return shopCrew.getBoundingClientRect(); }
  // On screen: the picture's top below the header, and the spot where he lands above the bottom edge
  function shopInView() {
    var p = shopEl.querySelector('.shop-pic').getBoundingClientRect(), r = shopRect();
    return p.top >= hh() - 2 && r.bottom <= innerHeight - 4;
  }
  function intoShop() {
    tvAbort();
    ++arm1Gen; arm1Off(); dropArm2();
    shopCrew.classList.toggle('flip', crewEl.classList.contains('flip'));
    crewEl.hidden = true; mode = 'shop'; perch = null;
    shopEl.dispatchEvent(new CustomEvent('crew:enter'));
  }
  function leaveShop() { shopEl.dispatchEvent(new CustomEvent('crew:leave')); crewEl.hidden = false; }
  // Caught by the header while outside the shop
  function takeFromShop() {
    var r = shopRect();
    crewEl.classList.toggle('flip', shopCrew.classList.contains('flip'));
    leaveShop();
    grab(r.left, Math.max(hh() + hangGap(), r.top));
  }
  // From wherever he is to the shop's pavement (after the stop and the delay)
  function goShop() {
    var r = shopRect(), target = { x: r.left, y: r.top };
    if (mode === 'home') { takeFromHome(); return rappelTo(target, 'shop'); }
    if (mode === 'tucked') fromTopBar(pos.x);
    if (mode === 'below') { fromBelow(pos.x); return riseTo(target, 'shop'); }
    if (mode === 'perch') {
      var pr = crewEl.getBoundingClientRect();
      if (pr.top >= innerHeight) { fromBelow(perchDoc.x - scrollX); return riseTo(target, 'shop'); }
      if (pr.bottom <= hh()) fromTopBar(pr.left); else putFixed(pr.left, pr.top);
    }
    return rappelTo(target, 'shop');
  }
  // The shop has left the screen while he was in it
  function outOfShop() {
    var p = shopEl.querySelector('.shop-pic').getBoundingClientRect(), r = shopRect();
    if (p.bottom <= hh()) {                                     // scrolled down past it: in from the top bar
      leaveShop(); fromTopBar(r.left);
      var seat = nearestBelow(handAt().x, pos.y);
      if (seat) rappelTo(seat);
      return true;
    }
    if (p.top >= innerHeight) {                                 // scrolled up past it: up from below, the usual way
      var home = homeInView(), s2 = !home && nearestAbove(r.left + cw() / 2);
      if (!home && !s2) return false;                           // nothing in view to go to: he stays in the shop
      leaveShop(); fromBelow(r.left);
      if (home) { var h = homeRect(); riseTo({ x: h.left, y: h.top }, true); } else riseTo(s2);
      return true;
    }
    return false;
  }
  // Contact page: a short typing motion on the CRT's top edge for each ticked chip
  doc.addEventListener('change', function (e) {
    if (reduced || mode !== 'perch' || !perch || !perch.matches('.crt') || !e.target.matches('input[type=checkbox]') || !e.target.checked) return;
    crewEl.classList.remove('typing'); void crewEl.offsetWidth; crewEl.classList.add('typing');
    setTimeout(function () { crewEl.classList.remove('typing'); }, 600);
  });

  /* ---------- Tips ---------- */
  var bubbleTimer = 0;
  function say(text, ms) {
    clearTimeout(bubbleTimer);
    bubbleText.textContent = text;
    bubble.hidden = false;
    window.cussBubble(bubble, crewEl);              // beside his head on the side with room, or above; on screen (site.js)
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

  /* ---------- Home (hero or band) hands him over, and gets him back ---------- */
  function homeRect() { return homeCrew.getBoundingClientRect(); }
  function homeReady() { return homeCrew && homeCrew.classList.contains('live') && !homeCrew.classList.contains('held'); }
  function takeFromHome() {
    var r = homeRect();
    homeCrew.classList.add('away');
    homeEl.classList.add('crew-out');
    crewEl.hidden = false;
    crewEl.classList.toggle('flip', homeCrew.classList.contains('flip'));
    grab(r.left, Math.max(hh() + hangGap(), r.top));
    doc.dispatchEvent(new CustomEvent('crew:left'));
  }
  function backHome() {
    tvAbort(); tvWant = false;
    ++arm1Gen; arm1Off(); dropArm2();                                         // nothing of his left on screen
    homeCrew.classList.toggle('flip', crewEl.classList.contains('flip'));   // facing the same way: no flip on the swap
    crewEl.hidden = true; mode = 'home'; perch = null;
    homeCrew.classList.remove('away'); homeEl.classList.remove('crew-out');
    doc.dispatchEvent(new CustomEvent('crew:back'));
  }
  function homeInView() {
    if (!homeCrew) return false;
    var r = homeRect(), h = homeEl.getBoundingClientRect();
    if (r.top <= hh() + hangGap() + 4 || r.bottom > innerHeight) return false;
    return homeEl.hasAttribute('data-hero') ? h.bottom > innerHeight * 0.6 : h.top >= hh() - 4;   // a band: scrolled right back up
  }

  /* ---------- Watching the scroll ---------- */
  var scrolling = false, touching = false, stillT = 0, delayT = 0, ticking = false;
  // During the scroll: only the grab (and freezing a move)
  function duringScroll() {
    if (mode === 'move') { freeze(); return; }
    if (mode === 'shop') {                                    // behind the shutter the header never catches him
      if (!shopInside() && shopRect().top <= hh() + hangGap()) takeFromShop();
      return;
    }
    if (mode === 'home') {
      if (homeReady() && homeRect().top <= hh() + hangGap()) takeFromHome();
      return;
    }
    if (mode === 'perch' && perchDoc.y - scrollY <= hh() + hangGap()) grab(perchDoc.x - scrollX, hh() + hangGap());
    if (mode === 'hang' && nearNever()) tuck();
  }
  var lastSY = null;
  function onScroll() {
    // Only a page that actually moved counts: a layout change can fire a scroll event with nothing moved, and that
    // must not freeze him (mid-fall, say) as if the visitor had scrolled
    var sy = Math.round(scrollY);
    if (sy === lastSY) return;
    lastSY = sy;
    scrolling = true;
    tvAbort();
    clearTimeout(stillT); clearTimeout(delayT);
    if (!reduced) {
      if (mode === 'move') freeze();                          // at once, not on the next frame
      if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; duringScroll(); }); }
    }
    if (!touching) stillT = setTimeout(stopped, CREW_STILL_MS);
  }
  function stopped() {
    if (touching) return;
    clearTimeout(stillT); clearTimeout(delayT);
    scrolling = false;
    delayT = setTimeout(act, CREW_DELAY_MS);
  }
  // After the stop and the delay: the one move he makes
  function act() {
    tvAbort();                                                // a move comes first; the telly can wait a moment
    if (scrolling || touching) return;
    if (reduced) { sitStill(); return; }
    if (mode === 'shop') { outOfShop(); return; }
    // Never stuck: "on his way" with no move running for a second (a move cut off without a scroll) counts as hanging
    if (mode === 'move' && performance.now() - lastFrame > 1000) startHang();
    // The Control room's shop on screen and its story unfinished: that's where he goes
    if (mode !== 'move' && shopWants() && shopInView() && (mode !== 'home' || homeReady())) { goShop(); return; }
    if (mode === 'home' || mode === 'move') return;
    if (mode === 'below') {                                   // fell out at the bottom: back up from there, as usual
      var xb = pos.x, sb = !homeInView() && nearestAbove(xb + cw() / 2);
      if (homeInView()) { var hb = homeRect(); fromBelow(xb); riseTo({ x: hb.left, y: hb.top }, true); }
      else if (sb) { fromBelow(xb); riseTo(sb); }
      return;
    }
    if (mode === 'tucked' && homeInView()) { fromTopBar(pos.x); }
    if (homeInView()) {                                       // back into the hero / band
      var r = homeRect();
      if (mode === 'perch') {
        var pr = crewEl.getBoundingClientRect();
        if (pr.top < innerHeight && pr.bottom > hh()) putFixed(pr.left, pr.top);
        else if (pr.top >= innerHeight) { fromBelow(perchDoc.x - scrollX); riseTo({ x: r.left, y: r.top }, true); return; }   // back up from where he went out
        else fromTopBar(r.left);
      }
      rappelTo({ x: r.left, y: r.top }, true);
      return;
    }
    if (mode === 'hang') {
      // Never stuck (2026-11-18): a box below him, he goes down to it; none below but one on screen, he reels himself
      // up his arm to it; none on screen, he goes up into the top bar (at once and unseen if he's under the screen)
      var seat = nearestBelow(handAt().x, pos.y), up = !seat && nearestAbove(handAt().x);
      if (seat) rappelTo(seat);
      else if (up) reelUp(up);
      else if (pos.y >= innerHeight) { arm1Off(); dropArm2(); putFixed(pos.x, hh() - ch()); mode = 'tucked'; clearTimeout(peekT); }
      else tuck();
      return;
    }
    if (mode === 'tucked') {                                  // up in the top bar: down again once there's a box in view
      var s3 = nearestBelow(handAt().x, hh() - ch());
      if (s3) { fromTopBar(pos.x); rappelTo(s3); }
      return;
    }
    if (mode === 'perch') {
      var b = perch.getBoundingClientRect();
      if (b.top < innerHeight && b.bottom > hh()) return;     // still in view: he stays put
      // Scrolling up took his box out of view at the bottom: he comes back up from where he went out, on his arm
      // clamped to the top bar (his only grappling point, up or down), to the nearest box in view
      var x = perchDoc.x - scrollX, s2 = nearestAbove(x + cw() / 2);
      if (!s2) return;                                        // nothing in view to sit on: he stays where he is
      fromBelow(x);
      riseTo(s2);
    }
  }

  // Reduced motion: no moves; after scrolling stops (and the same delay) he simply sits, still, on a box near the middle
  function sitStill() {
    if (mode === 'shop') {                                    // in the shop he stays while any of it is on screen
      var sp = shopEl.querySelector('.shop-pic').getBoundingClientRect();
      if (sp.bottom > hh() && sp.top < innerHeight) return;
      leaveShop(); crewEl.hidden = true; mode = 'move';
    }
    if (homeCrew && homeRect().bottom > hh()) {               // one CREW at a time: home on screen keeps him
      crewEl.hidden = true; homeCrew.classList.remove('away'); homeEl.classList.remove('crew-out'); mode = 'home'; perch = null; return;
    }
    if (shopWants() && shopInView()) {                        // he simply appears in the shop, still
      if (homeCrew) { homeCrew.classList.add('away'); homeEl.classList.add('crew-out'); }
      intoShop(); return;
    }
    var pick = null;
    candidates().forEach(function (s) { if (!pick || Math.abs(s.top - innerHeight * 0.4) < Math.abs(pick.top - innerHeight * 0.4)) pick = s; });
    if (!pick) return;
    if (homeCrew) { homeCrew.classList.add('away'); homeEl.classList.add('crew-out'); }
    crewEl.hidden = false; arm1Off(); dropArm2();
    pos.x = seatX(pick, innerWidth * 0.75);
    sitOn(pick.el);
  }

  function begin() {
    fixedEl.hidden = false;
    lastSY = Math.round(scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    if ('onscrollend' in window) window.addEventListener('scrollend', function () { if (!touching) stopped(); });
    // A finger on the screen counts as scrolling, however still it is
    window.addEventListener('touchstart', function () { touching = true; clearTimeout(stillT); clearTimeout(delayT); }, { passive: true });
    function lift() { if (!touching) return; touching = false; if (scrolling) stillT = setTimeout(stopped, CREW_STILL_MS); }
    window.addEventListener('touchend', lift, { passive: true });
    window.addEventListener('touchcancel', lift, { passive: true });
    window.addEventListener('resize', function () {
      if (mode === 'perch' && perch) { var s = seatOf(perch); putDoc(seatX(s, perchDoc.x - scrollX + cw() / 2) + scrollX, seatY(s) + scrollY); }
    });
    // The page moving under him while he sits (not a resize: that's handled above, first): he loses his footing
    if ('ResizeObserver' in window) new ResizeObserver(function () { checkFooting(); }).observe(doc.body);
    doc.addEventListener('toggle', function () { requestAnimationFrame(checkFooting); }, true);
    if (reduced) { if (scrollY > 0) sitStill(); return; }
    if (!homeCrew) {
      // A page without a home: he arrives on his arm out of the top bar, three-quarters across, then picks a box
      crewEl.hidden = false;
      fromTopBar(innerWidth * 0.75 - cw() / 2);
      putFixed(pos.x, hh() + hangGap()); arm1Line();
      delayT = setTimeout(act, CREW_DELAY_MS);
      return;
    }
    if (scrollY > 0) duringScroll();                          // loaded part-way down the page
    if (mode !== 'home') delayT = setTimeout(act, CREW_DELAY_MS);
  }
  function whenIdle(fn) {
    var go = function () { if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 2000 }); else setTimeout(fn, 300); };
    if (doc.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }
  // Probes (scripts/dev) read his state from here; harmless on the live site
  fixedEl.crewState = function () { return { mode: mode, scrolling: scrolling, perch: perch && (perch.className || perch.tagName) }; };
  (window.cussLate || Promise.resolve()).then(function () { whenIdle(begin); });
})();

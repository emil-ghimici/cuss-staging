/* The Control room demo (README section 3, rebuilt 2026-11-18): a bakery's storefront.
   CREW's arrival starts it (guide.js hands him in on the pavement with 'crew:enter' and takes him with
   'crew:leave'). He opens the shutter, checks the old screens, pulls the shutter down and works behind it
   (sparks, then welding light); it lifts on one big screen that runs the order through, while he fixes the sign.
   The visitor confirms the last step, then he asks if they're happy too.
   - The story runs on its own clock, which stops while he's away, the shop is off screen or the tab is hidden:
     nothing runs unseen. A beat he was in the middle of starts again when he's back; if the shutter was down
     with him behind it, he squeezes in under it first.
   - "Skip ahead" jumps to the shutter lifting on the finished shop. "Show me again" replays it.
   - Reduced motion: the shop shows open on the old screens; "Show the finished shop" swaps at once.
   Transform and opacity only. The screens' text, the caption and the buttons are real. */
(function () {
  'use strict';
  var doc = document;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mqPhone = matchMedia('(max-width: 760px)');
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function plain(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function whenIdle(fn) {
    var go = function () { if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 2000 }); else setTimeout(fn, 300); };
    if (doc.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  function easeInOut(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }

  // Where things are, in scene units (desktop 1200 wide, phones 640): the floor inside and the pavement outside
  // (where his tracks touch the ground), where he stands to check the screens, where he lands, where he waits
  // beside the buttons, the shutter's top and bottom, and where he stands to fix the sign
  var GEO = {
    d: { W: 1200, floor: 566, pave: 624, stand: 600, entry: 850, side: 1112, top: 162, line: 572, sign: 700 },
    p: { W: 640, floor: 782, pave: 846, stand: 320, entry: 470, side: 572, top: 130, line: 790, sign: 420 }
  };
  var ROLL_PX_S = 90;   // his rolling speed, as everywhere

  // Its styles are in late.css, which site.js loads; wait for it
  (window.cussLate || Promise.resolve()).then(function () { $$('[data-shop]').forEach(setup); });
  function setup(shop) {
    var pic = $('.shop-pic', shop), crew = $('.shop-crew', shop), shutter = $('.shutter', shop);
    // His drawing: the same one as everywhere (the guide's), copied in rather than sent twice in the page
    var src = $('.g-crew svg') || $('.crew svg');
    if (src && !crew.firstElementChild) { var c = src.cloneNode(true); c.removeAttribute('style'); crew.appendChild(c); }
    var cap = $('.caption', shop), acts = $('.acts', shop), sign = $('.sign', shop);
    var B = {};
    ['skip', 'finish', 'confirm', 'yes', 'again', 'talk'].forEach(function (k) { B[k] = $('[data-act="' + k + '"]', acts); });
    var T = JSON.parse($('[data-shop-text]', shop).textContent), L = T.crew;
    var scr = {}; $$('.scrn', shop).forEach(function (s) { scr[s.getAttribute('data-k')] = s; });
    var order = ['inbox', 'sheet', 'inv', 'del', 'bank', 'dash'].filter(function (k) { return scr[k]; });
    var rail = {}, railKeys = [];
    $$('.rail li', shop).forEach(function (li) { var k = li.getAttribute('data-s'); rail[k] = li; railKeys.push(k); });
    var panel = {}; $$('.bpane', shop).forEach(function (p) { panel[p.getAttribute('data-p')] = p; });
    var afterKeys = ['sent', 'paid', 'dash'].filter(function (k) { return panel[k]; });
    var firstCaption = cap.textContent;
    acts.hidden = false;                              // its space was kept from the first paint
    shop.setAttribute('data-want', '');               // the guide brings him here while this is set

    function geo() { return mqPhone.matches ? GEO.p : GEO.d; }
    function U() { return pic.clientWidth / geo().W; }
    function say(t) { cap.textContent = t; }
    function show(list) { Object.keys(B).forEach(function (k) { B[k].hidden = list.indexOf(k) < 0; }); }

    /* ---------- Him, in the scene: x is his middle, base where his tracks touch the ground (scene units) ---------- */
    var me = { x: 0, base: 0, inside: false };
    function spot(where) {
      var G = geo();
      if (where === 'entry') { me.x = G.entry; me.base = G.pave; me.inside = false; }
      if (where === 'stand') { me.x = G.stand; me.base = G.floor; me.inside = true; }
      place();
    }
    function box() {
      var u = U(), w = crew.offsetWidth, h = crew.offsetHeight;
      return { x: me.x * u - w / 2, y: me.base * u - h, w: w, h: h };
    }
    function place() {
      var b = box();
      crew.style.setProperty('--x', b.x.toFixed(1) + 'px');
      crew.style.setProperty('--y', b.y.toFixed(1) + 'px');
      crew.classList.toggle('inside', me.inside);
    }
    function rel(el) {                                // an element's middle, in the picture's pixels
      var r = el.getBoundingClientRect(), p = pic.getBoundingClientRect();
      return { x: r.left - p.left + r.width / 2, y: r.top - p.top + r.height / 2, top: r.top - p.top };
    }

    /* ---------- The story's clock: stops while he's away, off screen, or the tab is hidden ---------- */
    var away = true, off = false, gen = 0;
    function running() { return !away && !off && !doc.hidden; }
    function wait(ms) {
      return new Promise(function (res) {
        var left = ms, t = performance.now();
        (function f() {
          var n = performance.now(); if (running()) left -= n - t; t = n;
          if (left <= 0) res(); else setTimeout(f, Math.max(16, Math.min(120, left)));
        })();
      });
    }
    // A move for beat g: progress only while the clock runs; false if the beat was interrupted
    function tween(ms, fn, g) {
      if (reduced || ms <= 0) { fn(1); return Promise.resolve(g === gen); }
      return new Promise(function (res) {
        var done = 0, t = 0;
        function f(n) {
          if (g !== gen) return res(false);
          if (t && running()) done += n - t; t = n;
          var k = Math.min(1, done / ms); fn(k);
          if (k < 1) requestAnimationFrame(f); else res(true);
        }
        requestAnimationFrame(f);
      });
    }
    function hold(ms, g) { return wait(ms).then(function () { return g === gen; }); }

    /* ---------- His telescopic arm (the same look as everywhere: .reach-arm/.reach-hand) ---------- */
    var arm = doc.createElement('span'), hand = doc.createElement('span'), armLeft = false;
    arm.className = 'reach-arm'; hand.className = 'reach-hand';
    pic.appendChild(arm); pic.appendChild(hand);
    function shoulder(left) { var b = box(); return { x: b.x + (left ? 26 : 52) / 78 * b.w, y: b.y + 52 / 104 * b.h }; }
    function aim(x, y) {
      var s = shoulder(armLeft);
      [arm, hand].forEach(function (el) {
        el.classList.toggle('inside', me.inside);
        el.style.setProperty('--sx', s.x + 'px'); el.style.setProperty('--sy', s.y + 'px');
        el.style.setProperty('--tx', x + 'px'); el.style.setProperty('--ty', y + 'px');
      });
      arm.style.width = Math.hypot(x - s.x, y - s.y) + 'px';
      arm.style.setProperty('--ang', Math.atan2(y - s.y, x - s.x) + 'rad');
    }
    function reach(x, y, g) {
      armLeft = x < me.x * U();
      crew.classList.toggle('flip', armLeft);
      [arm, hand].forEach(function (el) { el.classList.add('still'); el.classList.remove('out'); });
      aim(x, y);
      crew.classList.add('extend'); arm.classList.add('on'); hand.classList.add('on');
      void arm.offsetWidth;
      if (!reduced) [arm, hand].forEach(function (el) { el.classList.remove('still'); });
      arm.classList.add('out'); hand.classList.add('out');
      return hold(reduced ? 0 : 470, g);
    }
    function follow(x, y) { arm.classList.add('still'); hand.classList.add('still'); aim(x, y); }   // hand on a moving thing
    function back(g) {
      [arm, hand].forEach(function (el) { el.classList.remove('still', 'out'); });
      return hold(reduced ? 0 : 470, g).then(function (ok) { if (ok) armOff(); return ok; });
    }
    function armOff() { [arm, hand].forEach(function (el) { el.classList.remove('on', 'out', 'still'); }); crew.classList.remove('extend'); }

    /* ---------- His bubble: beside his head, a little screen (decoration; the caption is the real text) ---------- */
    var bub = doc.createElement('div'), bubP = doc.createElement('p'), bubWho = doc.createElement('span'), bubT = 0;
    bub.className = 'crew-bubble side'; bub.hidden = true; bub.setAttribute('aria-hidden', 'true');
    bubWho.className = 'who'; bubWho.textContent = 'CREW';
    bub.appendChild(bubWho); bub.appendChild(bubP); pic.appendChild(bub);
    function speak(text, ms, at) {
      clearTimeout(bubT);
      bubP.textContent = text; bub.hidden = false;
      var pr = pic.getBoundingClientRect();
      // Beside his head on the side with room, or above him; always on screen (site.js). `at`: a point in the picture.
      window.cussBubble(bub, crew, at ? { at: { left: pr.left + at.x, right: pr.left + at.x, top: pr.top + at.y } } : null);
      void bub.offsetWidth; bub.classList.add('on');
      if (ms) bubT = setTimeout(hush, ms);
    }
    function hush() { clearTimeout(bubT); bub.classList.remove('on'); bub.hidden = true; }

    /* ---------- The shutter: 0 closed, 1 open ---------- */
    var shut = reduced ? 1 : 0;
    function setShut(p) { shut = p; shutter.style.transform = 'translateY(' + (-101 * p).toFixed(2) + '%)'; }
    function barY() { var G = geo(); return (G.top + (G.line - G.top) * (1 - shut)) * U() - 8; }
    function barX() { return (me.x - (mqPhone.matches ? 70 : 60)) * U(); }
    // His hand on the bottom bar, the shutter moves to p, the hand going with it
    function pullTo(p, ms, ease, g) {
      var p0 = shut;
      return tween(ms, function (k) { setShut(p0 + (p - p0) * ease(k)); follow(barX(), barY()); }, g);
    }

    /* ---------- Rolling on his tracks, about 90 px a second; in or out under the shutter line ---------- */
    function roll(x, base, g) {
      var x0 = me.x, b0 = me.base, in0 = me.inside, goesIn = base < b0 - 1, goesOut = base > b0 + 1;
      var d = Math.hypot(x - x0, base - b0) * U();
      if (d < 2) return Promise.resolve(g === gen);
      crew.classList.toggle('flip', x < x0);
      crew.classList.add('rolling');
      return tween(d / ROLL_PX_S * 1000, function (k) {
        me.x = x0 + (x - x0) * k; me.base = b0 + (base - b0) * k;
        me.inside = goesIn ? k > 0.5 : goesOut ? k < 0.5 && in0 : in0;
        place();
      }, g).then(function (ok) { crew.classList.remove('rolling'); return ok; });
    }

    /* ---------- The scene's states ---------- */
    function flicker(on) { order.forEach(function (k) { scr[k].classList.toggle('flicker', on && !reduced); }); }
    function setPanel(k) {
      Object.keys(panel).forEach(function (p) {
        var was = panel[p].classList.contains('on');
        panel[p].classList.toggle('on', p === k);
        panel[p].classList.toggle('gone', was && p !== k);
      });
      if (panel[k]) say(panel[k].getAttribute('data-say'));
    }
    function setRail(k, doneAll) {
      var hit = false;
      railKeys.forEach(function (r) {
        var li = rail[r], cur = r === k, done = doneAll || !hit && !cur;
        if (cur) hit = true;
        li.classList.toggle('on', cur || done);
        li.classList.toggle('done', done);
        $('.st', li).textContent = done ? ' (done)' : cur ? ' (now)' : ' (to do)';
      });
    }
    /* ---------- The sign: hangs from two hangers; nudged, the left one gives and its left side drops ---------- */
    var grip = $('.grip', sign), hangL = $('.hanger.l', shop), tilt = 0, dropped = false, DROP = -9;
    function setTilt(d) { tilt = d; sign.style.transform = d ? 'rotate(' + d.toFixed(2) + 'deg)' : ''; }
    function gripAt() { return rel(grip); }
    // He reaches the sign's left end, gives it a nudge (a little wobble), lets go, and the left side drops
    function nudgeSign(g) {
      if (dropped) { setTilt(DROP); hangL.classList.add('snap'); return Promise.resolve(g === gen); }
      var t = gripAt();
      return reach(t.x, t.y, g)
        .then(function (ok) { return ok && tween(420, function (k) { setTilt(Math.sin(k * Math.PI * 2) * 1.6 * (1 - k)); follow(gripAt().x, gripAt().y); }, g); })
        .then(function (ok) {
          if (!ok) return false;
          dropped = true; hangL.classList.add('snap');
          back(g);                                    // his hand comes back while it drops
          return tween(650, function (k) { var e = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2); setTilt(DROP * e); }, g);
        })
        .then(function (ok) { if (ok) setTilt(DROP); return ok && hold(500, g); });
    }
    // Back level: he takes the left end and lifts it, the hanger hooks on again
    function liftSign(g) {
      if (!dropped && !tilt) return Promise.resolve(g === gen);
      var t = gripAt();
      return reach(t.x, t.y, g)
        .then(function (ok) { var t0 = tilt; return ok && tween(800, function (k) { setTilt(t0 * (1 - easeInOut(k))); follow(gripAt().x, gripAt().y); }, g); })
        .then(function (ok) { if (ok) { setTilt(0); dropped = false; hangL.classList.remove('snap'); } return ok; });
    }
    function signBroken() { setTilt(0); dropped = false; hangL.classList.remove('snap'); }

    function before() {                               // back to the old screens (shutter state untouched)
      signBroken();
      shop.classList.remove('after', 'lit', 'grind', 'weld', 'puff');
      Object.keys(panel).forEach(function (p) { panel[p].classList.remove('on', 'gone'); });
      setRail(null); say(firstCaption);
    }

    /* ---------- The screen runs the order through (its own branch, on the story's clock) ---------- */
    var stepsP = null;
    function runSteps() {
      var chain = wait(700);
      railKeys.forEach(function (k, i) {
        chain = chain.then(function () { setRail(k); setPanel(k); return i < railKeys.length - 1 ? wait(2000) : null; });
      });
      return chain;
    }

    /* ---------- The beats. Each takes the beat's generation g and resolves true when done, false if interrupted.
       Interrupted beats start again when he's back, from the scene as it is. ---------- */
    var isConfirmed = false, afterIx = 0, sparked = false;
    // Sparks fan out both ways from under the shutter, near the middle; set once, when first needed
    function sparks() {
      if (sparked) return; sparked = true;
      $$('.sparks i', shop).forEach(function (s, i) {
        var dir = i % 2 ? 1 : -1, r = Math.random();
        s.style.setProperty('--ox', (42 + Math.random() * 16).toFixed(1) + '%');
        s.style.setProperty('--dx', (dir * (40 + r * 170) * U()).toFixed(1) + 'px');
        s.style.setProperty('--dy', ((26 + Math.random() * 34) * U()).toFixed(1) + 'px');
        s.style.setProperty('--d', (Math.random() * 0.7).toFixed(2) + 's');
        s.style.setProperty('--r', (dir * (25 + r * 50)).toFixed(0) + 'deg');
      });
    }

    function beatArrive(g) {
      var chain = Promise.resolve(true);
      if (shut > 0.01) {                              // Show me again: down it comes first, from the pavement
        chain = reach(barX(), barY(), g)
          .then(function (ok) { return ok && pullTo(0, 1100, easeInOut, g); })
          .then(function (ok) { if (!ok) return false; before(); flicker(false); return back(g); })
          .then(function (ok) { return ok && roll(geo().entry, geo().pave, g); });
      }
      return chain
        .then(function (ok) { return ok && nudgeSign(g); })            // he tries the sign; its left side drops
        .then(function (ok) {
          if (!ok) return false;
          crew.classList.toggle('flip', rel(sign).x < me.x * U());   // looking at it
          speak(L.sign, 2200);
          return hold(2000, g);
        });
    }
    function beatOpen(g) {
      if (shut >= 1) return Promise.resolve(true);
      return reach(barX(), barY(), g)
        .then(function (ok) { return ok && (shut < 0.75 ? pullTo(0.75, 900, easeOut, g) : true); })
        .then(function (ok) {                         // it sticks; a jolt
          if (!ok) return false;
          crew.classList.add('tapping'); shutter.classList.remove('thump'); void shutter.offsetWidth; shutter.classList.add('thump');
          return hold(320, g);
        })
        .then(function (ok) { crew.classList.remove('tapping'); return ok && pullTo(1, 450, easeOut, g); })
        .then(function (ok) {
          if (!ok) return false;
          flicker(true);
          shop.classList.remove('dusty'); void shop.offsetWidth; shop.classList.add('dusty');
          return back(g);
        });
    }
    function toStand(g) {
      var G = geo();
      return me.inside && Math.abs(me.x - G.stand) < 2 ? Promise.resolve(true) : roll(G.stand, G.floor, g);
    }
    function beatScreen(k) {
      return function (g) {
        return toStand(g)
          .then(function (ok) { if (!ok) return false; var t = rel(scr[k]); return reach(t.x, t.y, g); })
          .then(function (ok) { if (!ok) return false; speak(L[k], 2100); return hold(1400, g); })
          .then(function (ok) { return ok && back(g); });
      };
    }
    function beatClose(g) {
      return toStand(g)
        .then(function (ok) { if (!ok) return false; speak(L.close, 2200); return hold(1300, g); })
        .then(function (ok) { return ok && reach(barX(), barY(), g); })
        .then(function (ok) { if (!ok) return false; shop.classList.add('crew-inside'); return pullTo(0, 1100, easeInOut, g); })
        .then(function (ok) { if (!ok) return false; armOff(); hush(); return true; });
    }
    // Behind the shutter, about 5 s: grinding (sparks), welding (light through the gaps, ≤ 3 flashes a second), a thump
    function beatWork(g) {
      shop.classList.remove('weld', 'puff');
      shop.classList.add('crew-inside');
      say(T.workshop); sparks();
      shop.classList.add('grind');
      return hold(1000, g)
        .then(function (ok) {
          if (!ok) return false;
          var b = box();
          speak(L.muffled, 2200, { x: b.x + b.w / 2, y: barY() - 70 });
          return hold(1000, g);
        })
        .then(function (ok) { if (!ok) return false; shop.classList.remove('grind'); shop.classList.add('weld'); return hold(2000, g); })
        .then(function (ok) {
          if (!ok) return false;
          shop.classList.remove('weld');
          shutter.classList.remove('thump'); void shutter.offsetWidth; shutter.classList.add('thump');
          shop.classList.add('puff');
          return hold(500, g);
        })
        .then(function (ok) {
          if (!ok) return false;
          shop.classList.remove('puff');
          // Behind the shutter, the shop is finished
          flicker(false); shop.classList.add('after'); setRail(null);
          return hold(500, g);
        });
    }
    function beatReveal(g) {
      shop.classList.add('after');
      if (!stepsP) stepsP = runSteps();
      return pullFree(1, 900, g).then(function (ok) { if (ok) shop.classList.remove('crew-inside'); return ok; });
    }
    // The shutter lifts by itself (his hands are busy inside)
    function pullFree(p, ms, g) { var p0 = shut; return tween(ms, function (k) { setShut(p0 + (p - p0) * easeInOut(k)); }, g); }
    function beatSign(g) {
      var G = geo();
      if (shop.classList.contains('lit')) return Promise.resolve(true);
      return roll(G.sign, G.pave, g)
        .then(function (ok) { return ok && liftSign(g); })             // level again first, then a new tube
        .then(function (ok) {
          if (!ok) return false;
          var a = gripAt(), t = rel(sign), y = t.y + sign.offsetHeight * 0.2;
          if (!arm.classList.contains('on')) return reach(t.x, y, g);   // it was never dropped (Skip ahead came first)
          return tween(350, function (k) { follow(a.x + (t.x - a.x) * k, a.y + (y - a.y) * k); }, g);
        })
        .then(function (ok) { return ok && hold(1100, g); })
        .then(function (ok) { if (!ok) return false; shop.classList.add('lit'); return back(g); })
        .then(function (ok) {
          if (!ok) return false;
          speak(L.signFixed, 2600);
          crew.classList.remove('happy'); void crew.offsetWidth; crew.classList.add('happy');
          return hold(1400, g);
        })
        .then(function (ok) { crew.classList.remove('happy'); return ok; });
    }
    function beatSide(g) {
      var G = geo();
      return roll(G.side, G.pave, g).then(function (ok) { return ok && stepsP.then(function () { return g === gen; }); });
    }
    // The checkpoint: he points at Confirm from beside it, never pressing or covering it
    function beatConfirm(g) {
      if (isConfirmed) return Promise.resolve(true);
      show(['confirm']);
      var b = rel(B.confirm), top = B.confirm.getBoundingClientRect().top - pic.getBoundingClientRect().top;
      speak(L.confirm, 4500);
      return reach(b.x, top - 24, g).then(function (ok) {
        if (!ok) return false;
        return new Promise(function (res) {
          (function w() { if (g !== gen) return res(false); if (isConfirmed) return res(true); setTimeout(w, 100); })();
        });
      }).then(function (ok) { return ok && back(g); });
    }
    function beatAfter(g) {
      var chain = Promise.resolve(true);
      setRail(null, true);
      afterKeys.slice(afterIx).forEach(function (k) {
        chain = chain.then(function (ok) { if (!ok) return false; setPanel(k); afterIx++; return hold(2000, g); });
      });
      return chain;
    }
    function beatAsk(g) {
      crew.classList.remove('flip');
      speak(L.ask);
      shop.removeAttribute('data-want');
      show(['yes', 'again']);
      return Promise.resolve(g === gen);
    }

    var BEATS = [beatArrive, beatOpen].concat(order.map(beatScreen), [beatClose, beatWork, beatReveal, beatSign, beatSide, beatConfirm, beatAfter, beatAsk]);
    var WORK = BEATS.indexOf(beatWork), REVEAL = BEATS.indexOf(beatReveal);
    var ix = 0, looping = false, squeezeFirst = false;

    // Back to unfinished work behind the shutter: he lifts it just enough to squeeze under, rolls in, shuts it
    function squeeze(g) {
      var gap = (crew.offsetHeight + 10) / ((geo().line - geo().top) * U());
      return reach(barX(), barY(), g)
        .then(function (ok) { return ok && pullTo(Math.min(1, gap), 600, easeOut, g); })
        .then(function (ok) { if (!ok) return false; armOff(); return roll(geo().stand, geo().floor, g); })
        .then(function (ok) { return ok && reach(barX(), barY(), g); })
        .then(function (ok) { return ok && pullTo(0, 500, easeInOut, g); })
        .then(function (ok) { if (ok) armOff(); return ok; });
    }
    function syncSkip() { if (!reduced) B.skip.hidden = !(!away && ix <= WORK); }
    function loop() {
      if (looping || away || reduced) return;
      looping = true;
      (function next() {
        syncSkip();
        if (away || ix >= BEATS.length) { looping = false; return; }
        var g = gen, first = squeezeFirst && shop.classList.contains('crew-inside') && shut < 0.5 ? squeeze(g) : Promise.resolve(true);
        first.then(function (ok) { if (ok) squeezeFirst = false; return ok && BEATS[ix](g); })
          .then(function (ok) {
            if (ok && g === gen) { ix++; next(); return; }
            looping = false; if (!away) setTimeout(loop, 0);
          });
      })();
    }
    function interrupt() { ++gen; armOff(); hush(); crew.classList.remove('rolling', 'happy', 'point', 'tapping'); }

    /* ---------- The guide hands him in, and takes him ---------- */
    shop.addEventListener('crew:enter', function () {
      away = false; shop.classList.remove('frozen');
      crew.classList.add('live'); crew.classList.remove('away');
      if (reduced) { stillLines(); return; }
      // Back to unfinished work: no sparks while he squeezes in; the work starts again once the shutter is down
      if (shop.classList.contains('crew-inside')) { squeezeFirst = true; shop.classList.remove('grind', 'weld', 'puff'); }
      loop();
    });
    shop.addEventListener('crew:leave', function () {
      interrupt();
      away = true; shop.classList.add('frozen');
      crew.classList.add('away');
      spot('entry');                                  // when he's back, he lands on the pavement
      syncSkip();
    });

    /* ---------- The strip's buttons ---------- */
    B.skip.addEventListener('click', function () {
      if (ix > WORK) return;
      interrupt();
      shop.classList.remove('grind', 'weld', 'puff', 'dusty');
      setShut(0); flicker(false); spot('stand');
      shop.classList.add('crew-inside', 'after'); setRail(null);
      ix = REVEAL; squeezeFirst = false;
      B.skip.hidden = true;
      setTimeout(loop, 0);
    });
    B.confirm.addEventListener('click', function () {
      show([]);
      isConfirmed = true;
      if (reduced) afterStill();
    });
    B.yes.addEventListener('click', function () {
      show(['talk']);
      crew.classList.remove('happy'); void crew.offsetWidth; crew.classList.add('happy');
      setTimeout(function () { crew.classList.remove('happy'); }, 1000);
      if (!away) speak(L.yes, 6000);
      B.talk.focus({ preventScroll: true });
    });
    B.again.addEventListener('click', function () {
      show([]); hush();
      stepsP = null; afterIx = 0; isConfirmed = false;
      shop.setAttribute('data-want', '');
      if (reduced) { before(); show(['finish']); B.finish.focus({ preventScroll: true }); return; }
      interrupt(); ix = 0;
      setTimeout(loop, 0);
    });

    /* ---------- Reduced motion: no moves; each change at once ---------- */
    function stillLines() {
      var lines = order.map(function (k) { return L[k]; }), i = 0;
      (function next() {
        if (away || shop.classList.contains('after') || i >= lines.length) return;
        speak(lines[i++], 3000);
        setTimeout(next, 3200);
      })();
    }
    function afterStill() {
      setRail(null, true);
      var chain = Promise.resolve();
      afterKeys.forEach(function (k, i) { chain = chain.then(function () { setPanel(k); return plain(2000); }); });
      chain.then(function () {
        if (!away) speak(L.ask);
        shop.removeAttribute('data-want');
        show(['yes', 'again']);
      });
    }
    if (reduced) {
      show(['finish']);
      B.finish.addEventListener('click', function () {
        shop.classList.add('after', 'lit');
        var last = railKeys[railKeys.length - 1];
        setRail(last); setPanel(last);
        show(['confirm']);
        if (!away) speak(L.confirm, 4500);
        B.confirm.focus({ preventScroll: true });
      });
    } else show([]);

    // Where he lands is measured once the page is idle (never read layout while the page loads); the guide only
    // looks for him after that too
    whenIdle(function () { spot('entry'); });
    window.addEventListener('resize', function () { place(); if (arm.classList.contains('on')) armOff(); });
    // Nothing runs while the shop is off screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { off = !es[0].isIntersecting; shop.classList.toggle('paused', off); }).observe(shop);
    }
  }
})();

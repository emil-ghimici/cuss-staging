/* CuSS site script: theme switch, neon dividers,
   the chip-composed email, copy buttons and "On this page". No libraries, no cookies. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;

  /* ---------- CREW's moving parts (arm, bubble, guide) live in a cached stylesheet, not the inlined one.
     The crew scripts wait for window.cussLate before they start. ---------- */
  window.cussLate = new Promise(function (res) {
    var me = doc.currentScript, link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = (me && me.src ? me.src.replace(/js\/site\.js.*$/, '') : '/assets/') + 'css/late.css';
    link.onload = link.onerror = function () { res(); };
    doc.head.appendChild(link);
  });
  /* ---------- CREW's speech bubbles, everywhere (hero, bands, 404, guide, Control room): beside his head on the side
     with more room, no wider than that room; above his head when neither side has 150 px; always inside the screen
     (8 px clear of its edges). b: the bubble, absolutely positioned in its offsetParent; crew: his element, or
     opt.at, a {left, right, top} box in screen pixels. Call it after setting the text. ---------- */
  window.cussBubble = function (b, crew, opt) {
    opt = opt || {};
    var M = 8, G = 10, MIN = 150, vw = root.clientWidth;
    // No transition while it's placed: otherwise its slide-in starts from the last placement's side and sweeps
    // across the screen edge. Restored after one style pass, so adding .on still slides it in from the new side.
    b.style.transition = 'none';
    b.style.maxWidth = ''; b.style.boxSizing = 'border-box'; b.classList.remove('side', 'left', 'above');   // widths include padding
    try { place(); } finally { void b.offsetWidth; b.style.transition = ''; }
    function place() {
    var host = b.offsetParent ? b.offsetParent.getBoundingClientRect() : { left: 0, top: 0 };
    var c = opt.at || crew.getBoundingClientRect(), natural = b.offsetWidth;
    var roomL = c.left - G - M, roomR = vw - M - c.right - G;
    if (Math.max(roomL, roomR) >= Math.min(natural, MIN)) {
      var toLeft = roomL > roomR;
      b.classList.add('side'); b.classList.toggle('left', toLeft);
      b.style.maxWidth = Math.floor(Math.min(natural, toLeft ? roomL : roomR)) + 'px';
      b.style.left = ((toLeft ? c.left - G : c.right + G) - host.left) + 'px';
      b.style.top = Math.max(opt.minTop === undefined ? -1e9 : opt.minTop, c.top + (opt.dy || 4) - host.top) + 'px';
      return;
    }
    b.classList.add('above');
    b.style.maxWidth = Math.floor(Math.min(natural, vw - 2 * M)) + 'px';
    var w = b.offsetWidth, cx = (c.left + c.right) / 2, x = Math.max(M + w / 2, Math.min(vw - M - w / 2, cx));
    b.style.left = (x - host.left) + 'px';
    b.style.top = (c.top - 8 - host.top) + 'px';
    b.style.setProperty('--tail', (cx - x) + 'px');
    }
  };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }

  /* ---------- Theme: OS preference, overridden by the switch (kept in localStorage) ---------- */
  var mqLight = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
  function isLight() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'light' : !!(mqLight && mqLight.matches);
  }
  function syncThemeButtons() {
    var light = isLight();
    $$('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(light));
      b.title = light ? 'Night theme' : 'Daylight theme';
    });
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#f3f0ea' : '#0b0f14');
  }
  $$('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var next = isLight() ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('cuss-theme', next); } catch (e) {}
      syncThemeButtons();
      doc.dispatchEvent(new CustomEvent('cuss:theme'));
    });
  });
  if (mqLight && mqLight.addEventListener) mqLight.addEventListener('change', syncThemeButtons);
  syncThemeButtons();

  /* ---------- Neon signs ignite once when they come into view ---------- */
  var io = 'IntersectionObserver' in window && !reduced && new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('ignite'); io.unobserve(e.target); } });
  }, { threshold: 0.6 });
  function neonIn(root) { if (io) $$('[data-neon]', root).forEach(function (n) { io.observe(n); }); }
  neonIn(doc);

  /* ---------- Junk strips: the page has their slots; the drawings come from one cached file once the page is idle
     (src/_lib/junk.js). Their loops run only while on screen; reduced motion shows them fixed and still. ---------- */
  var junk = $$('[data-junk]');
  if (junk.length) {
    if (reduced) junk.forEach(function (j) { j.classList.add('fixed'); });
    var fillJunk = function () {
      var me = doc.querySelector('script[src*="js/site.js"]');
      fetch((me ? me.src.replace(/js\/site\.js.*$/, '') : '/assets/') + 'junk.json').then(function (r) { return r.json(); }).then(function (art) {
        function draw(j) { if (!j.firstChild && art[j.dataset.junk]) { j.innerHTML = art[j.dataset.junk]; neonIn(j); } }
        if (!('IntersectionObserver' in window)) return junk.forEach(draw);
        // Each strip is drawn as it nears the screen (one at a time, never all at once), and moves only while on it
        var near = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { draw(e.target); near.unobserve(e.target); } }); }, { rootMargin: '600px 0px' });
        var jo = !reduced && new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('live', e.isIntersecting); }); });
        junk.forEach(function (j) { near.observe(j); if (jo) jo.observe(j); });
      }).catch(function () {});
    };
    var idleJunk = function () { if ('requestIdleCallback' in window) requestIdleCallback(fillJunk, { timeout: 2000 }); else setTimeout(fillJunk, 300); };
    if (doc.readyState === 'complete') idleJunk(); else addEventListener('load', idleJunk);
  }

  /* ---------- Free text: first letter of each sentence in capitals, as it's typed ---------- */
  function sentenceCase(v) {
    return v.replace(/(^\s*|[.!?]\s+)([a-zà-ÿ])/g, function (m, pre, ch) { return pre + ch.toUpperCase(); });
  }
  $$('[data-format="sentence"]').forEach(function (el) {
    el.addEventListener('input', function () {
      var v = el.value, nv = sentenceCase(v);
      if (nv !== v) { var s = el.selectionStart, e = el.selectionEnd; el.value = nv; el.setSelectionRange(s, e); }
    });
  });

  /* ---------- Contact: chips compose an email (mirrors src/_lib/compose.js) ---------- */
  function list(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function esc(s) { return s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (res, rej) {
      var ta = doc.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      doc.body.appendChild(ta); ta.select();
      try { doc.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); } finally { doc.body.removeChild(ta); }
    });
  }
  // A link can ask for a chip (/contact/?need=Automate%20a%20task, from the Control room): it's ticked instead of the default
  var need = null;
  try { need = new URLSearchParams(location.search).get('need'); } catch (e) {}
  $$('[data-compose]').forEach(function (f) {
    var grid = f.closest('.contact-grid'), to = f.getAttribute('data-to');
    var asked = need && $$('input[name="need"]', f).filter(function (i) { return i.value === need; })[0];
    if (asked) { $$('input[name="need"]', f).forEach(function (i) { i.checked = i === asked; }); }
    var out = $('[data-preview]', grid), send = $('[data-send]', grid), text = '';
    function upd() {
      var picked = $$('input[name="need"]:checked', f);
      var wants = picked.filter(function (i) { return !i.hasAttribute('data-unsure'); });
      var unsure = picked.length !== wants.length;
      var subj = 'Enquiry: ' + (wants.length ? wants.map(function (i) { return i.value; }).join(', ') : 'not sure yet');
      var ask = wants.length
        ? 'We’d like to talk about ' + list(wants.map(function (i) { return i.getAttribute('data-phrase'); })) + '.' + (unsure ? ' We’re not sure yet exactly what we need.' : '')
        : 'We’re not sure yet what we need, and would like some advice.';
      var biz = f.elements.biz.value.trim(), more = f.elements.more.value.trim();
      var body = 'Hi CuSS,\n\n' + ask + '\n' + (biz ? 'Our business: ' + biz + '\n' : '') + (more ? '\n' + more + '\n' : '') + '\nThanks!';
      text = 'To: ' + to + '\nSubject: ' + subj + '\n\n' + body;
      out.innerHTML = '<span class="k">To:</span> ' + esc(to) + '\n<span class="k">Subject:</span> ' + esc(subj) + '\n\n' + esc(body) + (reduced ? '' : '<span class="cursor"></span>');
      send.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body);
    }
    f.addEventListener('input', upd);
    f.addEventListener('change', upd);
    upd();
    $$('[data-copy]', grid).forEach(function (b) {
      var what = b.getAttribute('data-copy'), done = $('[data-copied="' + what + '"]', grid);
      b.addEventListener('click', function () {
        copyText(what === 'address' ? to : text).then(function () {
          done.textContent = what === 'address' ? 'Address copied' : 'Message copied';
        }, function () { done.textContent = 'Couldn’t copy. Select the text instead.'; });
      });
    });
  });

  /* ---------- "On this page": mark the section in view ---------- */
  var toc = $$('.toc a');
  if (toc.length && 'IntersectionObserver' in window) {
    var map = {};
    toc.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        toc.forEach(function (a) { a.classList.remove('on'); a.removeAttribute('aria-current'); });
        var a = map[e.target.id];
        if (a) { a.classList.add('on'); a.setAttribute('aria-current', 'location'); }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(map).forEach(function (id) { var s = doc.getElementById(id); if (s) obs.observe(s); });
  }

  /* ---------- CREW off email duty: when its status file says so, the Contact line says till when.
     Read once per page, when the Contact block comes near the screen; nothing is stored. If the file can't be read,
     the working line stays. Same rule as CREW's own emails: "tomorrow" when back the next day, else the date. ---------- */
  var assists = $$('[data-crew-status]');
  function irishDay(offset) {
    var d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Dublin' }).format(new Date());   // YYYY-MM-DD
    return offset ? new Date(Date.parse(d + 'T00:00:00Z') + offset * 864e5).toISOString().slice(0, 10) : d;
  }
  function showOff(back) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(back || '') || back <= irishDay(0)) return;
    var when = back === irishDay(1) ? 'tomorrow'
      : new Date(back + 'T00:00:00Z').toLocaleDateString('en-IE', { day: 'numeric', month: 'long', timeZone: 'UTC' });
    assists.forEach(function (p) {
      var line = p.querySelector('[data-crew-line]');
      if (line) line.textContent = 'Our assistant, CREW, is off email duty till ' + when + '. A person is handling emails for now and follows up within two working days.';
    });
  }
  var devOff = /crew-off-(tomorrow|date)/.exec(location.hash);   // dev checks only: show the off-duty lines locally
  // Only these sites may read the file (CORS, statusOrigins in CREW's infra/main.bicep: change both together).
  // Anywhere else the browser would refuse it and log an error, so local builds don't ask.
  var mayRead = /^(www\.)?cuss\.ie$|^emil-ghimici\.github\.io$/.test(location.hostname);
  if (assists.length && devOff) showOff(irishDay(devOff[1] === 'tomorrow' ? 1 : 10));
  else if (assists.length && mayRead && window.fetch) {
    var asked = false;
    var ask = function () {
      if (asked) return;
      asked = true;
      fetch(assists[0].getAttribute('data-crew-status'), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (s) { if (s && s.state === 'off-email-duty') showOff(s.back); })
        .catch(function () {});
    };
    if ('IntersectionObserver' in window) {
      var near = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { near.disconnect(); ask(); }
      }, { rootMargin: '600px 0px' });
      assists.forEach(function (p) { near.observe(p); });
    } else ask();
  }
})();

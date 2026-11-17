/* CuSS site script: theme switch, Services panel, phone Menu, neon dividers,
   the chip-composed email, copy buttons and "On this page". No libraries, no cookies. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
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

  /* ---------- Services panel: opens on click, closes on Esc, outside click or the tab ---------- */
  var pbtn = $('[data-panel]'), panel = $('#services-panel');
  function setPanel(open, refocus) {
    pbtn.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    if (open) { var f = $('a', panel); if (f) f.focus({ preventScroll: true }); }
    else if (refocus) pbtn.focus();
  }
  if (pbtn && panel) {
    pbtn.addEventListener('click', function () { setPanel(panel.hidden); });
    doc.addEventListener('click', function (e) {
      if (!panel.hidden && !panel.contains(e.target) && !pbtn.contains(e.target)) setPanel(false);
    });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) setPanel(false, true); });
    panel.addEventListener('focusout', function (e) {
      if (e.relatedTarget && !panel.contains(e.relatedTarget) && e.relatedTarget !== pbtn) setPanel(false);
    });
  }

  /* ---------- Phone Menu: a sheet under the header; body scroll locked while open ---------- */
  var mbtn = $('[data-menu]'), menu = $('#phone-menu');
  function setMenu(open, refocus) {
    menu.hidden = !open;
    mbtn.setAttribute('aria-expanded', String(open));
    $('.lbl', mbtn).textContent = open ? 'Close' : 'Menu';
    $('.i-open', mbtn).style.display = open ? 'none' : '';
    $('.i-close', mbtn).style.display = open ? '' : 'none';
    doc.body.classList.toggle('menu-open', open);
    if (!open && refocus) mbtn.focus();
  }
  if (mbtn && menu) {
    $('.i-close', mbtn).style.display = 'none';
    mbtn.addEventListener('click', function () { setMenu(menu.hidden); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) setMenu(false, true); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    window.addEventListener('resize', function () { if (!menu.hidden && window.innerWidth > 760) setMenu(false); });
  }

  /* ---------- Neon signs ignite once when they come into view ---------- */
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('ignite'); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    $$('[data-neon]').forEach(function (n) { io.observe(n); });
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
  $$('[data-compose]').forEach(function (f) {
    var grid = f.closest('.contact-grid'), to = f.getAttribute('data-to');
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
})();

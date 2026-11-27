/* The bakery demos, shared: the CuSS bar (theme switch, "Loaded in"), demo notes, screenshot mode, helpers.
   Each page's own script (demo-site.js, demo-dashboard.js, demo-roster.js) uses window.BK. */
(function () {
  var doc = document, root = doc.documentElement;
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  var data = {};
  try { data = JSON.parse($('#bk-data').textContent); } catch (e) {}

  // Screenshot mode (npm run shots): ?shot hides the bar and the notes; the clock is the demo's own anyway.
  if (/[?&]shot\b/.test(location.search)) root.classList.add('shotmode');

  /* ---------- Theme switch (tool demos): the same switch and stored choice as the rest of cuss.ie ---------- */
  var mqLight = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
  function isLight() { var t = root.getAttribute('data-theme'); return t ? t === 'light' : !!(mqLight && mqLight.matches); }
  function syncTheme() {
    var light = isLight();
    $$('[data-theme-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', String(light)); b.title = b.ariaLabel = light ? 'Night theme' : 'Daylight theme'; b.setAttribute('aria-label', b.title); });
    if (!doc.body.classList.contains('bk-site')) { var m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', light ? '#fbf6ec' : '#121826'); }
    doc.dispatchEvent(new CustomEvent('bk:theme'));
  }
  $$('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var next = isLight() ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('cuss-theme', next); } catch (e) {}
      syncTheme();
    });
  });
  if (mqLight && mqLight.addEventListener) mqLight.addEventListener('change', syncTheme);
  syncTheme();

  /* ---------- "Loaded in X s on your device": measured live, one decimal (approved 2026-11-24) ---------- */
  var loaded = $('[data-loaded]');
  if (loaded) {
    var show = function () {
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      var ms = nav && nav.loadEventEnd > 0 ? nav.loadEventEnd : performance.now();
      loaded.querySelector('b').textContent = (Math.max(ms, 50) / 1000).toFixed(1);
      loaded.classList.add('on');
    };
    if (doc.readyState === 'complete') setTimeout(show, 0); else addEventListener('load', function () { setTimeout(show, 0); });
  }

  /* ---------- Demo notes: <p class="cnote" id="n-…" hidden> under the control; a control with data-note="n-…" opens it ---------- */
  function note(id, on) {
    var n = doc.getElementById(id);
    if (!n) return;
    n.hidden = on === undefined ? !n.hidden : !on;
  }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-note]');
    if (!b) return;
    if (b.tagName === 'A') e.preventDefault();
    note(b.getAttribute('data-note'), true);
  });

  /* ---------- Helpers ---------- */
  function euro(v, dec) {
    var d = dec === undefined ? 2 : dec;
    return '€' + Number(v).toLocaleString('en-IE', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  // English counts: "1 order", "2 orders", "1 hour’s rest" / "7 hours’ rest" (one helper for every count on the
  // demos; the build reads this same function for the templates, src/_lib/count.js). n may be a number or its text.
  function count(n, one, many) { return n + ' ' + (Number(n) === 1 ? one : (many || one + 's')); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/csv;charset=utf-8' });
    var a = doc.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    doc.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function csv(rows) {
    return '﻿' + rows.map(function (r) { return r.map(function (c) { var s = String(c == null ? '' : c); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(','); }).join('\r\n') + '\r\n';
  }
  // Leaving a form with typed content asks first (the browser's own warning covers closing the tab)
  var dirty = [];
  function guard(fn) { dirty.push(fn); }
  addEventListener('beforeunload', function (e) { if (dirty.some(function (f) { return f(); })) { e.preventDefault(); e.returnValue = ''; } });
  // Copy buttons
  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-copy]');
    if (!b) return;
    var t = b.getAttribute('data-copy');
    var done = function () { var o = b.textContent; b.textContent = 'Copied'; setTimeout(function () { b.textContent = o; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () {});
    else { var ta = doc.createElement('textarea'); ta.value = t; doc.body.appendChild(ta); ta.select(); try { doc.execCommand('copy'); done(); } catch (x) {} ta.remove(); }
  });
  // Field formatting as typed: names in title case (small words lowercase), free text sentence case; never lowercases
  var SMALL = /^(and|of|the|on|in|at|for|to|a|an|by|de|du|na|an|y)$/i;
  function titleCase(v) {
    return v.replace(/(^|[\s\-’'])([^\s\-’']+)/g, function (m, pre, w, off) {
      if (off > 0 && SMALL.test(w)) return pre + w;
      return pre + w.charAt(0).toUpperCase() + w.slice(1);
    });
  }
  function sentenceCase(v) { return v.replace(/(^\s*|[.!?]\s+)([a-zà-ÿ])/g, function (m, pre, ch) { return pre + ch.toUpperCase(); }); }
  function keepCaret(el, fn) {
    var s = el.selectionStart, e2 = el.selectionEnd, v = fn(el.value);
    if (v !== el.value) { el.value = v; try { el.setSelectionRange(s, e2); } catch (x) {} }
  }
  doc.addEventListener('input', function (e) {
    var el = e.target, f = el.getAttribute && el.getAttribute('data-format');
    if (f === 'name') keepCaret(el, titleCase);
    else if (f === 'sentence') keepCaret(el, sentenceCase);
  });

  window.BK = { data: data, $: $, $$: $$, note: note, euro: euro, count: count, esc: esc, download: download, csv: csv, guard: guard, isLight: isLight };
})();

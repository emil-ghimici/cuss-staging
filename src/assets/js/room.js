/* The Control room demo (design spec section 3): a FICTIONAL bakery's six tools, typed four times,
   then connected. It runs only on its buttons (never autoplays) and pauses at a human checkpoint.
   Every screen holds real text. It tells CREW (guide.js) what is happening through 'room:*' events.
   Reduced motion: each step's screens change at once, with no cable flow. */
(function () {
  'use strict';
  var doc = document;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }

  // Screens after connecting (fictional business only)
  var AFTER = {
    inbox: '<span class="dim">INBOX</span>\nFrom: Café on Main St\n<span class="hi">Order: 40 sourdough,\n24 scones, Thu am</span>\n\n<span class="hz">→ queued as #1042 ✓</span>',
    sheet: '<span class="dim">STOCK</span>\nSourdough   <span class="hi">40 reserved</span>\nScones      <span class="hi">24 reserved</span>\nFlour 25kg  11 left\n\n<span class="hz">✓ no retyping</span>',
    inv: '<span class="dim">INVOICES</span>\nINV-0142  DRAFT\nCafé on Main St\n40 × sourdough\n24 × scones\n<span class="amb">€186.00 · waiting for you</span>',
    invSent: '<span class="dim">INVOICES</span>\nINV-0142  <span class="hz">SENT ✓</span>\nCafé on Main St\n40 × sourdough\n24 × scones\n€186.00',
    del: '<span class="dim">DELIVERIES</span>\n#1042 → Café on Main St\nVan 2 · Thu 07:30\n<span class="hz">Label printed ✓</span>',
    bank: '<span class="dim">BANK</span>\n+€186.00  CAFE ON MAIN\n<span class="hz">matched → INV-0142 ✓</span>\n\nUnmatched: 0',
    dash: '<span class="dim">THIS WEEK</span>\nSales   €4,280  <span class="hz">▲ +€186</span>\nOrders  37\nUnpaid  €0\n<span class="dim">updated just now</span>'
  };
  var SAY = {
    inbox: 'The order lands in one queue. Typed once, by the customer.',
    sheet: 'Stock is reserved automatically.',
    inv: 'A draft invoice is ready. You stay in charge: check it, then confirm.',
    confirmed: 'Confirmed. The rest follows on its own.',
    del: 'Delivery booked, label printed.',
    bank: 'Payment arrives and is matched to the invoice.',
    dash: 'Typed once. Checked by you. Done.'
  };

  $$('[data-room]').forEach(function (room) {
    var wall = $('.room-wall', room), svg = $('.cables', room), cap = $('.caption', room);
    var connectBtn = $('.connect', room), confirmBtn = $('.confirm', room), againBtn = $('.again', room);
    var mons = {}; $$('.mon', room).forEach(function (m) { mons[m.dataset.k] = m; });
    var order = ['inbox', 'sheet', 'inv', 'del', 'bank', 'dash'].filter(function (k) { return mons[k]; });
    var before = {}; Object.keys(mons).forEach(function (k) { before[k] = $('.scr', mons[k]).innerHTML; });
    var firstCaption = cap.textContent, timers = [];

    function tell(type, k, line) { doc.dispatchEvent(new CustomEvent('room:' + type, { detail: { room: room, mon: k && mons[k], line: line } })); }
    function later(fn, ms) { timers.push(setTimeout(fn, reduced ? 0 : ms)); }
    function set(k, html) {
      var m = mons[k]; if (!m) return false;
      $('.scr', m).innerHTML = html; m.classList.add('live'); m.classList.remove('flicker');
      return true;
    }
    function say(t) { cap.textContent = t; }
    function step(k, html, line, ms) {
      later(function () { if (set(k, html)) { say(line); tell('step', k, line); } }, ms);
    }
    function drawCables() {
      var wr = wall.getBoundingClientRect(), d = '';
      svg.setAttribute('viewBox', '0 0 ' + wr.width + ' ' + wr.height);
      for (var i = 0; i < order.length - 1; i++) {
        var a = mons[order[i]].getBoundingClientRect(), b = mons[order[i + 1]].getBoundingClientRect();
        var ax = a.left + a.width / 2 - wr.left, ay = a.top + a.height / 2 - wr.top;
        var bx = b.left + b.width / 2 - wr.left, by = b.top + b.height / 2 - wr.top;
        if (Math.abs(ay - by) < 10) { ax += a.width / 2 - 4; bx -= b.width / 2 - 4; d += 'M' + ax + ' ' + ay + ' C' + (ax + 30) + ' ' + (ay + 40) + ' ' + (bx - 30) + ' ' + (by + 40) + ' ' + bx + ' ' + by + ' '; }
        else { ay += a.height / 2 - 4; by -= b.height / 2 - 4; d += 'M' + ax + ' ' + ay + ' C' + ax + ' ' + (ay + 60) + ' ' + bx + ' ' + (by - 60) + ' ' + bx + ' ' + by + ' '; }
      }
      svg.innerHTML = '<path d="' + d + '"/>';
    }

    connectBtn.addEventListener('click', function () {
      room.classList.add('connected'); drawCables();
      Object.keys(mons).forEach(function (k) { mons[k].classList.remove('flicker'); });
      set('inbox', AFTER.inbox); say(SAY.inbox); tell('step', 'inbox', SAY.inbox);
      step('sheet', AFTER.sheet, SAY.sheet, 1600);
      later(function () {
        set('inv', AFTER.inv); room.classList.add('awaiting');
        say(SAY.inv); tell('await', 'inv', SAY.inv);
        confirmBtn.focus({ preventScroll: true });
      }, 3200);
    });
    confirmBtn.addEventListener('click', function () {
      room.classList.remove('awaiting'); set('inv', AFTER.invSent);
      say(SAY.confirmed); tell('step', 'inv', SAY.confirmed);
      step('del', AFTER.del, SAY.del, 1400);
      step('bank', AFTER.bank, SAY.bank, 2800);
      later(function () {
        var last = mons.dash ? 'dash' : order[order.length - 1];
        if (mons.dash) set('dash', AFTER.dash);
        say(SAY.dash); tell('done', last, SAY.dash);
        againBtn.hidden = false;
      }, 4200);
    });
    againBtn.addEventListener('click', function () {
      timers.forEach(clearTimeout); timers = [];
      room.classList.remove('connected', 'awaiting'); againBtn.hidden = true;
      Object.keys(mons).forEach(function (k) { $('.scr', mons[k]).innerHTML = before[k]; mons[k].classList.remove('live'); mons[k].classList.add('flicker'); });
      say(firstCaption); tell('reset');
      connectBtn.focus({ preventScroll: true });
    });
    window.addEventListener('resize', function () { if (room.classList.contains('connected')) drawCables(); });
    // Flicker and cable flow pause while the wall is off screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { room.classList.toggle('paused', !es[0].isIntersecting); }).observe(room);
    }
  });
})();

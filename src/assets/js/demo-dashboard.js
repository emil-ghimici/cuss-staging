/* The bakery's dashboard demo: "Needs a look" actions with undo (cleared only by doing the work), reminders,
   CSV and PDF exports made on the device. Fixed at Thursday 10:30 of the demo week. */
(function () {
  var BK = window.BK, $ = BK.$, $$ = BK.$$, D = BK.data, doc = document;
  if (!D.invoices) return;
  var unpaid = D.invoices.map(function (i) { return { n: i.n, who: i.who, amount: i.amount, due: i.due, dueIso: i.dueIso, overdue: i.overdue, paid: false }; });
  // The order states and sources in the page's own words, for the CSV too (2026-11-27)
  var STATE = { out: 'Out for delivery', booked: 'Booked', delivered: 'Delivered' };
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function lookCount() {
    var n = $$('.look').filter(function (l) { return !l.classList.contains('is-done'); }).length;
    var c = $('[data-look-count]');
    c.textContent = n; c.hidden = n === 0;
  }
  function renderUnpaid() {
    var open = unpaid.filter(function (i) { return !i.paid; });
    var sum = open.reduce(function (s, i) { return s + i.amount; }, 0);
    $('[data-unpaid]').textContent = BK.euro(sum, 0);
    var late = open.filter(function (i) { return i.overdue; }).length;
    $('[data-unpaid-n]').textContent = BK.count(open.length, 'invoice') + ' · ' + (late ? BK.count(late, 'overdue', 'overdue') : 'none overdue');
  }

  // Each action: what it does, its plain-text result, and its own undo naming what was done.
  var acts = {
    match: {
      label: 'Matched to INV-0139: €410.00 paid', undo: 'Undo match for INV-0139',
      on: function () {
        unpaid.forEach(function (i) { if (i.n === 'INV-0139') i.paid = true; });
        var row = $('[data-inv="INV-0139"]');
        row.querySelector('[data-inv-act]').innerHTML = '<span class="pill ok">Paid · matched</span>';
        var li = doc.createElement('li'); li.className = 'r'; li.setAttribute('data-paid-0139', '');
        li.innerHTML = '<div><p class="r-t">INV-0139 · Hotel on the Square</p><p class="muted">+€410.00 · matched by you</p></div><span class="pill ok">Paid</span>';
        $('[data-paid]').insertBefore(li, $('[data-paid]').firstChild);
        $('[data-paid-n]').textContent = $$('[data-paid] li').length;
        renderUnpaid();
      },
      off: function () {
        unpaid.forEach(function (i) { if (i.n === 'INV-0139') i.paid = false; });
        $('[data-inv="INV-0139"] [data-inv-act]').innerHTML = '<button class="b" type="button" data-remind>Send reminder</button>';
        var li = $('[data-paid-0139]'); if (li) li.remove();
        $('[data-paid-n]').textContent = $$('[data-paid] li').length;
        renderUnpaid();
      }
    },
    flour: {
      label: 'Flour order drafted', undo: 'Undo flour order draft',
      on: function () { BK.note('n-flour', true); }, off: function () { BK.note('n-flour', false); }
    }
  };
  // An acted-on card stays where it is, showing its new state and its undo, until the page is left or reloaded.
  doc.addEventListener('click', function (e) {
    var d = e.target.closest('[data-do]');
    if (d) {
      var k = d.getAttribute('data-do'), a = acts[k], card = d.closest('.look'), box = card.querySelector('[data-look-act]');
      a.on();
      card.classList.add('is-done');
      box.innerHTML = '<span class="done-t">' + BK.esc(a.label) + '</span><button class="b undo" type="button" data-undo="' + k + '">' + BK.esc(a.undo) + '</button>';
      lookCount();
      return;
    }
    var u = e.target.closest('[data-undo]');
    if (u) {
      var k2 = u.getAttribute('data-undo'), a2 = acts[k2], card2 = u.closest('.look');
      a2.off();
      card2.classList.remove('is-done');
      card2.querySelector('[data-look-act]').innerHTML = '<button class="b fill" type="button" data-do="' + k2 + '">' + (k2 === 'match' ? 'Match to INV-0139' : 'Draft the flour order') + '</button>';
      lookCount();
      return;
    }
    var r = e.target.closest('[data-remind]');
    if (r) {
      var row = r.closest('[data-inv]');
      row.querySelector('[data-inv-act]').innerHTML = '<span class="done-t">Reminder sent</span>';
      row.querySelector('.r-note').hidden = false;
    }
  });

  // Exports, made on the device from the demo's figures
  $('[data-csv]').addEventListener('click', function () {
    var rows = [['Shutter & Crumb', 'This week, to Thursday 10:30'], [],
      ['Figure', 'Value'], ['Sales (Mon–Thu)', D.sales.soFar], ['Sales, last week to Thursday 10:30', D.sales.lastToNow], ['Wholesale orders', D.ordersWeek],
      ['Unpaid', unpaid.filter(function (i) { return !i.paid; }).reduce(function (s, i) { return s + i.amount; }, 0).toFixed(2)], ['Wages so far', D.wages.total], [],
      ['Day', 'Shop', 'Wholesale', 'Last week']];
    D.days.forEach(function (d, i) { var t = D.sales.thisWeek[i]; rows.push([d, t ? t[0] : '', t ? t[1] : '', D.sales.lastWeek[i]]); });
    rows.push([], ['Order', 'Customer', 'Items', 'Delivery', 'State', 'Came']);
    D.orders.forEach(function (o) { rows.push(['#' + o.n, o.who, o.what, o.when, STATE[o.state] || o.state, cap(o.src)]); });
    rows.push([], ['Invoice', 'Customer', 'Amount', 'Due', 'State']);
    unpaid.forEach(function (i) { rows.push([i.n, i.who, i.amount.toFixed(2), i.dueIso, i.paid ? 'Paid' : 'Unpaid']); });
    BK.download('shutter-and-crumb-this-week.csv', BK.csv(rows));
  });
  // PDF: the folds open for the print and go back to how they were once printing ends (2026-11-27)
  $('[data-pdf]').addEventListener('click', function () {
    var was = $$('details').map(function (d) { return [d, d.open]; });
    was.forEach(function (x) { x[0].open = true; });
    addEventListener('afterprint', function back() { was.forEach(function (x) { x[0].open = x[1]; }); removeEventListener('afterprint', back); });
    window.print();
  });
  lookCount();
})();

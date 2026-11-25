/* The bakery's website demo: open now (Irish time), the owner's settings panel (nothing stored), the wholesale
   form (nothing sent), the phone's Call | Directions dock. Demo steps 4 and 4b; CuSS's words approved 2026-11-24. */
(function () {
  var BK = window.BK, $ = BK.$, $$ = BK.$$, D = BK.data, doc = document;
  if (!D.hours) return;

  /* ---------- Irish time ---------- */
  function dublinNow() {
    var parts = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Dublin', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false, year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    var wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday);
    return { day: wd, min: (+parts.hour % 24) * 60 + (+parts.minute), date: new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day)) };
  }
  function toMin(t) { var a = t.split(':'); return +a[0] * 60 + (+a[1]); }
  function hm(t) { var a = t.split(':'), h = +a[0], m = +a[1]; return (h % 12 || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + (h < 12 ? 'am' : 'pm'); }
  function times(from, to) { var out = []; for (var m = toMin(from); m <= toMin(to); m += 30) out.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0')); return out; }
  var items = []; D.menu.forEach(function (g) { g.items.forEach(function (i) { items.push(i); }); });
  function itemName(id) { for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i].name; return id; }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- The page's state: what's saved, and the owner's draft ---------- */
  var saved = { mode: 'usual', earlyAt: '', note: '', hours: D.hours.map(function (h) { return { open: h.open, close: h.close }; }), items: {}, photo: '' };
  items.forEach(function (i) { saved.items[i.id] = { price: i.price, sold: !!i.soldOut }; });
  var draft = copy(saved);
  var history = []; // each save: { prev: state, keys: [...] }
  var svg = $('[data-pic] svg');

  /* ---------- Open now ---------- */
  function todaysHours(st, day, now) {
    var h = st.hours[day];
    if (!h.open) return null;
    if (now && day === now.day) {
      if (st.mode === 'closed') return null;
      if (st.mode === 'early' && st.earlyAt) return { open: h.open, close: st.earlyAt, early: true };
    }
    return h;
  }
  function renderOpen() {
    var now = dublinNow(), pill = $('[data-open-pill]'), txt = $('[data-open-text]');
    var t = todaysHours(saved, now.day, now);
    var open = t && now.min >= toMin(t.open) && now.min < toMin(t.close);
    if (open) {
      pill.textContent = 'Open now'; pill.className = 'pill ok';
      txt.textContent = t.early ? 'closing early today, at ' + hm(t.close) : 'until ' + hm(t.close);
    } else {
      pill.className = 'pill dim';
      if (t && now.min < toMin(t.open)) { pill.textContent = 'Closed now'; txt.textContent = 'opens at ' + hm(t.open) + ' today'; }
      else {
        pill.textContent = saved.mode === 'closed' ? 'Closed today' : 'Closed now';
        for (var k = 1; k <= 7; k++) {
          var d = (now.day + k) % 7, h = saved.hours[d];
          if (h.open) { txt.textContent = 'opens ' + hm(h.open) + ' ' + (k === 1 ? 'tomorrow' : D.dayNames[d]); break; }
        }
      }
    }
    // The owner's notice for today
    var msg = saved.note;
    if (!msg && saved.mode === 'closed') msg = 'Closed today.';
    if (!msg && saved.mode === 'early' && saved.earlyAt) msg = 'Closing early today, at ' + hm(saved.earlyAt) + '.';
    else if (msg && saved.mode === 'early' && saved.earlyAt) msg = 'Closing at ' + hm(saved.earlyAt) + ' today. ' + msg;
    ['[data-notice-line]', '[data-notice-line2]'].forEach(function (s) { var el = $(s); el.hidden = !msg; el.textContent = msg ? 'Today: ' + msg.replace(/^Today:\s*/, '') : ''; });
    $$('[data-hrow]').forEach(function (r) {
      var i = +r.getAttribute('data-hrow'), h = saved.hours[i];
      r.classList.toggle('today', i === now.day);
      r.querySelector('.today-tag').hidden = i !== now.day;
      r.querySelector('[data-htime]').textContent = h.open ? hm(h.open) + '–' + hm(h.close) : 'Closed';
    });
  }
  function renderMenu() {
    items.forEach(function (i) {
      var li = $('[data-mi="' + i.id + '"]'), s = saved.items[i.id];
      li.querySelector('[data-mi-price]').textContent = (i.from ? 'from €' + (+s.price).toFixed(s.price % 1 ? 2 : 0) : '€' + (+s.price).toFixed(2));
      li.querySelector('[data-mi-sold]').hidden = !s.sold;
    });
  }
  function renderPhoto() {
    var pic = $('[data-pic]'), img = $('img', pic);
    if (saved.photo) {
      if (!img) { img = doc.createElement('img'); img.alt = 'Photo of the shop, added by the owner'; pic.appendChild(img); }
      img.src = saved.photo; svg.style.display = 'none';
    } else { if (img) img.remove(); svg.style.display = ''; }
  }
  function renderPage() { renderOpen(); renderMenu(); renderPhoto(); }
  renderPage();
  setInterval(renderOpen, 60000);

  /* ---------- The owner's settings panel ---------- */
  var panel = $('#owner'), toggle = $('[data-owner-toggle]'), form = $('[data-own]');
  toggle.addEventListener('click', function () {
    var open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close the owner’s settings' : 'Try the owner’s settings';
  });
  if (matchMedia('(pointer: coarse)').matches) { $('[data-touch-only]').hidden = false; $('.photo2').classList.add('two'); }

  // Fill the selects
  var opens = times('05:00', '12:00'), closes = times('11:00', '21:00');
  $$('.oh').forEach(function (fs) {
    var o = fs.querySelector('[data-open]'), c = fs.querySelector('[data-close]');
    o.innerHTML = '<option value="">Closed all day</option>' + opens.map(function (t) { return '<option value="' + t + '">' + hm(t) + '</option>'; }).join('');
    c.innerHTML = closes.map(function (t) { return '<option value="' + t + '">' + hm(t) + '</option>'; }).join('');
  });
  function fillEarly() {
    var now = dublinNow(), h = draft.hours[now.day], sel = $('[data-close-early]');
    var end = h.open ? toMin(h.close) - 30 : toMin('16:30');
    var from = Math.max(toMin('10:00'), now.min + 30);
    var opts = times('10:00', '21:00').filter(function (t) { return toMin(t) <= end && toMin(t) >= from; });
    sel.innerHTML = '<option value="">' + (opts.length ? 'Pick a time' : 'No earlier time left today') + '</option>' + opts.map(function (t) { return '<option value="' + t + '">' + hm(t) + '</option>'; }).join('');
  }
  fillEarly();

  function fillFields() {
    $$('[data-today]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-today') === draft.mode)); });
    $('[data-early-time]').hidden = draft.mode !== 'early';
    $('[data-close-early]').value = draft.earlyAt;
    $('[data-notice]').value = draft.note;
    $$('.oh').forEach(function (fs) {
      var i = +fs.getAttribute('data-day'), h = draft.hours[i];
      fs.querySelector('[data-open]').value = h.open;
      var c = fs.querySelector('[data-close]'); c.value = h.close; c.disabled = !h.open;
    });
    $$('.mrow').forEach(function (r) {
      var s = draft.items[r.getAttribute('data-item')];
      var p = r.querySelector('[data-price]');
      if (doc.activeElement !== p) p.value = (+s.price).toFixed(2);
      r.querySelector('[data-sold]').checked = s.sold;
    });
  }

  // What differs between the draft and what's saved, one entry per field the owner can undo
  function changes() {
    var out = [];
    if (draft.mode !== saved.mode || draft.earlyAt !== saved.earlyAt) out.push({ key: 'today', label: 'Undo change to today’s opening' });
    if (draft.note !== saved.note) out.push({ key: 'note', label: 'Undo change to the note for customers' });
    draft.hours.forEach(function (h, i) { var s = saved.hours[i]; if (h.open !== s.open || (h.open && h.close !== s.close)) out.push({ key: 'h' + i, label: 'Undo hours change for ' + D.dayNames[i] }); });
    items.forEach(function (it) {
      var d = draft.items[it.id], s = saved.items[it.id];
      if (+d.price !== +s.price) out.push({ key: 'p-' + it.id, label: 'Undo price change for ' + it.name });
      if (d.sold !== s.sold) out.push({ key: 's-' + it.id, label: 'Undo sold-out change for ' + it.name });
    });
    if (draft.photo !== saved.photo) out.push({ key: 'photo', label: 'Undo photo change' });
    return out;
  }
  function revert(key) {
    if (key === 'today') { draft.mode = saved.mode; draft.earlyAt = saved.earlyAt; }
    else if (key === 'note') draft.note = saved.note;
    else if (/^h\d$/.test(key)) draft.hours[+key.slice(1)] = copy(saved.hours[+key.slice(1)]);
    else if (key.indexOf('p-') === 0) draft.items[key.slice(2)].price = saved.items[key.slice(2)].price;
    else if (key.indexOf('s-') === 0) draft.items[key.slice(2)].sold = saved.items[key.slice(2)].sold;
    else if (key === 'photo') draft.photo = saved.photo;
  }
  var badPrice = {};
  function refresh() {
    var ch = changes(), keys = {};
    ch.forEach(function (c) { keys[c.key] = c.label; });
    $$('[data-undo-key]').forEach(function (b) { var k = b.getAttribute('data-undo-key'); b.hidden = !keys[k]; b.textContent = keys[k] || ''; });
    var why = [];
    if (draft.mode === 'early' && !draft.earlyAt) why.push('Pick a closing time for Closing early');
    Object.keys(badPrice).forEach(function (id) { if (badPrice[id]) why.push('Check the price for ' + itemName(id) + ' (a number, like 4.80)'); });
    if (!ch.length && !why.length) why.push('Nothing changed yet');
    var save = $('[data-save]');
    save.disabled = why.length > 0;
    save.textContent = ch.length ? 'Save changes (' + ch.length + ')' : 'Save changes';
    $('[data-save-why]').innerHTML = why.map(function (w) { return '<li>' + BK.esc(w) + '</li>'; }).join('');
    var sum = $('[data-sum="today"]');
    sum.textContent = draft.mode === 'usual' ? 'As usual' : draft.mode === 'closed' ? 'Closed today' : 'Closing early' + (draft.earlyAt ? ' at ' + hm(draft.earlyAt) : '');
    if (ch.length) hideSaved();
  }

  form.addEventListener('click', function (e) {
    var t = e.target.closest('[data-today]');
    if (t) { draft.mode = t.getAttribute('data-today'); if (draft.mode !== 'early') draft.earlyAt = ''; fillFields(); refresh(); return; }
    var u = e.target.closest('[data-undo-key]');
    if (u) { var k = u.getAttribute('data-undo-key'); revert(k); if (k.indexOf('p-') === 0) badPrice[k.slice(2)] = false; fillFields(); refresh(); }
  });
  form.addEventListener('change', function (e) {
    var el = e.target;
    if (el.matches('[data-close-early]')) draft.earlyAt = el.value;
    else if (el.matches('[data-open]') || el.matches('[data-close]')) {
      var i = +el.closest('.oh').getAttribute('data-day'), h = draft.hours[i];
      if (el.matches('[data-open]')) { h.open = el.value; if (h.open && toMin(h.close) <= toMin(h.open)) h.close = times(h.open, '21:00')[2] || '21:00'; }
      else h.close = el.value;
      if (h.open && toMin(h.close) <= toMin(h.open)) h.close = times(h.open, '21:00')[2] || '21:00';
      fillFields();
    } else if (el.matches('[data-sold]')) draft.items[el.closest('.mrow').getAttribute('data-item')].sold = el.checked;
    else if (el.matches('[data-photo]') && el.files && el.files[0]) { draft.photo = URL.createObjectURL(el.files[0]); el.value = ''; $('[data-sum="photo"]').textContent = 'New photo chosen'; }
    refresh();
  });
  form.addEventListener('input', function (e) {
    var el = e.target;
    if (el.matches('[data-notice]')) draft.note = el.value.trim();
    else if (el.matches('[data-price]')) {
      var id = el.closest('.mrow').getAttribute('data-item');
      var v = el.value.replace(',', '.').replace(/[^0-9.]/g, '');
      var n = parseFloat(v);
      badPrice[id] = !(v && /^\d{1,4}(\.\d{0,2})?$/.test(v) && n > 0);
      if (!badPrice[id]) draft.items[id].price = Math.round(n * 100) / 100;
    }
    refresh();
  });
  form.addEventListener('focusout', function (e) { if (e.target.matches('[data-price]') && !badPrice[e.target.closest('.mrow').getAttribute('data-item')]) fillFields(); });

  // Save: the whole page updates; "Changed" tags mark what this save changed; one undo for the whole save
  function chgKeys(keys) {
    $$('.chg').forEach(function (c) { c.classList.remove('on'); });
    keys.forEach(function (k) {
      var tag = k === 'today' || k === 'note' ? 'today' : /^h\d$/.test(k) ? k : k.indexOf('-') === 1 ? 'i-' + k.slice(2) : null;
      var el = tag && $('[data-chg="' + tag + '"]'); if (el) el.classList.add('on');
    });
  }
  function showSaved() {
    var last = history[history.length - 1], area = $('[data-save-area]');
    hideSaved();
    if (!last) return;
    $('[data-save]').hidden = true; $('[data-save-why]').hidden = true;
    var line = doc.createElement('p');
    line.className = 'saved-line'; line.setAttribute('data-saved-line', '');
    line.innerHTML = '<span>' + BK.esc(BK.count(last.keys.length, 'change')) + ' saved</span><button class="b" type="button" data-undo-save>' + BK.esc('Undo ' + BK.count(last.keys.length, 'change')) + '</button>';
    area.insertBefore(line, area.firstChild);
  }
  function hideSaved() {
    var l = $('[data-saved-line]'); if (l) l.remove();
    $('[data-save]').hidden = false; $('[data-save-why]').hidden = false;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ch = changes();
    if (!ch.length || $('[data-save]').disabled) return;
    history.push({ prev: copy(saved), keys: ch.map(function (c) { return c.key; }) });
    saved = copy(draft);
    renderPage(); chgKeys(history[history.length - 1].keys); refresh(); showSaved(); renderDays();
  });
  $('[data-save-area]').addEventListener('click', function (e) {
    if (!e.target.closest('[data-undo-save]')) return;
    var last = history.pop();
    saved = last.prev; draft = copy(saved);
    fillFields(); renderPage(); chgKeys(history.length ? history[history.length - 1].keys : []); refresh(); renderDays();
    if (history.length) showSaved();
  });
  fillFields(); refresh();
  BK.guard(function () { return changes().length > 0; });

  /* ---------- Wholesale form ---------- */
  // Delivery mornings (2026-11-24): the coming seven days from the first morning the 2pm cut-off allows, and a
  // calendar for later dates (up to 8 weeks). A day that can't be booked stays in its place, greyed, with its reason
  // in a tip: Sundays (the van goes out Monday to Saturday), the public holidays the bakery closes for, and weekdays
  // the owner's opening hours mark "Closed all day". In the real app a published roster with no van shift greys a day
  // too ("No van out that day"); the website only ever learns that, never who works when.
  var ws = $('[data-ws]'), orderNo = D.nextOrder, pick = null, calMonth = null;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  function wd(dt) { return (dt.getUTCDay() + 6) % 7; }                       // Monday = 0
  function key(dt) { return dt.toISOString().slice(0, 10); }
  function fromKey(k) { return new Date(k + 'T00:00:00Z'); }
  function addDays(dt, n) { return new Date(dt.getTime() + n * 864e5); }
  function firstMorning() { var now = dublinNow(); return addDays(now.date, now.min < 14 * 60 ? 1 : 2); }
  function lastMorning() { return addDays(firstMorning(), 55); }
  function why(dt) {                                                       // null when the morning can be booked
    var w = wd(dt), md = key(dt).slice(5);
    if (w === 6) return 'No deliveries on Sundays';
    for (var i = 0; i < (D.closures || []).length; i++) if (D.closures[i].md === md) return 'Closed: ' + D.closures[i].name;
    if (!saved.hours[w].open) return 'Closed on ' + D.dayNames[w] + 's';
    return null;
  }
  function longDate(dt) { return D.dayNames[wd(dt)] + ' ' + dt.getUTCDate() + ' ' + MONTH[dt.getUTCMonth()]; }
  function dayBtn(dt, short) {
    var k = key(dt), r = why(dt);
    // The spoken name starts with the visible words; a greyed day adds its reason for screen readers
    return '<button class="dayb" type="button" data-day-pick="' + k + '"' + (r ? ' aria-disabled="true" data-tip="' + BK.esc(r) + '"' : '') + ' aria-pressed="' + (pick === k) + '">' +
      (short ? '<span>' + dt.getUTCDate() + '</span>' : '<span class="wd-l">' + D.dayNames[wd(dt)] + '</span><span class="wd-s">' + SHORT[wd(dt)] + '</span><small>' + dt.getUTCDate() + ' ' + MON[dt.getUTCMonth()] + '</small>') + (r ? '<span class="sr">: ' + BK.esc(r) + '</span>' : '') + '</button>';
  }
  function renderDays() {
    var f = firstMorning(), html = '';
    for (var i = 0; i < 7; i++) html += dayBtn(addDays(f, i));
    $('[data-days]').innerHTML = html;
    var now = dublinNow();
    $('[data-cutoff]').textContent = pick ? 'Delivery: ' + longDate(fromKey(pick)) + '.' :
      now.min < 14 * 60 ? 'Order by 2pm today for tomorrow morning.' : 'It’s past today’s 2pm cut-off, so the first delivery is ' + D.dayNames[wd(f)] + '.';
    if (!$('[data-cal]').hidden) renderCal();
  }
  function renderCal() {
    var f = firstMorning(), l = lastMorning();
    if (!calMonth) calMonth = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), 1));
    var y = calMonth.getUTCFullYear(), m = calMonth.getUTCMonth(), first = new Date(Date.UTC(y, m, 1));
    var prevOk = new Date(Date.UTC(y, m, 0)) >= f, nextOk = new Date(Date.UTC(y, m + 1, 1)) <= l;
    var html = '<div class="cal-head"><p class="cal-title" aria-live="polite">' + MONTH[m] + ' ' + y + '</p>' +
      '<button class="b" type="button" data-cal-move="-1"' + (prevOk ? '' : ' disabled') + '>‹ Previous month</button>' +
      '<button class="b" type="button" data-cal-move="1"' + (nextOk ? '' : ' disabled') + '>Next month ›</button></div><div class="cal-grid" role="group" aria-label="' + MONTH[m] + ' ' + y + '">';
    SHORT.forEach(function (d) { html += '<span class="wdh" aria-hidden="true">' + d + '</span>'; });
    // Whole weeks before the first bookable morning (or after the last) aren't drawn: the grid starts on the Monday of
    // the first week that has one
    var start = first < f ? addDays(f, -wd(f)) : addDays(first, -wd(first)), end = new Date(Date.UTC(y, m + 1, 0));
    if (end > l) end = addDays(l, 6 - wd(l));
    for (var dt = start; dt <= end; dt = addDays(dt, 1)) html += dt.getUTCMonth() !== m || dt < f || dt > l ? '<span class="out"></span>' : dayBtn(dt, true);
    html += '</div><p class="cnote">For demo purposes, the days follow the opening hours only. In the real app, a day with no van on the roster is greyed out too, and the website only ever learns that, never who works when.</p>';
    $('[data-cal]').innerHTML = html;
  }
  renderDays();
  // The reason a day can't be booked: a floating tip on hover, on tap, or on keyboard focus; one at a time
  var tip = doc.createElement('div'); tip.className = 'tip'; tip.hidden = true; tip.setAttribute('role', 'tooltip'); doc.body.appendChild(tip);
  function showTip(b) {
    tip.textContent = b.getAttribute('data-tip'); tip.hidden = false;
    var r = b.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    tip.style.top = (r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8) + 'px';
  }
  function hideTip() { tip.hidden = true; }
  ws.addEventListener('mouseover', function (e) { var b = e.target.closest('[data-tip]'); if (b) showTip(b); });
  ws.addEventListener('mouseout', function (e) { if (e.target.closest('[data-tip]')) hideTip(); });
  ws.addEventListener('focusin', function (e) { var b = e.target.closest('[data-tip]'); if (b) showTip(b); else hideTip(); });
  ws.addEventListener('focusout', hideTip);
  addEventListener('scroll', hideTip, { passive: true });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideTip(); });
  doc.addEventListener('click', function (e) { if (!e.target.closest('[data-tip]')) hideTip(); });

  function qty(tr) { var v = tr.querySelector('[data-qty]').value; return v ? parseInt(v, 10) : 0; }
  function wsRefresh() {
    var total = 0, any = false;
    $$('[data-tr]', ws).forEach(function (tr) {
      var q = qty(tr), line = q * parseFloat(tr.getAttribute('data-price'));
      if (q > 0) any = true;
      total += line;
      tr.querySelector('[data-line]').textContent = q > 0 ? BK.euro(line) : '–';
    });
    $('[data-total]', ws).textContent = BK.euro(total);
    var w = [];
    if (!$('[data-ws-name]').value.trim()) w.push('Add your business name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($('[data-ws-email]').value.trim())) w.push('Add an email address');
    if (!any) w.push('Add a quantity for at least one product');
    if (!pick) w.push('Pick a delivery morning');
    $('[data-ws-send]').setAttribute('aria-disabled', String(w.length > 0));
    $('[data-ws-why]').innerHTML = w.map(function (x) { return '<li>' + x + '</li>'; }).join('');
    return w.length === 0;
  }
  ws.addEventListener('input', function (e) {
    if (e.target.matches('[data-qty]')) { var v = e.target.value.replace(/\D/g, ''); if (v !== e.target.value) e.target.value = v; }
    $('[data-ws-done]').hidden = true; BK.note('n-send', false);
    wsRefresh();
  });
  ws.addEventListener('click', function (e) {
    var b = e.target.closest('[data-day-pick]');
    if (b) {
      if (b.getAttribute('aria-disabled') === 'true') { showTip(b); return; }   // a tap shows why
      pick = b.getAttribute('data-day-pick');
      renderDays(); wsRefresh();
      var again = $('[data-day-pick="' + pick + '"]', b.closest('.cal') || ws); if (again) again.focus();
      return;
    }
    var t = e.target.closest('[data-cal-toggle]');
    if (t) { var cal = $('[data-cal]'); cal.hidden = !cal.hidden; t.setAttribute('aria-expanded', String(!cal.hidden)); if (!cal.hidden) renderCal(); return; }
    var mv = e.target.closest('[data-cal-move]');
    if (mv) { calMonth = new Date(Date.UTC(calMonth.getUTCFullYear(), calMonth.getUTCMonth() + (+mv.getAttribute('data-cal-move')), 1)); renderCal(); }
  });
  ws.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!wsRefresh()) return;
    var done = $('[data-ws-done]');
    done.textContent = 'Order #' + orderNo + ' received for ' + longDate(fromKey(pick)) + '.';
    orderNo++;
    $$('input,textarea', ws).forEach(function (i) { i.value = ''; });
    pick = null; renderDays(); wsRefresh();
    done.hidden = false; BK.note('n-send', true);
  });
  wsRefresh();
  BK.guard(function () { return $$('input,textarea', ws).some(function (i) { return i.value.trim(); }); });

  /* ---------- Phone: Call | Directions dock once the top pair has scrolled away ---------- */
  var dock = $('[data-dock]'), acts = $('[data-acts]');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      var gone = !es[0].isIntersecting && es[0].boundingClientRect.top < 0;
      dock.hidden = !gone; doc.body.classList.toggle('docked', gone);
      if (!gone) BK.note('n-dock', false);
    }).observe(acts);
  }
  dock.addEventListener('click', function (e) {
    var b = e.target.closest('[data-dock-note]');
    if (!b) return;
    e.preventDefault();
    var n = $('#n-dock');
    n.textContent = doc.getElementById(b.getAttribute('data-dock-note')).textContent;
    n.hidden = false;
  });
})();

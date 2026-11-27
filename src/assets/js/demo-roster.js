/* The bakery's roster demo (demo steps 7–10). Fixed at Thursday 10:30 of the demo week.
   Rules (skill staff-rostering-rules, Ireland, verified November 2026):
   RED, can't be put on: under-18s (PYPEA 1996 s.6: no work 22:00–06:00, ≤ 8 h a day, ≤ 40 h a week, 12 h daily
   rest, 2 days off in 7); 11 h daily rest (OWTA s.11); 4-month average over 48 h (s.15); already on a shift then.
   AMBER, the owner confirms: one week over 48 h (s.15); no 24 h weekly rest (s.13); not an agreed day (s.17(1A),
   ask first); under 24 h notice (s.17(1), (4)); over contract hours (a cost, not law).
   PLANNED: breaks (s.12; shop staff S.I. 57/1998 reg. 3; under-18s PYPEA s.6), Sunday pay (s.14), records (s.25). */
(function () {
  var BK = window.BK, $ = BK.$, $$ = BK.$$, D = BK.data, doc = document, esc = BK.esc;
  if (!D.shifts) return;
  var NOW = D.now.day * 1440 + D.now.min; // Thursday 10:30
  var DAY = D.dayNames, DY = D.days;
  var people = {}; D.staff.forEach(function (p) { people[p.id] = p; });
  var shifts = D.shifts.map(function (s) { var k = D.kinds[s.kind]; return { id: s.id, day: s.day, kind: s.kind, who: s.who, need: !!s.need, label: k.label, start: k.start.replace(/^0/, ''), end: k.end.replace(/^0/, ''), team: k.team, shop: k.shop, status: null }; });
  var byId = {}; shifts.forEach(function (s) { byId[s.id] = s; });
  function toMin(t) { var a = t.split(':'); return +a[0] * 60 + (+a[1]); }
  function t0(s) { return s.day * 1440 + toMin(s.start); }
  function t1(s) { return s.day * 1440 + toMin(s.end); }
  function len(s) { return (toMin(s.end) - toMin(s.start)) / 60; }
  function fmtH(h) { return (Math.round(h * 10) / 10).toString().replace(/\.0$/, ''); }
  function when(s) { return DAY[s.day] + ' ' + s.start + '–' + s.end; }
  function finished(s) { return t1(s) <= NOW; }
  function running(s) { return t0(s) <= NOW && t1(s) > NOW; }
  var CITE = { s11: 'Organisation of Working Time Act 1997, section 11.', s12: 'Organisation of Working Time Act 1997, section 12.', s13: 'Organisation of Working Time Act 1997, section 13.', s14: 'Organisation of Working Time Act 1997, section 14.', s15: 'Organisation of Working Time Act 1997, section 15.', s17a: 'Organisation of Working Time Act 1997, section 17(1A).', s17: 'Organisation of Working Time Act 1997, section 17(1) and (4).', s25: 'Organisation of Working Time Act 1997, section 25.', p6: 'Protection of Young Persons (Employment) Act 1996, section 6.', si57: 'Organisation of Working Time (Breaks at Work for Shop Employees) Regulations 1998 (S.I. 57/1998), regulation 3, with the Organisation of Working Time Act 1997, section 12.' };
  function why(text, cite) { return { text: text, cite: cite }; }

  /* ---------- State ---------- */
  // changes: shift id → { from: who was on it at the last publish }; log: every change since, newest last, so each can
  // be undone one step at a time until Publish, the point of no return (2026-11-27).
  var st = { published: 'Published Monday 09:12', changes: {}, log: [], request: null, sick: null, swap: null, corrections: {}, open: null, day: D.now.day, view: 'owner', viewAs: 'niamh', confirmShort: false, saidNo: {} };
  // Times show as 5:00, not 05:00
  var worked = {}; Object.keys(D.worked).forEach(function (k) { var w = D.worked[k]; worked[k] = [w[0].replace(/^0/, ''), w[1] && w[1].replace(/^0/, ''), w[2]]; });

  /* ---------- Planned breaks ---------- */
  function brk(s, p) {
    var h = len(s);
    if (p && p.under18 && h > 4.5) return { min: 30, txt: 'Break 30 min', why: why('Under-18s get a 30-minute break after 4½ hours.', CITE.p6) };
    if (s.shop && h > 6 && toMin(s.start) <= toMin('11:30') && toMin(s.end) >= toMin('14:30')) return { min: 60, txt: 'Break 1 h, starting 11:30–14:30', why: why('Shop staff who work more than 6 hours, on a shift that covers all of 11:30 to 14:30, get a one-hour break instead of 30 minutes, starting between 11:30 and 14:30. Baking is food preparation, which these rules leave out, so the bakers get the usual breaks.', CITE.si57) };
    if (h > 6) return { min: 30, txt: 'Break 30 min', why: why('More than 4½ hours: a 15-minute break. More than 6 hours: 30 minutes, which can include the 15. A break at the end of the shift doesn’t count.', CITE.s12) };
    if (h > 4.5) return { min: 15, txt: 'Break 15 min', why: why('More than 4½ hours: a 15-minute break. More than 6 hours: 30 minutes, which can include the 15. A break at the end of the shift doesn’t count.', CITE.s12) };
    return { min: 0, txt: 'No break needed', why: null };
  }
  var SUNDAY = { txt: 'Sunday: time and a third', why: why('Sunday work earns something extra: an allowance, a higher rate, paid time off, or a mix, unless the pay already allows for it. Here: time and a third, as the contract says.', CITE.s14) };
  var RECORDS = why('Records showing these rules were kept must be held for 3 years.', CITE.s25);

  /* ---------- The rules: what happens if person p takes shift s ---------- */
  function mine(pid, except) { return shifts.filter(function (x) { return x.who === pid && x !== except && x.status !== 'sick'; }); }
  function check(pid, s) {
    var p = people[pid], list = mine(pid, s).concat([s]).sort(function (a, b) { return t0(a) - t0(b); });
    var red = [], amb = [], others = mine(pid, s);
    var weekH = list.reduce(function (a, x) { return a + len(x); }, 0);
    // Already on a shift at that time (not law)
    others.forEach(function (o) { if (t0(o) < t1(s) && t0(s) < t1(o)) red.push({ short: 'Already on ' + when(o), why: why('Not a legal rule: ' + p.name + ' is already on ' + when(o) + '.', null) }); });
    if (p.under18) {
      if (toMin(s.start) < 360) red.push({ short: 'Under 18: can’t start before 6am', why: why('Under-18s can’t work between 10pm and 6am, and this shift starts at ' + s.start + '.', CITE.p6) });
      if (toMin(s.end) > 1320) red.push({ short: 'Under 18: can’t work after 10pm', why: why('Under-18s can’t work between 10pm and 6am, and this shift ends at ' + s.end + '.', CITE.p6) });
      var dayH = list.filter(function (x) { return x.day === s.day; }).reduce(function (a, x) { return a + len(x); }, 0);
      if (dayH > 8) red.push({ short: 'Under 18: over 8 hours that day', why: why('Under-18s can work at most 8 hours a day and 40 hours a week.', CITE.p6) });
      if (weekH > 40) red.push({ short: 'Under 18: over 40 hours this week', why: why('Under-18s can work at most 8 hours a day and 40 hours a week.', CITE.p6) });
      var daysOn = {}; list.forEach(function (x) { daysOn[x.day] = 1; });
      if (Object.keys(daysOn).length > 5) red.push({ short: 'Under 18: fewer than 2 days off', why: why('Under-18s need 12 hours off in a row between working days, and two days off in every 7, together where possible.', CITE.p6) });
    }
    // Daily rest: 11 hours (12 for under-18s) between this shift and the ones either side
    var need = p.under18 ? 12 : 11, i = list.indexOf(s), prev = list[i - 1], next = list[i + 1];
    [[prev, true], [next, false]].forEach(function (pr) {
      var o = pr[0]; if (!o || (t0(o) < t1(s) && t0(s) < t1(o))) return;
      var gap = pr[1] ? (t0(s) - t1(o)) / 60 : (t0(o) - t1(s)) / 60;
      if (gap < need) {
        var txt = pr[1] ? p.name + ' finishes ' + DAY[o.day] + ' at ' + o.end + ', so a ' + s.start + ' start leaves ' + fmtH(gap) + '.'
                        : p.name + ' starts ' + DAY[o.day] + ' at ' + o.start + ', so a ' + s.end + ' finish leaves ' + fmtH(gap) + '.';
        var rest = BK.count(fmtH(gap), 'hour’s rest', 'hours’ rest');
        if (p.under18) red.push({ short: 'Under 18: only ' + rest, why: why('Under-18s need 12 hours off in a row between working days, and two days off in every 7, together where possible. ' + txt, CITE.p6) });
        else red.push({ short: 'Only ' + rest, why: why('Everyone needs 11 hours off in a row in every 24. ' + txt, CITE.s11) });
      }
    });
    // 4-month average (s.15): the last 16 weeks' average plus this week
    var avg = (p.avg * 16 + weekH) / 17;
    if (avg > 48) red.push({ short: '4-month average over 48 hours', why: why('Over a period of up to 4 months, working hours can’t average more than 48 a week.', CITE.s15) });
    else if (weekH > 48) amb.push({ short: 'Over 48 hours this week (' + fmtH(weekH) + ')', why: why('This week goes over 48 hours. That’s allowed while the 4-month average stays at 48 or under.', CITE.s15) });
    // Weekly rest (s.13): the longest time off this week, counting the week's edges as off
    var edges = [0].concat(list.map(function (x) { return [t0(x), t1(x)]; }).reduce(function (a, b) { return a.concat(b); }, [])).concat([7 * 1440]);
    var longest = 0; for (var e = 0; e < edges.length; e += 2) longest = Math.max(longest, edges[e + 1] - edges[e]);
    if (longest < 35 * 60) amb.push({ short: 'No 24-hour break this week', why: why('Everyone needs 24 hours off in a row each week, right after a daily rest, or two 24-hour breaks the week after. This week has none, so next week needs two.', CITE.s13) });
    // Agreed days (s.17(1A)): ask first
    var notMyDay = p.days.indexOf(s.day) < 0;
    if (notMyDay) amb.push({ ask: true, short: 'Not one of ' + p.name + '’s agreed days', why: why(DAY[s.day] + ' isn’t one of ' + p.name + '’s agreed days. Work outside the hours and days agreed in advance can be refused without any consequences, so ask first.', CITE.s17a) });
    // Notice (s.17)
    if (t0(s) - NOW < 24 * 60) amb.push({ short: 'Less than 24 hours’ notice', why: why('Shift times have to be given at least 24 hours ahead, unless the contract fixes them. Less notice is allowed only when something comes up that couldn’t reasonably have been foreseen, like someone off sick.', CITE.s17) });
    // Contract hours (cost)
    if (weekH > p.contract) amb.push({ short: 'Over contract: ' + fmtH(weekH) + ' of ' + BK.count(p.contract, 'hour'), why: why('Not a legal rule, a cost: this takes ' + p.name + ' to ' + BK.count(fmtH(weekH), 'hour') + ' against a ' + p.contract + '-hour contract.', null) });
    return { red: red, amb: amb, ask: notMyDay, hours: weekH, otherTeam: p.team !== s.team };
  }
  function planned(pid) { return mine(pid).reduce(function (a, x) { return a + len(x); }, 0); }

  /* ---------- Rendering helpers ---------- */
  var whyN = 0;
  function reasonsHtml(rs, cls) {
    return rs.map(function (r) {
      var id = 'w' + (++whyN);
      return '<li class="rs ' + cls + '"><span>' + esc(r.short) + '</span> <button class="lnk" type="button" data-why="' + id + '" aria-expanded="false">Why?</button>' +
        '<div class="why" id="' + id + '" hidden>' + whyBody(r.why) + '</div></li>';
    }).join('');
  }
  function whyBody(w) { return '<p>' + esc(w.text) + '</p><p class="cite">' + (w.cite ? esc(w.cite) + ' ' : '') + (w.cite ? 'A demo, not legal advice.' : 'A demo.') + '</p>'; }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest('[data-why]');
    if (b) { var w = doc.getElementById(b.getAttribute('data-why')); w.hidden = !w.hidden; b.setAttribute('aria-expanded', String(!w.hidden)); return; }
    var s = e.target.closest('[data-why-static]');
    if (s) { var body = $('[data-why-body="' + s.getAttribute('data-why-static') + '"]'); body.innerHTML = whyBody(RECORDS); body.hidden = !body.hidden; s.setAttribute('aria-expanded', String(!body.hidden)); }
  });

  /* ---------- Owner's view: the week ---------- */
  var ROWS = [
    { key: 'bake', label: 'Baking', match: function (s) { return (s.kind === 'bake' || s.kind === 'bakeSun') && !/-2$/.test(s.id); } },
    { key: 'bake2', label: 'Baking, second baker', match: function (s) { return s.kind === 'bake' && /-2$/.test(s.id); } },
    { key: 'prep', label: 'Prep', match: function (s) { return s.kind === 'prep'; } },
    { key: 'early', label: 'Counter, early', match: function (s) { return s.kind === 'early' || s.kind === 'sun'; } },
    { key: 'late', label: 'Counter, late', match: function (s) { return s.kind === 'late'; } },
    { key: 'van', label: 'Van', match: function (s) { return s.kind === 'van'; } },
  ];
  function cellHtml(s) {
    var p = s.who && people[s.who], cls = 'cell', body;
    if (finished(s)) cls += ' past';
    if (s.day === D.now.day) cls += ' today';
    if (st.open === s.id) cls += ' open';
    if (hiShift === s.id) cls += ' hi';
    var corr = st.corrections[s.id], w = worked[s.id];
    if (s.status === 'sick') body = '<span class="pill amb">Off sick</span><span class="c-who">' + esc(p.name) + '</span><span class="c-sub">needs cover</span>';
    else if (!p) {
      var asked = st.request && st.request.shift === s.id && st.request.state === 'waiting';
      body = asked ? '<span class="pill amb">Asked ' + esc(people[st.request.who].name) + '</span><span class="c-sub">waiting for an answer</span>' : '<span class="pill amb">Nobody yet</span>';
      cls += ' empty';
    } else {
      body = '<span class="c-who">' + esc(p.name) + (p.under18 ? ' <span class="u18">Under 18</span>' : '') + '</span>';
      if (finished(s) && w) body += '<span class="c-sub">' + esc((corr ? corr.start : w[0]) + '–' + (corr ? corr.end : w[1]) + ' · break ' + (corr ? corr.brk : w[2]) + ' min') + (corr ? ' · corrected' : '') + '</span>';
      else if (running(s) && w) body += '<span class="c-sub ok">In since ' + esc(w[0]) + '</span>';
      else body += '<span class="c-sub">' + esc(brk(s, p).txt) + '</span>';
      if (s.day === 6) body += '<span class="c-sun">Sunday</span>';
      if (st.changes[s.id]) body += '<span class="c-chg">Not published yet</span>';
    }
    return '<button class="' + cls + '" type="button" data-shift="' + s.id + '" aria-expanded="' + (st.open === s.id) + '"><span class="c-time">' + s.start + '–' + s.end + '</span>' + body + '</button>';
  }
  function renderGrid() {
    var html = '<table class="wk"><caption class="sr">The week’s shifts, by role and day</caption><thead><tr><th scope="col"><span class="sr">Role</span></th>';
    DY.forEach(function (d, i) { html += '<th scope="col" class="' + (i === D.now.day ? 'today' : i < D.now.day ? 'past' : '') + '">' + DAY[i] + (i === D.now.day ? '<span class="tday">Today</span>' : '') + (i === 5 ? '<span class="pill amb need">2 bakers needed</span>' : '') + '</th>'; });
    html += '</tr></thead><tbody>';
    ROWS.forEach(function (r) {
      html += '<tr><th scope="row">' + r.label + '</th>';
      for (var d = 0; d < 7; d++) {
        var s = shifts.filter(function (x) { return x.day === d && r.match(x); })[0];
        html += '<td class="' + (d < D.now.day ? 'past' : d === D.now.day ? 'today' : '') + '">' + (s ? cellHtml(s) : '<span class="nosh" aria-label="No shift">–</span>') + '</td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table>';
    // Phone: one day at a time
    html += '<div class="dayview">';
    shifts.filter(function (x) { return x.day === st.day; }).forEach(function (s) { html += '<div class="drow"><p class="d-role">' + esc(s.label) + '</p>' + cellHtml(s) + '</div>'; });
    html += '</div>';
    $('[data-grid]').innerHTML = html;
    $('[data-days]').innerHTML = DY.map(function (d, i) { return '<button class="b dbtn' + (i < D.now.day ? ' past' : '') + '" type="button" data-day="' + i + '" aria-pressed="' + (i === st.day) + '">' + d + (i === D.now.day ? '<span class="sr"> (today)</span>' : '') + '</button>'; }).join('');
  }

  /* ---------- The panel under the week: one shift's details and who could take it ---------- */
  function pickList(s) {
    var rows = D.staff.filter(function (p) { return p.id !== s.who; }).map(function (p) { return { p: p, c: check(p.id, s) }; });
    var rank = function (r) { return r.c.otherTeam ? 3 : r.c.red.length ? 2 : r.c.amb.length ? 1 : 0; };
    rows.sort(function (a, b) { return rank(a) - rank(b); });
    var html = '<ul class="plain picks">';
    rows.forEach(function (r) {
      var p = r.p, c = r.c, pill, act = '';
      var asked = st.request && st.request.shift === s.id && st.request.who === p.id;
      if (c.otherTeam) pill = '<span class="pill dim">Other team</span>';
      else if (c.red.length) pill = '<span class="pill red">Can’t take</span>';
      else if (st.saidNo[s.id + p.id]) pill = '<span class="pill dim">Said no</span>';
      else if (asked && st.request.state === 'waiting') pill = '<span class="pill amb">Asked · waiting</span>';
      else if (c.ask) pill = '<span class="pill amb">Ask first</span>';
      else if (c.amb.length) pill = '<span class="pill amb">Check first</span>';
      else pill = '<span class="pill ok">Free</span>';
      if (!c.otherTeam && !c.red.length && !st.saidNo[s.id + p.id]) {
        if (asked && st.request.state === 'waiting') act = '<p class="muted">Asked ' + esc(p.name) + ' · waiting for an answer</p><p class="cnote">In the real app, the request goes to ' + esc(p.name) + '’s phone. Here, switch to Staff view at the top to answer it.</p>';
        else if (c.ask) act = '<button class="b fill" type="button" data-ask="' + p.id + '">Ask ' + esc(p.name) + '</button>';
        else if (c.amb.length) act = '<label class="chk"><input type="checkbox" data-ok="' + p.id + '"> <span>I’ve checked the warnings above</span></label><button class="b fill" type="button" data-put="' + p.id + '" disabled>Put ' + esc(p.name) + ' on</button>';
        else act = '<button class="b fill" type="button" data-put="' + p.id + '">Put ' + esc(p.name) + ' on</button>';
      }
      html += '<li class="pk' + (c.otherTeam ? ' other' : '') + '"><div class="pk-top"><p class="pk-name">' + esc(p.name) + (p.under18 ? ' <span class="u18">Under 18</span>' : '') + '</p>' + pill + '</div>' +
        '<p class="muted pk-sub">' + esc(p.role) + ' · ' + fmtH(planned(p.id)) + ' of ' + BK.count(p.contract, 'hour') + ' this week</p>' + (asked && st.request.prev ? '<p class="muted">' + esc('Answer changed: ' + st.request.prev + ' → ' + (st.request.state === 'waiting' ? 'waiting' : st.request.state)) + '</p>' : '') +
        '<ul class="plain rlist">' + reasonsHtml(c.red, 'red') + reasonsHtml(c.amb, 'amb') + '</ul>' + (act ? '<div class="pk-act">' + act + '</div>' : '') + '</li>';
    });
    return html + '</ul>';
  }
  function renderPanel() {
    var box = $('[data-panel]');
    if (!st.open) { box.innerHTML = ''; $('[data-pane="owner"]').classList.remove('shiftpage'); return; }
    var s = byId[st.open], p = s.who && people[s.who], pg = phone();
    $('[data-pane="owner"]').classList.toggle('shiftpage', pg);
    var html = '<section class="panel' + (pg ? ' page' : '') + '" aria-labelledby="pan-h">' + (pg ? '<button class="b back" type="button" data-back>‹ ' + esc(DAY[s.day]) + '</button>' : '') +
      '<div class="pan-head"><h2 id="pan-h">' + esc(DAY[s.day] + ' · ' + s.label + ' ' + s.start + '–' + s.end) + '</h2>' + (pg ? '' : '<button class="b" type="button" data-close>Close</button>') + '</div>';
    if (finished(s) && p) {
      var w = worked[s.id], c = st.corrections[s.id];
      html += '<p><b>' + esc(p.name) + '</b> worked ' + esc((c ? c.start : w[0]) + '–' + (c ? c.end : w[1]) + ', break ' + (c ? c.brk : w[2]) + ' min') + '.</p>';
      if (c) html += '<p class="muted">' + esc(c.log) + '</p><button class="b" type="button" data-uncorrect>' + esc('Undo correction for ' + p.name + ', ' + DAY[s.day]) + '</button>';
      else html += '<form class="corr" data-corr><p class="muted">Times not right? Correct them; the correction is recorded with the old times.</p><div class="row3"><label class="fld"><span>Start</span><input type="time" value="' + w[0] + '" data-c-start></label><label class="fld"><span>Finish</span><input type="time" value="' + w[1] + '" data-c-end></label><label class="fld"><span>Break (min)</span><input type="text" inputmode="numeric" value="' + w[2] + '" data-c-brk></label></div><button class="b fill" type="submit">Save correction</button></form>';
      html += '<p class="rec">Finished shifts are kept for 3 years, with any corrections.</p>';
    } else if (running(s) && p) {
      html += '<p><b>' + esc(p.name) + '</b> is on now: in since ' + esc(worked[s.id][0]) + '.</p>';
    } else {
      if (p && s.status !== 'sick') {
        var bk = brk(s, p);
        html += '<p><b>' + esc(p.name) + '</b> is on' + (st.changes[s.id] && st.changes[s.id].from && st.changes[s.id].from !== s.who ? ' instead of ' + esc(people[st.changes[s.id].from].name) + ', not published yet' : '') + '. ' + esc(bk.txt) + (bk.why ? ' <button class="lnk" type="button" data-why="pb" aria-expanded="false">Why?</button>' : '') + '</p>' + (bk.why ? '<div class="why" id="pb" hidden>' + whyBody(bk.why) + '</div>' : '') + undoBtn(s.id);
        if (s.day === 6) html += '<p>' + esc(SUNDAY.txt) + ' <button class="lnk" type="button" data-why="ps" aria-expanded="false">Why?</button></p><div class="why" id="ps" hidden>' + whyBody(SUNDAY.why) + '</div>';
        html += '<h3>Who else could take it</h3>';
      } else {
        var lead = s.status === 'sick' ? people[s.who].name + ' is off sick. Who could cover it' : 'Nobody yet. Who could take it';
        html += '<h3>' + esc(lead) + '</h3>';
        var plan = brk(s, null);
        html += '<p class="muted">' + esc(plan.txt + ' planned') + '. Planned breaks follow the person and the shift’s length.</p>';
      }
      html += pickList(s);
    }
    box.innerHTML = html + '</section>';
  }

  /* ---------- Hours, changes, publish ---------- */
  function renderHours() {
    var html = '<table class="hrs"><thead><tr><th scope="col">Name</th><th scope="col">This week</th><th scope="col">Contract</th><th scope="col"><span class="lg">4-month average</span><span class="sm">4-month avg</span></th></tr></thead><tbody>';
    D.staff.forEach(function (p) {
      var h = planned(p.id), avg = (p.avg * 16 + h) / 17;
      html += '<tr><th scope="row">' + esc(p.name) + (p.under18 ? ' <span class="u18">Under 18</span>' : '') + '<span class="muted team"><span class="sep"> · </span>' + esc(p.team) + '</span></th><td>' + fmtH(h) + ' h' + (h > p.contract ? ' <span class="pill amb">Over contract</span>' : '') + '</td><td>' + p.contract + ' h</td><td>' + fmtH(avg) + ' h</td></tr>';
    });
    $('[data-hours]').innerHTML = html + '</tbody></table>';
  }
  // A change of who is on a shift, kept for its undo: "Undo: Ciarán on Friday’s baking"
  function setWho(s, who) {
    var last = { id: s.id, from: s.who, status: s.status, sick: st.sick };
    if (s.status === 'sick') { s.status = null; st.sick = null; }
    if (!st.changes[s.id]) st.changes[s.id] = { from: last.from };
    s.who = who;
    if (st.changes[s.id].from === who && !s.status) delete st.changes[s.id];
    st.log.push(last);
  }
  function undoLabel(l) { var s = byId[l.id]; return 'Undo: ' + (s.who ? people[s.who].name : 'nobody') + ' on ' + DAY[s.day] + '’s ' + s.label.toLowerCase(); }
  function undoLast() {
    var l = st.log.pop(); if (!l) return;
    var s = byId[l.id];
    if (st.request && st.request.shift === l.id && st.request.state === 'yes' && s.who === st.request.who) st.request.state = 'waiting';
    s.who = l.from; s.status = l.status; st.sick = l.sick;
    if (st.changes[s.id] && st.changes[s.id].from === s.who) delete st.changes[s.id];
  }
  function undoBtn(forId) {
    var l = st.log[st.log.length - 1];
    return l && (!forId || l.id === forId) ? '<button class="b undo-chg" type="button" data-undo-chg>' + esc(undoLabel(l)) + '</button>' : '';
  }
  function renderPublish() {
    var ids = Object.keys(st.changes), why = [], box = $('[data-changes]');
    var short = ids.some(function (id) { return t0(byId[id]) - NOW < 24 * 60; });
    if (!ids.length) why.push('Nothing changed since the last publish');
    shifts.forEach(function (s) { if (s.who && !finished(s) && s.status !== 'sick' && check(s.who, s).red.length) why.push(people[s.who].name + ' can’t work ' + when(s) + ': ' + check(s.who, s).red[0].short); });
    var html = '';
    if (ids.length) {
      var lastId = st.log.length ? st.log[st.log.length - 1].id : null;
      html = '<h3>Changes since the last publish</h3><ul class="plain chl">' + ids.map(function (id) {
        var s = byId[id], from = st.changes[id].from;
        var who = s.who ? people[s.who].name + (from && from !== s.who ? ' instead of ' + people[from].name : '') : 'nobody' + (from ? ' (was ' + people[from].name + ')' : '');
        return '<li><span>' + esc(when(s) + ' · ' + s.label + ': ' + who) + '</span>' + (id === lastId ? undoBtn() : '') + '</li>';
      }).join('') + '</ul>';
      if (short) html += '<label class="chk"><input type="checkbox" data-short' + (st.confirmShort ? ' checked' : '') + '> <span>Less than 24 hours’ notice: I’ve spoken to the people affected</span></label>';
    }
    if (short && ids.length && !st.confirmShort) why.push('Confirm the short notice above');
    box.innerHTML = html;
    var b = $('[data-publish]');
    b.disabled = why.length > 0;
    $('[data-pub-why]').innerHTML = why.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('');
  }
  function renderSickBanner() {
    var box = $('[data-sick-banner]');
    if (!st.sick) { box.innerHTML = ''; return; }
    var s = byId[st.sick.shift];
    box.innerHTML = '<div class="banner"><p><span class="pill amb">Needs cover</span> <b>' + esc(people[st.sick.who].name + ' is off sick: ' + DAY[s.day] + ' ' + s.start + '–' + s.end + ' needs cover') + '</b></p><button class="b fill" type="button" data-shift="' + s.id + '">Find cover</button></div>';
  }
  function renderOwner() { renderSickBanner(); renderGrid(); renderPanel(); renderHours(); renderPublish(); }

  /* ---------- Staff view (a phone screen) ---------- */
  function renderStaff() {
    var pid = st.viewAs, p = people[pid], html = '';
    var req = st.request && st.request.who === pid ? st.request : null;
    if (req) {
      var rs = byId[req.shift];
      if (req.state === 'waiting') html += '<section class="req"><p class="req-t">Mary asks: can you take ' + esc(DAY[rs.day] + ' ' + rs.start + '–' + rs.end) + '?</p><p class="muted">' + esc(rs.label) + ' · ' + esc(brk(rs, p).txt) + '</p><div class="row2"><button class="b fill main" type="button" data-answer="yes">Yes, I’ll take it</button><button class="b main" type="button" data-answer="no">No, I can’t</button></div></section>';
      else html += '<p class="req-done">' + esc(req.state === 'yes' ? 'You said yes: ' + DAY[rs.day] + ' ' + rs.start + '–' + rs.end + ' is yours.' : 'You said no to ' + DAY[rs.day] + ' ' + rs.start + '–' + rs.end + '. Mary can ask someone else.') + '</p>' +
        (req.final ? '' : '<button class="b" type="button" data-reanswer>Change my answer</button><p class="muted hint">You can change it until Mary publishes the roster.</p>');
    }
    html += '<h2>Hi ' + esc(p.name) + '</h2>';
    var mineAll = shifts.filter(function (s) { return s.who === pid; }).sort(function (a, b) { return t0(a) - t0(b); });
    var next = mineAll.filter(function (s) { return !finished(s); }), done = mineAll.filter(finished);
    // Every row has the same parts: the day, the time · the role, the state. A narrow phone stacks them in three lines;
    // the wider phone frame lines them up as columns (demo-roster.css, 2026-11-27).
    html += '<h3>My shifts</h3><ul class="plain myl">';
    var notOut = [];
    for (var k = 0; k < 7; k++) {
      var d = (D.now.day + k) % 7;
      if (k > 0 && d < D.now.day) { notOut.push(d); continue; }
      var ds = next.filter(function (s) { return s.day === d; });
      if (!ds.length) { html += '<li class="my none"><b>' + DAY[d] + (k === 0 ? ' · today' : '') + '</b><span class="muted my-s">Off</span></li>'; continue; }
      ds.forEach(function (s) {
        var bk = brk(s, p), sick = s.status === 'sick';
        html += '<li class="my"><b>' + DAY[d] + (k === 0 ? ' · today' : '') + '</b><span class="my-t">' + s.start + '–' + s.end + '</span><span class="my-r">' + esc(s.label) + '</span>' +
          '<span class="my-s">' + (sick ? '<span class="pill amb">Off sick</span>' : running(s) ? '<span class="ok">On now</span>' : '<span class="muted">' + esc(bk.txt) + '</span>') + (s.day === 6 ? ' <span class="c-sun">' + esc(SUNDAY.txt) + '</span>' : '') + '</span></li>';
      });
    }
    if (notOut.length) html += '<li class="my none"><b>' + DAY[notOut[0]] + (notOut.length > 1 ? ' to ' + DAY[notOut[notOut.length - 1]] : '') + '</b><span class="muted my-s">Next week’s roster isn’t out yet</span></li>';
    html += '</ul>';
    if (done.length) {
      var dh = done.reduce(function (a, s) { var w = worked[s.id]; return a + (w && w[1] ? (toMin(w[1]) - toMin(w[0]) - w[2]) / 60 : 0); }, 0);
      html += '<details class="fold"><summary>Done this week <span class="muted fc"><span class="nw">' + BK.count(done.length, 'shift') + '</span> · <span class="nw">' + fmtH(dh) + ' h</span></span></summary><ul class="plain myl">' + done.map(function (s) { var w = worked[s.id]; return '<li class="my"><b>' + DAY[s.day] + '</b><span class="my-t">' + (w ? w[0] + '–' + w[1] : s.start + '–' + s.end) + '</span><span class="muted my-r">' + esc(s.label) + (w ? ' · break ' + w[2] + ' min' : '') + '</span></li>'; }).join('') + '</ul></details>';
    }
    html += '<p class="myh"><b>My hours:</b> ' + fmtH(planned(pid)) + ' this week, against a ' + p.contract + '-hour contract.</p>';
    // Can't make a shift?
    html += '<h3>Can’t make a shift?</h3><div class="row2"><button class="b" type="button" data-mode="swap" aria-pressed="' + (st.mode === 'swap') + '">Ask to swap</button><button class="b" type="button" data-mode="sick" aria-pressed="' + (st.mode === 'sick') + '">I’m off sick</button></div>';
    var open = next.filter(function (s) { return s.status !== 'sick' && !running(s); });
    if (st.mode === 'swap') {
      if (st.swap && st.swap.by === pid) {
        html += '<p class="req-done">Swap asked: ' + esc(people[st.swap.to].name + ' for ' + when(byId[st.swap.shift])) + '</p><p class="cnote">For demo purposes, the request stops here. In the real app, ' + esc(people[st.swap.to].name) + ' gets it, and once they agree, Mary confirms the swap before it’s final.</p><button class="b" type="button" data-unswap>' + esc('Undo swap request for ' + DAY[byId[st.swap.shift].day]) + '</button>';
      } else if (!open.length) html += '<p class="muted">No shifts left this week.</p>';
      else {
        html += '<fieldset class="fld"><legend>Which shift?</legend><div class="pickday">' + open.map(function (s) { return '<button class="b" type="button" data-swap-shift="' + s.id + '" aria-pressed="' + (st.swapShift === s.id) + '">' + DY[s.day] + ' ' + s.start + '</button>'; }).join('') + '</div></fieldset>';
        if (st.swapShift) {
          var s2 = byId[st.swapShift];
          var cand = D.staff.filter(function (q) { return q.id !== pid && q.team === p.team; }).map(function (q) { var tmp = s2.who; s2.who = null; var c = check(q.id, s2); s2.who = tmp; return { q: q, c: c }; });
          cand.sort(function (a, b) { return (a.c.red.length ? 2 : a.c.amb.length ? 1 : 0) - (b.c.red.length ? 2 : b.c.amb.length ? 1 : 0); });
          html += '<h3>Who could take ' + esc(DY[s2.day] + ' ' + s2.start) + '?</h3><ul class="plain picks">' + cand.map(function (r) {
            var pill = r.c.red.length ? '<span class="pill red">Can’t take</span>' : r.c.ask ? '<span class="pill amb">Ask first</span>' : r.c.amb.length ? '<span class="pill amb">Check first</span>' : '<span class="pill ok">Free</span>';
            return '<li class="pk"><div class="pk-top"><p class="pk-name">' + esc(r.q.name) + '</p>' + pill + '</div><ul class="plain rlist">' + reasonsHtml(r.c.red, 'red') + reasonsHtml(r.c.amb, 'amb') + '</ul>' + (r.c.red.length ? '' : '<div class="pk-act"><button class="b fill" type="button" data-swap-to="' + r.q.id + '">Ask ' + esc(r.q.name) + '</button></div>') + '</li>';
          }).join('') + '</ul>';
        }
      }
    }
    if (st.mode === 'sick') {
      if (st.sick && st.sick.who === pid) {
        var ss = byId[st.sick.shift];
        html += '<p class="req-done">' + esc('Mary knows you’re off sick on ' + DAY[ss.day] + '.') + '</p><p class="cnote">Mary sees this now in the Owner’s view, with who could cover. In the real app, it reaches Mary’s phone straight away.</p><button class="b" type="button" data-unsick>' + esc('Undo off sick for ' + DAY[ss.day]) + '</button>';
      } else if (!open.length) html += '<p class="muted">No shifts left this week.</p>';
      else html += '<fieldset class="fld"><legend>Which day?</legend><div class="pickday">' + open.map(function (s) { return '<button class="b" type="button" data-sick="' + s.id + '">' + DAY[s.day] + '</button>'; }).join('') + '</div></fieldset>';
    }
    $('[data-staff]').innerHTML = html;
  }
  function renderCount() {
    var n = st.request && st.request.state === 'waiting' ? 1 : 0;
    var c = $('[data-wcount]'); c.hidden = !n;
  }
  function render() { if (st.view === 'owner') renderOwner(); else renderStaff(); renderCount(); }

  /* ---------- Actions ---------- */
  function setView(v) {
    st.view = v;
    $$('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v)); });
    $('[data-pane="owner"]').hidden = v !== 'owner';
    $('[data-pane="staff"]').hidden = v !== 'staff';
    if (v === 'staff' && st.request && st.request.state === 'waiting') { st.viewAs = st.request.who; $('[data-viewas]').value = st.viewAs; }
    render();
  }
  $$('[data-view]').forEach(function (b) { b.addEventListener('click', function () { setView(b.getAttribute('data-view')); }); });
  $('[data-viewas]').innerHTML = D.staff.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + ' · ' + esc(p.role) + '</option>'; }).join('');
  $('[data-viewas]').value = st.viewAs;
  $('[data-viewas]').addEventListener('change', function (e) { st.viewAs = e.target.value; st.mode = null; st.swapShift = null; renderStaff(); });

  doc.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('[data-ok]')) { var b = $('[data-put="' + t.getAttribute('data-ok') + '"]'); if (b) b.disabled = !t.checked; }
    if (t.matches('[data-short]')) { st.confirmShort = t.checked; renderPublish(); }
  });
  doc.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-corr]');
    if (!f) return;
    e.preventDefault();
    var s = byId[st.open], w = worked[s.id];
    var c = { start: $('[data-c-start]', f).value || w[0], end: $('[data-c-end]', f).value || w[1], brk: parseInt($('[data-c-brk]', f).value, 10) || 0 };
    var parts = [];
    if (c.start !== w[0]) parts.push('start ' + w[0] + ' → ' + c.start);
    if (c.end !== w[1]) parts.push('finish ' + w[1] + ' → ' + c.end);
    if (c.brk !== w[2]) parts.push('break ' + w[2] + ' → ' + c.brk + ' min');
    if (!parts.length) return;
    c.log = 'Corrected Thursday 10:41 by Mary: ' + parts.join(', ') + '.';
    st.corrections[s.id] = c; render();
  });
  doc.addEventListener('click', function (e) {
    var t = e.target, b;
    if ((b = t.closest('[data-shift]'))) {
      var id = b.getAttribute('data-shift');
      if (phone()) { openPage(id); return; }
      st.open = st.open === id && !b.closest('.banner') ? null : id; render(); if (st.open) scrollToPanel(); return;
    }
    if ((b = t.closest('[data-close]'))) { st.open = null; render(); return; }
    if ((b = t.closest('[data-back]'))) { if (history.state && history.state.shift) history.back(); else closePage(); return; }
    if ((b = t.closest('[data-day]'))) { st.day = +b.getAttribute('data-day'); renderGrid(); return; }
    if ((b = t.closest('[data-uncorrect]'))) { delete st.corrections[st.open]; render(); return; }
    if ((b = t.closest('[data-ask]'))) { st.request = { shift: st.open, who: b.getAttribute('data-ask'), state: 'waiting' }; render(); return; }
    if ((b = t.closest('[data-put]'))) { setWho(byId[st.open], b.getAttribute('data-put')); render(); return; }
    if ((b = t.closest('[data-undo-chg]'))) { undoLast(); render(); return; }
    if ((b = t.closest('[data-export]'))) { exportCsv(); BK.note('n-export', true); return; }
    if ((b = t.closest('[data-publish]'))) {
      // The demo's clock stands at 10:30, so the publish is "just now" (2026-11-27); undo ends here.
      st.changes = {}; st.log = []; st.confirmShort = false; st.published = 'Published just now';
      if (st.request && st.request.state !== 'waiting') st.request.final = true;
      $('[data-published]').textContent = st.published;
      var done = $('[data-pub-done]'); done.textContent = st.published; done.hidden = false; BK.note('n-pub', true);
      render(); return;
    }
    // Staff view
    if ((b = t.closest('[data-answer]'))) {
      var r = st.request, rs = byId[r.shift];
      if (b.getAttribute('data-answer') === 'yes') { setWho(rs, r.who); r.state = 'yes'; }
      else { r.state = 'no'; st.saidNo[rs.id + r.who] = 1; }
      render(); return;
    }
    // An answer can be changed until Mary publishes (2026-11-27); Mary's view shows the old and the new answer.
    if ((b = t.closest('[data-reanswer]'))) {
      var r2 = st.request, rs2 = byId[r2.shift];
      r2.prev = r2.state === 'yes' ? 'yes' : 'no';
      if (r2.state === 'yes') for (var i = st.log.length - 1; i >= 0; i--) if (st.log[i].id === rs2.id) {
        var le = st.log.splice(i, 1)[0]; rs2.who = le.from; rs2.status = le.status; st.sick = le.sick;
        if (st.changes[rs2.id] && st.changes[rs2.id].from === rs2.who) delete st.changes[rs2.id];
        break;
      }
      else delete st.saidNo[rs2.id + r2.who];
      r2.state = 'waiting';
      render(); return;
    }
    if ((b = t.closest('[data-mode]'))) { var m = b.getAttribute('data-mode'); st.mode = st.mode === m ? null : m; st.swapShift = null; renderStaff(); return; }
    if ((b = t.closest('[data-swap-shift]'))) { st.swapShift = b.getAttribute('data-swap-shift'); renderStaff(); return; }
    if ((b = t.closest('[data-swap-to]'))) { st.swap = { by: st.viewAs, to: b.getAttribute('data-swap-to'), shift: st.swapShift }; renderStaff(); return; }
    if ((b = t.closest('[data-unswap]'))) { st.swap = null; st.swapShift = null; renderStaff(); return; }
    if ((b = t.closest('[data-sick]'))) { var sk = byId[b.getAttribute('data-sick')]; sk.status = 'sick'; st.sick = { who: st.viewAs, shift: sk.id }; renderStaff(); return; }
    if ((b = t.closest('[data-unsick]'))) { byId[st.sick.shift].status = null; st.sick = null; renderStaff(); return; }
  });
  /* ---------- Phones: a shift opens as a page of its own (2026-11-27) ---------- */
  var mqPhone = matchMedia('(max-width:820px)');
  function phone() { return mqPhone.matches; }
  function openPage(id) {
    history.pushState({ shift: id }, '', location.pathname + '?shift=' + id);
    st.open = id; st.day = byId[id].day; render(); scrollTo(0, 0);
  }
  function closePage() {
    var id = st.open; st.open = null;
    if (/[?&]shift=/.test(location.search)) history.replaceState(null, '', location.pathname);
    render();
    var d = id && $('.dayview [data-shift="' + id + '"]'); if (d) d.scrollIntoView({ block: 'center' });
  }
  addEventListener('popstate', function (e) {
    var id = e.state && e.state.shift;
    if (id && byId[id]) { st.open = id; st.day = byId[id].day; render(); scrollTo(0, 0); }
    else { var was = st.open; st.open = null; render(); var d = was && $('.dayview [data-shift="' + was + '"]'); if (d) d.scrollIntoView({ block: 'center' }); }
  });
  mqPhone.addEventListener('change', function () { if (st.view === 'owner') renderOwner(); });
  function scrollToPanel() {
    var p = $('[data-panel] .panel'); if (!p) return;
    var r = p.getBoundingClientRect();
    if (r.top > innerHeight - 120 || r.top < 0) scrollTo({ top: scrollY + r.top - 80, behavior: document.documentElement.classList.contains('still') ? 'auto' : 'smooth' });
  }

  /* ---------- Export hours for payroll (a real CSV, made on the device) ---------- */
  function exportCsv() {
    var rows = [['Name', 'Day', 'Shift', 'Start', 'Finish', 'Break (min)', 'Paid hours', 'Sunday hours', 'Status']];
    shifts.filter(function (s) { return s.who && s.status !== 'sick'; }).sort(function (a, b) { return a.who < b.who ? -1 : a.who > b.who ? 1 : t0(a) - t0(b); }).forEach(function (s) {
      var p = people[s.who], w = worked[s.id], c = st.corrections[s.id];
      var start = c ? c.start : w ? w[0] : s.start, end = c ? c.end : w && w[1] ? w[1] : s.end, br = c ? c.brk : w && w[1] ? w[2] : brk(s, p).min;
      var paid = (toMin(end) - toMin(start) - br) / 60;
      rows.push([p.name, DAY[s.day], s.label, start, end, br, paid.toFixed(2), s.day === 6 ? paid.toFixed(2) : '0.00', finished(s) ? 'worked' + (c ? ' (corrected)' : '') : running(s) ? 'on now' : 'planned']);
    });
    BK.download('shutter-and-crumb-hours-this-week.csv', BK.csv(rows));
  }

  /* ---------- Start: ?shift= opens that shift (the dashboard's "Open the roster") ---------- */
  var hiShift = (location.search.match(/[?&]shift=([\w-]+)/) || [])[1];
  if (hiShift && byId[hiShift]) { st.open = hiShift; st.day = byId[hiShift].day; } else hiShift = null;
  render();
  if (hiShift && phone()) scrollTo(0, 0);
  else if (hiShift) setTimeout(function () { var c = $('.wk [data-shift="' + hiShift + '"]'); if (c && c.offsetParent) c.scrollIntoView({ block: 'center' }); else { var d = $('.dayview [data-shift="' + hiShift + '"]'); if (d) d.scrollIntoView({ block: 'center' }); } }, 50);
  BK.guard(function () { return Object.keys(st.changes).length > 0; });
})();

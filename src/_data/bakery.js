// The bakery demos (/work/demo-bakery-*/): one FICTIONAL bakery, "Shutter & Crumb", the Control room's bakery
// (design README section 3; demo decisions of 2026-11-18/19). Everything here is made up: no real town, street,
// phone, person or business. First names only for staff; customers are generic and descriptive.
// Figures agree with the Control room: order #1042 from the email, Café on Main St, 40 sourdough + 24 scones at
// trade prices = €186.00, invoice INV-0142, Van 2 Thursday 07:30, paid +€186.00; this week's sales €4,280 (▲ 8% on
// last week to Thursday 10:30), 37 orders, overdue €0; flour 11 bags left; an unmatched +€410.00 (INV-0139).
// The dashboard and the roster are fixed at Thursday 26 November 2026, 10:30 (scripts/shots.mjs uses the same moment);
// the website runs on the real clock.

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Shop hours by weekday (Mon = 0). Open from 7am six days a week; Monday is a short day; Sunday mornings only.
const hours = [
  { open: '07:00', close: '15:00' },
  { open: '07:00', close: '17:00' },
  { open: '07:00', close: '17:00' },
  { open: '07:00', close: '17:00' },
  { open: '07:00', close: '17:00' },
  { open: '07:00', close: '17:00' },
  { open: '08:00', close: '13:00' },
];

// Allergens use the EU's 14 (Regulation (EU) No 1169/2011, Annex II), in plain words.
const menu = [
  { group: 'Bread', items: [
    { id: 'sourdough', name: 'Sourdough loaf', price: 4.80, allergens: 'Gluten (wheat)', trade: 3.60 },
    { id: 'soda', name: 'Brown soda bread', price: 3.90, allergens: 'Gluten (wheat), milk', trade: 2.90 },
    { id: 'rye', name: 'Seeded rye', price: 5.20, allergens: 'Gluten (rye, wheat), sesame', soldOut: true, trade: 3.90 },
    { id: 'baguette', name: 'Baguette', price: 2.80, allergens: 'Gluten (wheat)', trade: 2.10 },
  ] },
  { group: 'Pastries & scones', items: [
    { id: 'scone', name: 'Fruit scone', price: 2.40, allergens: 'Gluten (wheat), milk, eggs', trade: 1.75 },
    { id: 'cheese-scone', name: 'Cheese scone', price: 2.60, allergens: 'Gluten (wheat), milk, eggs, mustard', trade: 1.90 },
    { id: 'croissant', name: 'Butter croissant', price: 2.50, allergens: 'Gluten (wheat), milk, eggs', trade: 1.60 },
    { id: 'bun', name: 'Cinnamon bun', price: 3.20, allergens: 'Gluten (wheat), milk, eggs', trade: 2.40 },
  ] },
  { group: 'Cakes to order', note: 'Call us, 48 hours ahead.', items: [
    { id: 'sponge', name: 'Celebration sponge', price: 32, from: true, allergens: 'Gluten (wheat), milk, eggs' },
    { id: 'carrot', name: 'Carrot cake', price: 28, from: true, allergens: 'Gluten (wheat), milk, eggs, nuts (walnuts)' },
  ] },
];
// The public holidays the bakery closes for (its own choice; approved 2026-11-24): month-day and name. Deliveries
// can't be booked for these days, nor for Sundays (the van goes out Monday to Saturday).
const closures = [{ md: '12-25', name: 'Christmas Day' }, { md: '12-26', name: 'St Stephen’s Day' }, { md: '01-01', name: 'New Year’s Day' }];
// Trade (wholesale) prices for every bake that delivers (cakes to order don't), no VAT lines: 40 sourdough × €3.60 + 24 scones × €1.75 = €186.00 (the Control room's order)
const trade = menu.flatMap((g) => g.items).filter((i) => i.trade).map((i) => ({ id: i.id, name: i.name, price: i.trade }));

// ---- Staff and the week's roster (fictional first names) ----
// contract: hours a week; days: the days agreed in advance (s.17 "reference days"), Mon = 0; rate: € an hour;
// avg: average weekly hours over the previous 16 weeks (for the 4-month average, OWTA s.15).
const staff = [
  { id: 'ciaran', name: 'Ciarán', team: 'Baking', role: 'Head baker', contract: 40, days: [0, 1, 2, 3, 4, 5], rate: 19.0, avg: 41.5 },
  { id: 'niamh', name: 'Niamh', team: 'Baking', role: 'Baker', contract: 32, days: [1, 2, 3, 4], rate: 16.0, avg: 32.5 },
  { id: 'darragh', name: 'Darragh', team: 'Baking', role: 'Baker, part-time', contract: 20, days: [4, 5, 6], rate: 15.5, avg: 19 },
  { id: 'orla', name: 'Orla', team: 'Counter', role: 'Counter', contract: 40, days: [1, 2, 3, 4, 5], rate: 15.0, avg: 40 },
  { id: 'siobhan', name: 'Siobhán', team: 'Counter', role: 'Counter, part-time', contract: 32, days: [0, 1, 2, 3, 4], rate: 14.5, avg: 31 },
  { id: 'aoife', name: 'Aoife', team: 'Counter', role: 'Counter, weekends', contract: 11, days: [5, 6], rate: 11.5, avg: 11, under18: true },
  { id: 'sean', name: 'Seán', team: 'Van', role: 'Van', contract: 30, days: [0, 1, 2, 3, 4, 5], rate: 15.0, avg: 30 },
];

// Shift kinds. Breaks are planned by length and kind (OWTA s.12; shop staff S.I. 57/1998; under-18s PYPEA s.6).
const kinds = {
  bake: { label: 'Baking', start: '05:00', end: '13:00', team: 'Baking', shop: false },
  bakeSun: { label: 'Baking', start: '05:00', end: '11:00', team: 'Baking', shop: false },
  prep: { label: 'Prep for Saturday', start: '14:00', end: '22:00', team: 'Baking', shop: false },
  early: { label: 'Counter, early', start: '07:00', end: '15:00', team: 'Counter', shop: true },
  late: { label: 'Counter, late', start: '11:00', end: '17:00', team: 'Counter', shop: true },
  sun: { label: 'Counter', start: '08:00', end: '13:00', team: 'Counter', shop: true },
  van: { label: 'Van', start: '06:30', end: '11:30', team: 'Van', shop: false },
};

// The week: [id, day (Mon = 0), kind, person or null]. Saturday's second 5am bake is empty: the wholesale
// orders need two bakers (the dashboard's flag lands here).
const S = (id, day, kind, who, extra) => ({ id, day, kind, who, ...extra });
const shifts = [
  S('mon-bake', 0, 'bake', 'ciaran'), S('mon-early', 0, 'early', 'siobhan'), S('mon-van', 0, 'van', 'sean'),
  S('tue-bake', 1, 'bake', 'ciaran'), S('tue-bake-2', 1, 'bake', 'niamh'), S('tue-early', 1, 'early', 'orla'), S('tue-late', 1, 'late', 'siobhan'), S('tue-van', 1, 'van', 'sean'),
  S('wed-bake', 2, 'bake', 'ciaran'), S('wed-bake-2', 2, 'bake', 'niamh'), S('wed-early', 2, 'early', 'orla'), S('wed-late', 2, 'late', 'siobhan'), S('wed-van', 2, 'van', 'sean'),
  S('thu-bake', 3, 'bake', 'ciaran'), S('thu-bake-2', 3, 'bake', 'niamh'), S('thu-early', 3, 'early', 'orla'), S('thu-late', 3, 'late', 'siobhan'), S('thu-van', 3, 'van', 'sean'),
  S('fri-bake', 4, 'bake', 'niamh'), S('fri-prep', 4, 'prep', 'darragh'), S('fri-early', 4, 'early', 'orla'), S('fri-late', 4, 'late', 'siobhan'), S('fri-van', 4, 'van', 'sean'),
  S('sat-bake', 5, 'bake', 'ciaran'), S('sat-bake-2', 5, 'bake', null, { need: true }), S('sat-early', 5, 'early', 'orla'), S('sat-late', 5, 'late', 'aoife'), S('sat-van', 5, 'van', 'sean'),
  S('sun-bake', 6, 'bakeSun', 'darragh'), S('sun-counter', 6, 'sun', 'aoife'),
];
// What was really worked (finished shifts, Mon–Wed, and Thursday so far): start, finish, break in minutes.
const worked = {
  'mon-bake': ['04:58', '13:04', 30], 'mon-early': ['06:55', '15:02', 60], 'mon-van': ['06:30', '11:41', 15],
  'tue-bake': ['05:00', '13:00', 30], 'tue-bake-2': ['05:03', '13:10', 30], 'tue-early': ['07:00', '15:00', 60], 'tue-late': ['11:00', '17:05', 15], 'tue-van': ['06:28', '11:30', 15],
  'wed-bake': ['04:55', '13:20', 30], 'wed-bake-2': ['05:00', '13:00', 30], 'wed-early': ['06:58', '15:00', 60], 'wed-late': ['11:02', '17:00', 15], 'wed-van': ['06:30', '11:52', 15],
  'thu-bake': ['04:56', null, 0], 'thu-bake-2': ['05:01', null, 0], 'thu-early': ['06:57', null, 0], 'thu-van': ['06:31', null, 0],
};

// ---- Dashboard figures (Thursday 10:30) ----
// Sales by day: shop + wholesale; Thursday so far (includes #1042's €186.00). Mon–Thu = €4,280.
// lastWeek: last week's full days, for the chart's thin line. The tile compares like for like (2026-11-27): last week
// up to the same moment, Monday to Wednesday plus last Thursday to 10:30 (€880) = €3,960, so ▲ 8%.
const sales = {
  thisWeek: [[720, 380], [690, 350], [740, 420], [520, 460], null, null, null],
  lastWeek: [1010, 990, 1080, 958, 1240, 1420, 610],
  lastThuToNow: 880,
};
sales.soFar = sales.thisWeek.reduce((s, d) => s + (d ? d[0] + d[1] : 0), 0);
sales.lastToNow = sales.lastWeek.slice(0, 3).reduce((a, b) => a + b, 0) + sales.lastThuToNow;
sales.pct = Math.round((sales.soFar / sales.lastToNow - 1) * 100);

const orders = [
  { n: 1041, who: 'School canteen', what: '30 brown soda · 60 scones', when: 'Thu', state: 'out', src: 'by phone' },
  { n: 1043, who: 'Hotel on the Square', what: '24 sourdough · 48 croissants', when: 'Fri', state: 'booked', src: 'from the website' },
  { n: 1044, who: 'Corner Shop', what: '12 sourdough · 12 brown soda', when: 'Fri', state: 'booked', src: 'by phone' },
  { n: 1045, who: 'Golf Club', what: '20 baguettes · 36 scones', when: 'Sat', state: 'booked', src: 'from the email' },
  { n: 1046, who: 'Hotel on the Square', what: 'Wedding brunch: 60 sourdough · 120 croissants', when: 'Sat', state: 'booked', src: 'from the email' },
  { n: 1047, who: 'Farmers’ market stall', what: '40 sourdough · 40 brown soda', when: 'Sat', state: 'booked', src: 'from the website' },
  { n: 1042, who: 'Café on Main St', what: '40 sourdough · 24 scones', when: 'Thu', state: 'delivered', src: 'from the email', note: 'Van 2 · Thu 07:30' },
  { n: 1040, who: 'Garage forecourt', what: '24 croissants · 12 baguettes', when: 'Thu', state: 'delivered', src: 'by phone', note: 'Van 2 · Thu 07:05' },
  { n: 1039, who: 'Corner Shop', what: '12 sourdough · 12 brown soda', when: 'Wed', state: 'delivered', src: 'by phone', note: 'Van 2 · Wed 07:20' },
];
const ordersWeek = 37; // this week's wholesale orders, all states
// Worked out from the orders (2026-11-27), never typed: still to deliver, delivered this week, and the delivered ones
// earlier in the week that the fold doesn't list.
const ordersOpen = orders.filter((o) => o.state !== 'delivered').length;
const deliveredWeek = ordersWeek - ordersOpen;
const deliveredEarlier = deliveredWeek - orders.filter((o) => o.state === 'delivered').length;

// The demo's day as a date, so due dates and their weekdays can never disagree (2026-11-27: the old labels carried
// 2025's weekdays). One formatter builds every label: "today", or "Fri 27 Nov".
const TODAY = '2026-11-26';
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayLabel = (iso) => { if (iso === TODAY) return 'today'; const d = new Date(iso + 'T12:00:00Z'); return WD[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; };
const invoices = [
  { n: 'INV-0135', who: 'Golf Club', amount: 148.50, dueIso: '2026-11-26' },
  { n: 'INV-0137', who: 'Corner Shop', amount: 96.00, dueIso: '2026-11-27' },
  { n: 'INV-0138', who: 'Farmers’ market stall', amount: 72.00, dueIso: '2026-11-27' },
  { n: 'INV-0139', who: 'Hotel on the Square', amount: 410.00, dueIso: '2026-11-27' },
  { n: 'INV-0140', who: 'School canteen', amount: 212.40, dueIso: '2026-11-30' },
  { n: 'INV-0141', who: 'Garage forecourt', amount: 88.20, dueIso: '2026-12-01' },
  { n: 'INV-0143', who: 'Corner Shop', amount: 104.90, dueIso: '2026-12-02' },
  { n: 'INV-0144', who: 'Golf Club', amount: 108.00, dueIso: '2026-12-03' },
].map((i) => ({ ...i, due: dayLabel(i.dueIso), overdue: i.dueIso < TODAY }));
const paidThisWeek = [
  { n: 'INV-0142', who: 'Café on Main St', amount: 186.00, how: 'matched automatically' },
  { n: 'INV-0136', who: 'School canteen', amount: 198.60, how: 'matched automatically' },
  { n: 'INV-0134', who: 'Hotel on the Square', amount: 352.00, how: 'matched automatically' },
];

// Wages so far this week (Mon to Thursday 10:30), from what was really worked: paid time = finish − start − break;
// a shift still running counts to 10:30. The dashboard's Wages tile and the roster's line both show this figure.
const NOW = { day: 3, min: 10 * 60 + 30, date: TODAY };
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const wages = (() => {
  let total = 0, hours = 0;
  for (const [id, [start, end, brk]] of Object.entries(worked)) {
    const sh = shifts.find((s) => s.id === id), p = staff.find((x) => x.id === sh.who);
    const mins = (end ? toMin(end) : NOW.min) - toMin(start) - brk;
    hours += mins / 60; total += (mins / 60) * p.rate;
  }
  return { total: Math.round(total), hours: Math.round(hours * 10) / 10, pct: Math.round((total / sales.soFar) * 100), sales: sales.soFar };
})();

// The dashboard's "On today" (2026-11-27): people already in first, then whoever starts later, each by start time.
const onToday = shifts.filter((s) => s.day === NOW.day && s.who)
  .map((s) => ({ s, inNow: !!worked[s.id], t: toMin(kinds[s.kind].start) }))
  .sort((a, b) => (b.inNow - a.inNow) || (a.t - b.t)).map((x) => x.s);

export default { name: 'Shutter & Crumb', now: NOW, onToday, wages, closures, days, dayNames, hours, menu, trade, staff, kinds, shifts, worked, sales, orders, ordersWeek, ordersOpen, deliveredWeek, deliveredEarlier, invoices, paidThisWeek, nextOrder: 1048 };
// nextOrder: the website demo's first "Order #… received" (after the dashboard's #1043–#1047, so the demos agree)

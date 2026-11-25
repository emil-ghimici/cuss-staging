// Work items (copy agreed 2026-11-18; demo cards decided 2026-11-19, step 11a; card lines approved 2026-11-24).
// The client isn't named (and isn't Irish: say nothing about where it is). The three demos are the fictional bakery
// from the Control room, built as real pages under /work/demo-bakery-…/ and linked from their cards.
// `placeholder` keeps the amber dashed outline until a real screenshot exists: the client project keeps it until
// it's finished; the demos have screenshots (npm run shots, images in src/assets/img/work/).
// `img`: the screenshot's file stem; `themed` means a dark and a light version (only the visible one loads).
// `home`: shown in the home page's Work section, in this order (website, roster, dashboard) until the client project
// has screenshots; then it goes first and replaces the dashboard.
// Thumbnail colours of the drawn stand-in are theme variables; magenta stays reserved for Contact.
export default [
  { kind: 'Client project', title: 'Orders, stock and invoices in one place', placeholder: true,
    d: 'For a business we work with (name kept private): one system for orders, stock and invoicing, replacing a tangle of spreadsheets.',
    shot: '<rect x="0" y="0" width="60" height="170" style="fill:var(--screen-hi)"/><g style="fill:var(--phosphor)" opacity=".7"><rect x="10" y="14" width="40" height="6"/><rect x="10" y="34" width="30" height="5" opacity=".5"/><rect x="10" y="48" width="34" height="5" opacity=".5"/><rect x="10" y="62" width="26" height="5" opacity=".5"/></g><g style="fill:var(--phosphor)"><rect x="76" y="16" width="90" height="8"/><rect x="76" y="40" width="200" height="20" opacity=".18"/><rect x="76" y="66" width="200" height="20" opacity=".12"/><rect x="76" y="92" width="200" height="20" opacity=".18"/><rect x="76" y="118" width="200" height="20" opacity=".12"/></g><rect x="236" y="14" width="50" height="14" style="fill:var(--amber)" opacity=".8"/>' },
  { kind: 'Demo', title: 'The bakery’s website', href: '/work/demo-bakery-website/', home: 1,
    d: 'A website demo for the same fictional bakery: menu, opening hours, wholesale orders and directions, each one tap away on a phone, and a small settings panel for the owner.',
    img: 'bakery-website', themed: false,
    alt: 'The bakery’s demo website on a laptop and a phone: Fresh bread on Main Street from 7am, with Call us and Directions.' },
  { kind: 'Demo', title: 'The bakery’s week at a glance', href: '/work/demo-bakery-dashboard/', home: 3,
    d: 'A dashboard demo for the fictional bakery from our Control room: sales, orders, unpaid invoices and wages on one page, with what needs a look on top.',
    img: 'bakery-dashboard', themed: true,
    alt: 'The bakery’s dashboard for the week: three things that need a look, then sales, orders, unpaid invoices and wages.' },
  { kind: 'Demo', title: 'The bakery’s roster', href: '/work/demo-bakery-roster/', home: 2,
    d: 'A roster demo for the same fictional bakery: shifts that follow the orders, Irish working-time rules checked as you plan, and swaps from a phone.',
    img: 'bakery-roster', themed: true,
    alt: 'The bakery’s roster for the week, with Saturday’s 5am baking shift still empty.' },
];

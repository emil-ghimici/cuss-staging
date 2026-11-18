// Work items (copy agreed 2026-11-18). The client isn't named (and isn't Irish: say nothing about where it is).
// The two demos are the fictional bakery from the Control room. All three keep `placeholder` (the amber outline)
// until real screenshots exist: the client project's when it's finished, the demos' once they're built.
// The thumbnails are drawn stand-ins until real screenshots exist.
// Thumbnail colours are theme variables (screens follow the theme); magenta stays reserved for Contact.
export default [
  { kind: 'Client project', title: 'Orders, stock and invoices in one place', placeholder: true,
    d: 'For a business we work with (name kept private): one system for orders, stock and invoicing, replacing a tangle of spreadsheets.',
    shot: '<rect x="0" y="0" width="60" height="170" style="fill:var(--screen-hi)"/><g style="fill:var(--phosphor)" opacity=".7"><rect x="10" y="14" width="40" height="6"/><rect x="10" y="34" width="30" height="5" opacity=".5"/><rect x="10" y="48" width="34" height="5" opacity=".5"/><rect x="10" y="62" width="26" height="5" opacity=".5"/></g><g style="fill:var(--phosphor)"><rect x="76" y="16" width="90" height="8"/><rect x="76" y="40" width="200" height="20" opacity=".18"/><rect x="76" y="66" width="200" height="20" opacity=".12"/><rect x="76" y="92" width="200" height="20" opacity=".18"/><rect x="76" y="118" width="200" height="20" opacity=".12"/></g><rect x="236" y="14" width="50" height="14" style="fill:var(--amber)" opacity=".8"/>' },
  { kind: 'Demo', title: 'The bakery’s week at a glance', placeholder: true,
    d: 'A dashboard demo for the fictional bakery from our Control room: sales, wholesale orders and unpaid invoices on one page.',
    shot: '<g style="fill:var(--phosphor)"><rect x="16" y="16" width="80" height="34" opacity=".18"/><rect x="110" y="16" width="80" height="34" opacity=".18"/><rect x="204" y="16" width="80" height="34" opacity=".18"/></g><polyline points="16,150 60,120 100,130 140,90 180,100 220,60 284,70" fill="none" style="stroke:var(--phosphor)" stroke-width="3"/><g style="fill:var(--hazard)" opacity=".7"><rect x="30" y="28" width="40" height="8"/><rect x="124" y="28" width="30" height="8"/><rect x="218" y="28" width="50" height="8"/></g>' },
  { kind: 'Demo', title: 'The bakery’s website', placeholder: true,
    d: 'A website demo for the same fictional bakery: menu, opening hours, wholesale orders and directions, each one tap away on a phone.',
    shot: '<rect x="0" y="0" width="300" height="26" style="fill:var(--screen-hi)"/><rect x="14" y="9" width="40" height="8" style="fill:var(--phosphor)"/><rect x="20" y="48" width="150" height="16" style="fill:var(--phosphor)" opacity=".85"/><rect x="20" y="72" width="120" height="8" style="fill:var(--screen-dim)" opacity=".6"/><rect x="20" y="104" width="70" height="22" style="fill:var(--amber)" opacity=".85"/><rect x="190" y="44" width="90" height="100" style="fill:var(--phosphor)" opacity=".15"/>' },
];

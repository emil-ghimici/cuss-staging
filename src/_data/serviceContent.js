// Service page content (design spec section 13), keyed by the slug in services.js.
// COPY STATUS: Automation carries the design chat's draft copy from the agreed mock-up (final copy still to come).
// The other five services have no copy yet: every missing field renders as a clearly marked placeholder
// (dashed amber outline, "[Copy to come: …]") and is left out of the FAQPage structured data. Don't fill them by guessing.
// H1s and titles follow the README pattern "<Service> for small businesses in Ireland".
// bandTip: CREW's band tip line (README section 7, approved 2026-11-17).
export default {
  automation: {
    draft: true,
    h1: 'Automation for small businesses in Ireland',
    lead: 'We connect the tools you already use so orders, invoices and reminders move on their own. You stay in charge of the important steps.',
    bandTip: 'Let the boring bits run themselves.',
    what: [
      'Most small businesses run on a handful of tools: email, a spreadsheet, an accounts package, a courier website. Each one works fine on its own. The trouble is the gaps between them, where someone copies the same details from one screen to the next.',
      'Automation closes those gaps. When an order arrives, the details go where they need to go, once, without retyping. Where a decision matters, like sending an invoice, the software prepares it and waits for a person to confirm.',
    ],
    get: [
      'Orders, invoices and payments that move between your tools on their own',
      'Checkpoints where a person confirms before anything important goes out',
      'Reminders and follow-ups that happen on time, every time',
      'Works with what you already use: email, Excel, Xero, Sage, Microsoft 365',
    ],
    whoLead: 'Any business where the same information gets typed more than once. For example:',
    who: [
      { t: 'A bakery taking wholesale orders by email', d: 'Orders flow straight into stock and invoices instead of being retyped every evening.' },
      { t: 'A gym tracking memberships in a spreadsheet', d: 'Renewals, reminders and failed payments handled without anyone watching a sheet.' },
      { t: 'A pharmacy re-keying supplier invoices', d: 'Invoices read, checked and filed, with a person confirming anything unusual.' },
    ],
    exampleLead: 'A small bakery (fictional) takes wholesale orders by email. Here is the same order before and after.',
    room: ['inbox', 'sheet', 'inv', 'bank'],
    steps: [
      { t: 'Free first call', d: 'You walk us through the task as it’s done today: who types what, where, and how often.' },
      { t: 'We map it and quote', d: 'A short written plan: what gets automated, where a person still confirms, and the price.' },
      { t: 'First automation running', d: 'We start with the step that wastes the most time, so you feel the difference early.' },
      { t: 'Connect the rest', d: 'Step by step, the other tools are linked up, tested with your real (copied) data.' },
      { t: 'Looked after', d: 'We keep an eye on it. If a supplier changes a format, we adjust it.' },
    ],
    faqH: 'Questions about automation',
    faqs: [
      { q: 'Will automation replace my staff?', a: 'No. It takes away the retyping and checking so your people can do the work only they can do. A person still confirms the important steps.' },
      { q: 'Do I have to change the software I use?', a: 'Usually not. We connect the tools you already have where we can, and only suggest a change if it clearly saves you money or time.' },
      { q: 'What happens if something goes wrong?', a: 'Every automation logs what it did, stops and tells you when something looks unusual, and can be switched off with one click.' },
      { q: 'How much does it cost?', a: 'It depends on what’s being connected. The first call is free and you get a written quote before any work starts.' },
      { q: 'Is my data safe?', a: 'We use EU hosting, give the automation only the access it needs, and never sell or share your data.' },
    ],
    side: { t: 'Got a task in mind?', d: 'Tell us how it’s done today. The first call is free.' },
    related: ['custom-software', 'dashboards', 'ai-data'],
  },
  'custom-software': {
    h1: 'Custom web apps & internal tools for small businesses in Ireland',
    seoTitle: 'Custom web apps & internal tools for Irish businesses',
    bandTip: 'Built around how you already work.',
    room: ['inbox', 'sheet', 'inv', 'dash'],
    related: ['automation', 'dashboards', 'cloud-it-consulting'],
  },
  dashboards: {
    h1: 'Dashboards & reports for small businesses in Ireland',
    bandTip: 'Every number in one place. No digging.',
    // Before/after screens: illustrative only (labelled Example), draft wording for review
    screens: {
      before: { label: 'Before', text: '<span class="dim">SALES_final(2).xlsx</span>\nTab 1   Tab 2   Tab 2 (old)\nMon   =SUM(B2:B9) <span class="amb">#REF!</span>\nTue   ask Mary\n<span class="amb">updated: 3 weeks ago</span>' },
      after: { label: 'After', text: '<span class="dim">THIS WEEK</span>\nSales    €4,280  <span class="hz">▲ 6%</span>\nOrders   37\nUnpaid   €0\n<span class="dim">updated just now</span>' },
    },
    related: ['automation', 'custom-software', 'ai-data'],
  },
  websites: {
    h1: 'Websites for small businesses in Ireland',
    bandTip: 'Open for business, even at 3 a.m.',
    screens: {
      before: { label: 'Before', text: '<span class="dim">yourbusiness.ie</span>\n<span class="amb">loading… 8.4 s</span>\n\nWelcome to our website!\n<span class="dim">(last updated 2019)</span>' },
      after: { label: 'After', text: '<span class="dim">yourbusiness.ie</span>\nLoaded in 0.9 s\n\n<span class="hz">[ Call us ]  [ Directions ]</span>\nOpen today 9–6' },
    },
    related: ['custom-software', 'cloud-it-consulting', 'ai-data'],
  },
  'cloud-it-consulting': {
    h1: 'Cloud & IT consulting for small businesses in Ireland',
    bandTip: 'Keeping everything up and pointed the right way.',
    screens: {
      before: { label: 'Before', text: '<span class="dim">BACKUPS</span>\nLast run: <span class="amb">214 days ago</span>\nPasswords: on a sticky note\nEmail: shared login' },
      after: { label: 'After', text: '<span class="dim">BACKUPS</span>\nNightly, EU  <span class="hz">✓</span>\nSign-in: two-step  <span class="hz">✓</span>\nEmail: one account each <span class="hz">✓</span>' },
    },
    related: ['websites', 'custom-software', 'automation'],
  },
  'ai-data': {
    h1: 'AI & data projects for small businesses in Ireland',
    bandTip: 'This one’s a team job. We bring in partners.',
    screens: {
      before: { label: 'Before', text: '<span class="dim">INBOX</span>\n212 unread\n<span class="amb">"Do you deliver to Moate?"</span>\n<span class="amb">"Do you deliver to Moate??"</span>' },
      after: { label: 'After', text: '<span class="dim">INBOX</span>\n180 replies drafted\n32 need you\n<span class="hz">Nothing sent without a look</span>' },
    },
    related: ['automation', 'dashboards', 'custom-software'],
  },
};

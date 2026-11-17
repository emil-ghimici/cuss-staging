// Control room demo: a FICTIONAL bakery. Generic on purpose: no names, products, systems,
// figures or wording from any real client project (design spec section 3).
export default {
  monitors: [
    { k: 'inbox', label: 'Inbox', before: '<span class="dim">INBOX (14 unread)</span>\nFrom: Café on Main St\nRe: order for Thu?\n"40 sourdough, 24 scones\n…and can we pay later"' },
    { k: 'sheet', label: 'Spreadsheet', before: '<span class="dim">stock_FINAL_v3.xlsx</span>\nSourdough   =B4-40 ??\nScones      #REF!\nFlour       ask Mary\n<span class="amb">▌typing again…</span>' },
    { k: 'inv', label: 'Invoices', before: '<span class="dim">INVOICES</span>\nINV-0141  sent\nINV-0142  <span class="amb">retype order…</span>\nCafe on Main Street\n40 x sourdouhg' },
    { k: 'del', label: 'Deliveries', before: '<span class="dim">COURIER SITE</span>\nAddress:  ____\nParcels:  ____\n<span class="amb">copy from email…</span>' },
    { k: 'bank', label: 'Bank', sticky: 'check who paid??', before: '<span class="dim">STATEMENT</span>\n+186.00 CAFE ON MAIN\n+92.50  J MURPHY\n+410.00 ?????' },
    { k: 'dash', label: 'Dashboard', before: '<span class="dim">THIS WEEK</span>\n\nNo data.\n<span class="dim">(nobody had time\nto update it)</span>' },
  ],
  caption: 'Typed four times. One typo away from a wrong invoice.',
};

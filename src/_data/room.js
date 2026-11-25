// The Control room demo (design spec section 3, rebuilt 2026-11-18 as a storefront): a FICTIONAL bakery.
// Generic on purpose: no names, products, systems, figures or wording from any real client project.
// Screens are drawn as the tools they are (inbox, spreadsheet, invoice, booking form, statement, chart),
// recognisable by their shape. Rows marked class "x" are extra detail, dropped where the screen is small.
export default {
  // The six old screens, in the order an order travels
  monitors: [
    {
      k: 'inbox', label: 'Inbox',
      html: '<p class="s-title">Inbox <span class="dim">14 unread</span></p><ul class="s-mail">'
        + '<li class="spam"><b>Prize Desk</b> You’ve WON a hamper!!</li>'
        + '<li class="spam"><b>accounts</b> Re: Re: Fwd: invoice??</li>'
        + '<li class="x"><b>Café on Main St</b> order for Thu?</li>'
        + '<li class="x spam"><b>Deals4U</b> Ovens 90% off</li></ul>',
    },
    {
      k: 'sheet', label: 'Spreadsheet',
      html: '<p class="s-title s-tab">stock_FINAL_v3.xlsx</p><table class="s-grid"><tr><th></th><th>A</th><th>B</th></tr>'
        + '<tr><th>1</th><td>Sourdough</td><td class="amb">=B4-40??</td></tr>'
        + '<tr><th>2</th><td>Scones</td><td class="amb">#REF!</td></tr>'
        + '<tr class="x"><th>3</th><td>Flour</td><td>ask Mary<span class="caret"></span></td></tr></table>',
    },
    {
      k: 'inv', label: 'Invoices',
      html: '<p class="s-title">Invoices</p><div class="s-paper"><p><b>INVOICE</b><span class="x"> INV-0142</span></p>'
        + '<p>40 × <span class="typo">sourdouhg</span></p><p class="x">Total <span class="blank"></span></p></div>',
    },
    {
      k: 'del', label: 'Deliveries',
      html: '<p class="s-title">Courier · book a pickup</p><div class="s-form">'
        + '<p>Address <span class="fld"><span class="caret"></span></span></p>'
        + '<p class="x">Parcels <span class="fld short"></span></p><p><span class="fbtn">Book</span></p></div>',
    },
    {
      k: 'bank', label: 'Bank', sticky: 'check who paid??',
      html: '<p class="s-title">Statement</p><table class="s-rows">'
        + '<tr><td>+186.00</td><td>CAFE ON MAIN</td></tr>'
        + '<tr class="x"><td>+92.50</td><td>J MURPHY</td></tr>'
        + '<tr><td class="amb">+410.00</td><td class="amb">?????</td></tr></table>',
    },
    {
      k: 'dash', label: 'Dashboard',
      html: '<p class="s-title">This week</p><div class="s-chart"><p>No data.</p><p class="dim x">(nobody had time to update it)</p></div>',
    },
  ],

  // The one big screen once the tools are connected. `needs`: the old screen a step stands for
  // (a service page showing fewer screens shows fewer steps). Caption lines are approved (2026-11-17);
  // "inv" and "del" use the first part of their approved line, since the checkpoint moved to the end.
  steps: [
    { k: 'order', needs: 'inbox', t: 'Order', say: 'The order lands in one queue. Typed once, by the customer.',
      html: '<p class="dim">ORDER #1042 · from the email</p><p>Café on Main St</p><p>40 sourdough · 24 scones</p><p>Thursday morning</p>' },
    { k: 'stock', needs: 'sheet', t: 'Stock', say: 'Stock is reserved automatically.',
      html: '<p class="dim">STOCK</p><p>Sourdough <span class="ok">40 reserved</span></p><p>Scones <span class="ok">24 reserved</span></p><p>Flour 25 kg · 11 left</p>' },
    { k: 'inv', needs: 'inv', t: 'Invoice', say: 'A draft invoice is ready.',
      html: '<p class="dim">INVOICE INV-0142 · draft</p><p>40 × sourdough</p><p>24 × scones</p><p>€186.00</p>' },
    { k: 'del', needs: 'del', t: 'Delivery', say: 'Delivery booked.',
      html: '<p class="dim">DELIVERY</p><p>Van 2 · Thu 07:30</p><p>Café on Main St</p><p>Label ready</p>' },
    { k: 'ready', t: 'Ready to send', say: 'You stay in charge. The software does the typing.',
      html: '<p class="dim">READY TO SEND · waiting for you</p><p><span class="ok">✓</span> Order #1042</p><p><span class="ok">✓</span> INV-0142 · €186.00</p><p><span class="ok">✓</span> Stock and van booked</p>' },
  ],
  // After the visitor confirms
  after: [
    { k: 'sent', t: 'Sent', say: 'Confirmed. The rest follows on its own.',
      html: '<p class="dim">SENT</p><p>INV-0142 <span class="ok">sent ✓</span></p><p>Label <span class="ok">printed ✓</span></p>' },
    { k: 'paid', needs: 'bank', t: 'Paid', say: 'Payment arrives and is matched to the invoice.',
      html: '<p class="dim">BANK</p><p>+€186.00 CAFE ON MAIN</p><p><span class="ok">matched → INV-0142 ✓</span></p><p>Overdue: €0</p>' },
    { k: 'dash', needs: 'dash', t: 'Dashboard', say: 'Typed once. Checked by you. Done.',
      html: '<p class="dim">THIS WEEK</p><p>Sales €4,280 <span class="ok">▲ +€186</span></p><p>Orders 37</p><p>Overdue €0</p>' },
  ],

  caption: 'Typed four times. One typo away from a wrong invoice.',
  // Captions and CREW's lines (approved 2026-11-17 and 2026-11-18). Each screen's line is keyed by its screen.
  text: {
    workshop: 'Hang on. We’re connecting your tools.',
    done: 'Typed once. Checked by you. Done.',
    crew: {
      sign: 'I’ll get to you later.',
      inbox: 'Fourteen unread. Thirteen are spam.',
      sheet: '#REF! means a formula’s broken somewhere.',
      inv: 'Sourdouhg. One typo, wrong invoice.',
      del: 'Same address, typed in a third time.',
      bank: 'Someone’s left a note. Check who paid??',
      dash: 'Nobody’s looked at this since Easter.',
      close: 'Right. Leave this with me.',
      muffled: 'Nearly there. Nearly.',
      signFixed: 'Told you I’d get to you.',
      confirm: 'Your call. Have a look, then press Confirm.',
      ask: 'Happy with that? I’m happy.',
      yes: 'Grand. Want one for your business? The first call’s free.',
    },
  },
};

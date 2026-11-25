// Home page content (design spec section 12). Copy is the agreed draft; final copy still to come.
// CREW's section tips (data-crew-tip in index.njk) were approved 2026-11-17.
export default {
  title: 'Custom software, automation & websites in Athlone | CuSS',
  description: 'Custom web apps, automation, dashboards and websites for small businesses in Athlone, the Midlands and across Ireland. Free first call, written quote before work starts.',
  bodyClass: 'home',
  scripts: ['hero', 'room'],
  css: ['hero', 'room'],
  pains: [
    { icon: 'repeat', t: 'The same order, typed three times', d: 'Into the spreadsheet, the invoice and the courier site, by hand.' },
    { icon: 'grid-3x3', t: 'The spreadsheet only one person gets', d: 'And when they’re off sick, nobody can find anything.' },
    { icon: 'banknote', t: 'Chasing who has paid', d: 'Matching bank lines to invoices on a Friday evening.' },
    { icon: 'globe', t: 'A website that brings in nothing', d: 'It looks fine, but the phone doesn’t ring because of it.' },
  ],
  howSteps: [
    { t: 'Free first call', d: 'Tell us how things work today. We listen first.' },
    { t: 'Written quote', d: 'A clear price and plan on paper before any work starts.' },
    { t: 'Built in small steps', d: 'You see it working early and steer as we go.' },
    { t: 'Looked after', d: 'We stay around once it’s live: fixes, changes, questions.' },
  ],
  why: [
    { icon: 'map-pin', t: 'Local, and happy to meet', d: 'Based in Athlone. We’ll come to you anywhere around the Midlands, and work remotely across Ireland.' },
    { icon: 'message-circle', t: 'Plain English', d: 'No jargon, no 40-page proposals. You’ll always know what you’re paying for and why.' },
    { icon: 'key', t: 'You own it', d: 'Your software, your data, your accounts. No lock-in if you ever want to move on.' },
    { icon: 'shield', t: 'Careful with your data', d: 'Hosted in Microsoft’s Irish data centre, backed up in the Netherlands. Outside the EU only if absolutely necessary and the law allows. GDPR-minded from day one.' },
  ],
  faqs: [
    { q: 'How much does it cost?', a: 'It depends on the job, so we don’t publish prices. The first call is free, and you get a written quote before any work starts. No surprises.' },
    { q: 'We’re a small business. Is this for us?', a: 'Yes. Most of our work is for businesses with a handful of people, where a few hours saved every week makes a real difference.' },
    { q: 'Do you come to us?', a: 'Yes, anywhere around the Midlands, at the points where being in the room matters: when the work starts, when we map out how things are done today, when we show you what we’ve built, and on delivery. The work in between happens remotely, across Ireland.' },
    { q: 'How long does a project take?', a: 'Small automations can be running within a couple of weeks; bigger apps are built in stages so you can use the first parts early.' },
    { q: 'What if you’re not around one day?', a: 'You own the code, the data and the accounts, and everything is documented, so another developer can pick it up.' },
    { q: 'Do you do AI?', a: 'Where it genuinely helps, yes: sorting emails, reading invoices, answering common questions. For bigger data projects we work with a partner team.' },
  ],
};

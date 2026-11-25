// Business details used across the site. Values marked PLACEHOLDER still need the real thing.
export default {
  name: 'CuSS',
  legalName: 'CuSS Custom Software Solutions',
  email: 'hello@cuss.ie',   // people: footer, Privacy, rights requests, structured data
  // The automatic email assistant (CREW) answers crew@ (agreed 2026-11-18; live and tested 2026-11-19). With
  // assistantLive true the Contact block writes to crew@ and says CREW replies first, and the Privacy page shows its
  // "Our automatic first reply" section (facts verified by the assistant's build, 2026-11-19). Set it to false to
  // take every mention of the assistant off the site at once (the Contact block then writes to hello@).
  crewEmail: 'crew@cuss.ie',
  assistantLive: true,
  // CREW's public status file (agreed 2026-11-24). When CREW hits a cap it goes "off email duty" and writes
  // {"state":"off-email-duty","back":"YYYY-MM-DD"}; the Contact line then says so (site.js). Holds no personal data.
  // The storage account lets only cuss.ie, www.cuss.ie and the staging site read it (CORS), so site.js asks only from
  // those and local builds keep the working line: use #crew-off-tomorrow or #crew-off-date to see the off-duty lines.
  crewStatusUrl: 'https://stcrewpubyzotliot3d7to.blob.core.windows.net/status/crew.json',
  // Shown only on the Contact page and in the footer, never as the first contact option.
  phone: { display: '089 704 4394', tel: '+353897044394' },
  town: 'Athlone, Co. Westmeath',
  legal: {
    cro: '797449',
    owner: 'Emil Stefan Ghimici',
    address: '5 Garden Lodge, Court Devenish, Athlone, Co. Westmeath, N37 KV57',
    streetAddress: '5 Garden Lodge, Court Devenish',
    locality: 'Athlone',
    region: 'Co. Westmeath',
    postalCode: 'N37 KV57',
  },
  promise: 'Free first call. Written quote before work starts.',
};

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

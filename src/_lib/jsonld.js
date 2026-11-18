// Structured data: ProfessionalService on every page, plus BreadcrumbList, Service and FAQPage where a page has them.
export function jsonld({ site, env, services, url, crumbs, faqs, service }) {
  const base = env.url + '/';
  const abs = (p) => new URL(String(p).replace(/^\//, ''), base).href;
  const orgId = abs('/#business');
  const graph = [{
    '@type': 'ProfessionalService',
    '@id': orgId,
    name: site.legalName,
    alternateName: site.name,
    url: base,
    email: site.email,
    telephone: site.phone.tel,
    logo: abs('/assets/img/apple-touch-icon.png'),
    image: abs('/assets/img/og.png'),
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.legal.streetAddress,
      addressLocality: site.legal.locality,
      addressRegion: site.legal.region,
      postalCode: site.legal.postalCode,
      addressCountry: 'IE',
    },
    areaServed: [
      { '@type': 'AdministrativeArea', name: 'County Westmeath' },
      { '@type': 'AdministrativeArea', name: 'Midlands, Ireland' },
      { '@type': 'Country', name: 'Ireland' },
    ],
    knowsLanguage: 'en',
    makesOffer: services.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.name, url: abs(`/services/${s.slug}/`) } })),
  }];
  // A crumb with `ld: false` (the Services level, which links to a home-page anchor) stays out of the structured data
  const ldCrumbs = (crumbs || []).filter((c) => c.ld !== false);
  if (ldCrumbs.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: ldCrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.url || url) })),
    });
  }
  if (service) {
    graph.push({
      '@type': 'Service',
      name: service.name,
      serviceType: service.name,
      description: service.summary,
      url: abs(url),
      provider: { '@id': orgId },
      areaServed: { '@type': 'Country', name: 'Ireland' },
    });
  }
  if (faqs && faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\u003c');
}

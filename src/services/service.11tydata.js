// Per-service page data, computed from services.js and serviceContent.js.
export default {
  eleventyComputed: {
    band: (d) => d.service.slug,
    bandTip: (d) => d.serviceContent[d.service.slug].bandTip,
    // Titles stay under ~65 characters (seoTitle where the H1 is longer); descriptions under ~155 (seoDescription
    // where the lead runs longer: Google cuts descriptions at about 160)
    title: (d) => `${d.serviceContent[d.service.slug].seoTitle || d.serviceContent[d.service.slug].h1} | CuSS`,
    description: (d) => d.serviceContent[d.service.slug].seoDescription || d.serviceContent[d.service.slug].lead || `${d.service.summary} From Athlone, across Ireland. Free first call, written quote before work starts.`,
    crumbs: (d) => [{ name: 'Home', url: '/' }, { name: 'Services', url: '/#services', ld: false }, { name: d.service.name }],
    // Placeholder FAQs never reach the structured data
    faqs: (d) => d.serviceContent[d.service.slug].faqs || null,
    scripts: (d) => (d.serviceContent[d.service.slug].room ? ['room', 'band'] : ['band']),
    css: () => ['room', 'bands'],
    ogTitle: (d) => d.serviceContent[d.service.slug].h1,
  },
};

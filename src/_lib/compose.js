// The email the "What do you need?" chips compose. assets/js/site.js mirrors this in the browser;
// the build uses it for the first frame, so the preview and the link work before (or without) scripts.
const list = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);

export function compose(picked, biz = '', more = '') {
  const unsure = picked.some((c) => c.unsure);
  const wants = picked.filter((c) => !c.unsure);
  const subject = 'Enquiry: ' + (wants.length ? wants.map((c) => c.label).join(', ') : 'not sure yet');
  let ask;
  if (wants.length) ask = `We’d like to talk about ${list(wants.map((c) => c.phrase))}.` + (unsure ? ' We’re not sure yet exactly what we need.' : '');
  else ask = 'We’re not sure yet what we need, and would like some advice.';
  const body = 'Hi CuSS,\n\n' + ask + '\n' + (biz ? 'Our business: ' + biz + '\n' : '') + (more ? '\n' + more + '\n' : '') + '\nThanks!';
  return { subject, body };
}

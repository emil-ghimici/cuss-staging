// Production builds (cuss.ie) vs staging builds (noindex, own address).
const staging = process.env.STAGING === '1';
export default {
  staging,
  url: staging ? 'https://emil-ghimici.github.io/cuss-staging' : 'https://cuss.ie',
};

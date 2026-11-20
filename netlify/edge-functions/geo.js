// The visitor's country (two letters, e.g. "DE"), from Netlify's own geolocation of the request's IP: the form's phone
// field starts on that country's dial code (startDial in site/assets/js/landing.js). Nothing is stored or sent elsewhere.
export default (request, context) =>
  new Response(JSON.stringify({ country: (context.geo && context.geo.country && context.geo.country.code) || null }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
  });

export const config = { path: '/api/geo' };

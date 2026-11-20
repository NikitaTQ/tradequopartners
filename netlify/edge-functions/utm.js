// The UTM tags of the link the visitor came by, stored by the server for 30 days (cookie tq_utm). The page writes the same
// cookie itself at once (partials/head.html) and then calls this: Safari keeps cookies written by a page's script only
// 7 days (and 1 day after a click from an ad network), but a cookie the site's own server sets keeps its 30 days.
// Only the five utm_* tags, each cut to 200 characters; nothing else is read, stored or sent elsewhere.
const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

export default (request) => {
  const q = new URL(request.url).searchParams, u = {};
  for (const k of KEYS) { const v = q.get(k); if (v) u[k] = v.slice(0, 200); }
  const headers = { 'cache-control': 'private, no-store' };
  if (Object.keys(u).length) {
    headers['set-cookie'] = 'tq_utm=' + encodeURIComponent(JSON.stringify(u)) + '; Max-Age=2592000; Path=/; SameSite=Lax; Secure';
  }
  return new Response(null, { status: 204, headers });
};

export const config = { path: '/api/utm' };

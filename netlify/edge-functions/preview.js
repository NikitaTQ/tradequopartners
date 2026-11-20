// Private pages in development (now /for-influencers/): shown only to the owner, everyone else gets the site's ordinary 404.
// The owner opens the page once per browser with ?key=<preview key>: the key is checked against its SHA-256 below (the key
// itself is not in the repository), kept in an HttpOnly cookie for a year and taken out of the address. A new key = a new
// HASH here (README: Закрытая страница /for-influencers/). Pages behind it are also marked noindex.
const HASH = '49e6e48cbf0b9272d9439c45f3a09f7d3b8730eee6a775721556d13561682e28';

const sha256 = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
  .map((b) => b.toString(16).padStart(2, '0')).join('');

export default async (request, context) => {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (key && (await sha256(key)) === HASH) {
    url.searchParams.delete('key');
    return new Response(null, { status: 302, headers: {
      location: url.pathname + url.search,
      'set-cookie': 'tq_preview=' + encodeURIComponent(key) + '; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax',
      'cache-control': 'private, no-store',
    } });
  }
  const c = /(?:^|;\s*)tq_preview=([^;]+)/.exec(request.headers.get('cookie') || '');
  if (c && (await sha256(decodeURIComponent(c[1]))) === HASH) {
    const res = await context.next();
    res.headers.set('x-robots-tag', 'noindex, nofollow');
    res.headers.set('cache-control', 'private, no-store');
    return res;
  }
  const nf = await fetch(new URL('/404.html', url));
  return new Response(nf.body, { status: 404, headers: {
    'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex',
  } });
};

export const config = { path: ['/for-influencers', '/for-influencers/*'] };

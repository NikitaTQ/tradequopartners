/* The partner request form → a Telegram chat.
 *
 * The form on the landing pages (tools/i18n/landing.html, data-notify) POSTs its fields here as JSON, next to its copy
 * for Netlify Forms; this function sends them as one message to the chat, through the site's own Telegram bot.
 * The bot's token and the chat stay out of the code, in the site's environment variables on Netlify:
 *   TELEGRAM_BOT_TOKEN  the token @BotFather gave for the bot
 *   TELEGRAM_CHAT_ID    the chat (a group's id starts with -100…); several chats: ids separated by commas
 * Without them the function answers 503 and the form still delivers to Netlify Forms.
 * Bots that fill the hidden field get a quiet 200 and no message; requests from other sites are refused. */

const ALLOWED_ORIGIN = /^(https:\/\/([a-z0-9-]+\.)*(tradequopartners\.com|netlify\.app)|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
/* one line of text: no control characters, at most n characters */
const line = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, n);

export function message(d) {
  const name = line(d.name, 120), email = line(d.email, 160), phone = line(d.phone, 40);
  const [country = '', dial = ''] = line(d.phone_code, 40).split(' ');   // "AE +971"
  const lines = ['🆕 Новая заявка с сайта', '', 'Имя: ' + (name || '—'), 'Email: ' + email,
    'Телефон: ' + (phone ? (dial ? dial + ' ' : '') + phone + (country ? ' (' + country + ')' : '') : '—')];
  const lang = line(d.language, 12), page = line(d.page, 300);
  if (lang) lines.push('Язык страницы: ' + lang);
  if (page) lines.push('Страница: ' + page);
  return lines.join('\n');
}

export default async (req) => {
  if (req.method !== 'POST') return reply(405, { ok: false, error: 'method' });
  const origin = req.headers.get('origin');
  if (origin && !ALLOWED_ORIGIN.test(origin)) return reply(403, { ok: false, error: 'origin' });
  let d;
  try { d = await req.json(); } catch (e) { return reply(400, { ok: false, error: 'body' }); }
  if (!d || typeof d !== 'object') return reply(400, { ok: false, error: 'body' });
  if (line(d['bot-field'], 200)) return reply(200, { ok: true });                    // the honeypot: say yes, send nothing
  if (!EMAIL.test(line(d.email, 160))) return reply(400, { ok: false, error: 'email' });

  const token = process.env.TELEGRAM_BOT_TOKEN, chats = (process.env.TELEGRAM_CHAT_ID || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!token || !chats.length) { console.error('lead: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set'); return reply(503, { ok: false, error: 'not configured' }); }

  const text = message(d);
  const sent = await Promise.all(chats.map(async (chat_id) => {
    try {
      const r = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id, text, disable_web_page_preview: true }),
      });
      if (!r.ok) console.error('lead: Telegram answered', r.status, (await r.text()).slice(0, 300));
      return r.ok;
    } catch (e) { console.error('lead: Telegram unreachable', e && e.message); return false; }
  }));
  return sent.some(Boolean) ? reply(200, { ok: true }) : reply(502, { ok: false, error: 'telegram' });
};

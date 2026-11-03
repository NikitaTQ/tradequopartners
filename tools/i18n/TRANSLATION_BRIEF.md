# Translation brief — tradequopartners.com landing page

**Source:** `tools/i18n/strings/en.json` (key → English). Produce `tools/i18n/strings/<code>.json`
with **exactly the same keys**, values translated.

## Context
Landing page of the **TradeQuo Partner Program** — the affiliate / Introducing Broker (IB) program
of TradeQuo, an online forex & CFD broker. Readers are affiliates, IBs, trading educators, signal-group
owners and content creators deciding whether to refer their audience. Tone: confident, precise,
premium fintech (think Revolut / a tier-1 broker's partner page) — business style, never slangy,
never hype. Short sentences. Write as a senior financial marketing translator native in the target
language would: natural phrasing for that market, not word-for-word.

## Hard rules
1. **Keep every number, amount and percentage exactly as written**: `87%`, `$5.00`, `$7.50`, `$10.00`,
   `$7.5`, `7,800`, `24`, `00:00`, `0–50`, `51–200`, `200+`, `30K+`, `$9M+`, `4.9`, `72.6%`, `4`.
2. **Keep the inline tokens and their order of meaning**: `<red>…</red>` (red accent words — wrap the
   words that carry the same emphasis in your language), `<privacy>…</privacy>`, `<terms>…</terms>`,
   `<lots>7,800</lots>`, and the self-closing `<br/>`, `<brd/>`, `<year/>`, `<day/>`. Do not add other markup.
   Write `&` and quotes as plain characters.
3. **Brand and product names stay in Latin script**: TradeQuo, TradingView, Trustpilot, Client Portal
   may be translated if the market normally does (e.g. "Kundenportal"), IB / Sub-IB may stay as "IB".
   `Infinite Flow` is a feature name — not present in the strings.
4. **Keys ending in `.title`/`hero.h1` are big headlines**: keep them about as short as the English.
5. **Tight UI slots** (keep as short as the English or shorter):
   `nav.*`, `nav.cta`, `form.name`, `form.email`, `form.phone`, `form.commit1-3`, `form.section`, `form.auth`,
   `form.sign`, `form.date`, `form.submit`, `form.sent`, `calc.lotsUnit`, `calc.tradersUnit`, all `inv.*`,
   `rcpt.*`, `dock.l` + `dock.r` (one button split in two halves: "Become a" | "partner" — split your
   phrase naturally into a left and right part; both parts non-empty), `stats.cta`, `reach.cta1`, `reach.cta2`,
   `offer.N.t`, `embed.crys.*` (caption under a big number inside a small hexagon, max ~22 characters,
   CJK max ~8 characters), `embed.flow.f1-3`, `embed.flow.live`.
6. Strings that are UPPERCASE in English (`form.*` labels, `inv.*`, kickers, `embed.crys.*`) should be
   uppercase in scripts that have case; in scripts without case just translate.
7. `footer.risk` is a **regulatory risk warning**: translate faithfully and completely. Where an official
   ESMA standard wording exists in your language ("CFDs are complex instruments…"), use it, keeping `72.6%`
   with your language's decimal separator **only here** if the official wording requires it (e.g. `72,6 %`).
8. `form.datePh` is a date-format hint: use the local abbreviation of DD / MM / YYYY (e.g. TT / MM / JJJJ),
   keep day/month/year order.
9. `meta.*` are search/social snippets: natural, keyword-aware ("partner program", "IB program",
   "affiliate", "rebate" as used in that market).
10. Do not add claims, superlatives or promises that are not in the English.

## Address form per language
de Sie · fr vous · es tú (neutral international Spanish) · pt Brazilian Portuguese, você · it tu ·
pl Ty (or impersonal) · ro tu · tr siz · id Anda · vi bạn · th คุณ, polite · ja です/ます, natural
business Japanese · ko 합니다/하세요 · zh-hans Simplified Chinese (mainland), 您 · zh-hant Traditional Chinese
(Taiwan/HK usage), 您 · uk ви · ar Modern Standard Arabic, professional.

## Glossary (use consistently)
- spread · lot (trading lot) · rebate (per-lot commission paid to the partner) · revenue share / rev-share ·
  payout · referral link · referred clients · Introducing Broker (IB) · partner manager · creatives
  (marketing materials) · white-label · Sub-IB network · incentive trips · tiers: Starter, Gold, Elite
  (keep tier names in English).
- Chinese: lot = 手; ja: ロット; ko: 랏; uk: лот; ar: لوت (or العقد where natural for "lot").

## Output
Valid JSON (UTF-8, no comments), same key order as en.json, 2-space indent.

---

# Partner Programs + Commission Plan pages (added Nov 2026)

**Sources:** `tools/i18n/strings/programs/en.json` (keys `pp.*`) and `tools/i18n/strings/commission/en.json`
(keys `cp.*`). Produce `tools/i18n/strings/programs/<code>.json` and `tools/i18n/strings/commission/<code>.json`
with exactly the same keys. Same tone, rules, glossary and address form as above.

Also new in the landing master `tools/i18n/strings/en.json` (add them to `<code>.json`, same position):
`lang.translate` (label of an on/off switch in the language menu that allows the browser to auto-translate
the page — short, max ~20 characters), `fan.home` (= link to the landing page, "Home"),
`fan.programs`, `fan.commission`, `fan.dashboard`, `fan.marketing`, `fan.academy`, `fan.stories`
(page names in the bottom-right site-map menu; title case where the language uses it; max ~22 characters).

## Page context
- **Partner Programs** (`pp.*`): three ways to partner with TradeQuo — Introducing Broker (refer traders),
  Partner network (Sub-IB: earn on partners you bring in), White Label (own brokerage / academy brand).
- **Commission Plan** (`cp.*`): an earnings calculator (active clients × lots per client × rate per lot of the
  tier), the commission structure (up to 87% of spread; tiers Starter $5.00 / Gold $7.50 / Elite $10.00 per lot),
  daily payouts, perks, FAQ.

## Extra rules for these pages
1. `cp.calc.next` contains the placeholders `{tier}` (an English tier name: Starter/Gold/Elite) and `{n}`
   (a number of clients): keep both exactly, move them where your grammar needs them. Example de:
   `{tier} ab {n} Kunden`.
2. Tight slots (as short as English or shorter): `pp.nav.*`, `cp.nav.*`, `pp.p1-3.tag`, `pp.p1-3.value`,
   `pp.p1-3.valueNote`, `pp.card.plan`, `cp.calc.clientsUnit`, `cp.calc.tier`, `cp.calc.perLot`, `cp.calc.perDay`,
   `cp.calc.perYear`, `cp.calc.p1-3`, `cp.str.example`, `cp.tier.*`, `cp.pay.t1-4`, `pp.join.cta2`, `cp.end.cta2`,
   `pp.why.cta`. Keys in UPPERCASE in English (`*.kicker`, `*.tag`, `cp.calc.clientsUnit`, `cp.calc.tier`,
   `cp.str.example`) stay uppercase in scripts with case.
3. `pp.p2.value` "Sub-IB" may stay as is (or the market's usual term). `pp.p3.value` "Your brand" is a big
   headline value — keep it short.
4. `cp.str.l1`…`l3`, `cp.str.exampleFrom/To` explain spread-based commission: "spread" = the bid/ask difference,
   use your market's standard trading term.
5. Dollar amounts stay exactly as written (`$5.00–$10.00`, `$1,000`, `$870`), like on the landing. Other numbers
   keep their digits (`87%`, `00:00`, `24`, `0–50`, `51–200`, `200+`, `51`, `200`); the count `30,000+` may use
   your language's thousands separator (`30.000+`, `30 000+`) or a natural local form (`3万+`).

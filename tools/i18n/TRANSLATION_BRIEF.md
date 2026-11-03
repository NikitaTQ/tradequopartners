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

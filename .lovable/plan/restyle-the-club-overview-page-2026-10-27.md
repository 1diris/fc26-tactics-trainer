# Restyle the club Overview page

Only the look changes. All numbers, calculations, links, buttons and season switching stay the same.

## What changes

1. **Header** (shared career header, so it shows on every career tab): small green dot + league name, big club name, "Season" label above the season picker on the right, tabs Overview / Squad / Tactics / Academy / Transfers / Import with a green underline on the active tab; tabs scroll sideways on phones.
2. **Stats strip**: one card with 6 stats split by thin lines (Players, Avg. OVR, Avg. POT, Avg. age, Squad value, Wages / week). "Young squad" in green under age when it applies. 3 per row on tablet, 2 on phones.
3. **Recommendation**: plain bordered card, green lightbulb, bold title + grey explanation, solid green button on the right.
4. **Two columns**: Top players table (#, name + grey position tag, OVR, POT, top values in green, "–" when unknown, "See full squad →") and Alerts (orange dot rows with outlined button, grey dot for the database-match alert, "N open" count). They stack on phones.
5. **Other sections** that are on the page today but not in the screenshot (squad distribution, academy talents, expiring contracts) stay, restyled in the same card style below the two columns, so no information is lost.

## Technical details

- Files: `src/routes/_authenticated/karrierer.$id.index.tsx` (overview body) and `src/routes/_authenticated/karrierer.$id.tsx` (header/tabs/season select).
- Add scoped tokens under a `.overview-dark` class in `src/styles.css` (bg #000, card #0A0A0A, border #222, divider #1A1A1A, muted #8C8C8C, accent #16A34A, warning #F5A524) and expose them via `@theme inline` utilities; no hardcoded hex in components.
- Load "Inter Tight" 600/700 via a `<link>` in `__root.tsx`; add `--font-tight` token.
- Max width 1200px, 24px gaps, 16px radius, no shadows/gradients.
- Verify with Playwright at desktop and mobile widths; run typecheck.

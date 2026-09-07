# Squad: full info on mobile

On desktop, the Squad table shows Value, Wage, Contract, Age and more — but on mobile each player row only shows name, position, contract label and OVR/POT. This plan brings the full overview to mobile.

## Changes (one file)

File: `src/routes/_authenticated/karrierer.$id.trup.tsx`

Upgrade the mobile player card (the `md:hidden` list) so each player shows the same key info as the desktop table:

- **Top row** (unchanged position): photo, name, position badge, OVR and POT badges.
- **New stat grid** under the name: a compact 2–3 column grid with small label + value pairs:
  - **Age** — `row.current.age`
  - **Value** — `formatMoney(row.estimatedValue)` (same estimate as desktop)
  - **Wage** — `formatWage(row.current.wage)`
  - **Contract** — existing colour-coded contract status (Expiring / year / –)
  - **FC26 status** — Matched / Unmatched indicator
- The whole card still opens the existing player detail panel on tap (Back to squad panel already works on mobile, so tapping gives the full stats grid).

Layout details:
- Card keeps rounded dark styling; stat grid uses DM Mono numbers and muted uppercase micro-labels, matching the desktop table look.
- Grid wraps to 2 columns on very narrow screens, 3 columns when space allows.
- Cards stay compact — no page-height blow-up; roughly two text lines taller than today.

## What stays the same

- Desktop table is untouched.
- Filters, sorting, Auto-match, detail panel, sell/match dialogs — all unchanged.
- No backend or data changes.

## Technical notes

- Reuses existing `contractStatus`, `contractTone`, `RatingBadge`, `PositionPill`, `formatMoney`, `formatWage` helpers already in the file.
- Verified with `bunx tsgo --noEmit` and a mobile-viewport screenshot via Playwright.

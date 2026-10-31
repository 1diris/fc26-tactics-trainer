# Academy: clear advice per talent

Today the Status column only says Ready / Developing / Loan candidate, based on OVR alone. Replace it with a concrete recommendation that tells you what to do with each youth player.

## Recommendations (from age, OVR and potential)

- **Promote** — OVR 70+, or OVR 65+ with potential 80+. Ready for the first team.
- **Keep & develop** — potential 80+ but not ready yet. Keep in the academy.
- **Loan out** — age 17+, OVR under 62, potential 75+. Needs match minutes elsewhere.
- **Release** — potential under 70, or age 18+ with OVR under 58 and potential under 75. Frees a slot.
- **Keep watching** — everything else.

Each pill gets a short reason under or next to it, e.g. "POT 85 · not ready yet" or "18 yrs, low ceiling".

## Where it shows

- Academy table: the Status column becomes "Advice" with the pill and reason (also on phone).
- Top summary: the "Ready" count becomes small counts: Promote · Keep · Loan · Release.
- Talent detail window: one line with the advice and why.
- Overview page "Academy's Best Talents" card: small advice pill next to each name.

## Not changing

No database changes, no AI calls, no change to saving or the growth plan field. Advice is calculated on the page from data you already have.

## Technical

- New pure function `youthAdvice(row)` in `src/lib/youth-advice.ts` returning `{ action, reason }`, with tests for each threshold.
- Replace `statusOf`/`StatusPill` in `karrierer.$id.akademi.tsx`; reuse the pill in `karrierer.$id.index.tsx`.

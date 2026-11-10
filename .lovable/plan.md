# Fix missing OVR and POT for academy players in the Import review list

## What I found
- The AI did read your screenshots correctly: the saved results show OVR (e.g. L. Bravo 60, A. Álvarez 59) and POT as a range (e.g. "68 - 92").
- POT is empty because academy players get POT as a range (min–max), but the review list only shows a single POT number, which stays blank for talents.
- OVR is read and passed to the list, but it still shows empty on your iPhone. The exact cause is not confirmed yet; first step is to reproduce it at iPhone size.

## Plan
1. Reproduce the import review at iPhone size with academy players and find why OVR boxes appear empty (likely the number box being too narrow or the value being lost when results are merged/restored).
2. Fix OVR so it always shows the read value, for both squad and academy players.
3. For academy players, show POT as the range (e.g. "68–92") in the review list, editable as two small boxes (min / max).
4. Make sure Save sends OVR and the POT range to the Academy, so they appear on the Academy page.
5. Squad players keep their single POT as today. No change to layout elsewhere or to saved data.

## Technical details
- `src/routes/_authenticated/karrierer.$id.import.tsx`: Draft already carries `potential_min`/`potential_max` from `ai-extract.server.ts`; render them for `target === "youth"` rows instead of `potential`; verify `overall` survives `mergeDrafts` and sessionStorage restore; widen number inputs on mobile.
- Verify youth save path (`youth.functions.ts` import rows) maps `overall`, `potential_min`, `potential_max`.
- Verify with Playwright at 390px width.

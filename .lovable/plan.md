# Hide FC 26 database matching from the Squad page

The database link keeps working quietly in the background, because it's where each player's potential and starting OVR come from. Only the parts you can see about matching go away.

## What changes

- **Squad page**
  - The "Matched / Unmatched" badges on players (desktop table and phone cards) are removed.
  - The "x/y matched" count is removed. The line keeps "x of y players".
  - The "Auto-match squad" button is removed.
  - The "Matched" sort option is removed.
  - The player detail panel loses the "Matched with… / Change match" section. It shows **POT** and a new **Start OVR** (the player's rating from the FC 26 database) next to the current OVR, with the gain (for example "+3").
- **Automatic background matching**: when you open the Squad or Overview page and some players are unlinked, the app links them silently in the background. If no link is found, the player just shows "–" for Start OVR, with no warning.
- **Overview**: the "FC 26 database / Match squad" alert is removed, so "open" counts only real squad issues.

Nothing changes for your saved players, OVR/POT, values or imports.

## Technical details

- `src/routes/_authenticated/karrierer.$id.trup.tsx`: remove `MatchBadge` usages, matched count, auto-match button, `matched` sort key, `FcMatchDialog` and the match section in the detail panel. Add a Start OVR stat from `row.fc?.overall` with the delta to `row.current?.overall`.
- Add a small `useSilentAutoMatch(careerId, rows)` hook. It calls the existing `autoMatchSquad` once per session when unmatched players exist, then invalidates the career query, with no toasts. It's used on the Squad and Overview pages.
- `src/routes/_authenticated/karrierer.$id.index.tsx`: drop the FC 26 alert.
- Keep `fc-match-dialog.tsx` and the server functions in place, unused, so matching can be brought back later. No database changes.

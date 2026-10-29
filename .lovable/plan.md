# Squad on iPhone: see names without sliding sideways

Today the Squad list on phone is a wide table, so you swipe right to see Age, OVR, Value and the rest, and the names slide out of view.

## What changes (phone only, under 768px)
Each player becomes one compact card row instead of a wide table row:

```text
[ Lukas Brenner        CB ]   82  ↗88
  24 yrs · €45m · €60k/w · 2027 •
```

- Line 1: full player name (never cut off) + position chip on the left; OVR (big) and POT (with the green "room to grow" arrow) on the right.
- Line 2: Age, Value, Wage and Contract year in small grey text, with the orange dot if the contract expires this season.
- Group headers (Goalkeepers, Defenders...) stay.
- Tapping a row still opens the player profile, same as today.
- A small "Sort by" dropdown above the list (Name, Age, OVR, POT, Value, Wage, Contract) replaces clicking the column headers, which are hidden on phone.

## Unchanged
- Desktop and tablet keep the current table exactly as it is.
- No change to data, sorting logic, filters, search or the player profile.

## Technical details
- In `karrierer.$id.trup.tsx`: wrap the existing table in `hidden md:block`; add a `md:hidden` list rendering the same `grouped` rows with existing `ov-*` tokens; the mobile Sort select reuses `sortKey`/`asc`/`toggleSort` state.
- Verify with Playwright at 393px width and run typecheck.

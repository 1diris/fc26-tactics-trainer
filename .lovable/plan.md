# Sort squad by wage, value and contract on mobile

## What you get

On the Squad page, a "Sort by" control that works on both phone and computer, so you can instantly see:

- Who earns the most / least (Wage, high→low or low→high)
- Who is worth the most / least (Value)
- Whose contract expires soonest / latest (Contract)
- Plus the existing sorts: OVR, POT, Age, Name

## Changes

- Add a visible sort row under the existing search/filters in `src/routes/_authenticated/karrierer.$id.trup.tsx`:
  - A "Sort by" dropdown (select) with: OVR, POT, Age, Value, Wage, Contract, Name, Position
  - A direction toggle button (highest→lowest / lowest→highest) using arrow icons
- The control drives the same existing `sortKey` / `asc` state, so desktop column-header sorting keeps working and stays in sync with the dropdown.
- Default stays OVR descending — nothing else changes (filters, detail panel, auto-match, sell, backend all untouched).

## Technical notes

- Single file edit: `src/routes/_authenticated/karrierer.$id.trup.tsx`
- Reuses existing `SortKey`, `toggleSort`, `sortValue` logic — only UI is added
- `bunx tsgo --noEmit` after the edit, then verify on a phone-sized screen

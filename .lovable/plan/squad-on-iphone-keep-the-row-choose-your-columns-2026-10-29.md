# Squad on iPhone: keep the row, choose your columns

You keep today's one-row-per-player table, but decide which columns are shown, and the name never slides away.

## What changes
1. **"Columns" button** next to the sort/filter controls. Tapping it opens a small checklist: Age, OVR, POT, Value, Wage, Contract. Untick what you don't need and it disappears from the table; tick it again to bring it back.
2. **Remembered choice**: your selection is saved on the device, so the table looks the same next time you open Squad.
3. **Phone default**: on iPhone the table starts with Name, OVR and POT shown so it fits without swiping. On computer all columns stay on by default.
4. **Name stays pinned**: if you do turn on many columns and need to swipe, the name column stays fixed on the left so you always see who the row is.
5. Tapping a row still opens the player profile with all details.

## Unchanged
- Sorting by tapping column headers, search, filters, grouping and the player profile.
- No data or database changes.

## Technical details
- `karrierer.$id.trup.tsx`: `visibleCols` state (name always included) persisted in localStorage, read in `useEffect` to avoid hydration mismatch; default depends on `useIsMobile`.
- Filter `tableCols` and the matching `<td>` cells by `visibleCols`; table `min-w` computed from visible columns; group header `colSpan` follows the count.
- Name `th`/`td` get `sticky left-0 z-10 bg-ov-card`.
- Columns menu via shadcn `DropdownMenu` with checkbox items, existing `ov-*` styles.
- Verify with Playwright at 393px and run typecheck.

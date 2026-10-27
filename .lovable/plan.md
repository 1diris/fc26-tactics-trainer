# Simpler "Search the market" section

Make the search section calmer and more minimal. No search or filter features are removed — some just move behind a button.

## What you'll see

- **One clean toolbar:** search box, a Sort dropdown and a "Filters" button (with a small count when filters are active). The Search players / My targets switch sits on the right as a small toggle.
- **Quick picks:** Wonderkids, Gems, Bargains, Expiring and Free agents become small grey outlined chips on one line. The active one is outlined in green.
- **Filters panel (hidden by default):** opens under the toolbar. It holds the position buttons, the OVR/POT/Age/Value/Wage ranges, league, foot, "Within budget" and "Reset filters".
- **"Cover my gaps" removed from here:** the Priority cards at the top already do this job. The squad analysis list goes inside the Filters panel.
- **Results as a table:** one card with the same look as the Shortlist. Columns: Player (+ position tag), Age, OVR, POT, Value, vs. squad (+X in green), plus a star (shortlist) and a "Sign" button on each row. Photos, the club line and the six stat numbers (PAC, SHO…) are no longer shown in each row. Club and league appear as small grey text under the name.
- **Page buttons:** stay at the bottom of the card.
- **My targets:** the three stat boxes become one card with thin dividers, and the targets list uses the same table.
- On phones, the table scrolls sideways inside its card.

## Technical details

- Only `src/routes/_authenticated/karrierer.$id.marked.tsx` changes. All state, filter values, queries and mutations stay as they are.
- A new `filtersOpen` state controls the panel. The active-filter count is worked out from the existing values.
- `PlayerRow` is replaced by a table row component that uses the same `onToggle`/`onSign`/`delta` props.
- It uses the existing `ov-*` design tokens and `font-tight`.

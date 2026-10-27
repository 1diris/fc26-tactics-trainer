# Restyle the Squad page

Only design and layout change. Search, filters, sorting, row click to open the player panel, sell and match dialogs all keep working as today.

## Layout
- Shared career header (already restyled) with Squad tab active.
- Title "Squad" (32px Inter Tight bold) + muted line: "31 players · Avg. OVR 73.9 · Avg. POT 79.6" (computed from the current squad). No button in the title row.
- Toolbar, one row that wraps on mobile:
  1. Search field with icon (44px tall, dark card, 12px radius), fills remaining width.
  2. Segmented filter: All / GK / DEF / MID / ATT (maps to the existing group filter; active segment #1F1F1F with white text).
  3. "Sort" label + dropdown: OVR, POT, Age, Value, Contract (uses existing sort; column headers still toggle direction).
  4. Small secondary "Filters" button that opens the existing age/OVR range inputs and reset, so nothing is lost while the main row stays clean.
- Table card (#0A0A0A, 1px #222, radius 16px):
  - Columns: Player, Age, OVR, POT, Value, Wage/wk, Contract (all but Player right-aligned).
  - Rows grouped under small uppercase muted labels: Goalkeepers, Defenders, Midfielders, Attackers.
  - Player name + grey outlined position tag. No avatars, no colored rating badges, no Matched/Unmatched badges.
  - OVR 17px Inter Tight semibold; highest OVR in green.
  - POT muted; green with an up-right arrow when POT > OVR; "–" if unknown.
  - Contract year muted, orange dot before it when it expires this season.
  - Footer: "Showing X of Y players" + legend (orange dot = expires this season, green arrow = room to grow).
  - Below ~820px the table scrolls sideways inside the card; the separate mobile card list is replaced by this table.
- The "Auto-match squad" button moves out of the main view into the Filters panel as a secondary button (still works).
- Player detail panel and dialogs: restyled to the same card/border/button tokens, content unchanged.

## Technical
- File: `src/routes/_authenticated/karrierer.$id.trup.tsx` only; reuse existing `ov-*` tokens and `font-tight` in `src/styles.css`.
- Grouping uses existing `groupOfPosition`; within each group the current `sortKey`/`asc` order applies.
- Primary button: `bg-ov-accent text-black rounded-[10px]`; secondary: transparent with `border-ov-control`.
- Typecheck and Playwright check (desktop + phone) on the Real Betis career.

# Team overview as boxes above the tactics section

## Goal
Move the "Team overview" panel from below the pitch to directly above the lineup/tactics area on the Tactics page, and restyle it as box cards matching the reference screenshot: dark cards with a thin border, centered uppercase gray label and a large lime-green number.

## Reference look (from screenshot)
```text
+-----------+  +-----------+  +-----------+
|  DEFENCE  |  |  MIDFIELD |  |  ATTACK   |
|    82     |  |    79     |  |    84     |
+-----------+  +-----------+  +-----------+
```

## Changes (src/routes/_authenticated/karrierer.$id.taktik.tsx only)

1. Move the "Team overview" card so it renders above the "Lineup" card in the left column (before the pitch section). Keep everything else (Suggest lineup / Save buttons, tabs, export/import) untouched.

2. Restyle the line ratings as boxes, one per line: GK, DEFENCE, MIDFIELD, ATTACK.
   - Each box: `rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-center`
   - Label: uppercase, `text-[11px] tracking-widest text-zinc-400` (use `font-display`-style condensed headings already in the app)
   - Value: large lime number, `text-3xl font-bold text-lime-400` (fallback "–" when a line has no players yet)
   - Grid: `grid-cols-3` for DEFENCE/MIDFIELD/ATTACK, with GK either as its own box in the row (4 boxes total, wrapping on mobile) — follow the screenshot's 3-box rows by putting GK in the second row with the other stats if it looks cleaner; decide in implementation so desktop and mobile both look balanced.

3. Keep the secondary stats (Avg age, Empty slots, Out of pos.) as compact boxes/pills in a row below the rating boxes, inside the same moved panel.

4. Keep the clickable role warnings (hints) attached to the moved panel, unchanged.

5. No database, routing, or logic changes — same data (`lineAverages`, `avgAge`, `emptySlots`, `outOfPosition`) already computed in the file.

## Verification
- `bunx tsgo --noEmit`
- Playwright check of the tactics page layout: boxes render above the pitch, both desktop and mobile widths.

# Restyle the Tactics page

Design and layout only. Saved tactics (select, save as new, rename, delete), click and drag lineup editing, roles, Tactical Visions, team settings, export/import codes and the bench all keep working exactly as today.

## Top of the page
- Shared career header with Tactics tab active (already in place).
- Title "Tactics" (32px Inter Tight bold) + muted subtitle "Best XI picked by OVR from your squad".
- Right side of the title row: "Formation" dropdown. It keeps all 30 formations (your saved tactics depend on them); the four from the screenshot (4-3-3, 4-2-3-1, 4-4-2, 3-5-2) are listed first.

## Main two columns (1.1fr / 1fr, stacked on phones)
Left: pitch card
- Minimal pitch: #0D0D0D surface, thin #262626 lines (outline, halfway line, centre circle, both boxes). No grass stripes or gradients.
- Players as 40px black circles with OVR inside, name below (12px). Ring: green = highest rated in the XI, orange = weak spot (flagged by the existing out-of-position/role warnings or lowest OVR line), grey #3A3A3A = normal. Empty slot = dashed grey ring with the position label.
- Selected slot gets a white ring. Click and drag behave as now.
- Legend under the pitch: Top rated / Weak spot / Normal.

Right, stacked:
1. Depth chart card: rows Pos | Starter | OVR | Backups, one per lineup slot. Backups = bench players who can play that position (existing position-fit logic). 0 backups shows an orange dot.
2. Recommendation card: bold title (e.g. "Full backs are your weak spot"), muted explanation, green "Find full backs" button that links to the Transfers page, as the Overview recommendation does. Based on the weakest line / thinnest depth in the current lineup.

## Below the main columns (same new card style)
- Saved tactic bar (select, save, save as new, rename, delete).
- Team overview boxes (Defence / Midfield / Attack, avg age, empty slots, warnings), restyled to plain dark cards with white numbers.
- Settings card with the existing Team tactics / Player role / Export tabs, restyled: segmented tab control like the Squad filter, grey outlined inputs, secondary buttons.
- Bench card with search and sort, grey position tags, no colored badges.

## Style rules applied everywhere
#000 background, #0A0A0A cards, 1px #222 borders, 16px radius, #141414/#1A1A1A dividers, green used sparingly, orange only for dots/rings, no shadows or gradients, 24px gaps, max width 1200px. The neon-green title and lime highlights are replaced by this style.

## Technical
- Files: `src/routes/_authenticated/karrierer.$id.taktik.tsx`, `src/components/tactics/pitch-view.tsx` (new ring-tone prop on `PitchNode`: "top" | "weak" | "normal"; keep drag/drop props). Reuse `ov-*` tokens and `font-tight`.
- Depth chart and recommendation derived with `useMemo` from existing `lineup`, `bench`, `positionFit`, `lineupLineAverages` and hints; nothing saved.
- No database or saved-data changes. Typecheck and Playwright check (desktop + phone) on Real Betis, including a drag swap and saving.

# Redesign of the Overview page

Rebuild only the career Overview/Dashboard screen to match the attached design. All data, navigation, imports, squad, tactics, academy and backend logic stay exactly as they are. Labels on this page will be in English, as in the design.

## What the page will look like

1. **Club context bar** — league in small green uppercase text, club name large below it. Flat near-black background, no stadium image, no gradient. The "YOUR CLUB. YOUR DECISIONS. YOUR LEGACY." line and the whole stadium hero are not part of the new page.
2. **6 KPI cards** — Players, Avg. OVR, Avg. POT, Avg. Age, Squad Value, Wage/Week. Each with big condensed number, small uppercase label, discreet icon, and a short status line where real data supports one (e.g. "+2.1 from season start" comes from the previous season snapshot; "young squad" from average age). Cards with a positive trend get a green top edge, warnings an orange one.
3. **"Career Chronicles recommends"** — dark green tinted card with green border, a short recommendation built from the real squad gap analysis and contract situation, plus a CTA button (e.g. "Find RB") that opens Transfers pre-filled for that position.
4. **Top Players** — ranked list with portrait, name, position badge, green OVR and POT, and a "See full squad →" link.
5. **Alerts** — red for critical gaps, orange for thin positions and expiring contracts, green for database-match status. Each alert has a real action: Find <position>, View players, or Match squad.
6. **Squad Distribution** — Goalkeeper / Defence / Midfield / Attack with player count, average OVR and a green progress bar.
7. **Academy's Best Talents** — top youth talents sorted by max potential, with "See academy →".
8. **Expiring Contracts** — portrait, position badges, OVR and remaining contract time in a mono amber chip.

Sections with no data (e.g. empty academy) are simply hidden; the existing "no squad data yet — upload a screenshot" empty state is kept.

## Responsive behaviour

- Desktop: airy multi-column dashboard grid; recommendation and alerts high on the page.
- Mobile: single column, KPI cards in 2 columns, extra bottom padding so nothing hides behind the bottom bar.

## Technical notes

- Rewrite `src/routes/_authenticated/karrierer.$id.index.tsx` only; keep its existing `head()` metadata and `careerDataQuery` loading.
- Reuse existing logic: `buildSquad`, `averageOf`, `contractYear`, `seasonStartYear` (squad.ts), `analyseSquadNeeds`/`PRIORITY_META` (squad-needs.ts), `formatMoney`/`POSITION_GROUPS`/`normalizePosition` (football.ts), `PlayerAvatar`.
- Academy data: add a `youthQuery` wrapper in `src/lib/career-queries.ts` around the existing `listYouthPlayers` server function; no new backend code.
- Transfers pre-fill: add optional search params (position, OVR/age hints) to the existing `/karrierer/$id/marked` route and apply them as initial filter state. No change to market server functions.
- Typography: reuse the existing display font for headings/numbers; add Inter for body text and DM Mono for stats/contract chips via a font link in the root route and tokens in `src/styles.css`.
- Palette: add near-black background and green/amber/red accent tokens to `src/styles.css` as semantic tokens; no hardcoded colour classes in the component.
- "Wage/Week" shows total weekly wage; there is no stored wage budget, so it will not claim a budget percentage unless a budget field is added later.

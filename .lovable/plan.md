# Bench panel: search + sorting on Tactics page

Add a search field and a sort dropdown to the "Bench and rest of squad" panel (bottom of the right column) on `src/routes/_authenticated/karrierer.$id.taktik.tsx`. UI-only — no database or bench-calculation changes.

## Changes

1. **New state** (next to the other useState hooks):
   - `benchSearch: string` (default `""`)
   - `benchSort: "ovr" | "age" | "position" | "name"` (default `"ovr"`)

2. **Derived list** — keep the existing `bench` computation untouched (players not in the lineup, sorted by OVR). Build a separate `visibleBench` on top of it:
   - Filter: `row.player.name.toLowerCase().includes(benchSearch.trim().toLowerCase())` (matches anywhere in the name).
   - Sort by `benchSort`:
     - `ovr` → current default, OVR highest first (use `bench` as-is)
     - `age` → age ascending, missing age last
     - `position` → position code A–Z, missing position last
     - `name` → name A–Z (localeCompare)

3. **UI above the list** (inside the bench card, under the heading) in a flex row:
   - `Input` (already imported; styling like the import field: `border-zinc-800 bg-zinc-950`), placeholder `Search players…`, bound to `benchSearch`.
   - `Select` (already imported) with the four options labelled:
     - "OVR (highest first)", "Age (youngest first)", "Position (A–Z)", "Name (A–Z)".

4. **List rendering** — map over `visibleBench` instead of `bench`; each row keeps avatar, name, position, OVR exactly as today. Empty states:
   - `bench.length === 0` → existing text "All players are in the starting lineup."
   - `bench.length > 0 && visibleBench.length === 0` → "No players match your search."

5. Run `bunx tsgo --noEmit`.

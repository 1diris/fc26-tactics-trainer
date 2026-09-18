# Træk-og-slip på taktik-siden

Træk-og-slip tilføjes som supplement til det eksisterende klik-flow (vælg plads → vælg spiller), som bevares uændret — vigtigt på mobil. Der bruges kun native HTML5 drag-and-drop; intet nyt bibliotek.

## 1. Banen (src/components/tactics/pitch-view.tsx)

- `PitchNode`-typen udvides med `playerId: string | null`.
- Besatte pladser (hvor `node.playerName` findes) bliver `draggable`; `onDragStart` sætter `dataTransfer` med `application/json`: `{ playerId, sourceSlotId: node.id }`.
- Alle pladser (tomme som besatte) får `onDragOver` (`event.preventDefault()`) og `onDrop`. `onDrop` parser payloaden og kalder en ny prop `onDropOnSlot(targetSlotId, { playerId, sourceSlotId })`.
- Visuel highlight: lime-400-ring på den plads, musen holdes over under drag (lokal state med `onDragEnter`/`onDragLeave`).

## 2. Taktik-siden (src/routes/_authenticated/karrierer.$id.taktik.tsx)

- `nodes`-opbygningen (linje ~310) udvides med `playerId: row?.player.id ?? null`.
- Ny funktion `swapSlotPlayers(sourceSlotId, targetSlotId)`: bytter de to pladser immutable i én `setLineup`-opdatering. Besat målplads = bytte; tom målplads = flyt, og kildepladsen tømmes.
- `onDropOnSlot` sendes til `PitchView`: `sourceSlotId === null` (fra bænken) → eksisterende `assign(targetSlotId, playerId)`; ellers → `swapSlotPlayers(sourceSlotId, targetSlotId)`.
- Bænken: hver række i `visibleBench`-listen (linje ~845) bliver `draggable` med samme payload-format og `sourceSlotId: null`.
- Bænke-panelets container (linje ~823) bliver drop-zone: `onDragOver` + `onDrop`; hvis `payload.sourceSlotId` findes, sættes `lineup[sourceSlotId]` til `null` (spilleren tilbage på bænken).

## Begrænsninger

- Ingen ændringer til klik-flowet, gemte data-strukturer eller databasen.
- `bunx tsgo --noEmit` efter ændringerne, og hurtig verifikation i preview (træk bane→bane, bænk→bane, bane→bænk).

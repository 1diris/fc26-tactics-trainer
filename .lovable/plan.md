# Flere navngivne taktikker pr. sæson

I dag kan der kun gemmes én taktik pr. karriere/sæson. Efter denne ændring kan du gemme flere navngivne taktikker (fx "Hjemme – højt pres", "Ude – kontra") og skifte mellem dem.

## Sådan bliver det

- En vælger øverst på Tactics-siden viser alle gemte taktikker for den aktive sæson. Vælger du en, indlæses formation, opstilling, roller, indstillinger og noter.
- "Save as new": et lille navnefelt gemmer den nuværende opsætning som en ny taktik. Den aktuelle opstilling bevares.
- "Rename": omdøber den valgte taktik uden at ændre indhold.
- "Delete": sletter den valgte taktik. Knappen er slået fra, hvis det er sæsonens eneste taktik.
- "Save tactics" gemmer fortsat den taktik, der er valgt.
- Eksisterende taktikker beholder navnet "Standard", så intet går tabt.

## Teknisk

Migration:
- Drop unikt indeks `tactics_career_season_uniq`.
- Nyt unikt indeks på `(career_id, season_id, name)` med `NULLS NOT DISTINCT`, så også rækker uden `season_id` er dækket.
- `name`-kolonnen findes allerede (`NOT NULL DEFAULT 'Standard'`) — ingen datamigrering nødvendig.

`src/lib/tactics.functions.ts` (uændret `requireSupabaseAuth`/RLS-mønster):
- `getTactic`: valgfrit `name` (default `'Standard'`), filtrerer også på `name`; select udvides med `name`.
- `saveTactic`: `name` med default `'Standard'`; opslag af eksisterende række på `(career_id, season_id, name)`, ellers insert.
- Ny `listTactics` (GET): `{ id, name, formation, updated_at }` for en `(careerId, seasonId)`, sorteret efter `name`.
- Ny `deleteTactic` (POST): sletter på `id`, men afviser (fejl) hvis det er den sidste taktik for den `(career_id, season_id)`.

`src/routes/_authenticated/karrierer.$id.taktik.tsx`:
- Ny state `activeTacticName` (default `'Standard'`); `tacticQuery` får navnet med i queryKey og input, og indlæsnings-`useEffect` bruger den valgte taktik.
- Ny `tacticsListQuery` (`listTactics`) driver Select-vælgeren.
- Handlinger til save-as-new, rename (saveTactic med nyt navn + deleteTactic på gammel række) og delete; alle invaliderer både `["tactic", ...]` og listen og skifter aktivt navn korrekt efter sletning.
- Al eksisterende funktionalitet (formationer, roller, bænk, Tactical Visions, import/eksport af taktikkode) bevares.

Typecheck (`bunx tsgo --noEmit`) køres til sidst.

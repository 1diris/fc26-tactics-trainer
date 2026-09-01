# Opfølgende import: opdater eksisterende trup

Når du uploader nye screenshots til en karriere, der allerede har en trup, skal import-siden vise klart hvad der er en **ny spiller** og hvad der er en **opdatering** af en spiller du allerede har — med de gamle tal ved siden af de nye.

## Sådan bliver flowet

1. Du vælger screenshots som i dag (op til 10, analyseres i kø).
2. Hver læst spiller sammenlignes med din nuværende trup (samme navn-matchning som ved lagring, så "T. Alexander-Arnold" og "Trent Alexander-Arnold" er samme mand).
3. Gennemgangslisten får:
   - Badge **Ny** eller **Opdateret** på hver række.
   - Små før → efter-visninger på OVR, POT, alder, værdi og løn (fx `OVR 78 → 81 (+3)`), med grøn/rød farve for op/ned.
   - Række med uændrede tal markeres diskret som "ingen ændring".
   - Tællere i overskriften: "3 nye · 18 opdateres".
   - Filter/knap: "Vis kun ændringer" så du hurtigt kan godkende.
4. Felter AI ikke kunne læse (null) overskriver **ikke** eksisterende værdier — de gamle tal bevares.
5. Ved "Gem i truppen" opdateres den aktive sæsons tal (som valgt), og kun reelt nye navne oprettes som nye spillere. Spillere der ikke er på billederne, står urørt.

## Teknisk

- `src/lib/career.functions.ts`
  - `savePlayers`: hent også nuværende snapshot for `seasonId` og flet feltvis — `null`/`undefined` fra AI beholder eksisterende værdi i stedet for at nulstille. `stats` flettes i stedet for at overskrives.
  - Returnér `created` og `updated` som i dag.
- Nyt hjælpemodul `src/lib/import-diff.ts`
  - Funktion der tager `drafts` + eksisterende trup/snapshots (fra `careerDataQuery`) og giver pr. draft: `status: "new" | "updated"`, matchet `playerId`, og `changes` med `{ field, before, after }` for OVR, POT, alder, værdi, løn, position, kontrakt.
  - Bruger `findMatchingPlayerIndex` fra `src/lib/player-matching.ts`, så matchningen er identisk med serverens.
- `src/routes/_authenticated/karrierer.$id.import.tsx`
  - Beregn diff mod `useSuspenseQuery(careerDataQuery(id))`-data.
  - Tilføj Ny/Opdateret-badge, før→efter under de relevante felter, tællere og "Vis kun ændringer"-toggle i både tabel og mobilvisning.
  - Ingen ændring i upload-, dedupliker- eller auto-match-logikken.

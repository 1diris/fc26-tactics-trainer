# Køb spillere fra Transfermarkedet ind i truppen

I dag kan en spiller fra Transfermarkedet kun gemmes som transfermål. Nu kan du også hente ham direkte ind i din trup.

## Sådan fungerer det

- Hver spiller på Transfermarkedet (søgeresultater, scoutinglister og transfermål-listen) får en **"Til trup"**-knap ved siden af stjerneknappen.
- Klik åbner en lille dialog med:
  - Spillerens navn, OVR/POT, alder og position (forudfyldt fra FC 26-databasen)
  - **Transfersum** (forudfyldt med markedsværdien, kan rettes)
  - **Trøjenummer** (valgfrit)
  - Sæson: den aktive sæson i karrieren
- Bekræft med **Hent til trup**.

## Hvad der sker bagefter

- Spilleren oprettes i truppen med navn, position, fod og nationalitet fra FC 26-kortet og bliver automatisk koblet til FC 26-spilleren (match-kilde "manual"), så original POT og estimeret værdi virker med det samme.
- Der oprettes et sæson-snapshot med OVR, POT, alder, position, løn, kontraktår og markedsværdi.
- Transfersummen trækkes fra karrierens transferbudget.
- Er spilleren allerede i truppen (samme navn eller samme FC-kobling), opdateres han i stedet for at blive oprettet igen, og dialogen siger det tydeligt.
- Er han på transfermål-listen, fjernes han derfra efter køb.
- Overblik, Trup og Taktik viser ham straks efter, uden reload.

## Teknisk

- Ny serverfunktion `signMarketPlayer` i `src/lib/market.functions.ts`:
  `{ careerId, seasonId, fcPlayerId, fee, shirtNumber? }` med `requireSupabaseAuth`.
  Læser `fc_players`-rækken, dedupliker mod eksisterende `players` via
  `findMatchingPlayerIndex` + `fc_player_id`, indsætter/opdaterer `players`
  (inkl. `fc_player_id`, `fc_match_source = "manual"`), upsert i
  `player_snapshots` på `player_id,season_id`, opdaterer
  `careers.transfer_budget` (aldrig under 0) og sletter evt. række i
  `transfer_targets`.
- Ingen migration nødvendig — alle felter findes.
- UI: `PlayerRow` i `karrierer.$id.marked.tsx` får `onSign`; ny
  `src/components/sign-player-dialog.tsx` med formular. Efter succes
  `router.invalidate()` + `queryClient.invalidateQueries()` og en sonner-toast
  ("X er hentet til truppen").
- Positionsnavne normaliseres via `normalizePosition`, så FC-koder er ensartede.

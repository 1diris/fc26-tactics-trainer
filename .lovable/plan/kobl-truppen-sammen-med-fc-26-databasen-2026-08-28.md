# Kobl truppen sammen med FC 26-databasen

Dine egne trupspillere kobles automatisk til de 18.405 spillere, der allerede ligger i FC 26-databasen bag Transfermarkedet. Databasen og Transfermarkedet ændres ikke — der oprettes ingen ny spillerdatabase, og de originale FC 26-tal bliver ikke overskrevet.

## Adskillelse af data

- **Original FC 26-data** (uændret, fælles): original OVR, original POT, original værdi, positioner, alder ved lancering.
- **Min karriere-data** (pr. sæson, som i dag): nuværende OVR, alder, position, løn, kontrakt — plus en ny beregnet *estimeret aktuel værdi*.

Din trupspiller får kun én ny ting gemt: en henvisning til den matchede FC 26-spiller.

## 1. Automatisk match

Ved import og ved åbning af Trup-siden matches hver trupspiller mod FC 26-databasen med den matchingslogik, appen allerede bruger til dedupering af screenshots (navn normaliseret for accenter/punktum, fornavn vs. initial, efternavn). Match accepteres automatisk kun når det er entydigt — ét kandidatnavn, og alder/position understøtter det. Er der flere mulige eller ingen, gættes der ikke.

## 2. POT = originalt potentiale

Trup-siden viser POT fra FC 26-databasen. Det ændrer sig ikke, selvom spilleren udvikler sig: Original POT 82 + nuværende OVR 84 vises stadig som POT 82. Er spilleren ikke matchet, vises den POT der findes i dine egne screenshotdata, ellers "–".

## 3-5. Estimeret karriereværdi

Kolonnen **Værdi** på Trup-siden bliver den estimerede aktuelle værdi, ikke den originale FC 26-værdi. Modellen er fast og forudsigelig (ingen tilfældighed):

1. Start i original FC 26-værdi.
2. Gang med en OVR-faktor: hvert OVR-point over/under original OVR ændrer værdien eksponentielt (ca. +18 % pr. point op, tilsvarende ned) — så 75 → 82 OVR løfter €8 mio. markant.
3. Gang med en aldersfaktor: unge (≤23) med resterende potentiale får præmie, spillere over ca. 29 får faldende faktor pr. år.
4. Gang med en potentiale-faktor: stor afstand mellem nuværende OVR og original POT giver et lille løft (endnu uindfriet vækst).
5. Let positionsjustering (angreb/offensiv midtbane højest, målmand lavest), som i FC's egen prisdannelse.
6. Resultatet rundes til pæne tal og har et gulv, så en spiller aldrig får negativ eller absurd værdi.

Mangler original værdi eller original OVR, falder den tilbage til den værdi dine screenshots har givet — og ellers "–". Ingen opdigtede tal.

## 6. Visning

- **Trup**: én værdikolonne (estimeret karriereværdi) med en lille markør, der ved hover/tap forklarer "Estimeret ud fra karriereudvikling". POT-kolonnen viser original POT.
- **Spillerprofil**: nyt panel "FC 26-data vs. min karriere" med original OVR, original POT, original værdi, nuværende OVR, OVR-udvikling (+7) og estimeret aktuel værdi — samt link til FC 26-kortet.

## 7. Hele truppen

Logikken kører for alle spillere i truppen på én gang. Matchede spillere får original POT + estimeret værdi; ikke-matchede viser "–" og markeres som "ikke matchet".

## 8. Manuel match

Ikke-matchede (eller tvivlsomme) spillere får knappen **Match spiller**: en søgedialog mod den eksisterende FC 26-database (samme søgning som Transfermarkedet) hvor du vælger den rigtige spiller. Valget gemmes på din trupspiller, og POT + værdi er straks tilgængelige. Der kan også fjernes eller ændres et match.

## 9. Resten af appen

Den estimerede karriereværdi bruges konsekvent i:

- **Overblik**: trupværdi og nøgletal.
- **Trup**: værdikolonne, sortering og værdifiltre.
- **Transfermarked / Trupanalyse / "Dæk mine huller"**: sammenligning af dine spillere mod mål bruger original POT og estimeret værdi, så prisniveau og opgraderingsvurdering bliver realistisk.
- **Budget/økonomi**: samlet trupværdi = summen af estimerede karriereværdier.

## Teknisk

- Migration: `players` får kolonnen `fc_player_id uuid null references public.fc_players(id)` samt `fc_match_source text` ("auto" | "manual") — ingen ændring af `fc_players` eller `transfer_targets`.
- Ny serverfunktion i `src/lib/market.functions.ts` (eller ny `src/lib/fc-match.functions.ts`): `autoMatchSquad({careerId})` slår trupnavne op i `fc_players` (ilike på `short_name`/`long_name`, filtreret på position/alder-vindue), scorer kandidater med `findMatchingPlayerIndex`-logikken fra `src/lib/player-matching.ts` og gemmer entydige match. Plus `setPlayerFcMatch({playerId, fcPlayerId|null})` til manuel match.
- `getCareerData` i `src/lib/career.functions.ts` returnerer de matchede `fc_players`-rækker (original OVR/POT/værdi/positioner) sammen med trup og snapshots.
- Ny ren modul `src/lib/valuation.ts` med `estimateCareerValue()` (modellen ovenfor) + `originalPotential()`, brugt af Trup, Overblik, spillerprofil og trupanalyse — én kilde til sandhed, med enhedstests for typiske cases (75→82 ung, 84 på 33 år, uændret OVR).
- `src/lib/squad.ts` / `src/lib/squad-needs.ts` udvides til at læse original POT og estimeret værdi fra det nye felt i stedet for kun snapshot-data.
- Auto-match kører idempotent: efter import og ved første indlæsning af karrieren, kun for spillere uden `fc_player_id`.

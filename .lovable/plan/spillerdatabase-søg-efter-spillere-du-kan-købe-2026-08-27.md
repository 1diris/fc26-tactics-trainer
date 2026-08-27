# Spillerdatabase: søg efter spillere du kan købe

Din uploadede fil er komplet: 18.405 FC 26-spillere med `player_positions` (rigtige positioner, fx "CAM, CM"), OVR, potentiale, værdi i euro, løn, alder, klub, liga, nationalitet, foretrukket fod, svag fod, tricks, kontraktudløb, de seks hovedstats og spillerbillede. Positionen behøver derfor ikke gættes ud fra stats.

## Sådan kommer det ind

Hele datasættet lægges i databasen én gang som fælles opslagsdata — du skal ikke uploade noget i appen. Data er den samme for alle, så den ligger i sin egen tabel adskilt fra dine karrierer, og din trup og dine transfermål bliver ikke berørt.

Kolonner der tages med: navn (kort og langt), positioner, OVR, potentiale, værdi, løn, frikøbsklausul, alder, højde, vægt, klub, liga og ligaens niveau, nationalitet, fod, svag fod, tricks, kontraktudløb, PAC/SHO/PAS/DRI/DEF/PHY og billede-URL. Resten (de 100+ detailattributter og positionskarakterer) springes over for at holde det hurtigt — de kan tilføjes senere hvis du vil se fulde spillerkort.

## Ny side: Transfermarked

Ligger som ny fane i karriere-navigationen ved siden af Trup og Taktik.

1. **Søgning** — fritekst på navn eller klub, med resultatet sorteret på OVR som standard.
2. **Filtre** — position (multivalg, matcher alle spillerens positioner), OVR-interval, potentiale-minimum, aldersinterval, liga, maks. værdi, maks. løn, foretrukket fod.
3. **Inden for budget** — én knap sætter maks. værdi til karrierens transferbudget, så du kun ser spillere du kan betale.
4. **Dæk mine huller** — knap der forfilterer på de positioner dashboardet advarer om at du mangler.
5. **Opgradering eller ej** — hver række viser forskellen i OVR til din bedste spiller på samme position, så en +6 opgradering er tydelig med det samme.
6. **Transfermål** — stjerne-knap gemmer spilleren som mål for karrieren med prioritet, forventet pris og en note. Egen fane viser dine mål, samlet forventet udgift og hvor meget der er tilbage af budgettet.
7. **Spillerkort** — klik på en spiller for detaljer: alle positioner, de seks stats som bjælker, kontrakt, klub, liga, værdi og løn.

Alt på dansk, med samme mørke stil og mobilvenlige kortvisning som truptabellen.

## Teknisk

- Ny tabel `fc_players` (fælles opslagsdata, ikke brugerejet): `external_id` som unik nøgle plus kolonnerne ovenfor, `positions` som text[] med GIN-indeks, og indekser på overall, age, value_eur og navn. RLS slået til med læseadgang for `authenticated`, ingen skriveadgang fra klienten; GRANT SELECT til `authenticated` og ALL til `service_role`.
- Ny tabel `transfer_targets`: karriere, `fc_player_id`, prioritet, forventet pris, note, ejer-scoped RLS på `auth.uid()` med sædvanlige GRANTs.
- Data indlæses i databasen i batches fra den uploadede fil som ren dataindsættelse — ingen AI, ingen credits til udtræk, og ingen upload-flow i appen.
- Søgning kører i en server function med `requireSupabaseAuth`, paginering på 50 rækker og filtrene som parametre, så 18.000 rækker forbliver hurtige. Ingen client-side hentning af hele datasættet.
- Positionsmatch mod din trup genbruger `POSITION_GROUPS`/`normalizePosition` fra `src/lib/football.ts` og trup-beregningerne i `src/lib/squad.ts`, så "opgradering"-tallet er konsistent med dashboardet.
- Ny rute `src/routes/_authenticated/karrierer.$id.marked.tsx` med egen `head()`-metadata, plus link i karriere-navigationen.

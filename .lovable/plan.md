# Spillerdatabase og køb-søgning

Målet: en søgbar database over FC 26-spillere, du selv uploader som CSV, så du kan finde emner at købe og markere dem som transfermål i en karriere.

## Først: filen du uploadede er tom

`EAFC26-Men-selected-columns.csv` indeholder kun overskriftsrækken (ID, Rank, Name, GENDER, OVR, PAC, SHO, PAS, DRI, DEF) og 124 helt blanke rækker — ingen spillere. Importen bygges til netop den kolonneopsætning, men der skal en fil med data i, før der er noget at søge i. Upload den igen når eksporten er fuldført.

## Kan positionen udregnes af stats alene?

Ja, men som et kvalificeret gæt — ikke som fakta. Med kun OVR, PAC, SHO, PAS, DRI og DEF kan spillertypen udledres ret præcist:

- Meget lav PAC + lav DRI og markant afvigende profil → målmand (GK-kort viser andre stats i EA's eksport, så de skiller sig tydeligt ud)
- DEF højest og over DRI/SHO → forsvar; høj PAC → back, lav PAC → midterforsvar
- PAS højest, DEF middel → central midtbane; DEF høj og SHO lav → defensiv midt
- DRI + PAC højest, SHO middel → kant
- SHO højest → angriber; SHO høj + PAS høj → hængende angriber

Det giver en position som **Angreb / Kant / Offensiv midt / Central midt / Defensiv midt / Back / Midterforsvar / Målmand** — altså en rolletype, ikke garanteret spillerens rigtige position i spillet (EA's egen position kan afvige, især for spillere med flere positioner). Positionen vises derfor som "anslået" og kan rettes manuelt. Hvis din eksport kan tage en rigtig positions-kolonne med, bruges den i stedet, og gætteriet er kun fallback.

## Sådan kommer det til at virke

1. **Ny side "Spillerdatabase"** i karriere-navigationen.
2. **CSV-upload**: du vælger filen, appen læser den i browseren, viser hvor mange spillere den fandt, og gemmer dem. Genupload overskriver samme spiller i stedet for at duplikere.
3. **Søgning og filtre**: fritekst på navn, anslået position, OVR-interval, og minimumskrav på hver af de seks stats. Sortering på OVR og stats.
4. **Sammenlign med din trup**: hvert emne viser hvor meget bedre/dårligere det er end din bedste spiller i samme positionsgruppe, så du hurtigt ser om det er en opgradering.
5. **Transfermål**: stjerne-knap gemmer spilleren som mål for karrieren med plads til note og forventet pris; en liste viser dine mål.

## Teknisk

- Ny tabel `market_players`: ejer, ekstern id, navn, køn, rank, ovr, de seks stats, `derived_position`, `position_override`, kilde-filnavn. RLS scoped til `auth.uid()`, GRANTs til `authenticated` og `service_role`. Unikt indeks på (user_id, ekstern id) så genupload opdaterer.
- Ny tabel `transfer_targets`: karriere, spiller-reference, prioritet, forventet pris, note. Samme RLS-mønster.
- CSV-parsing i browseren (ingen ny afhængighed nødvendig — filen er simpel komma-separeret), gemning via server function i batches på ca. 500 rækker, så store filer ikke timeouter.
- Positionsudledning som ren funktion i `src/lib/position-inference.ts`, genbrugt både ved import og ved visning, og dækket af enhedstest på et par kendte profiler.
- Søgning kører serverside med filtre sendt som parametre, så en fil med tusindvis af spillere stadig er hurtig.

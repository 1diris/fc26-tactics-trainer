# Danske positionsforkortelser oversættes til FC-koder

Årsagen er bekræftet i databasen: dine importerede spillere er gemt med de danske forkortelser fra spillets sprogindstilling — `ANG` (9 spillere), `HB` (5), `HW` (4), `VW` (3), `MV` (3), `VB` (2), `HM` (1), `COM` (1) — side om side med engelske koder som CM, CB, CDM, LB, GK. Taktik-siden arbejder med FC-koder (RB, ST, RW …), så en `HB` bliver aldrig genkendt som naturlig RB.

## Hvad ændres

- Danske forkortelser oversættes automatisk ved import og visning:
  - MV → GK, HB → RB, VB → LB, HWB → RWB, VWB → LWB
  - CB/MB/MF-varianter → CB, DM/CDM → CDM, CM/MC → CM, COM/OM → CAM
  - HM → RM, VM → LM, HW → RW, VW → LW, HA/CF → CF, ANG/A → ST
- Eksisterende data i din trup rettes én gang, så du ikke skal importere forfra: alle `ANG`, `HB`, `HW`, `VW`, `MV`, `VB`, `HM`, `COM` bliver til deres FC-kode i både spillere og historiske snapshots.
- Sekundære positioner (hvis de findes i data) oversættes på samme måde, så positions-fit på taktik-siden (grøn/gul/rød) bliver korrekt.
- Efter ændringen viser Trup, Taktik, trupanalyse og "Dæk mine huller" samme koder, og RB-behovet forsvinder når du faktisk har en højre back.

## Teknisk

- Udvid `map` i `normalizePosition` (`src/lib/football.ts`) med de danske forkortelser; behold de engelske.
- Migration der kører `update players set primary_position = <mapping>` og samme mapping på `player_snapshots.position` (+ evt. sekundære positionsfelter), baseret på en `case`-oversættelse.
- Kontrol bagefter: forespørgsel der viser at kun gyldige FC-koder findes i begge tabeller.
- Ingen ændring af UI-tekster eller taktiklogik — kun normalisering af positionsdata.

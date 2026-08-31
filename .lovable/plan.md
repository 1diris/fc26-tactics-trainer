# Flere formationer på Taktik-siden

Taktik-siden har i dag 7 formationer (4-3-3, 4-2-3-1, 4-4-2, 4-2-2-2, 3-5-2, 5-2-1-2, 4-1-4-1). Den formation du mangler — 4-2-1-3 (to CDM, én CAM, tre forrest) — findes ikke, så den tilføjes sammen med flere gængse FC 26-formationer.

## Nye formationer

- 4-2-1-3: LB, CB, CB, RB — 2x CDM — CAM — LW, ST, RW
- 4-3-2-1: LB, CB, CB, RB — CDM, CM, CM — 2x CF — ST
- 4-1-2-1-2 (narrow): LB, CB, CB, RB — CDM — 2x CM — CAM — 2x ST
- 4-4-1-1: LB, CB, CB, RB — LM, CM, CM, RM — CF — ST
- 3-4-2-1: 3x CB — LM, CM, CM, RM — 2x CAM — ST
- 5-3-2: LWB, 3x CB, RWB — 3x CM — 2x ST
- 4-3-3 (holding): som 4-3-3, men med CDM bagved to CM'ere er allerede dækket — i stedet tilføjes 4-5-1 med LM, CM, CM, CM, RM

Hver ny plads får korrekte koordinater på banen, og roller/fokus fungerer automatisk, fordi rolle-kataloget allerede dækker alle brugte positioner (GK, CB, LB/RB, LWB/RWB, CDM, CM, CAM, LM/RM, LW/RW, CF, ST).

## Adfærd

- Formationsvælgeren viser formationerne i en logisk rækkefølge (4-mands-, 3-mands-, 5-mands-kæder).
- "Foreslå opstilling" og rolle-forslag virker uændret for de nye formationer.
- Gemte taktikker påvirkes ikke; skifter man til en ny formation, nulstilles roller til positionens standardrolle som i dag.

## Teknisk

- Kun `src/lib/formations.ts` udvides med nye `Formation`-objekter (slot-id'er unikke pr. formation, x/y i procent som de eksisterende).
- Ingen databaseændringer; `lineup`/`roles` er jsonb og keyes på slot-id.
- Typecheck efter ændringen.

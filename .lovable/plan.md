# Sælg spiller — fjern fra trup med salgssum

Gør det muligt at sælge en spiller væk fra truppen: du angiver salgsprisen, spilleren fjernes fra truppen, og beløbet lægges til transferbudgettet.

## Sådan virker det

- På Trup-siden får hver spiller en "Sælg"-mulighed (knap på mobilkortet, handling i tabelrækken).
- Der åbnes en dialog med:
  - Spillerens navn og estimeret værdi som forslag til salgssum (kan redigeres).
  - Feltet "Solgt for (€)" — kan sættes til 0 (fri transfer).
  - Bekræft-knap "Sælg spiller" og Annuller.
- Ved bekræftelse: spilleren slettes fra truppen (inkl. hans snapshots), salgssummen lægges til karrierens transferbudget, og der vises en bekræftelse: "X solgt for €Y — budget nu €Z".
- Truppen, dashboardet og budgettet opdateres med det samme.
- Samme "Sælg"-knap tilføjes på spillerprofilen; efter salg sendes du tilbage til Trup-siden.
- Hvis spilleren er brugt i en gemt opstilling, fjernes han fra opstillingen, så taktikken ikke peger på en solgt spiller.

## Teknisk

- Ny serverfunktion `sellPlayer` i `src/lib/career.functions.ts` (auth-middleware, input: `careerId`, `playerId`, `fee >= 0`):
  1. Verificér at spilleren tilhører karrieren.
  2. Slet spilleren (snapshots følger via cascade).
  3. Læs `careers.transfer_budget`; hvis den er sat, opdatér til `budget + fee` (samme mønster som fradraget i `signMarketPlayer`).
  4. Ryd spillerens id ud af `tactics.lineup` for karrierens taktikker.
  5. Returnér `{ ok: true, budget }`.
- Ny komponent `src/components/sell-player-dialog.tsx` efter samme mønster som `sign-player-dialog.tsx` (Dialog + Input + mutation via `useServerFn`, `invalidateQueries(["career", id])` + `router.invalidate()`).
- Trup-siden (`karrierer.$id.trup.tsx`) og spillerprofilen får state for den valgte spiller og renderer dialogen; ingen ændring i eksisterende filtre/sortering.
- Eksisterende `deletePlayer` bevares uændret til ren sletning af fejlimporterede spillere.

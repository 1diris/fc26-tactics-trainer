# Gør appen hurtigere at åbne

## Hvad der gør den langsom

Jeg har gennemgået appen. Der er ikke én fejl, men fem ting der lægger sig oven i hinanden:

1. **Alt hentes forfra hver gang du skifter fane.** Skifter du mellem Overview, Squad, Tactics, Academy og Transfers, hentes karriere, hele truppen og al historik igen — selvom intet har ændret sig.
2. **Al gammel historik hentes altid.** Appen henter hver enkelt måling for alle spillere i alle sæsoner, også selvom du kun ser den aktive sæson.
3. **Spillerbillederne hentes én ad gangen gennem vores egen server.** En trup- eller transferliste starter 25–50 billedhentninger, og de gemmes ikke på serveren, så de hentes forfra for alle.
4. **Transfermarkedet skanner hele spillerdatabasen.** Ligelisten læser alle 18.000 spillere igennem, og søgninger hiver op til 1.500 spillere hjem for at sortere dem bagefter.
5. **Skrifttyperne blokerer for det første billede på skærmen.** Fem skriftfamilier hentes udefra, før teksten kan vises.

## Hvad jeg laver

- Data huskes i et stykke tid, så faneskift bliver øjeblikkelige i stedet for at hente alt igen.
- Kun den aktive sæsons data hentes ved sideindlæsning; ældre historik hentes først, når du åbner en spillerprofil.
- Spillerbilleder gemmes på serveren/kanten, så samme portræt kun hentes én gang for alle brugere — og listerne henter kun de billeder, der faktisk er synlige.
- Transfermarkedets ligeliste og søgning laves om, så databasen filtrerer og sorterer, i stedet for at sende tusindvis af spillere til appen.
- Skrifttyperne indlæses uden at blokere, og kun de vægte vi faktisk bruger.
- Login-tjekket vises med en hurtig skeletvisning, så du ser siden med det samme i stedet for en tom skærm.

Ingen ændringer i funktioner, data, filtre eller udseende — kun hastighed.

## Teknisk

- `src/lib/career-queries.ts`: `staleTime` + `gcTime` på `careerDataQuery`, `careersQuery`, `targetsQuery`, `youthQuery`, `importsQuery`, `marketSearchQuery`; `src/router.tsx` får `defaultPreloadStaleTime` > 0 og default query-options.
- `src/lib/career.functions.ts` `getCareerData`: `player_snapshots` filtreres på aktiv `season_id` (+ evt. forrige sæson til vækstberegning) i stedet for hele karrieren; behold kolonnelisterne.
- `src/routes/api/public/player-face.ts`: brug `caches.default` (Worker cache API) med `cacheKey` = normaliseret URL, læs før upstream-fetch og skriv efter; behold host-allowlist og 404-fallback.
- `src/components/player-avatar.tsx`: `loading="lazy"` + `decoding="async"` + faste `width/height` overalt; ét `<img>` pr. spillerrække (fjern dobbelt avatar i Squad-detaljepanelet).
- `src/lib/market.functions.ts`: `listLeagues` erstattes af en `distinct`-forespørgsel/SQL-view i stedet for `.limit(20000)`; preset-ranking flyttes til SQL-order/filtrering, `CANDIDATE_LIMIT` sænkes markant; listevisning henter en smal kolonneliste, fuld kolonneliste kun i spillerdialogen.
- `src/routes/__root.tsx`: Google Fonts hentes non-blocking (`media="print"`/`onload`-swap eller `preload`+`display=swap`) og familier/vægte trimmes til dem der faktisk bruges.
- `src/routes/_authenticated/route.tsx`: `pendingComponent` med skeleton, så auth-tjekket ikke giver blank skærm.
- Verifikation: `bunx tsgo --noEmit`, HTTP 200 på ruterne og Playwright-måling af faneskift før/efter.

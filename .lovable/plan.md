# Scouting-lister i Transfermarked

Vi bygger fifacm-agtige scouting-lister direkte oven på din egen spillerdatabase (18.405 EA FC 26-spillere), så du får de samme genveje uden at hente noget fra deres side.

## Nye lister

Fem faste lister som knapper øverst i Transfermarked-fanen. Alle respekterer dine eksisterende filtre (position, liga, budget osv.), så du kan kombinere fx "Wonderkids" + "CB" + "inden for budget".

- **Wonderkids** — maks 21 år og mindst 10 point vækst i potentiale, sorteret efter potentiale. Ca. 3.900 spillere i datasættet.
- **Talenter (Gems)** — 22-26 år med potentiale over overall og lav værdi i forhold til potentiale — spillere der er undervurderede i forhold til hvad de kan blive.
- **Bargains** — bedste overall pr. euro: OVR 70+ sorteret efter "værdi-effektivitet" (OVR i forhold til markedsværdi), så billige, brugbare spillere kommer først.
- **Kontrakt udløber** — kontrakt slutter i indeværende sæsonår, altså spillere du kan hente billigt eller gratis. 6.267 spillere har kontraktudløb i 2026.
- **Free agents** — spillere uden klub (89 i datasættet).

## Hvad du ser på hver spiller

Ud over det der vises i dag, tilføjer vi de tal listerne handler om:

- Vækstpotentiale (+X til potentiale)
- Pris pr. overall-point, så du kan se om han er dyr for sin kvalitet
- Frikøbsklausul hvis den findes (findes for 16.971 spillere)
- "+X vs. trup"-sammenligningen som i dag

## Sådan bruger du det

Vælg en liste, tilføj evt. position eller "inden for budget", og stjernemarkér de spillere du vil forfølge — de havner på din liste over transfermål som nu.

## Teknisk

- `src/lib/market.functions.ts`: nyt `preset`-felt i søge-input (`wonderkids`, `gems`, `bargains`, `expiring`, `free_agents`) der lægger de ekstra betingelser og sorteringer på forespørgslen server-side. Bargains/gems bruger et beregnet forhold mellem overall/potentiale og værdi, udtrykt via værdiintervaller på overall-niveau, så det kan køre som en almindelig indekseret forespørgsel.
- `src/routes/_authenticated/karrierer.$id.marked.tsx`: preset-knapper, visning af vækst, pris pr. OVR-point og frikøbsklausul i spillerkortet.
- Ingen databaseændringer og ingen eksterne kald — alt kører på `fc_players`, som allerede er indlæst.

## Om fifacm.com

Vi kopierer ikke deres data eller sider. Listerne bygges på det åbne EA FC 26-datasæt du selv uploadede. Hvis du vil, kan vi senere tilføje et "Se på fifacm"-link pr. spiller.

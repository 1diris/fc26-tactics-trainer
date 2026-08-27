# AI-vejledning til trup og taktik

Det sidste store punkt fra din oprindelige idé mangler: at AI'en faktisk giver dig råd. Alt grundlaget er på plads — trupdata, trupanalyse pr. position, formationer og den optimerede start-11 — så AI'en får rigtige tal at arbejde med i stedet for at gætte.

## Ny fane: Rådgiver

En ny fane i karriere-navigationen ved siden af Taktik. Du trykker "Lav ny rapport", og efter få sekunder får du en rapport i fire dele:

1. **Trupdom** — kort vurdering af klubbens niveau, aldersprofil og balance mellem stjerner og bænk.
2. **Startopstilling** — hvorfor den foreslåede 11'er ser ud som den gør, hvem der spiller ude af position, og hvad der vil løse det.
3. **Taktikforslag** — konkrete indstillinger (bredde, dybde, opbygning) der passer til truppens styrker, med begrundelse.
4. **Handlingsplan** — 3-5 prioriterede skridt: hvilke positioner du skal købe til, hvem du bør sælge eller forlænge, og hvilke unge spillere der er værd at spille op.

Hver rapport gemmes med dato og sæson, så du kan gå tilbage og se, hvad du blev anbefalet før du handlede.

## Sådan hænger det sammen med resten

- Handlingsplanens positionsforslag får en knap, der åbner Transfermarkedet med det behov forfiltreret — samme filtrering som "Trupanalyse" bruger i dag.
- Taktikforslaget får en knap, der lægger de foreslåede indstillinger direkte ind på Taktik-siden, så du kan gemme dem med et klik.
- Rapporten siger kun noget om data der findes. Mangler løn, kontrakt eller potentiale på en spiller, nævnes det som "ukendt" i stedet for at blive opfundet.

Alt på dansk, samme mørke stil som resten.

## Teknisk

- Ny tabel `ai_reports`: karriere, sæson, oprettet, modelnavn og rapporten som jsonb (sektioner + strukturerede forslag). Ejer-scoped RLS på `auth.uid()` med GRANT til `authenticated` og ALL til `service_role`.
- `src/lib/advisor.server.ts`: bygger en kompakt prompt ud fra `squad.ts`, `squad-needs.ts` og `lineup.ts` (trupliste, klubniveau, behov pr. position, bedste 11'er, budget) og kalder Lovable AI Gateway med samme opsætning som `ai-extract.server.ts`. Svar valideres med et Zod-skema, så UI aldrig får løs tekst.
- `src/lib/advisor.functions.ts`: `generateReport` og `listReports` som server functions med `requireSupabaseAuth`; kaldes fra komponenten via `useServerFn`, ikke fra en loader.
- Ny rute `src/routes/_authenticated/karrierer.$id.raadgiver.tsx` med egen `head()`, plus link i karriere-navigationen.
- Ingen ændringer i eksisterende trup-, taktik- eller markedslogik ud over de to genvejsknapper.

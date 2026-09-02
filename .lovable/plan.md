# Bedre Taktik-side

Taktik-siden virker, men føles statisk: banen er grå, spillere skiftes kun via en liste, og der er ingen vurdering af, om taktikken faktisk passer til truppen. Planen løfter både udseende, betjening og vejledning.

## 1. Banen ser ud som en rigtig bane

- Grøn bane med striber, straffesparksfelter, midtercirkel og målfelter i klubbens farvetoner.
- Større spillerkort: navn, OVR, position, rolle og en lille farvemarkering for pasform (naturlig / sekundær / ude af position).
- Tom plads vises tydeligt som "Tilføj spiller".
- Banen fylder mere på desktop og skalerer pænt på mobil.

## 2. Nemmere at stille holdet

- Træk og slip: flyt en spiller fra en plads til en anden, eller fra bænken ind på banen. Slipper du på en optaget plads, byttes de to spillere.
- Klik virker stadig som i dag (vælg plads → vælg spiller), så mobil ikke bliver værre.
- Fast bænke-panel ved siden af banen med de bedste spillere udenfor holdet, søgefelt og sortering, så man hurtigt finder en afløser.

## 3. Hold-overblik

- Linjevurdering: gennemsnitlig OVR for forsvar, midtbane og angreb vist ved siden af banen.
- Balance-indikatorer: alder i startopstillingen, antal spillere ude af position, antal pladser uden spiller.
- Rolle-advarsler samles ét sted under banen (som i dag), men med link direkte til den plads det gælder.

## 4. AI-vejledning til taktikken

Ny knap "Få AI-vejledning" analyserer den aktuelle trup + valgt formation og svarer på dansk med:

- Anbefalet formation ud fra spillerne du faktisk har.
- Forslag til roller og fokus pr. plads, hvor det nuværende valg er uheldigt.
- Forslag til holdindstillinger (opbygning, pres, forsvarslinje osv.) med kort begrundelse.
- Et "Anvend forslag"-valg, så AI'ens opstilling, roller og indstillinger kan indsættes med ét klik (kan altid ændres bagefter).

## 5. Gemte taktikker

- Mulighed for at gemme flere navngivne taktikker pr. karriere (fx "Hjemme – højt pres", "Ude – kontra") og skifte mellem dem.
- Nuværende gemte taktik bliver automatisk til "Standard", så intet går tabt.

## Teknisk

- `src/routes/_authenticated/karrierer.$id.taktik.tsx` deles op i komponenter: `PitchView`, `SlotCard`, `BenchPanel`, `TeamSummary`, `AiAdvicePanel` under `src/components/tactics/`.
- Drag & drop med HTML5 dnd-events (ingen nyt bibliotek); klik-flow bevares.
- Linje-/balanceberegninger lægges i `src/lib/lineup.ts` som rene funktioner.
- Ny serverfunktion `adviseTactics` i `src/lib/tactics.functions.ts` (Lovable AI, `google/gemini-3-flash`) med struktureret JSON-svar valideret med zod: `{ formation, slots: [{ position, playerName, role, focus, reason }], settings, summary }`.
- Flere taktikker: migration der tilføjer `name` (default `'Standard'`) på `tactics` og erstatter unik nøgle pr. `(career_id, season_id)` med `(career_id, season_id, name)`; `getTactic`/`saveTactic` udvides med navn, plus `listTactics` og `deleteTactic`. Grants og RLS følger eksisterende mønster for tabellen.
- Typecheck efter ændringerne.

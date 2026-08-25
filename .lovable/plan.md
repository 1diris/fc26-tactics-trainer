# FC 26 Karrieremode-assistent

Et dansk værktøj hvor du uploader screenshots fra din FC 26-karriere, får din trup læst automatisk ind, og derefter kan planlægge opstilling, taktik og udvikling med AI-vejledning.

## Sådan bruger du det

1. **Log ind** — opret konto med e-mail, så dine karrierer gemmes i skyen.
2. **Opret karriere** — klub, liga, sæson, formation.
3. **Upload screenshots** — af trupoversigt/spillerkort. AI læser navne, position, rating, alder, potentiale, foretrukken fod og kontraktår.
4. **Gennemse og ret** — de læste spillere vises i en tabel du kan rette i, før de gemmes.
5. **Trup** — sorter og filtrer på position, rating, alder, potentiale; se huller i truppen.
6. **Opstilling** — vælg formation, træk spillere ind på banen, gem flere opstillinger pr. karriere.
7. **Taktik** — indstil FC-taktikker (opbygning, pres, bredde, defensiv linje, spillerroller) og gem dem.
8. **AI-vejledning** — fire analyser: bedste startopstilling, taktikforslag, trup-analyse (svage positioner, alder, køb/salg) og udviklingsplan for talenter. Hvert svar vises som læsbar rapport og gemmes i karrierens historik.

## Sider

- `/` — forside med forklaring + log ind/opret
- `/karriere` — oversigt over dine karrierer
- `/karriere/$id` — trup, upload, opstilling, taktik, AI-råd i faner

## Design

Mørkt "broadcast"-look inspireret af fodbold-tv: dyb grøn/kul baggrund, skarp accentfarve til ratings, kondenseret display-font til navne og tal, tabeller og banevisning som fokus. Ingen generisk lilla gradient.

## Teknisk

- **Lovable Cloud** aktiveres: login (e-mail/password), database og fillager.
- Tabeller: `careers`, `players`, `lineups` (+ `lineup_slots`), `tactics`, `ai_reports`, `screenshot_imports`. RLS på alle: kun ejeren (`auth.uid()`) kan læse/skrive, plus GRANTs til `authenticated`/`service_role`.
- Privat storage-bucket `career-screenshots` med ejer-baseret RLS.
- Screenshot-læsning: server function der sender billedet til Lovable AI (`google/gemini-3.7-flash`, multimodal image-input) med et struktureret schema → returnerer spillerliste til godkendelse i UI.
- AI-vejledning: server functions der sender truppen + valgt formation/taktik som JSON til Lovable AI med struktureret output pr. analysetype. Fejl (fx opbrugte credits) vises tydeligt i UI'et.
- Alt AI-kald og nøgler bliver serverside; klienten kalder kun server functions.

## Forbehold

FC 26's egne save-filer er krypterede og kan ikke læses, så screenshot-læsning er vejen ind. AI'en kan læse forkert på uskarpe billeder — derfor kan du altid rette data manuelt før de gemmes.

## Første leverance

Login, karriere-oprettelse, screenshot-import med godkendelse, trupvisning og "bedste startopstilling"-AI. Derefter taktikeditor, opstillingseditor og de øvrige tre AI-analyser.

# FC Career Companion

Et eksternt management- og overbliksværktøj til FC 26 Career Mode. Appen er ikke forbundet til spillet: du spiller normalt, tager screenshots, uploader dem, og AI læser spillerdata ud, som du godkender og gemmer. Egen visuel identitet — ingen officielle logoer eller branding.

## MVP (denne leverance)

1. **Login** — e-mail/password, dine karrierer er private.
2. **Opret Career Mode** — navn, klub, liga, startsæson, transferbudget.
3. **Screenshot-import** (kernen) — upload et eller flere screenshots af trup/spillerkort. AI læser navn, position, OVR, alder, potentiale, værdi, løn, kontraktudløb, fod og synlige statistikker.
4. **Godkendelses-trin** — de udtrukne spillere vises i en redigerbar tabel med tydelig markering af usikre felter. Du retter og godkender, før noget gemmes. Kendte spillere matches mod truppen, så en ny upload opdaterer i stedet for at duplikere.
5. **Dashboard** — klub, nuværende sæson, antal spillere, gennemsnits-OVR, gennemsnitsalder, spillere i udvikling, spillere med faldende rating, kontrakter der snart udløber, transferbudget. Plus advarselskort: 🔴 manglende position, 🟡 kontraktudløb, 🟢 udvikling.
6. **Squad** — tabel over alle spillere med sortering og filtre på position, OVR, alder, potentiale, værdi, løn, kontrakt, form og udvikling.
7. **Spillerprofil** — alle sæson-snapshots for spilleren: OVR 72 → 76 → 80, alder, markedsværdi, med simpel udviklingsgraf.
8. **Sæsonhistorik** — flere sæsoner pr. karriere, skift aktiv sæson, se tidligere sæsoners trup.

## Senere faser (ikke i MVP)

- Taktik-builder: formation, spillere på banen, roller, flere gemte taktikker (Standard/Defensiv/Offensiv/Mod stærke hold/Mod svage hold)
- Transfer Planner med behovsrækker (position, behov, budget, aldersgrænse, prioritet) + Transfer Targets-liste
- Scouting/spillerforslag
- AI Career Assistant (chat der kun bruger dine gemte data): "Analyser min trup", "Hvem bør jeg sælge?", "Jeg har €60m — hvad bør jeg prioritere?"
- Kampe og resultater, avanceret statistik, flere grafer

## Sider

- `/` — forside: hvad appen gør + log ind/opret
- `/auth` — log ind / opret konto
- `/karrierer` — dine karrierer + opret ny
- `/karrierer/$id` — dashboard
- `/karrierer/$id/trup` — squad-tabel
- `/karrierer/$id/spiller/$playerId` — spillerprofil med historik og graf
- `/karrierer/$id/import` — screenshot-upload og godkendelse
- `/karrierer/$id/saesoner` — sæsonhistorik

## Design

Mørkt, moderne, dataorienteret management-dashboard: kul/grafit flader, én skarp accentfarve til nøgletal og advarselsfarver (rød/gul/grøn) til dashboard-kortene, kondenseret display-font til tal og navne, tætte men luftige tabeller. Fuldt brugbart på mobil (kort-visning af trup i stedet for bred tabel). Ingen generisk lilla gradient. Hele brugerfladen på dansk.

## Teknisk

- **Lovable Cloud** aktiveres: auth (e-mail/password), Postgres og privat fillager.
- Datamodel bygget til sammenligning på tværs af sæsoner fra dag ét:
  - `careers` — ejer, klub, liga, aktiv sæson, transferbudget
  - `seasons` — sæsoner pr. karriere
  - `players` — stabil spiller-identitet pr. karriere (navn, fod, primær position)
  - `player_snapshots` — én række pr. spiller pr. sæson med OVR, potentiale, alder, værdi, løn, kontraktudløb, form, statistik-JSON. Al udvikling og alle grafer læses herfra.
  - `screenshot_imports` — upload-status, rå AI-output, godkendt/afvist
  - Forberedt til senere: `tactics`, `transfer_needs`, `transfer_targets`, `matches`, `ai_reports`
- RLS på alle tabeller: kun ejeren (`auth.uid()`) kan læse/skrive, med GRANTs til `authenticated` og `service_role`.
- Privat storage-bucket `career-screenshots` med ejer-baseret RLS.
- AI-udtræk: server function der sender billedet til Lovable AI (`google/gemini-3.7-flash`, multimodal billed-input) med struktureret output-schema → returnerer spillerliste plus per-felt sikkerhed til godkendelsesskærmen. Fejl (fx opbrugte credits) vises tydeligt i UI'et.
- Al AI-kald og nøgler serverside; klienten kalder kun server functions.

## Forbehold

FC 26's egne save-filer er krypterede og kan ikke læses, så screenshot-import er vejen ind. AI'en kan læse forkert på uskarpe eller beskårne billeder — derfor er godkendelses-trinnet obligatorisk, og du kan altid rette data manuelt bagefter.

# FC IQ ind på karrierens Taktik-side

Den nye taktikbygger blev bygget som en selvstændig demo-side på `/fc-iq` uden link i menuen, og den bruger mockspillere. Derfor kan du ikke se den fra din karriere. Planen flytter FC IQ-designet ind på karrierens Taktik-side, så det kører på din rigtige trup og gemte taktik.

## Hvad du får

- Taktik-siden i karrieren får FC IQ-udseendet: mørkt gaming-tema, grøn 2D-bane med baneopmærkning og runde spillernoder med position, rolle og mastery-mærke.
- Klik på en node vælger pladsen; højre panel har faner:
  - Holdtaktik: formation, opbygning og forsvarsindstillinger (de eksisterende angreb/forsvar-indstillinger bevares).
  - Spillerrolle: vælg spiller til pladsen, rolle (kun roller der findes til positionen), fokus og rolle-mastery.
  - Eksport & kode: generér og kopiér en taktikkode, samt importfelt.
- Alt eksisterende bevares: formationsliste, "Foreslå opstilling", rolleadvarsler, gem/hent af taktik pr. sæson.
- Rolle-mastery gemmes sammen med rolle og fokus.
- `/fc-iq` bliver stående som selvstændig demo-side (uden menupunkt), så intet går tabt.

## Teknisk

- Genbrug UI'et fra `src/routes/fc-iq.tsx` som delte komponenter under `src/components/tactics/` (`PitchView`, `PlayerNode`, `TacticPanel`), og lad både `/fc-iq` og karrierens taktikside bruge dem.
- `src/routes/_authenticated/karrierer.$id.taktik.tsx` beholder sin data-loading (`getTactic`/`saveTactic`, trup fra career-queries) og bytter kun præsentationen ud; klik-flowet til at vælge spiller bevares.
- Roller kommer fortsat fra `src/lib/roles.ts` (ikke mock-listen), så danske rollenavne og fokus-begrænsninger bevares.
- `mastery` gemmes i `settings.roles[slotId]` i eksisterende jsonb — ingen migration; `saveTactic`-validatoren udvides med et valgfrit `mastery`-felt.
- Taktikkode kodes/afkodes ud fra formation + lineup-positioner + roller, så import faktisk kan gendanne en opstilling.
- Typecheck efter ændringerne.

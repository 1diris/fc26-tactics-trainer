# Ungdomsspillere fra screenshot-import direkte i Akademiet

I dag ender alle spillere fra en screenshot-import i førsteholdstruppen. Planen gør det muligt at uploade billeder af akademi-/ungdomsskærme, så de spillere i stedet registreres i Ungdomsakademiet.

## Sådan bliver flowet

1. Du uploader billeder som nu (op til 10 ad gangen).
2. AI læser også ungdomsspecifikke felter: potentiale som interval (fx "80 - 94") og udviklingsplan.
3. I gennemgangslisten får hver spiller en lille vælger: **Trup** eller **Akademi**.
   - Forslaget sættes automatisk til Akademi når spilleren ser ud som et talent: alder 14–19, eller potentialet er læst som et interval, eller billedet i sig selv er genkendt som en akademiskærm.
   - Du kan altid ændre valget pr. spiller, plus "Sæt alle til Akademi" / "Sæt alle til Trup" som hurtige handlinger.
4. Når du gemmer:
   - Trup-markerede spillere gemmes som i dag (fletning med eksisterende spillere, ingen dubletter).
   - Akademi-markerede spillere gemmes i Ungdomsakademiet med navn, position, alder, SML/OVR, potentiale min/max og plan (standard "Dynamisk").
   - Findes talentet allerede i akademiet (samme navn/position), opdateres det i stedet for at oprette en dublet — samme princip som opfølgende trup-imports.
5. Bekræftelsen viser hvor mange der gik til truppen og hvor mange til akademiet, med link til Akademi-siden.

## Teknisk

- `src/lib/ai-extract.server.ts`: udvid prompt og `ExtractedPlayer` med `potential_min`, `potential_max`, `plan` og `is_youth` (bool-hint fra billedet). Bevar eksisterende normalisering; interval som "80 - 94" parses til min/max, enkelt tal fylder begge.
- `src/lib/import-diff.ts` / import-siden: draft får `target: "squad" | "youth"` med auto-forslag ud fra alder, potentialeinterval og AI-hint. Diff-visningen gælder fortsat kun trup-drafts.
- `src/lib/youth.functions.ts`: ny `saveYouthPlayers` serverfunktion (auth-beskyttet) som tager en liste og upserter pr. karriere ved at matche på normaliseret navn (genbrug logikken fra `src/lib/player-matching.ts`); nul-felter fra AI overskriver ikke eksisterende værdier.
- `src/routes/_authenticated/karrierer.$id.import.tsx`: target-vælger pr. række, bulk-handlinger, opdelt gem-kald (`savePlayers` + `saveYouthPlayers`), invalidering af både karriere- og akademi-queries, opdateret toast.
- Ingen databaseændringer nødvendige — `youth_players` har allerede de felter der skal til.

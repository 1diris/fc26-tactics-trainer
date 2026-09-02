# Spillerportrætter på Taktik-siden

Portrætterne findes allerede på de matchede FC 26-spillere (`fc.face_url`) og bruges i Trup og Transfermarked. Taktik-siden viser i dag kun positionskoder i banens noder. Planen tager billederne med over.

## Hvad du får

- Banen: hver besat plads viser spillerens runde portræt i noden i stedet for positionskoden. Positionskoden flyttes til et lille mærke i hjørnet, så du stadig kan se pladsen.
- Tomme pladser ser ud som i dag (positionskode i en tom cirkel).
- Fit-farven (naturlig/ok/ude af position) bevares som ring rundt om portrættet, og mastery-mærket (+/++) bevares.
- Mangler et billede, vises spillerens initialer — samme fallback som i Trup.
- Bænk/spillervalg i højre panel får også en lille avatar foran navnet, så det er nemt at genkende spillerne.

Ingen ændringer i taktik-logik, roller, formationer, gem/hent eller taktikkode.

## Teknisk

- `PitchNode` udvides med `faceUrl: string | null` og `playerFullName`; taktik-siden sender `row.fc?.face_url` med.
- `src/components/tactics/pitch-view.tsx` renderer `PlayerAvatar` (størrelse `sm`) inde i noden med `overflow-hidden`, positionsbadge nederst/venstre og eksisterende fit-ring + mastery-badge ovenpå.
- Spiller-/bænkliste i `karrierer.$id.taktik.tsx` får `PlayerAvatar` foran navnet.
- Billederne går fortsat gennem den eksisterende `/api/public/player-face`-proxy via `PlayerAvatar`.
- Typecheck efter ændringerne.

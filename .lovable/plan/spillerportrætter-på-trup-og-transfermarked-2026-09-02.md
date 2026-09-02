# Spillerportrætter på Trup og Transfermarked

Vis et rundt ansigtsbillede yderst til venstre på hvert spillerkort/række, med pæn fallback når billedet mangler.

## Godt nyt om data
Alle 18.405 spillere i FC 26-databasen har allerede et portræt-link (sofifa-CDN, fx `.../players/019/541/26_120.png`). Der er derfor ikke brug for mock-billeder — Transfermarkedet kan vise ægte ansigter med det samme, og trupspillere viser deres ansigt så snart de er matchet med FC 26-databasen.

## Hvad der bygges

1. En fælles avatar-komponent (`PlayerAvatar`)
   - Rund (`rounded-full`), diskret kant og mørk placeholder-baggrund via temaets tokens.
   - Størrelser: `w-12 h-12` i lister, `w-14 h-14` hvor der er plads (spillerprofil/dialoger senere hvis ønsket).
   - Billedet loades "lazy" og med fast bredde/højde, så listen ikke hopper.
   - Fejler billedet (eller mangler det), vises spillerens initialer centreret i cirklen — fx "TA" for "T. Alexander-Arnold".

2. Transfermarked
   - Avatar indsættes yderst til venstre i markedskortet, før OVR/POT-blokken, i samme flex-række.

3. Trup
   - Mobilkortene: avatar til venstre for navn/position.
   - Desktop-tabellen: lille avatar inde i "Spiller"-cellen foran navnet, så kolonnerne bevares uændret.
   - Kilde: portrættet fra den matchede FC 26-spiller; ellers initialer.

Ingen ændringer i filtre, sortering, salg, matching eller anden funktionalitet.

## Teknisk

- Ny komponent `src/components/player-avatar.tsx` med props `name`, `src`, `size`.
- `face_url` er allerede med i markedets og karrierens select-lister og i `FcOriginal`, så ingen databaseændringer eller nye queries.
- Initial-udtræk: første bogstav i første og sidste navneled, versaler.
- Styling bruger eksisterende design-tokens (`border-border`, `bg-muted`, `text-muted-foreground`) i stedet for hårdkodede zinc-farver, så mørkt tema forbliver konsistent.

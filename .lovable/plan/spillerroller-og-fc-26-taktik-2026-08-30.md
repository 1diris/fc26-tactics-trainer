# Spillerroller og FC 26-taktik

Taktik-siden får FC 26's opbygning: hver plads i formationen kan få en rolle og et fokus, og holdtaktikken deles i angreb/forsvar med spillets egne valg.

## Spillerroller (pr. plads)

- Hver plads får en rolle-liste der kun indeholder roller, der findes til den position, fx:
  - GK: Målmand, Sweeper Keeper
  - RB/LB: Forsvarende back, Balanceret, Angribende back, Falsk back
  - RWB/LWB: Balanceret, Angribende, Wing Back
  - CB: Forsvarer, Stopper, Ball-Playing
  - CDM: Holding, Centre-Half, Deep-Lying Playmaker
  - CM: Box-to-Box, Holding, Deep-Lying Playmaker, Playmaker, Half Winger
  - CAM: Playmaker, Half Winger, Shadow Striker, Classic 10
  - RM/LM: Balanceret, Winger, Wide Midfielder, Inside Forward
  - RW/LW: Winger, Inside Forward, Inverted Winger, Wide Playmaker
  - CF: Falsk 9, Shadow Striker, Klassisk 9
  - ST: Advanced Forward, Poacher, Målmaskine, Komplet angriber, Target Forward
- Hver rolle kan sættes til et fokus: Forsvar / Balanceret / Angreb (kun de fokusvarianter rollen understøtter).
- Rollen vises på banen under spillerens navn, så man hurtigt kan overføre den til spillet.
- Skifter man formation eller position, nulstilles rollen til positionens standardrolle.
- En kort forklaring pr. rolle (tooltip/hjælpetekst) beskriver, hvad rollen gør på banen.

## Holdtaktik (FC 26-struktur)

To faner i stedet for én liste:

- Angreb: Opbygning (Balanceret / Kort spil / Langt spil / Kontraangreb), Chanceskabelse (Balanceret / Direkte / Kombinationsspil / Kant-fokus), Bredde, Spillere i feltet, Hjørnespark, Frispark.
- Forsvar: Forsvarsstil (Balanceret / Dybt / Aggressivt pres / Højt pres), Bredde, Forsvarslinjens højde, Aggression i pres.

Tallene (bredde, dybde, aggression) sættes med skydere 1-10 som i spillet; de øvrige er valglister.

## Gemning og advarsler

- Roller, fokus og de nye indstillinger gemmes sammen med taktikken pr. sæson — nuværende gemte taktikker fortsætter med at virke og får blot standardroller.
- Advarsel hvis en plads har en rolle, som spilleren er dårligt egnet til (fx en langsom back som Angribende back), vist som en blød hint-tekst under banen.
- "Foreslå opstilling" foreslår også en passende standardrolle pr. plads.

## Teknisk

- Ny `src/lib/roles.ts`: rolle-katalog pr. position (`{ id, label, focuses, description }`), standardrolle pr. position og hjælpere til validering/oprydning ved formationsskift.
- `src/lib/formations.ts`: erstat `TACTIC_SETTINGS` med en grupperet struktur (`ATTACK_SETTINGS`, `DEFENCE_SETTINGS`) med felttype `select` eller `slider` (min/max/step) og opdater `defaultSettings()` bagudkompatibelt.
- `tactics.settings` (jsonb) udvides til at kunne rumme tal-værdier: input-validator i `src/lib/tactics.functions.ts` ændres til `z.record(z.union([z.string(), z.number()]))`; roller gemmes i et nyt felt i samme jsonb, fx `settings.roles` eller nyt `roles`-objekt i `lineup`-payload — ingen migration nødvendig, da felterne er jsonb.
- `src/routes/_authenticated/karrierer.$id.taktik.tsx`: rolle- og fokusvælger i slot-panelet, rollevisning på banen, faner for angreb/forsvar med Slider-komponent, og rolle-hints.
- `src/lib/lineup.ts`: `suggestLineup` returnerer også en standardrolle pr. plads.
- Typecheck efter ændringerne.

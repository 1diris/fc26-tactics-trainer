# Ny navigation i karrieren

Menuen i karrieren bygges om, så den matcher det viste design: en ren tekst-menu på computer med grøn streg under den aktive fane, og en fast bundmenu med ikon over tekst på mobil.

## Sådan bliver det

Desktop (skjult på mobil):
- Fanerne Overview, Squad, Tactics, Academy, Transfers, Import i én række.
- Aktiv fane: hvid tekst med en grøn streg nedenunder. Ingen baggrundsfarve.
- Inaktiv: dæmpet grå tekst, lysere ved museover.
- Tynd linje under hele menuen, mørk næsten sort baggrund.

Mobil (skjult på desktop):
- Fast bundmenu i 6 lige kolonner med ikon øverst og lille tekst nedenunder.
- Aktiv = grøn, inaktiv = mørkegrå.
- Ekstra bundplads, så menuen ikke ligger oven på iPhones hjemme-indikator.
- Indholdet får plads i bunden, så bundmenuen ikke dækker noget.

Navigation sker fortsat via appens rigtige sider (adresselinjen skifter, links kan deles og genindlæses) — ikke via en intern faneskifter, så alle nuværende sider virker uændret.

Etiketterne skiftes til engelsk som i designet (Overview, Squad, Tactics, Academy, Transfers, Import). Sig til, hvis de skal blive på dansk.

## Teknisk

- Ændringer kun i `src/routes/_authenticated/karrierer.$id.tsx` (menuen) — ingen ændring af sider, data eller backend.
- `NAV_ITEMS`-liste med `to`, `label`, `icon`; ikoner fra `lucide-react` (LayoutGrid, Users, Shield/Target, Star, ArrowLeftRight, Upload), plus en lille egen SVG til Squad hvis ønsket.
- Aktiv tilstand kommer fra routerens `data-[status=active]` / `activeOptions.exact`, ikke `useState`.
- Desktop: `hidden sm:flex` række med `relative px-4 py-3 text-sm`, aktiv får `absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-t-full` — via semantiske tokens hvor de findes.
- Mobil: `fixed bottom-0 grid grid-cols-6 border-t bg-black/90 backdrop-blur-md sm:hidden` med `style={{ paddingBottom: "env(safe-area-inset-bottom)" }}`; `<main>` får ekstra `pb` på mobil.
- Typecheck efter ændringen.

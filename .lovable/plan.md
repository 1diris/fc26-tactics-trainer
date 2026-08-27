# Ensartede positionsnavne (kun FC-koder)

I dag blandes engelske FC-koder (GK, CB, ST) med danske navne (Målmand, Midterforsvar, Højre kant), fordi flere sider viser `POSITION_LABELS`. Det ensrettes til kun koder.

## Hvad ændres

- Positioner vises altid som FC-koder: GK, RB, RWB, CB, LB, LWB, CDM, CM, CAM, RM, LM, RW, LW, CF, ST.
- Danske ord bruges kun til grupper i filtre og dashboard-optælling: Målmand, Forsvar, Midtbane, Angreb.
- Taktik-siden: banepositioner, spillervælger-overskrift og tooltips viser koden alene (fx "Vælg spiller til CB").
- Trupanalyse og advarsler skriver koden: "Du har ingen naturlig spiller på CB", "Kun én naturlig CB i truppen".
- Spillerprofil viser koden (og gruppen som sekundær tekst i stedet for det danske positionsnavn).
- Taktik-indstillinger beholder deres danske labels (Forsvarsstil, Forsvarslinje osv.) — de er ikke positioner.

## Teknisk

- `src/lib/football.ts`: fjern brugen af `POSITION_LABELS` som visningsnavn (behold evt. som ren kommentar/tooltip-fri), så koden er den eneste kilde.
- Opdater visningssteder: `src/lib/squad.ts` (advarselstekster), `src/lib/squad-needs.ts` (`label` = position-koden), `src/routes/_authenticated/karrierer.$id.taktik.tsx`, `src/routes/_authenticated/karrierer.$id.spiller.$playerId.tsx`.
- Ingen ændringer i datamodel, import-logik eller filtreringslogik — kun labels/visning.
- Typecheck efter ændringerne.

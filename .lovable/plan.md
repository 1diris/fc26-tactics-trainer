# Ungdomsakademi i EA FC Career Mode-stil

Ny side "Akademi" i karrieren, hvor du styrer dine ungdomstalenter i et layout, der efterligner spillets akademi-menu.

## Sådan ser den ud

- Dyb mørkelilla gradient-baggrund med svage taktiske linjer, skarp hvid tekst og dæmpede lyslilla kolonneheadere.
- Undertabs i toppen: "Akademi" | "Ungdomshold" (aktiv) | "Udvikling", med diskret [L2]/[R2]-hint.
- Knappen "+ Tilføj talent" øverst til højre.
- Rækkeliste med kolonnerne: Pos (fed, venstre) · Portræt (rundt billede, ellers silhuet/initialer) · Navn (J. Pineau) · År · SML med ▼ i header · POT som interval "80 - 94" · Plan.
- Den markerede række får en tydelig hvid/lilla afrundet ramme som controller-markøren; piletaster op/ned og klik flytter markøren.
- Bundbjælke: "(X) Vis handlinger", "(O) Tilbage", "(◻) Sortér" (skifter mellem SML, POT og Alder).

## Handlinger

- (X) åbner menu med "Forfrem til førstehold" og "Frigiv".
- Forfrem opretter talentet som spiller i truppen (position, alder, OVR, POT på den aktive sæson) og fjerner ham fra akademiet.
- Frigiv sletter talentet efter bekræftelse.
- "+ Tilføj talent": billed-upload fra enheden (gemmes som base64), Position (dropdown med FC-koder), Navn, Alder 14-19, SML, Potentiale min/max, Udviklingsplan (standard "Dynamisk"). Gemmes i din backend, så listen følger karrieren på alle enheder.

## Teknisk

- Migration: ny tabel `public.youth_players` (id, career_id, user_id, name, position, age, overall, potential_min, potential_max, plan default 'Dynamisk', photo_data_url text, created_at/updated_at) med GRANT til `authenticated`/`service_role`, RLS slået til og ejer-policy `auth.uid() = user_id`, samt indeks på `career_id`.
- Nye serverfunktioner i `src/lib/youth.functions.ts` med `requireSupabaseAuth`: `listYouthPlayers`, `createYouthPlayer`, `deleteYouthPlayer`, `promoteYouthPlayer` (opretter `players` + `player_snapshots` for aktiv sæson, sletter derefter talentet).
- Ny route `src/routes/_authenticated/karrierer.$id.akademi.tsx` med egen `head()`-metadata; "Akademi" tilføjes i fanerækken i `karrierer.$id.tsx`.
- Akademi-tema holdes lokalt i den nye side (gradient + tokens via arbitrary values), så resten af appens designsystem er uændret. Portrætter genbruger `PlayerAvatar` med base64-kilde og initial-fallback.
- Ingen ændringer i trup-, taktik- eller markedslogik ud over at forfremmelse indsætter en spiller.

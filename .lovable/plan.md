# Spillerdatabase til køb-søgning

## Om kilden

Der findes ingen hjemmeside med et åbent API over alle FC 26-spillere. SoFIFA og FUTBIN tillader ikke automatisk hentning, og EA har intet offentligt endpoint. Den realistiske vej er det datasæt du allerede er i gang med: Kaggle "EAFC26 Player Database", som har præcis de kolonner din upload viste (ID, Rank, Name, GENDER, OVR, PAC, SHO, PAS, DRI, DEF, PHY + alle detaljerede attributter). Kaggle kræver login, så filen skal downloades af dig og uploades her én gang — derefter ligger hele databasen i appen og skal ikke hentes igen.

Din nuværende upload var tom (kun overskriftsrækken, 124 blanke rækker), så den skal hentes igen — vælg "men"-filen med alle kolonner, ikke en beskåret udgave.

## Positioner

Datasættet har ikke en positionskolonne. Positionen udregnes derfor af appen ud fra attributterne og vises som **anslået** rolletype: Målmand, Midterforsvar, Back, Defensiv midt, Central midt, Offensiv midt, Kant, Angriber. Med de detaljerede attributter (Interceptions, Standing Tackle, Sliding Tackle, Positioning, Finishing, Crossing, GK-stats osv.) bliver gættet ret præcist, og du kan altid rette positionen manuelt på en spiller.

## Sådan bliver det brugt

1. **Ny side "Spillerdatabase"** i karriere-navigationen.
2. **Engangs-import**: du uploader CSV'en, appen viser hvor mange spillere den læste, og gemmer dem. Ny upload opdaterer i stedet for at duplikere.
3. **Søgning**: fritekst på navn, anslået position, OVR-interval og minimumskrav på hovedstats. Sortering på OVR og stats.
4. **Sammenlign med din trup**: hver spiller vises med forskellen til din bedste spiller i samme positionsgruppe, så du ser om det er en opgradering.
5. **Transfermål**: markér en spiller som mål for karrieren med prioritet og note; egen liste med dine mål.

## Teknisk

- Ny tabel `player_pool`: ejer, ekstern id, navn, køn, rank, ovr, hovedstats, udvalgte detailattributter i JSONB, `derived_position`, `position_override`. RLS scoped til `auth.uid()`, GRANTs til `authenticated` og `service_role`, unikt indeks på (user_id, ekstern id).
- Ny tabel `transfer_targets`: karriere, reference til pool-spiller, prioritet, forventet pris, note. Samme RLS-mønster.
- CSV læses i browseren og sendes til en server function i batches (ca. 500 rækker) med upsert, så en fil med titusinder af rækker ikke timeouter. Fremdrift vises undervejs.
- Positionsudledning som ren funktion i `src/lib/position-inference.ts`, brugt både ved import og visning, med enhedstest på kendte profiler.
- Søgning og sortering kører serverside med filtre som parametre, så store datasæt forbliver hurtige.

# Værdi på alle spillere

28 af 55 trupspillere er matchet med FC 26-databasen. De øvrige 27 viser "–" i både POT og Værdi. Jeg har undersøgt databasen, og der er tre uafhængige årsager.

## Hvad der faktisk er galt

1. **Accenter i FC 26-databasen er ødelagte.** Navnene blev indlæst med forkert tegnsæt: "Traoré" ligger som "TraorÃ©", "Ceballos Fernández" som "Ceballos FernÃ¡ndez". Derfor kan spillere som B. Traoré, T. Fernández, M. Jedlička og E. Højlund aldrig matche på navn.
2. **Dine egne screenshotdata indeholder ingen værdi og intet potentiale.** Alle 55 snapshots har tom `market_value` og tom `potential`. Derfor findes der ingen reserveværdi at falde tilbage på — resultatet bliver "–" i det sekund, et FC-match mangler.
3. **Nogle spillere findes slet ikke i FC 26-databasen.** Ungdoms- og regen-spillere (fx Luca Podlech, Nick Werner, A. Pond, Zai) er skabt i dit spil og har aldrig et rigtigt kort. De kan aldrig matches — de skal have værdi på anden vis.

## Løsning i tre trin

### 1. Ret de ødelagte navne i FC 26-databasen
En datamigration retter tegnsættet i `short_name`, `long_name`, `club_name`, `league_name` og `nationality_name`, så "TraorÃ©" bliver "Traoré". Det gør både auto-match og søgningen på Transfermarkedet mere præcis.

### 2. Bedre auto-match
Auto-matchet søger på efternavn uden accenter og vælger klogere blandt flere kandidater i denne rækkefølge:
- naturlig position skal overlappe spillerens position
- alder inden for ±2 år (når alderen kendes)
- tættest på spillerens nuværende OVR

Er der stadig flere lige gode kandidater, matches der ikke automatisk — så beholder du "Match"-knappen. Fornavne-initialer ("B. Traoré") accepteres kun, når initialen passer.

### 3. Værdi til alle — også dem uden FC-kort
Værdimodellen får en fallback, så en spiller altid får en estimeret værdi:
- Har spilleren FC 26-data: som i dag (original værdi justeret for OVR-udvikling, alder, potentiale og position).
- Har spilleren **ikke** FC-data: værdien beregnes ud fra en OVR-baseret grundkurve (eksponentielt stigende værdi pr. OVR-point, kalibreret mod de rigtige FC 26-værdier for samme OVR-niveau) og justeres derefter for alder og position — samme faktorer som i dag.
- POT: uden FC-match vises fortsat "–", da et potentiale ikke kan gættes. Kolonnen "Værdi (est.)" bliver derimod aldrig tom.

Trup, Overblik, spillerprofil og trupanalyse bruger den samme funktion, så tallene stemmer overalt. Ikke-matchede spillere beholder markeringen "Ikke matchet med FC 26", så det er tydeligt, at værdien er et rent modelestimat.

## Teknisk

- Datamigration: `UPDATE public.fc_players` med `convert_from(convert_to(col,'LATIN1'),'UTF8')`-oprydning på tekstkolonnerne, kun for rækker der indeholder mojibake-mønstre.
- `src/lib/valuation.ts`: ny intern `baselineValue(overall)` (kalibreret tabel/eksponentiel kurve, afledt af medianværdier pr. OVR i `fc_players`); `estimateCareerValue` bruger den, når `fc` mangler, i stedet for at returnere `snapshotValue ?? null`.
- `src/lib/fc-match.functions.ts`: normaliser accenter i både forespørgsel og kandidatnavne via `playerKey`, initial-tjek på fornavn, og scoring af kandidater på position/alder/OVR før valg; behold "kun entydigt match gemmes".
- Ingen ændringer i `players`/`player_snapshots`-skema. Enhedstests for `estimateCareerValue` uden FC-data (ung 74 OVR, 35-årig GK 79 OVR).

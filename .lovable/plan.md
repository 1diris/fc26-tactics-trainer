# Spillerbilleder følger med fra screenshot-import

I dag gemmes talenter fra en screenshot-import uden portræt, så akademilisten viser silhuet/initialer. Planen tager billederne med fra selve screenshottet.

## Sådan bliver det

1. Når AI læser et screenshot, angiver den også hvor hver spillers portræt/ansigt sidder i billedet (en lille ramme med relative koordinater).
2. Importsiden klipper det udsnit ud af det billede du selv uploadede, laver et lille kvadratisk portræt og viser det i gennemgangslisten ved siden af navnet — så du kan se med det samme om det ramte rigtigt.
3. Når du gemmer:
   - Akademi-markerede spillere gemmes med portrættet i `photo_data_url`, så Ungdomsakademiet viser rigtige billeder.
   - Trup-markerede spillere beholder nuværende adfærd: portræt hentes fra FC 26-databasen når spilleren er matchet (uændret).
4. Klipper AI ved siden af, eller er der ikke noget ansigt i billedet (fx en ren tabelvisning), falder visningen tilbage til initialer som nu. Ingen import fejler af den grund.
5. Ved opfølgende import overskrives et eksisterende portræt kun hvis det nye screenshot faktisk gav et billede.

## Teknisk

- `src/lib/ai-extract.server.ts`: prompt og `ExtractedPlayer` udvides med `face_box` som `{x, y, w, h}` i 0–1 (null hvis intet portræt er synligt). Normalisering klamper værdier til gyldigt interval og kasserer alt for små/store bokse.
- `src/routes/_authenticated/karrierer.$id.import.tsx`: efter analyse af hver fil laves crop klientside via `createImageBitmap` + `<canvas>` (ca. 128×128 px, JPEG kvalitet ~0.8) fra den `File` der allerede ligger i hukommelsen; resultatet gemmes som `photo_data_url` på draftet. Cropping sker i en try/catch — fejl giver blot intet billede.
- Draft-typen får `photo_data_url?: string | null`. Sessionstorage-persistering beholdes, men billeder udelades af det gemte objekt for at holde `sessionStorage` under kvoten (billederne genskabes ikke ved reload — draftet vises da uden portræt).
- Gennemgangstabellen får en billedkolonne, der genbruger `src/components/player-avatar.tsx` med `src={draft.photo_data_url}`.
- `src/lib/youth.functions.ts`: `youthImportRow` får `photoDataUrl` (nullable, maks-længde som i `youthInput`); insert sætter feltet, update sætter det kun når der er en ny værdi (`player.photoDataUrl ?? current.photo_data_url`).
- Ingen databaseændringer — `youth_players.photo_data_url` findes allerede.

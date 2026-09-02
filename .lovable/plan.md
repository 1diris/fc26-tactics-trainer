# Spillerbilleder vises ikke — årsag og løsning

## Hvad der er galt

Portrætterne er der i databasen (alle 18.405 FC 26-spillere har et link), men billedudbyderen blokerer forespørgsler, der kommer direkte fra vores app: linket svarer med "403 Forbidden". Derfor falder avataren altid tilbage til initialer.

Bekræftet ved test: samme billedlink svarer 200 OK, når forespørgslen sendes med en henvisning fra billedudbyderens eget site — ellers 403.

## Løsning

Vi henter billedet gennem vores egen server i stedet for direkte i browseren:

1. Nyt billed-endpoint på vores egen adresse, der henter portrættet på serveren med de rigtige headers og sender det videre til browseren.
2. Kun godkendte billed-links (udbyderens CDN) må hentes, så endpointet ikke kan misbruges som åben proxy.
3. Svaret caches længe (uændrede portrætter), så listerne loader hurtigt og vi ikke belaster udbyderen.
4. `PlayerAvatar` peger på det nye endpoint i stedet for det rå link; initial-fallback bevares uændret, hvis et billede mangler eller fejler.

Ingen ændringer i data, filtre, sortering eller anden funktionalitet — kun billedvisningen.

## Teknisk

- Ny server-route `src/routes/api/public/player-face.ts` (GET, `?u=<url>`): validerer at værten er `cdn.sofifa.net`, `fetch`er med `Referer: https://sofifa.com/` + browser-`User-Agent`, streamer svaret videre med `Content-Type: image/png` og `Cache-Control: public, max-age=31536000, immutable`. Ikke-godkendt vært eller fejl → 404.
- `src/components/player-avatar.tsx`: bygger `src` som `/api/public/player-face?u=${encodeURIComponent(src)}` når kilden er et eksternt CDN-link; lokale/relative links bruges uændret.
- Ingen databaseændringer.

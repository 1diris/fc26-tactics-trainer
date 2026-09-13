# Udgiv de nyeste ændringer til den publicerede side

## Problemet
Den publicerede side (careerchronicles.app / fc26-tactics-trainer.lovable.app) viser kun den version, der senest er udgivet. De nyeste ændringer — login-layoutet, iPhone safe-area i bundmenuen og hastighedsforbedringerne — ligger i previewen, men er ikke udgivet endnu. Derfor kan du ikke se dem på den publicerede side.

## Løsning
1. Udgiv (publish) projektet, så den publicerede side opdateres med alle de seneste ændringer:
   - Nyt login-layout med "Forgot password?" under password-feltet
   - iPhone safe-area i bundmenuen
   - Hastighedsforbedringer (hurtigere åbning)
2. Efter udgivelse: genindlæs den publicerede side (hård refresh på telefonen: luk fanen og åbn igen).

## Vigtigt at vide
- Safe-area-luften i bundmenuen er kun synlig på en rigtig iPhone med hjemme-indikator — på computer er indsatsen 0 px, så den ændring kan ikke ses der.
- Hvis du bruger appen fra hjemmeskærmen på iPhone, skal genvejen slettes og tilføjes igen fra Safari for at hente den nye version helt rent.
- Ingen kodeændringer i denne plan — kun udgivelse af det, der allerede er lavet.

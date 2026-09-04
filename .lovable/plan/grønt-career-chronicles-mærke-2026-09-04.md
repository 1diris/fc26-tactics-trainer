# Grønt Career Chronicles-mærke

Skærmbilledet viser et grønt cirkel-/måne-mærke til venstre for navnet "Career Chronicles". Det mærke findes ikke i appen i dag — toppen viser kun teksten. Planen tilføjer det.

## Sådan ser det ud

- Et grønt mærke: en åben ring/halvmåne der former et "C", i samme grønne accentfarve som resten af oversigten, på mørk baggrund.
- Placeres til venstre for teksten "Career Chronicles" i toppen af alle sider, med lidt luft imellem.
- Samme mærke bruges på login-siden og som fane-ikon i browseren.
- Mærket er også et link tilbage til karriere-oversigten, ligesom navnet er i dag.

## Sådan bygges det

1. Generér mærket som et grønt monogram med gennemsigtig baggrund og gem det som projektbillede.
2. Vis billedet i den fælles topbjælke (`src/components/app-header.tsx`) ved siden af navnet, i fast lille størrelse, med alt-tekst "Career Chronicles".
3. Brug samme billede på login-siden over overskriften.
4. Læg en nedskaleret kvadratisk kopi i `public/favicon.png`, peg fane-ikonet i `src/routes/__root.tsx` på den, og fjern den gamle `public/favicon.ico`.

Ingen ændringer i data, navigation, import, trup, taktik, akademi eller marked.

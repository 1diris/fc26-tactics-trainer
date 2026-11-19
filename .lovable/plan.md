# Fjern spillere, der ikke længere er med i importen

## Hvad du får
Når du har uploadet screenshots og ser gennemgangen, viser importen en ny boks: **"Not in this upload"**. Den lister de spillere i din nuværende trup, som ikke blev fundet i de nye billeder (fx solgt, udlånt eller frigivet).

- Hver spiller har et flueben. Du vælger selv, hvem der skal fjernes — så en spiller, der bare ikke kom med på et billede, ikke forsvinder ved en fejl.
- Knap: "Select all" / "Clear".
- Når du gemmer importen, fjernes de valgte spillere fra truppen for denne sæson.
- Deres historik fra tidligere sæsoner bevares, så spillerprofiler og udvikling ikke går tabt.
- Akademispillere berøres ikke.

## Teknisk
- Import-siden sammenligner de gennemgåede rækker med truppens nuværende spillere via den eksisterende `findMatchingPlayerIndex`-logik og viser de umatchede.
- `savePlayers` får et valgfrit felt `removePlayerIds: uuid[]`. Efter gem slettes disse spilleres `player_snapshots` for den aktuelle sæson (kun egne rækker, RLS gælder). Spillerrækken og ældre snapshots beholdes.
- Ingen databaseændringer. Lille test for "umatchede spillere"-funktionen.

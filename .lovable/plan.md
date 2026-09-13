# Opdateret login-layout

Ombyg `src/routes/auth.tsx`, så login-siden følger den ønskede rækkefølge og visuelle hierarki. Funktionaliteten (email/password-login, Google-login, skift mellem login/signup) bevares.

## Visuelle ændringer

- Centrér CC-logoet og "Career Chronicles" horisontalt øverst.
- Logoet står over navnet med lille afstand.
- Navnet vises centreret og diskret under logoet.

## Ny rækkefølge på login-flowet

1. CC-logo + "Career Chronicles" (centreret).
2. "Welcome back" + kort undertekst.
3. Email-felt.
4. Password-felt med "Forgot password?" til højre.
5. Grøn fuldbredde "Sign in"-knap.
6. Divider med teksten "or".
7. Google-knap: "Continue with Google".
8. Nederst: "New to Career Chronicles? Create account".

## Tekniske detaljer

- Fjern Google-knappen fra toppen af formularen.
- Email/password er primær loginmetode; Google er sekundær under "Sign in".
- Behold eksisterende formularhåndtering, validering og `mode`-skift mellem login/signup.
- "Forgot password?" vises som et link uden at ændre den nuværende adgangskodegendannelseslogik (hvis den findes; ellers vises den som inaktiv/placeholder indtil funktionalitet tilføjes).
- "Create account" skifter stadig til signup-mode.
- Ingen ændringer i backend, routing, auth-middleware eller andre sider.

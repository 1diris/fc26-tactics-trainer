# Logoet som ægte SVG-mærke

Nu er logoet et billede (PNG). Det udskiftes med den rigtige tegning: to grønne buer tegnet som streger, præcis som specifikationen du sendte.

## Hvad der laves

1. Nyt logo-element `src/components/brand-logo.tsx`
   - To bue-streger i 32x32-felt, farve #22c55e, stregtykkelse 2,2, runde ender.
   - Anden bue forskudt 6 px til højre med 55 % gennemsigtighed.
   - Størrelsen kan sættes frit (standard 28 px), så det skalerer skarpt overalt.
2. Bruges i toppen af appen (`src/components/app-header.tsx`) og på login-siden (`src/routes/auth.tsx`) i stedet for billedet.
3. Browser-ikonet (favicon) laves om, så det bygger på samme tegning i stedet for det gamle billede.
4. Det gamle billede `src/assets/logo-mark.png` slettes, når intet peger på det længere.

## Teknisk

- Inline SVG-komponent med `viewBox="0 0 32 32"`, `fill="none"`, to `<path>` med `d="M20 9 A8 8 0 1 0 20 23"` og `d="M26 9 A8 8 0 1 0 26 23"`, `stroke-linecap="round"`.
- Favicon genereres som PNG fra samme SVG og lægges i `public/favicon.png` (allerede refereret i roden).

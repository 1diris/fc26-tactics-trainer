# Full English app with FC 26 terminology

The whole app switches to English, using official FC 26 wording everywhere. No Danish text anywhere — headings, buttons, labels, placeholders, empty states, error messages, toasts and dialog texts.

## Pages that get translated

- Landing page and login/sign up ("Log in", "Log out", "Sign up")
- Careers list and career header (season picker: "Active season")
- Overview / dashboard (KPI labels, alerts, recommendations)
- Squad: column headers PLAYER · POS · OVR · POT · AGE · VALUE · WAGE · CONTRACT · STATUS, filters, "Search players...", "Auto-match squad", "View player", player detail panel ("Growth", "Match player")
- Transfers: "Value", "Wage", "Contract expiry", "Free agent", "Loan", "Release clause", "Add to shortlist"
- Academy: "Youth academy", "Wonderkid", "Growth", "Max potential", "+ Add talent", promote/release dialogs
- Tactics: "Formation", "Build-up play", "Chance creation", "Defensive approach", "Width", "Players in box", "Corners", "Free kicks", "Suggest lineup", "Save tactics", "Export tactics", plus player role names in English ("Winger", "Advanced Forward", "Playmaker", "Ball-playing CB", "Holding mid" style)
- Import: "Upload screenshots", "Last updated: [date]", status texts, squad vs academy choices

## Terminology rules applied

- Player attributes: OVR, POT, PAC, SHO, PAS, DRI, DEF, PHY; positions GK, CB, RB, LB, RWB, LWB, CDM, CM, CAM, RM, LM, RW, LW, ST, CF
- Player groups for filtering: Goalkeepers, Defenders, Midfielders, Attackers
- Status: "✓ Matched" / "! Unmatched", "Expiring" (contract under 6 months), "On loan"
- Navigation stays Overview · Squad · Tactics · Academy · Transfers · Import (already English)

## Technical

- Translate user-facing strings in place across `src/routes/**`, `src/components/**` and the label maps in `src/lib/roles.ts`, `src/lib/formations.ts`, `src/lib/squad.ts`, `src/lib/squad-needs.ts`, `src/lib/lineup.ts`, `src/lib/import-diff.ts`, `src/lib/football.ts`.
- Role names in `src/lib/roles.ts` get English FC 26 names; stored role ids/keys stay unchanged so existing saved tactics keep working.
- Server-side messages returned to the UI (`career.functions.ts`, `market.functions.ts`, `fc-match.functions.ts`, `import.functions.ts`, `youth.functions.ts`, `tactics.functions.ts`) become English; AI prompts in `ai-extract.server.ts` and tactics advice switch to English output.
- Route URLs (`/karrierer/...`, `/trup`, `/taktik`, `/akademi`, `/marked`) stay as they are, so no links or bookmarks break. Say the word if you also want English URLs.
- Page titles/descriptions in each route `head()` become English.
- No database or schema changes. Typecheck after the changes.

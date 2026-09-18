# New landing page

The front page still shows the old layout in both the preview and on careerchronicles.app. The earlier change only moved the dark colours onto the front page — it did not rebuild the page itself. This plan builds the new front page from your reference image.

## What you will see

A single dark front page, no boxes-in-a-grid look:

- Small green label at the top: FOR FC 26 CAREER MODE
- Large headline in two lines, the second line in neon green:
  "Manage your career. **Outside the game.**"
- One short paragraph explaining screenshots in, squad data out
- One bright green "Get started" button, plus a quiet "Log in" link beside it
- Below that, four slim feature rows (icon, title, one line of text) instead of the current cards
- A thin footer line with the logo and the name

Everything stays dark (near-black background, light text, green accents), headings in the condensed display font already used across the app. The rest of the app keeps its current look.

## Behaviour

- Signed out: buttons lead to the sign-in page
- Signed in: the main button leads straight to My careers
- Mobile first: headline and spacing scale down, button is full width on narrow screens

## Technical notes

- Rewrite `src/routes/index.tsx` only; keep the existing `landing-dark` wrapper class and the session check that decides where the buttons point.
- Use the shared `BrandLogo` component for the header/footer mark.
- Colours via existing tokens (`primary`, `muted-foreground`, `border`) — no new hardcoded hex values, no new CSS beyond the existing `.landing-dark` scope.
- Keep the route's `head()` metadata as is.
- Run `bunx tsgo --noEmit`, check the page in the preview, then publish so careerchronicles.app shows it.

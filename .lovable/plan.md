# Redesign landing page to match screenshot

Only the front page (`/`) changes. Login, "My careers" and other pages are untouched. Log in / Get started keep linking to `/auth` or `/karrierer` depending on sign-in.

## Sections (in order)
1. **Navbar** — green dot + "Career Chronicles"; right: "How it works" (anchor, hidden on mobile), "Log in" / "My careers", green "Get started".
2. **Hero** — outlined pill "For EA Sports FC Career Mode", huge two-line heading (second line green), muted subtext, green "Get started" + outlined "How it works" (smooth scroll to `#how`).
3. **App preview** — dark card: "Squad" header with season line, 3 stats (24 / 25/26 / €647m green) split by dividers, 4-row example table (POT and Value hidden on mobile, high POT green).
4. **How it works** (`id="how"`) — green label, heading "From screenshot to squad." + muted "In five steps.", 5 steps (3 cols tablet, 1 mobile) with numbered green circles, connector lines on desktop, small hand-built illustrations (camera frame, dropzone with squad.png, scan line over chips, mini table, rising line + orange "RB · Thin depth").
5. **CTA** — "Your next season / starts here." + Get started.
6. **Footer** — updated to: "© 2026 Career Chronicles · Not affiliated with EA Sports FC." left; Privacy, Terms, email right. Also used on /privacy and /terms.

Old features section and centered logo icon are removed.

## Technical details
- Load Inter Tight (600/700) via `<link>` in `__root.tsx`; add `--font-landing-display` token.
- Extend `.landing-dark` scope in `src/styles.css` with landing tokens (bg #000, card #0A0A0A, border #222, divider #1A1A1A, muted #8C8C8C, accent #16A34A, warning #F5A524) exposed as scoped CSS variables mapped to Tailwind utilities via `@theme inline` — so the rest of the app's theme is unaffected.
- Illustrations built with divs/SVG, no images; no gradients/shadows/emoji.
- Rewrite `src/routes/index.tsx` and `src/components/site-footer.tsx`; head() metadata kept.
- Verify with Playwright at desktop and mobile widths; run typecheck.

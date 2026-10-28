# Make challenges easier to find and link

## Why you can't see it now
- The challenge card only appears inside one career's **Overview** page (open a career first). It is not on the "My careers" list you land on after signing in.
- The challenge page itself has no "Link to career" button; linking only works from a career's Overview via "Add challenge".
- Your preview is currently on the sign-in page, so nothing personal shows until you sign in.

## Changes
1. **My careers list (dashboard):** each career card shows a small challenge line (title, points / 64, rank) when linked, or an "Add challenge" link that opens that career's Overview.
2. **Challenge page:** when not linked, show "Link to career" with a dropdown of your careers (your matching club first) and a "Link" button. Starting a challenge also asks which career to link.
3. **Career Overview:** move the challenge card higher so it is visible right under the stat strip.

## Technical details
- Reuse `startChallenge({ careerId })` for linking; add a light `listCareerChallengeLinks` server fn (user's runs with career_id) for the careers list.
- No database changes. Typecheck, tests and a signed-in browser check afterwards.

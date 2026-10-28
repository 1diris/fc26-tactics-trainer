# Link challenges to a career

All existing challenge logic stays unchanged: points, penalties, reset, screenshot checks, storage paths and the two database helper functions.

## 1. Database
- Add an optional `career_id` to challenge progress (set to empty if the career is deleted) plus an index on (user_id, career_id).
- Replace the own-row rule so writes also require the linked career to belong to the user.
- Key stays (user, challenge): one run per challenge, linked to at most one career.
- Applied through the migration tool (it creates the migration file and refreshes the types automatically).

## 2. Server functions (`src/lib/challenges.functions.ts`)
- `startChallenge`: optional `careerId`. Creates the run with the career; links an unlinked run; errors "This challenge is already running on another career. Unlink it first." if linked elsewhere.
- New `getCareerChallenges({ careerId })`: the user's runs on that career (challenge_id, completions, penalty_count).
- New `unlinkChallenge({ challengeId })`: clears the link.
- `getChallengeProgress`: also returns linked career id + name (or null).

## 3. Career Overview: new "Challenge" card
- Linked: title, "X / maxPoints p", rank (`score()` / `currentRank()`), progress bar, penalty count, up to 3 open goals for the current challenge season, "Open challenge" link.
- Current challenge season = position of the career's current season in sorted seasons (1-based), clamped to 1..challenge seasons.
- Not linked: "Add challenge" button opening a dialog of catalogue challenges; club match (case-insensitive) gets "Recommended for your club"; "Start challenge" links and navigates to the challenge page.
- Same dark card style.

## 4. Challenge page
- If linked: small line "Linked to career: <name>" linking to the career, plus an "Unlink" button. Otherwise unchanged.

## 5. Verification
- Typecheck, existing challenge tests, and a browser check: start from the Real Betis career, see the card, unlink from the challenge page.

# Fictional player names in the landing preview table

Replace "[Player name]" in the example squad table on the front page with made-up names that fit each position:

- ST — Lukas Brenner (84 / 90 / €92m)
- CM — Mateo Ferreira (81 / 87 / €64m)
- CB — Jonas Ekdahl (79 / 82 / €38m)
- GK — Rafael Duarte (80 / 81 / €22m)

Nothing else changes.

## Technical details
- Add a `name` field to the `rows` array in `src/routes/index.tsx` and render it in place of the static placeholder.
- Typecheck afterwards.

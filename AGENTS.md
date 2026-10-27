<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
 
- Challenges are standalone authenticated pages, with bundled JSON definitions and user-scoped progress/evidence; this permits future games and challenges without coupling them to a career save.
- Challenge AI extracts observations through strict function tools; deterministic scoring and confidence gates remain in shared pure functions so evidence never awards points by model judgment.
- Screenshot-verification reservations use a row lock in the database to enforce per-goal upload limits across concurrent requests; evidence writes are privileged only after an authenticated reservation.

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

## Architecture rules

- Backend is a self-hosted local PostgreSQL instance accessed through Drizzle (`src/server/db`), with custom scrypt password auth and DB-backed sessions (`src/server/auth.ts`). Never reintroduce Supabase auth, RLS policies, or the Supabase client for application data; auth and authorization are enforced server-side in server functions. (Deployed app is not on Supabase; the user requires self-hosted Postgres.)
- All telephony (dialing, call state, dispositions) comes from VICIdial — the CRM must not implement its own telephony; it integrates via VICIdial's APIs. (User requirement: VICIdial is the telephony system of record.)
- Target is production grade: server-side validation and role checks on every server function, no secrets in client code, VICIdial credentials only read from server env vars inside handlers.

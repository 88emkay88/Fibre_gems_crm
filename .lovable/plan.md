# FibreGems Team Lead Portal

## Goal
Add a protected supervisor workspace for live floor monitoring, call recording QA, and team callback redistribution, using the existing local PostgreSQL/auth setup and VICIdial/REMI adapter. Supervisors do not use the legacy VICIdial admin pages.

## Work
- Add a `/team-lead` workspace for `team_leader` and `admin`, with live floor, recordings/QA, and callback pool views plus role-appropriate workspace switching.
- Add server-side, role-checked functions for live agent status, Listen/Whisper/Barge, force pause/hangup, recording search/evaluation, and callback reassignment. VICIdial credentials and API calls stay on the server.
- Persist QA evaluations and supervisor audit activity in local PostgreSQL; scope team-lead customer access and reassignments to their team, with admins able to oversee all teams.
- Build responsive floor cards, warning timers, recording filters/player/evaluation drawer, and callback bulk-selection/reassignment with clear loading, empty, and connection-error states.
- Update local schema/migration documentation and the project roadmap.

## Hosting and verification
The app server must be deployed where it can securely reach the self-hosted PostgreSQL and the VICIdial/REMI API (same trusted network or VPN). Configure `DATABASE_URL`, `REMI_API_URL`, and the server-only REMI token there; do not point production at a developer workstation's `127.0.0.1` or expose credentials to browsers. Preview cannot confirm connectivity to the user's private network, so validate live controls against the real REMI API during deployment.

## Technical details
Use existing TanStack Start server functions, custom cookie auth, Drizzle schema, and server-side VICIdial adapter. Keep the app's established `team_leader` role. Add an additive PostgreSQL table for QA evaluations with a matching local SQL migration; keep migrations compatible with the project's self-hosted PostgreSQL workflow. All privileged mutations validate input and authorize the current role and team on every request.

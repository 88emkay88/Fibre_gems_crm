# FibreGems CRM implementation plan

## Goal
Build a production-ready React CRM for an ISP channel partner, preserving the existing lead, order, payment, activation, activity, and Agility-sync workflows while replacing Google Sheets and Apps Script with a relational PostgreSQL system.

## Product scope

### 1. Secure access and roles
- Email/password sign-in, password reset, account status, and expiring sessions.
- Separate role assignments for Admin, Team Leader, and Agent.
- Agents see and update only their assigned customers; team leaders see their team; admins see all operational data.
- Server-side authorization for every read, update, import, and report.

### 2. CRM workspace
- Responsive desktop command centre and mobile/tablet field-capture experience.
- Dashboard with pipeline totals, active agents, daily touches, payments, activations, overdue actions, and status distribution.
- Customer directory with search, filters, sorting, pagination, ownership, and status views.
- Customer profile containing contact details, service address, package, order, payment, activation, next action, and a chronological activity timeline.
- Fast lead capture and quick-update flows suitable for agents in the field.
- Duplicate cellphone protection: allow an owner to update their existing record; block agents from claiming another owner’s record.
- Admin user/team management and assignment controls.

### 3. Data model
Normalize the supplied sheets into PostgreSQL tables:
- `profiles`, `user_roles`, and `teams`
- `customers` and `customer_assignments`
- `orders`, `payments`, and `activations`
- `activities` and `daily_agent_activity`
- `agility_import_batches`, `agility_import_rows`, and `product_mappings`

Use UUID primary keys, timestamps, foreign keys, constrained status values, indexed cellphone/order identifiers, soft archival, and audit fields. Preserve original external IDs for traceability. Add a normalized cellphone column with a database uniqueness rule to make duplicate protection race-safe.

### 4. Agility import
- Replace direct sheet scanning with an admin CSV/XLSX upload and staged validation screen.
- Parse OVR/OVK references, map known products, identify new versus existing customers, and show row-level errors before committing.
- Process imports transactionally and idempotently so the same file or order cannot create duplicates.
- Retain import history, source rows, operator, timestamps, and outcome counts.

### 5. Visual system
- FibreGems palette: amber `#F5B021`, orange `#D44B2E`, black `#000000`, off-white `#F3F1F1`, with the supplied CTA orange scale.
- Montserrat-led typography, compact tables, strong status contrast, and restrained white/off-white surfaces.
- Orange reserved for primary actions and key states; operational data remains highly scannable.
- Shared accessible controls, clear focus states, loading/empty/error states, and mobile-safe forms.

## Hosting and feasibility

### Recommended production architecture
```text
Browser
  -> React/TanStack application and protected server functions
      -> managed PostgreSQL database
      -> object storage for Agility source files
```

Use Lovable hosting plus Lovable Cloud for the first production release. It provides managed PostgreSQL, authentication, storage, backups, and server-side functions without maintaining a database server. PostgreSQL remains an open-source database; the managed service removes operating-system and patching work.

### Fully self-managed alternative
Host PostgreSQL on a small VPS and expose it only through a separately hosted API service. Do not connect the browser directly to PostgreSQL. This gives maximum control but requires TLS, firewalling, backups, point-in-time recovery, upgrades, monitoring, secret rotation, and incident response. GitHub Pages alone is not suitable because it serves static files and cannot securely run database-backed server logic.

### Feasibility assessment
- Core CRM and role-scoped workflows: high feasibility.
- Data migration from clean sheets: high feasibility after validation and deduplication.
- Agility sync: high feasibility as staged file imports; direct third-party API sync depends on API access.
- “Free” production hosting: feasible for a pilot on free tiers, but not a reliable long-term promise. Storage, traffic, backups, and background processing normally require a paid tier as usage grows.
- Main migration risks: inconsistent sheet columns, placeholder cellphone numbers, duplicate OVR/OVK values, mixed date formats, and unclear ownership/team mappings.

## Delivery phases

### Phase 1 — Foundation
- Apply the FibreGems design system and application shell.
- Provision PostgreSQL, authentication, role tables, row-level access rules, and audit foundations.
- Build the responsive sign-in experience and seeded development roles.

### Phase 2 — Operational CRM
- Build dashboards, customer list/profile, lead capture, ownership, quick updates, activities, orders, payments, and activations.
- Implement server-validated duplicate handling and permissions.

### Phase 3 — Import and administration
- Build staged Agility imports, product mappings, user/team administration, reassignment, and import history.
- Add CSV exports and operational filters.

### Phase 4 — Migration and launch
- Profile and clean source sheets, map IDs, dry-run imports, reconcile totals, then perform final migration.
- Add automated tests for permissions, duplicate races, imports, and key agent/admin journeys.
- Validate desktop, tablet, and mobile layouts; configure production domain, monitoring, backups, and recovery checks.

## Acceptance criteria
- No user role or authorization decision is trusted from browser storage.
- Agents cannot read or mutate another agent’s assigned records unless permitted by role/team rules.
- Duplicate cellphone and OVR/OVK records cannot be created under concurrent requests.
- Every material customer change produces an immutable audit entry.
- An Agility file can be validated, previewed, committed once, and traced afterward.
- Core workflows work on desktop and mobile, with useful loading, empty, validation, and failure states.
- Every public page has app-specific metadata; no template placeholder remains.

## Technical details
- Keep TanStack Start and React 19; use server functions for protected application operations.
- Validate all inputs with Zod and use database transactions for multi-table writes.
- Store roles in a dedicated `user_roles` table; use database access policies plus server-side checks.
- Keep credentials server-side only; never expose a database URL or privileged key to the browser.
- Use migrations containing explicit table grants and row-level access policies.
- Add indexes for normalized cellphone, owner, status, next-action date, OVR, OVK, and import lookup paths.
- Import existing data with a repeatable migration script and reconciliation report rather than copying rows manually.

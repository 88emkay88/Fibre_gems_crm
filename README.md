# FibreGems CRM

A modern CRM built for FibreGems ISP field sales, order capture, payment tracking, customer activations, and Agility syncing.

## Architecture

- **Frontend & App Framework**: [TanStack Start](https://tanstack.com/start) + [React 19](https://react.dev) + [TanStack Router](https://tanstack.com/router)
- **Database & ORM**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team)
- **Styling**: Tailwind CSS + Radix UI primitives + Lucide Icons
- **State & Caching**: TanStack Query (React Query)
- **Authentication**: Native session cookie authentication with scrypt password hashing (zero external BaaS dependencies)

## Environment Configuration

Create a `.env` file or copy from [`.env.example`](file:///.env.example):

```bash
# Connect to your PostgreSQL database (Aiven, Neon, self-hosted, etc.)
DATABASE_URL="postgres://username:password@your-postgres-host:5432/defaultdb?sslmode=require"
```

> **Note**: If `DATABASE_URL` is omitted, the application will run in local in-memory fallback mode for quick testing and demo accounts:
> - **Admin Demo**: `admin@fibregems.co.za` (Password: `password123`)
> - **Agent Demo**: `agent@fibregems.co.za` (Password: `password123`)

## Database Migrations

To push your schema directly to your PostgreSQL database:

```bash
# Push schema changes to your PostgreSQL database
bun run db:push

# Generate migration SQL files
bun run db:generate

# Open Drizzle Studio to inspect and manage your database in the browser
bun run db:studio
```

## Running the Application

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build
```

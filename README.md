## Remcura V2

Remcura V2 is a multi-tenant inventory platform for medical practices. This repository uses a single Next.js 15
application with App Router, Tailwind CSS, and Prisma for data access.

### Stack

- [Next.js 15](https://nextjs.org/) with React Server Components
- Tailwind CSS for styling and lightweight Shadcn UI primitives
- PostgreSQL + Prisma ORM
- API route handlers colocated under `app/api`

### Prerequisites

- Node.js 18.18+ (Node 20+ recommended)
- npm (bundled with Node) or another package manager
- PostgreSQL instance (Docker or managed service)

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Duplicate the environment template and provide secrets:

   ```bash
   cp .env.example .env.local
   # update DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
   ```

3. Push the Prisma schema to your database (creates tables):

   ```bash
   npm run db:push
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000) to see the landing page. The dashboard prototype lives at
   `/dashboard` and the health check at `/api/health`.

### Authentication

- Use `/register` to create the first practice and administrator (credentials provider, password stored as bcrypt
  hash).
- Afterwards, sign in at `/login`. Protected routes (`/dashboard`, `/inventory`, `/suppliers`, `/orders`, `/locations`)
  require an authenticated session.
- Middleware redirects unauthenticated users back to `/login` with a `callbackUrl` parameter for smooth returns.

### Project Structure

- `app/(auth)` – authentication routes (register + login powered by NextAuth)
- `app/(dashboard)` – dashboard pages for inventory, suppliers, orders, locations
- `app/api` – API route handlers (e.g. `api/health`)
- `components/` – shared UI primitives
- `lib/` – Prisma client, auth helpers, utilities
- `prisma/` – Prisma schema & migrations
- `types/` – shared TypeScript definitions

### Prisma Commands

- `npm run prisma:generate` – regenerate Prisma client
- `npm run db:push` – sync schema changes (development)
- `npm run db:migrate` – create a migration during development
- `npm run db:studio` – open Prisma Studio for quick data inspection

### Next Steps

- Hook up NextAuth for tenant-aware authentication and RBAC.
- Implement CRUD flows for inventory, suppliers, and orders using Prisma.
- Add automated tests (Vitest/Playwright) and lightweight CI.

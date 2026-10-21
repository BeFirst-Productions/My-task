# OmniExpiry Multi-Tenant SaaS Platform — Technical Foundation

This repository contains the architecture foundation for a multi-tenant SaaS platform engineered to track expiration dates for corporate client documents (visas, commercial licences, municipal permits, and compliance certificates) with automated WhatsApp/email notifications and staff renewal task workflows.

---

## 1. Project Architecture

The project is structured as a clean **pnpm monorepo** with strictly two decoupled applications:

```text
.
├── apps/
│   ├── web/                     # Next.js 15 (App Router, Tailwind CSS, TypeScript)
│   │   ├── src/
│   │   │   └── app/
│   │   │       ├── (public)/    # Public website routes (/, /pricing, /register)
│   │   │       ├── (admin)/     # Authenticated application shells (/dashboard, /platform-admin)
│   │   │       ├── layout.tsx   # Root HTML shell
│   │   │       └── globals.css  # Design tokens and Tailwind base
│   │   ├── .env.example         # Web environment example
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── api/                     # Fastify 5 (Node.js, TypeScript, Zod, Prisma)
│       ├── src/
│       │   ├── app.ts           # Fastify application factory (plugins, error handling)
│       │   ├── server.ts        # Server lifecycle & graceful shutdown
│       │   ├── config/          # Zod-validated environment config
│       │   ├── database/        # Prisma client singleton & connection lifecycle
│       │   ├── modules/         # Modular feature routes (/api/health)
│       │   └── plugins/         # Fastify reusable plugins (CORS, sensible)
│       ├── prisma/
│       │   └── schema.prisma    # PostgreSQL Prisma schema
│       ├── .env.example         # API environment example
│       ├── package.json
│       └── tsconfig.json
├── docker-compose.yml           # Local PostgreSQL service with health check
├── .env.example                 # Root Docker & DB environment configuration
├── .gitignore                   # Ignore rules for secrets, builds, and dependencies
├── pnpm-workspace.yaml          # Monorepo workspace configuration
├── package.json                 # Monorepo root scripts
└── README.md                    # Architecture and developer documentation
```

---

## 2. Responsibility of Applications

### `apps/web` (Frontend)
- **Role**: Client-facing user interface and dashboard shells.
- **Tech Stack**: Next.js 15 with App Router, React 19, TypeScript, Tailwind CSS.
- **Organization**: Uses Next.js Route Groups `(public)` and `(admin)`. Route group folder names are omitted from final browser URLs.
- **Security Boundary**: The frontend communicates strictly via HTTP with the Fastify API. It never imports database drivers, credentials, or Prisma directly.

### `apps/api` (Backend)
- **Role**: Core business logic, data validation, database access, and future scheduled jobs.
- **Tech Stack**: Fastify 5, TypeScript, Zod, Prisma ORM.
- **Design**: Strict separation of app configuration (`buildApp` in `src/app.ts`) and HTTP server listening (`src/server.ts`), enabling reliable unit/integration testing and clean lifecycle teardown.

---

## 3. Why Prisma is Located Inside `apps/api`

In this architecture, **the backend API is the sole owner and gateway to the PostgreSQL database**:
1. **Security & Boundary Enforcement**: Database credentials and schemas must never leak to browser bundles or edge rendering environments.
2. **Single Point of Data Integrity**: Keeping migrations, schemas, and queries inside `apps/api` prevents duplicate schema definitions or split-brain migration states.
3. **Simplicity Without Premature Abstraction**: We deliberately avoid creating an extra shared package (`packages/database`) until multiple backend services actually require it.

---

## 4. How to Install Dependencies

Prerequisites:
- **Node.js**: v20+ (tested on Node v24)
- **pnpm**: v9+ (tested on pnpm v11)

From the **project root directory**, run:

```bash
pnpm install
```

This single command installs all dependencies for both `apps/web` and `apps/api` using the unified lockfile.

---

## 5. Environment Variables Configuration

Copy each `.env.example` file to its corresponding `.env` before running services:

### 1. Root Docker Compose Environment (`.env`)
```bash
# In the project root directory:
cp .env.example .env
```
Contains PostgreSQL user, password, database name, and port (`5436` by default to avoid conflicts with existing local PostgreSQL installations on `5432`).

### 2. API Application Environment (`apps/api/.env`)
```bash
# In apps/api directory (or create apps/api/.env from root):
cp apps/api/.env.example apps/api/.env
```
Key variables:
- `PORT=4000`
- `HOST=0.0.0.0`
- `NODE_ENV=development`
- `CORS_ORIGIN=http://localhost:3000`
- `DATABASE_URL="postgresql://postgres:postgres@localhost:5436/task_saas_db?schema=public"`

### 3. Web Application Environment (`apps/web/.env.local`)
```bash
# In apps/web directory:
cp apps/web/.env.example apps/web/.env.local
```
Key variables:
- `NEXT_PUBLIC_API_URL=http://localhost:4000`

---

## 6. How to Start PostgreSQL with Docker Compose

Start the local PostgreSQL container in the background from the **project root**:

```bash
# Start PostgreSQL container
docker compose up -d

# Check health and status
docker compose ps

# View container logs
docker compose logs -f postgres
```

To stop PostgreSQL:
```bash
docker compose down
```

---

## 7. How to Run Database Migrations

Once the PostgreSQL container is running and healthy:

```bash
# Run Prisma Client generation
pnpm --filter @saas/api run db:generate

# Push schema directly to database (for development)
pnpm --filter @saas/api run db:push

# Or create a formal migration:
pnpm --filter @saas/api run db:migrate
```

*(These commands can also be run directly inside `apps/api` via `pnpm run db:generate` / `pnpm run db:push`.)*

---

## 8. How to Start the Web and API Applications

### Run Both Simultaneously (from root)
```bash
pnpm dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)
- API Server: [http://localhost:4000](http://localhost:4000)

### Or Run Applications Individually
```bash
# Run only API in development mode
pnpm dev:api

# Run only Web in development mode
pnpm dev:web
```

---

## 9. How to Test the API Health Endpoint

When the API server is running on port 4000:

### Using curl / HTTP client:
```bash
curl -i http://localhost:4000/api/health
```

### Expected JSON Response:
```json
{
  "status": "ok",
  "uptime": 14,
  "timestamp": "2026-10-16T18:30:00.000Z"
}
```

---

## 10. Linting, Type-Checking, and Builds

Run these commands from the **project root**:

```bash
# Type-check both applications
pnpm type-check

# Lint both applications
pnpm lint

# Build production artifacts for both applications
pnpm build
```

Production builds will output:
- `apps/web`: `.next/` standalone bundle
- `apps/api`: `apps/api/dist/server.js` optimized ESM bundle via tsup

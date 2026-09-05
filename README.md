# NKC Institute Management System

Monorepo for the internal IMS: NestJS API, Next.js 15 frontend, PostgreSQL + Redis + PgBouncer.

## Layout

```
apps/backend          NestJS 10 (Fastify) — http://localhost:3001/api/v1
apps/frontend         Next.js 15 App Router — http://localhost:3000
packages/shared-types Shared DTOs and enums (@nkc/shared-types)
packages/eslint-config Shared ESLint flat configs
packages/tsconfig     Shared TypeScript configs (strict)
```

## Prerequisites

- Node.js 22+
- pnpm 9+ (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- Docker + Docker Compose (for Postgres, Redis, PgBouncer)

## Setup

```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
pnpm install
```

## Verification

Infrastructure:

```bash
pnpm docker:up
docker compose ps
docker compose exec postgres pg_isready -U nkc -d nkc_ims
docker compose exec redis redis-cli ping
# PgBouncer listens on host port 6432
nc -zv localhost 5432
nc -zv localhost 6379
nc -zv localhost 6432
```

Apps:

```bash
pnpm type-check
pnpm lint
pnpm build
pnpm dev
```

In another terminal:

```bash
curl -s http://localhost:3001/api/v1/health
# expect: {"status":"ok","service":"nkc-backend",...}

curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# expect: 200
```

Tear down data services:

```bash
pnpm docker:down
```

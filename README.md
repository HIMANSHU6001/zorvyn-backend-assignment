# Zorvyn Backend Assignment

Finance dashboard backend built with TypeScript, Express, Prisma, PostgreSQL, Redis, and JWT auth.

## Quick Startup (Local)

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Prepare database and seed admin user:

```bash
npx prisma migrate dev --name init
npm run seed
```

4. Start server:

```bash
npm run dev
```

API base URL: `http://localhost:3000/api`

## Quick Startup (Docker)

```bash
docker compose up --build
```

The compose startup runs migrations and seed automatically.

## Admin Login (Local)

After seeding, you can log in with the admin user from your local `.env`:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Default sample values are available in `.env.example`.
Use these credentials for local/dev only.

## Useful Commands

- `npm run dev` - run in development mode
- `npm run build` - generate Prisma client and compile TypeScript
- `npm test` - run Jest tests
- `npm run seed` - seed admin + default categories

## Docs

- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs/openapi.json`
- Technical Requirements Document: `docs/TRD.md`

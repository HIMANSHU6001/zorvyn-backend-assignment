# Zorvyn Backend Assignment

TypeScript + Express backend for a finance dashboard with Prisma/PostgreSQL, Redis, JWT auth, RBAC, categories, records, Swagger docs, and Jest tests.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment values:

```bash
cp .env.example .env
```

3. Run migrations and seed:

```bash
npx prisma migrate dev --name init
npm run seed
```

4. Start dev server:

```bash
npm run dev
```

Base URL: `http://localhost:3000/api`

## Docker

```bash
docker compose up --build
```

## Scripts

- `npm run dev` - start dev server
- `npm run build` - compile TypeScript
- `npm test` - run test suites
- `npm run migrate` - Prisma migrate dev
- `npm run seed` - seed admin + default categories

## API Docs

- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs/openapi.json`
- Redirect: `http://localhost:3000/docs`

## Postman

Postman assets are included in this repo under the `postman/` directory.

- Collection: `postman/collections/Zorvyn Backend Assignment API`
- Environment: `postman/environments/Zorvyn Backend - Local.yaml`

Recommended flow in Postman:

1. Run `Auth -> Login` to set `accessToken`.
2. Run `Categories -> Create Category` or `List Categories` to set `categoryId`.
3. Run `Records -> Create Record` (uses `categoryId`).
4. Use `Records -> List/Get/Update/Delete` for verification.

## Key Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/users/:id/status`
- `POST /api/categories`
- `GET /api/categories`
- `DELETE /api/categories/:id`
- `POST /api/records`
- `GET /api/records`
- `GET /api/records/:id`
- `PATCH /api/records/:id`
- `DELETE /api/records/:id`
- `GET /api/health`
- `GET /api/health/redis`

# Technical Requirements Document (TRD)

## 1. Purpose
This document defines the technical scope and implementation requirements for the Zorvyn Backend Assignment.

The backend provides secure APIs for:
- authentication and authorization,
- user administration,
- category and financial record management,
- dashboard summary analytics,
- audit logging,
- health and operational observability.

## 2. Scope
In scope:
- REST API with JSON request/response envelopes.
- JWT-based authentication.
- RBAC enforcement using VIEWER, ANALYST, and ADMIN roles.
- PostgreSQL persistence through Prisma ORM.
- Redis-backed caching for dashboard summary responses.
- OpenAPI documentation and Postman assets.
- Automated tests for major route and service behavior.

Out of scope:
- Frontend/UI implementation.
- Multi-tenant organization model.
- Async job queues and event streaming.

## 3. System Overview
### 3.1 Runtime Components
- API server: Express + TypeScript.
- Database: PostgreSQL.
- Cache: Redis.
- ORM and migration tooling: Prisma.

### 3.2 API Design Choice
REST was chosen over GraphQL due to the predictable shape of dashboard responses and simplicity of caching aggregated data.

### 3.3 Project Structure
- `src/modules/*` for bounded API domains (auth, user, finance, dashboard, audit, health).
- `src/common/*` for middleware, shared errors, and utility helpers.
- `prisma/*` for schema, migrations, and seed script.
- `tests/*` for route and service-level test coverage.
- `docs/openapi.yaml` for OpenAPI contract.

### 3.4 Caching and Transaction Strategy
- Dashboard summaries use cache-aside strategy with Redis:
  - Check cache first for a request-specific key (user + range + pagination + groupBy).
  - On cache miss, compute from PostgreSQL and store in Redis with TTL.
  - Invalidate user dashboard cache on record create, update, or soft delete.
- Cache scope is read-optimized and limited to aggregated summary endpoints.
- Write operations with side effects (for example record mutations and role assignment audit entries) use database transactions to keep business data and audit logs consistent.
- Transaction boundaries are service-level and guarantee all-or-nothing persistence for grouped writes.

## 4. Functional Requirements
### 4.1 Authentication and Identity
- Users can register and log in using email/password.
- Login returns JWT access token.
- Authenticated users can fetch current profile.
- Inactive users are blocked from protected APIs.

### 4.2 RBAC
- Roles: VIEWER, ANALYST, ADMIN.
- Protected endpoints require valid JWT.
- Administrative routes require ADMIN role.
- Record mutation routes require ANALYST or ADMIN.

#### RBAC Permission Matrix

| Capability | Viewer | Analyst | Admin |
| --- | --- | --- | --- |
| Register/Login/Get current user | Yes | Yes | Yes |
| Create category | Yes | Yes | Yes |
| List categories (own) | Yes | Yes | Yes |
| Delete category (own) | Yes | Yes | Yes |
| List records | Yes (own) | Yes (own) | Yes (all) |
| Get record by id | Yes (own) | Yes (own) | Yes (all) |
| Create record | No | Yes | Yes |
| Update record | No | Yes (own) | Yes (all) |
| Delete record (soft) | No | Yes (own) | Yes (all) |
| Get dashboard summary | Yes | Yes | Yes |
| Update user status | No | No | Yes |
| Assign user role | No | No | Yes |
| List audit logs | No | No | Yes |
| Get audit log by id | No | No | Yes |

### 4.3 User Management
- Admin can update target user status.
- Admin can update target user role.
- Self-role assignment is forbidden.
- Role assignment is allowed only for ACTIVE target users.
- Role changes are captured in audit logs.

### 4.4 Categories and Records
- Users can create, list, and soft-delete their own categories.
- Users can list/get records subject to ownership constraints.
- ANALYST/ADMIN can create/update/delete records.
- Records reference categories by `categoryId` relation.
- Soft deletion is used for records and categories.

### 4.5 Dashboard Summary
- Authenticated users can fetch `/api/dashboard/summary`.
- Supports MTD, specific month (`YYYY-MM`), or custom date range.
- Response includes:
  - total income, total expense, net balance,
  - per-category totals,
  - recent activity with pagination,
  - trends grouped by day or month.
- Summary responses are cached in Redis and invalidated after record mutations.
- Cache TTL is used to reduce repeated aggregation load while preserving near-real-time freshness after mutation-triggered invalidation.

### 4.6 Audit
- ADMIN can list audit logs and fetch an individual log by id.
- Audit entries track action type, entity type/id, user, and metadata.

### 4.7 Health and Documentation
- `/api/health` provides application health.
- `/api/health/redis` provides Redis connectivity status.
- API docs are served from OpenAPI + Swagger UI.

## 5. Data Requirements
### 5.1 Core Entities
- User: identity, credentials, role, status.
- Category: user-owned naming entity with soft delete support.
- FinancialRecord: user-owned transaction with amount/type/date/category relation.
- AuditLog: immutable history of important user and record events.

### 5.2 Enums
- Role: VIEWER, ANALYST, ADMIN.
- UserStatus: ACTIVE, INACTIVE.
- RecordType: INCOME, EXPENSE.
- AuditAction: CREATE, UPDATE, DELETE.
- EntityType: USER, FINANCIAL_RECORD.

### 5.3 Integrity Constraints
- Unique user email.
- Unique category normalized name per user.
- `FinancialRecord.categoryId` is required and FK-protected.
- Soft-deleted rows are excluded by default in service queries.

## 6. API and Contract Requirements
- Requests and responses use JSON.
- Validation is enforced at route boundary using Zod schemas.
- Errors follow a consistent response envelope.
- OpenAPI must be kept synchronized with implemented routes.

## 7. Security Requirements
- JWT secret must be configured via environment variable.
- Protected APIs require bearer token.
- Role checks are enforced via middleware and service logic.
- Passwords are hashed before persistence.

## 8. Operational Requirements
### 8.0 Production Deployment (DigitalOcean Droplet)
The backend is successfully deployed on a DigitalOcean droplet as a live, publicly reachable environment for demonstration and API consumption.

- Live API base URL: `http://168.144.24.48:3000/api`
- Live Swagger UI: `http://168.144.24.48:3000/api/docs`
- Live OpenAPI JSON: `http://168.144.24.48:3000/api/docs/openapi.json`

### 8.1 Local Startup
- Install dependencies.
- Configure `.env` from `.env.example`.
- Run Prisma migration(s).
- Run seed script.
- Start dev server.

### 8.2 Docker Startup
- `docker compose up --build` must bring up API + Postgres + Redis.
- API startup command applies migrations and seed before serving traffic.

### 8.3 Environment Variables
Required (or strongly expected):
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `REDIS_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## 9. Quality Requirements
- Unit/integration tests run through Jest.
- Build must run Prisma generation and TypeScript compilation.
- Migrations must be source-controlled and reproducible.
- API changes should include test and OpenAPI updates.
- Critical multi-write flows should remain transaction-protected and covered by tests where behavior is business-critical.

## 10. Risks and Notes
- Category mutation permissions currently allow any authenticated role; if VIEWER is intended to be strictly read-only, this policy should be tightened.
- The migration that removes the legacy category string assumes empty-db style progression; production-like upgrades may need explicit backfill strategy.
- README is intentionally concise; this TRD is the detailed reference.

## 11. Acceptance Checklist
- App starts locally with documented steps.
- App starts via Docker compose with migration + seed.
- Auth, user admin, records, dashboard, and audit routes are reachable and documented.
- Tests pass via `npm test`.
- Build passes via `npm run build`.

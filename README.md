# Sisques Account (`account-api`)

Identity + tenancy service for the Sisques Labs platform (Gardenia, Nexora,
and future apps). It owns:

- **User** — the platform identity record (`id`, `email`, `displayName`,
  `platformAdmin`).
- **Auth** — registration/login backed by Keycloak (self-hosted), and
  Sisques Account's own signed JWT (access token) + opaque refresh token
  (its own `Session` aggregate). Apps never talk to Keycloak directly —
  only `account-api` does.
- **Tenancy** — the platform-level mechanics of a tenant (name, members,
  roles). What each role *means* inside a given app (e.g. Gardenia's
  "member" can water but not delete plants) is that app's own concern, not
  this service's.

See `/Users/javi/Documents/projects/sisques-labs/sisques-account-architecture.md`
for the full design. This repo currently implements the **MVP**: `account-api`
standalone, validated via tests/Postman — no `account-web` frontend yet, no
email-based tenant invites.

Built from [`sisques-labs/nestjs-template`](https://github.com/sisques-labs/nestjs-template)
— DDD + CQRS + Hexagonal architecture. Three bounded contexts:
`src/contexts/user/`, `src/contexts/auth/` and `src/contexts/tenancy/` — see
each context's own `README.md` for the one/two/three-context decision,
aggregates, and public API.

## Prerequisites

- Node (see `.nvmrc`) + `pnpm` (see `packageManager` in `package.json`)
- Docker + Docker Compose v2
- [`local-dev-stack`](../local-dev-stack) running, for the shared Postgres —
  see below

## Running locally

**1. Shared Postgres (`local-dev-stack`)**

account-api uses `local-dev-stack`'s shared Postgres instance rather than
spinning up its own — see "Keycloak — where it runs" below for why Keycloak
is the one exception. `account_db` is already registered in that repo's
`docker/postgres/init-db.sh`. Start (or reuse) the stack:

```bash
cd ../local-dev-stack
docker compose up -d
```

If the stack was already running from before this database was added,
`init-db.sh` won't retroactively create it (it only runs on first boot of an
empty volume) — create it by hand instead:

```bash
docker compose exec postgres psql -U devuser -d postgres -c "CREATE DATABASE account_db;"
```

**2. Keycloak (this repo's own `docker-compose.yml`)**

```bash
cd ../../account/account-api
docker compose up -d keycloak
```

Realm `sisques-account` + client `account-api` (service account with
`manage-users`/`view-users`, plus direct-grant login) are auto-imported from
`docker/keycloak/realm-export.json` on first boot. Admin console at
`http://localhost:8083` (`admin` / `admin`, local dev only) — 8081 is taken
by `local-dev-stack`'s Mongo Express, 8082 is reserved for
`docker-compose.test.yml`'s `keycloak-test`.

**3. The app**

```bash
pnpm install
cp .env.example .env   # defaults already point at local-dev-stack + the
                        # Keycloak container above — see .env.example
pnpm dev
```

Migrations run automatically on boot (`DATABASE_MIGRATIONS_RUN` defaults to
`true`) and create the 4 MVP tables: `app`, `user`, `tenant`,
`tenant_membership`.

### Keycloak — where it runs

Decision: Keycloak lives in **this repo's `docker-compose.yml`**, not in
`local-dev-stack`. `local-dev-stack` exists to amortize infrastructure
*shared across multiple services* (Postgres, Kafka, Redis, OTel); Keycloak
has exactly one consumer — `account-api` itself is the architecture doc's one
explicit exception to "apps never talk to Keycloak directly" (it *is* the
adapter boundary). Keeping it here mirrors how this template already keeps
its own otel-collector/Jaeger alongside `local-dev-stack`'s shared Postgres.
Postgres, on the other hand, genuinely is shared platform-wide state (every
app in the ecosystem will eventually have a database here), so it uses
`local-dev-stack` as designed.

### Running tests

```bash
pnpm test              # unit (mocked, no infra needed)
pnpm test:db:up        # postgres-test (5433) + keycloak-test (8082)
pnpm test:integration  # persistence boundaries, real Postgres
pnpm test:e2e          # full HTTP flows — real Postgres AND real Keycloak
pnpm test:db:down
```

`docker-compose.test.yml` provisions an isolated `keycloak-test` (same
`realm-export.json`, port 8082) purely so e2e specs can exercise the real
`KeycloakIdentityProviderAdapter` for register/login — separate from the dev
Keycloak on 8083 so both can run at once.

## Example flow

Register → login → create an app → create a tenant (creator becomes owner)
→ add an existing user as a member → list members → refresh.

```bash
BASE=http://localhost:3000/api/v1

# 1. Register the tenant creator
curl -s -X POST $BASE/auth/register -H 'Content-Type: application/json' -d '{
  "email": "owner@example.com", "password": "Sup3rStrongPassw0rd!", "displayName": "Owner"
}'

# 2. Log in — returns { accessToken, refreshToken } (also set as cookies)
curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{
  "email": "owner@example.com", "password": "Sup3rStrongPassw0rd!"
}'
# -> save accessToken as $TOKEN, refreshToken as $REFRESH

# 3. Register the app (bootstrapping plumbing — no MVP endpoint touches `app`
#    otherwise, but `tenant.app_id` is a required FK)
curl -s -X POST $BASE/apps -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{
  "slug": "gardenia", "name": "Gardenia"
}'
# -> save appId as $APP_ID

# 4. Create a tenant — $TOKEN's user becomes owner automatically
curl -s -X POST $BASE/tenants -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{
  "appId": "'$APP_ID'", "name": "My Garden"
}'
# -> save tenantId as $TENANT_ID (slug defaults to "my-garden" when omitted)

# 5. Register a second user to add as a member
curl -s -X POST $BASE/auth/register -H 'Content-Type: application/json' -d '{
  "email": "member@example.com", "password": "Sup3rStrongPassw0rd!", "displayName": "Member"
}'

# 6. Add them as a member (by email — no invite flow in the MVP)
curl -s -X POST $BASE/tenants/$TENANT_ID/members -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{
  "email": "member@example.com", "role": "member"
}'

# 7. List members — owner + the new member
curl -s $BASE/tenants/$TENANT_ID/members -H "Authorization: Bearer $TOKEN"

# 8. Refresh — rotates the refresh token, issues a new access token
curl -s -X POST $BASE/auth/refresh -H 'Content-Type: application/json' -d '{
  "refreshToken": "'$REFRESH'"
}'
```

Swagger UI at `http://localhost:3000/docs` documents every request/response
shape.

## What's included (cross-cutting)

| Area | Where |
|------|-------|
| Config + env validation | `src/core/config/` (Zod), incl. `auth.config.ts` (JWT + Keycloak) |
| Auth infrastructure | `src/core/security/` — `JwtAuthGuard`, `@CurrentUser()`, shared `JwtService`. Cross-cutting (used by every context), not owned by `auth` |
| Health checks | `src/core/health/` — `GET /api/health/live`, `GET /api/health/ready` |
| Logging / OTel / MCP / Kafka forwarding | Unchanged from the template — see `openspec/config.yaml` and each module's own comments |
| Database | `src/database/migrations/` — the MVP tables (`app`, `user`, `tenant`, `tenant_membership`, `session`) |

## Architecture

DDD + CQRS + Hexagonal. Full rules in `.claude/skills/architecture/SKILL.md`;
project-wide conventions in `openspec/config.yaml`. Context-specific design
(aggregates, cross-context ports, public API) lives in
`src/contexts/user/README.md`, `src/contexts/auth/README.md` and
`src/contexts/tenancy/README.md`.

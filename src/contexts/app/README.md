# App Context

## What this context owns

`app` is the ecosystem's app registry — one row per app that plugs into the
platform (e.g. "gardenia", "nexora"). It's minimal bootstrapping plumbing,
not a feature called out in the architecture doc's MVP endpoint list:
`tenant.app_id` is a required FK and nothing else creates an `app` row, so
`POST /apps` is the smallest surface that makes `POST /tenants` testable at
all — see `src/contexts/tenancy/README.md`.

It owns a single aggregate:

- **App** — `id`, `slug` (unique), `name`.

`tenancy` reaches this context only through `IAppLookupPort` +
`AppLookupAdapter` (`QueryBus`), never a direct domain import — see the
boundary rule below.

---

## How app creation works

```
POST /apps  ->  AppsController
            ->  CreateAppCommand { slug?, name }
            ->  CreateAppCommandHandler
                1. AssertAppSlugAvailableService (409 if slug taken)
                   — slug defaults to a slugified `name` when omitted
                2. AppBuilder -> app.create() -> save
```

## Update / delete

`AppAggregate.update()`/`.delete()` (with `changeName()`/`changeSlug()`
emitting `AppNameChangedEvent`/`AppSlugChangedEvent`) already exist on the
aggregate, mirroring `TenantAggregate`, but **no command currently calls
them** — there is no `UpdateAppCommand`/`DeleteAppCommand` or REST route yet.
These are prepared-but-not-yet-exposed capabilities; wire them the same way
`tenancy`'s `UpdateTenantCommand`/`DeleteTenantCommand` do when a real need
lands.

## Listing apps

`GET /apps` — `AppFindByCriteriaQuery`, filterable by `id` (exact),
`slug`/`name` (partial `LIKE`), paginated. Returns `AppViewModel` mapped to
`AppRestResponseDto`.

---

## Cross-context port

`app` exposes `AppFindByIdQuery`, consumed cross-context by `tenancy`'s
`AppLookupAdapter` (`IAppLookupPort.assertExists`) to validate `tenant.appId`
on tenant creation — see `tenancy`'s README, "Cross-context port".

> Boundary rule: cross-context imports are allowed **only** from
> `infrastructure/adapters/`. This context's controller imports
> `JwtAuthGuard` from `src/core/security/` directly — that's cross-cutting
> infra (not another bounded context), so it isn't a boundary violation.

---

## Public API

### REST (`/api/v1/apps/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/apps` | JWT | Register a new app. 201, or 409 (slug taken). |
| `GET` | `/api/v1/apps` | JWT | List apps, filterable by `id`/`slug`/`name`, paginated. 200. |

### Commands & queries

| Class | Description |
|-------|-------------|
| `CreateAppCommand` | Registers a new app; slug defaults to a slugified name |
| `AppFindByCriteriaQuery` | Lists apps with pagination/filters |
| `AppFindByIdQuery` | Looks up a single app by id — consumed cross-context by `tenancy` |

### Domain events

`AppCreatedEvent`, `AppUpdatedEvent` (+ `AppNameChangedEvent`/`AppSlugChangedEvent`),
`AppDeletedEvent`. Only `AppCreatedEvent` is currently reachable — see
"Update / delete" above.

---

## Testing

```bash
pnpm test src/contexts/app             # unit
pnpm test:integration                  # App repo, real Postgres
pnpm test:e2e                          # create-app / list-apps HTTP flow
```

Same layering note as `tenancy`/`user`/`auth`: the TypeORM mapper/repository
are covered by integration specs against real Postgres, not isolated unit
specs.

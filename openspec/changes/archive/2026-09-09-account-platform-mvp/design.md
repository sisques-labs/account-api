# Design: Account Platform MVP — remaining gap

## Technical Approach

Three independent slices. Signing keys and the JWKS route stay in `src/core/security/`
(cross-cutting, already the single `JwtService` owner). Session chaining stays inside the
`auth` context. Platform-admin reconciliation crosses `auth → user` only through a new
port/adapter pair, per the existing `UserLookupAdapter` / `UserProvisioningAdapter` shape.
Stack verified from `package.json`: NestJS 11.1.28, TypeScript 6.0.3, pnpm 11.17.0, four
live contexts — `openspec/config.yaml`'s `context:` block is stale and was not trusted.

## Architecture Decisions

### Decision: Session chain shape

| Option | Tradeoff | Decision |
|---|---|---|
| Linked list `replaced_by_session_id` + `revoke_all_by_user_id` on reuse | No new grouping column; over-revokes a user's other chains | **Chosen** — gardenia-api parity ("port, do not redesign"); MVP has one chain per user |
| Explicit `family_id` | Precise per-chain revocation | Rejected — extra column and backfill, diverges from the mandated reference |
| Recursive CTE walk of the linked list | Precise, no new column | Rejected — recursive SQL inside a locked transaction, no MVP payoff |

### Decision: No reuse grace window

gardenia-api tolerates a one-hop replay inside `auth.refreshReuseGraceMs`.
`auth-session-rotation/spec.md` mandates the opposite ("the other request … is rejected as
a reuse attempt"). Strict rejection is implemented; the grace window is deliberately **not**
ported. Consequence: two browser tabs refreshing concurrently force a re-login.

### Decision: RSA key provisioning (resolves the proposal's open question)

| Option | Tradeoff | Decision |
|---|---|---|
| `JWT_PRIVATE_KEY` as base64-encoded PEM + ephemeral keypair generated at boot outside production | No key material on disk or in git; base64 survives dotenv/Docker/k8s single-line env | **Chosen** |
| `JWT_PRIVATE_KEY_PATH` file/volume mount | Adds a filesystem+volume story this repo has nowhere else | Rejected |
| Committed dev keypair fixture | Repeats the `dev-insecure-secret-change-me` mistake; a real leaked key is worse than a fake secret | Rejected |

Corollaries: the public key is derived via `crypto.createPublicKey(privateKey)` — never a
second env var that can drift. `kid` is the RFC 7638 JWK thumbprint, so it rotates with the
key automatically. `env.validation.ts` gains a `superRefine` that throws when
`NODE_ENV=production` and `JWT_PRIVATE_KEY` is absent — the same fail-closed pattern already
used for `CORS_ORIGINS`. `JWT_SECRET` is deleted, not deprecated.

### Decision: JWKS route placement

`src/core/security/transport/rest/controllers/jwks.controller.ts`, mirroring
`src/core/health/transport/rest/controllers/`. No `auth` domain concept participates — the
document is derived purely from the key `SecurityModule` already owns. `main.ts` must become
`setGlobalPrefix('api', { exclude: ['.well-known/jwks.json'] })`; `VERSION_NEUTRAL` alone is
not enough, the prefix would still yield `/api/.well-known/jwks.json`.

## Data Flow — reuse detection

    POST /auth/refresh ──→ RefreshSessionCommandHandler
                                 │ hash(presented token)
                                 ▼
                  sessionWriteRepository.rotate(hash, fn)
                                 │  BEGIN
                                 │  SELECT … WHERE refresh_token_hash = $1 FOR UPDATE
                                 ▼
                          row null? ──→ ROLLBACK ──→ InvalidRefreshTokenException (401)
                                 │
                     revoked_at IS NOT NULL?
                       │yes                        │no
                       ▼                           ▼
        markReuseDetected()              expired? ──→ InvalidRefreshTokenException
        revokeAllByUserId(userId)               │no
        RefreshTokenReuseDetected (401)         ▼
                                    INSERT successor row
                                    UPDATE current SET revoked_at=now(),
                                           replaced_by_session_id=successor.id
                                    COMMIT

Successor is inserted **before** the revoked row is updated — the self-FK on
`replaced_by_session_id` rejects a reference to a row that does not exist yet.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/core/security/keys/resolve-signing-key-pair.ts` | Create | PEM decode or dev keypair generation; returns `ISigningKeyPair` |
| `src/core/security/keys/signing-key-pair.interface.ts` | Create | `{ privateKeyPem, publicKeyPem, kid }` |
| `src/core/security/keys/jwks.service.ts` | Create | Public PEM → JWK (`kty/use/alg/kid/n/e`), never `d` |
| `src/core/security/transport/rest/controllers/jwks.controller.ts` | Create | `@Controller({ path: '.well-known', version: VERSION_NEUTRAL })`, `@Get('jwks.json')`, unauthenticated |
| `src/core/security/transport/rest/dtos/jwks-response.dto.ts` (+ `json-web-key.dto.ts`) | Create | Swagger response shape |
| `src/core/security/security.module.ts` | Modify | `privateKey`/`publicKey`, `algorithm: 'RS256'`, `keyid`, `verifyOptions.algorithms`; add `REST_CONTROLLERS` |
| `src/core/config/auth.config.ts` | Modify | Drop `jwtSecret`; add `jwtPrivateKey`/`jwtPublicKey`/`jwtKeyId`/`platformAdminEmails` |
| `src/core/config/env.validation.ts` | Modify | Production `JWT_PRIVATE_KEY` guard |
| `src/main.ts` | Modify | Global-prefix exclusion for the JWKS path |
| `src/contexts/auth/domain/aggregates/session.aggregate.ts` | Modify | `revokedAt`, `replacedBySessionId`, `revoke()`, `isRevoked()`, `markReuseDetected()`; drop in-place `rotate()` |
| `src/contexts/auth/domain/interfaces/rotate-session-callback.interface.ts`, `rotate-result.interface.ts` | Create | One type per file (repo rule) |
| `src/contexts/auth/domain/exceptions/refresh-token-reuse-detected.exception.ts` | Create | 401 |
| `src/contexts/auth/domain/repositories/write/session-write.repository.ts` | Modify | `+ rotate()`, `+ revokeAllByUserId()` |
| `…/typeorm/entities/session.entity.ts`, `mappers/…`, `repositories/…` | Modify | Drop `UQ_session_user_id`, add nullable columns, `pessimistic_write` transaction |
| `…/commands/refresh-session/refresh-session.handler.ts` | Modify | Rotate through the locked callback |
| `…/commands/login-user/login-user.handler.ts` | Modify | Always create a new chain root; reconcile platform admin |
| `src/contexts/auth/application/ports/user-platform-admin.port.ts` | Create | `IUserPlatformAdminPort` + `USER_PLATFORM_ADMIN_PORT` |
| `src/contexts/auth/infrastructure/adapters/user-platform-admin.adapter.ts` | Create | `CommandBus` dispatch only |
| `…/services/write/reconcile-platform-admin/reconcile-platform-admin.service.ts` | Create | Returns `boolean \| null` (`null` = no change / var unset) |
| `src/contexts/user/application/commands/set-user-platform-admin/*` | Create | Command + handler (`user.update({ platformAdmin })`) |
| `src/contexts/user/application/services/write/assert-user-exists/…` | Create | Required by the repo's assert-service rule |
| `src/database/migrations/{ts}-SessionChainRotation.ts` | Create | Breaking; `DELETE FROM "session"` first |
| `src/contexts/{auth,user}/README.md`, `docs/integration-guide.md` | Modify | Mandated by `rules.apply` |

## Interfaces / Contracts

```ts
// domain/interfaces/rotate-session-callback.interface.ts
export type RotateSessionCallback = (
  current: SessionAggregate,
  findLockedById: (id: string) => Promise<SessionAggregate | null>,
) => Promise<{ revoked: SessionAggregate; created: SessionAggregate }>;
```

```ts
// application/ports/user-platform-admin.port.ts
export const USER_PLATFORM_ADMIN_PORT = Symbol('USER_PLATFORM_ADMIN_PORT');
export interface IUserPlatformAdminPort {
  setPlatformAdmin(userId: string, platformAdmin: boolean): Promise<void>;
}
```

`platformAdminEmails` is `string[] | null` — `null` only when `PLATFORM_ADMIN_EMAILS` is
absent from `process.env`. An empty-string value parses to `[]`, which revokes; the spec
distinguishes "unset" (skip) from "set but empty" (revoke). Emails are trimmed and
lowercased at config load. `LoginUserCommandHandler` signs claims with the **reconciled**
boolean, not the value read before reconciliation.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `SessionAggregate.revoke/isRevoked`, `ReconcilePlatformAdminService` truth table, `JwksService` omits `d`, `resolveSigningKeyPair` dev/prod branches, `SetUserPlatformAdminCommandHandler` no-op short-circuit | `jest.Mocked<T>`, co-located, no `@nestjs/testing` |
| Integration | Concurrent rotation yields exactly one pair; replay revokes the whole chain; migration up/down | `test/integration/*.integration-spec.ts`, real Postgres, two overlapping transactions |
| E2E | `GET /.well-known/jwks.json` anonymous 200 and no `d`; token verifies against the published key; `PLATFORM_ADMIN_EMAILS` grant and revoke across two logins | `test/*.e2e-spec.ts` + supertest |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or
process-integration boundary. The new HTTP route is an ordinary REST endpoint, not
command/process dispatch.

## Migration / Rollout

Single migration. `up()`: `DELETE FROM "session"` → `DROP CONSTRAINT UQ_session_user_id` →
`ADD COLUMN revoked_at TIMESTAMP NULL, replaced_by_session_id uuid NULL` → self-FK
`ON DELETE SET NULL` → non-unique `IDX_session_user_id`. `UQ_session_refresh_token_hash` is
retained (rotation always writes a fresh hash). `down()` reverses and re-deletes rows — safe,
never session-preserving in either direction. Provision `JWT_PRIVATE_KEY` **before** deploy.
Revoked rows accumulate; pruning is a follow-up, not MVP.

## Work Units (delivery)

| Unit | Scope | Est. lines | Depends on |
|---|---|---|---|
| WU-1 | RS256 + JWKS + config/env | ~300 | none |
| WU-2 | `platform_admin` bootstrap | ~300 | none |
| WU-3 | Session chain rotation + migration | ~550 | none |

All three are independently deployable. WU-2 and WU-3 both edit
`login-user.handler.ts` — land WU-2 first to keep the WU-3 diff clean. WU-3 alone exceeds
the 400-line review budget; chained PRs are recommended.

## Open Questions

- [ ] None blocking. Revoked-session pruning and multi-instance dev key sharing are
      deliberately deferred (see Migration / Rollout).

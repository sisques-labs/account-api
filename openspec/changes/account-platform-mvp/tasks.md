# Tasks: Account Platform MVP — Remaining Gap

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | WU-1 ~300, WU-2 ~300, WU-3a ~300, WU-3b ~250 (WU-3 total ~550) |
| 400-line budget risk | High (WU-3 alone) |
| Chained PRs recommended | Yes |
| Suggested split | WU-1 → WU-2 → WU-3a → WU-3b |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending — stacked-to-main suggested (WU-1/WU-2 independently deployable; WU-3b depends on WU-3a) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| WU-1 | RS256 signing + JWKS endpoint | PR 1 | `pnpm test -- jwks.service resolve-signing-key-pair` | `pnpm test:e2e -- jwks` | Revert `security.module.ts`, `main.ts` prefix exclusion, JWKS files — no schema change |
| WU-2 | `platform_admin` bootstrap | PR 2 (after WU-1) | `pnpm test -- reconcile-platform-admin set-user-platform-admin` | `pnpm test:e2e -- platform-admin` | Revert port/adapter/command + `login-user.handler.ts` reconcile call — no schema change |
| WU-3a | Session chain domain + persistence + migration | PR 3 (after WU-2) | `pnpm test -- session.aggregate` + `pnpm test:integration -- session-write.repository` | `pnpm test:integration -- rotation` (real Postgres) | `down()` migration reverses schema; no handler wiring yet, chain unused |
| WU-3b | Rotation + reuse-detection wiring | PR 4 (stacked on WU-3a) | `pnpm test -- refresh-session.handler` | `pnpm test:e2e -- refresh-rotation` | Revert `refresh-session.handler.ts`/`login-user.handler.ts` changes; WU-3a schema stays valid standalone |

## Phase 1: WU-1 — RS256 Signing + JWKS (independent)

- [ ] 1.1 Create `src/core/security/keys/signing-key-pair.interface.ts` — `{ privateKeyPem, publicKeyPem, kid }`.
- [ ] 1.2 Create `src/core/security/keys/resolve-signing-key-pair.ts` — decode base64 `JWT_PRIVATE_KEY` PEM, or generate an ephemeral dev keypair outside production; derive public key via `crypto.createPublicKey`; `kid` = RFC 7638 JWK thumbprint.
- [ ] 1.3 Create `src/core/security/keys/jwks.service.ts` — public PEM → JWK (`kty/use/alg/kid/n/e`); MUST NOT emit `d`.
- [ ] 1.4 Modify `src/core/config/auth.config.ts` — drop `jwtSecret`; add `jwtPrivateKey`/`jwtPublicKey`/`jwtKeyId`.
- [ ] 1.5 Modify `src/core/config/env.validation.ts` — `superRefine` throws when `NODE_ENV=production` and `JWT_PRIVATE_KEY` absent.
- [ ] 1.6 Modify `src/core/security/security.module.ts` — wire `privateKey`/`publicKey`, `algorithm: 'RS256'`, `keyid`, `verifyOptions.algorithms: ['RS256']`; add JWKS controller to `REST_CONTROLLERS`.
- [ ] 1.7 Create `src/core/security/transport/rest/dtos/json-web-key.dto.ts` + `jwks-response.dto.ts`.
- [ ] 1.8 Create `src/core/security/transport/rest/controllers/jwks.controller.ts` — `@Controller({ path: '.well-known', version: VERSION_NEUTRAL })`, `@Get('jwks.json')`, unauthenticated.
- [ ] 1.9 Modify `src/main.ts` — `setGlobalPrefix('api', { exclude: ['.well-known/jwks.json'] })`; `VERSION_NEUTRAL` alone is insufficient.
- [ ] 1.10 RED unit test `resolve-signing-key-pair.spec.ts` — prod without `JWT_PRIVATE_KEY` throws; dev generates an ephemeral pair.
- [ ] 1.11 RED unit test `jwks.service.spec.ts` — output never contains `d`.
- [ ] 1.12 E2E: anonymous `GET /.well-known/jwks.json` → 200, no `d`; token signed by `TokenSignService` verifies against the published key.
- [ ] 1.13 Update `docs/integration-guide.md` if signing algorithm/JWKS is documented there.

## Phase 2: WU-2 — Platform Admin Bootstrap (land before WU-3)

- [ ] 2.1 Modify `src/core/config/auth.config.ts` — add `platformAdminEmails: string[] | null`, trimmed + lowercased at load.
- [ ] 2.2 Create `src/contexts/user/application/services/write/assert-user-exists/assert-user-exists.service.ts`.
- [ ] 2.3 Create `src/contexts/user/application/commands/set-user-platform-admin/set-user-platform-admin.command.ts` + `.handler.ts` — `user.update({ platformAdmin })`.
- [ ] 2.4 Create `src/contexts/auth/application/ports/user-platform-admin.port.ts` — `IUserPlatformAdminPort` + `USER_PLATFORM_ADMIN_PORT`.
- [ ] 2.5 Create `src/contexts/auth/infrastructure/adapters/user-platform-admin.adapter.ts` — `CommandBus` dispatch only; no direct cross-context import.
- [ ] 2.6 Create `.../services/write/reconcile-platform-admin/reconcile-platform-admin.service.ts` — returns `boolean | null`.
  - Acceptance: `PLATFORM_ADMIN_EMAILS` **undefined** (absent from `process.env`) → return `null`, skip reconciliation entirely, no port dispatch, existing flag untouched.
  - Acceptance: `PLATFORM_ADMIN_EMAILS` **empty string** → parses to `[]`; if current flag is `true`, revoke to `false`; if already `false`, no-op.
  - Acceptance: `PLATFORM_ADMIN_EMAILS` **populated** → grant `true` when email present and flag not already `true`; revoke `false` when flag `true` and email now absent; no-op otherwise.
- [ ] 2.7 Modify `.../commands/login-user/login-user.handler.ts` — call reconcile service after auth success; sign token claims with the **reconciled** boolean, never the pre-reconciliation value.
- [ ] 2.8 RED unit test `reconcile-platform-admin.service.spec.ts` — full truth table: {undefined, empty, populated} × {email present, absent} × {flag true, false}.
- [ ] 2.9 RED unit test `set-user-platform-admin.handler.spec.ts` — no-op short-circuit when flag unchanged.
- [ ] 2.10 E2E: `PLATFORM_ADMIN_EMAILS` grants on login, then revokes on a second login after email removal.
- [ ] 2.11 Update `src/contexts/user/README.md`, `src/contexts/auth/README.md`, `docs/integration-guide.md`.

## Phase 3: WU-3a — Session Chain Domain + Persistence (after WU-2 lands)

- [ ] 3.1 Modify `src/contexts/auth/domain/aggregates/session.aggregate.ts` — add `revokedAt`, `replacedBySessionId`, `revoke()`, `isRevoked()`, `markReuseDetected()`; remove in-place `rotate()`.
- [ ] 3.2 Create `.../domain/interfaces/rotate-session-callback.interface.ts` and `rotate-result.interface.ts` (one type per file).
- [ ] 3.3 Create `.../domain/exceptions/refresh-token-reuse-detected.exception.ts` — maps to 401.
- [ ] 3.4 Modify `.../domain/repositories/write/session-write.repository.ts` — add `rotate()`, `revokeAllByUserId()`.
- [ ] 3.5 Modify TypeORM `session.entity.ts` — drop `UQ_session_user_id`; add nullable `revoked_at`, `replaced_by_session_id` self-FK `ON DELETE SET NULL`; non-unique `IDX_session_user_id`; keep `UQ_session_refresh_token_hash`.
- [ ] 3.6 Modify TypeORM mapper + write repository implementation — `rotate()` runs in one transaction using `pessimistic_write` (`SELECT ... FOR UPDATE`).
  - Acceptance: within the locked transaction, INSERT the successor session row **before** UPDATE-ing the current row's `revoked_at`/`replaced_by_session_id`. The self-FK rejects a reference to a not-yet-existing row — this is gardenia-api's own documented bug; do not repeat it.
- [ ] 3.7 Create `src/database/migrations/{ts}-SessionChainRotation.ts` — `up()`: `DELETE FROM "session"` → drop `UQ_session_user_id` → add nullable columns → self-FK → non-unique index. `down()` reverses and re-deletes rows (never session-preserving either direction).
- [ ] 3.8 RED unit test `session.aggregate.spec.ts` — `revoke`/`isRevoked` state transitions.
- [ ] 3.9 Integration test: concurrent rotation on the same token yields exactly one successful pair; the other finds the token already consumed.
- [ ] 3.10 Integration test: migration `up`/`down` round-trip against real Postgres.

## Phase 4: WU-3b — Rotation + Reuse-Detection Wiring (depends on WU-3a)

- [ ] 4.1 Modify `.../commands/refresh-session/refresh-session.handler.ts` — rotate through the locked callback. On `revoked_at IS NOT NULL` (replay), call `markReuseDetected()` + `revokeAllByUserId(userId)`, throw `RefreshTokenReuseDetectedException` (401). No reuse grace window — deliberate divergence from gardenia-api.
- [ ] 4.2 Modify `.../commands/login-user/login-user.handler.ts` — always create a new chain-root session (replaces the old `UNIQUE(user_id)` single-session reuse).
- [ ] 4.3 RED unit test `refresh-session.handler.spec.ts` — replaying a consumed token invalidates the whole chain and returns 401.
- [ ] 4.4 Integration test: replay of a consumed token marks every record in the chain invalidated; any other token from the same chain also 401s afterward.
- [ ] 4.5 E2E: successful rotation; concurrent refresh with the same token; replay after chain invalidation; legitimate holder of the latest never-consumed token rejected post-invalidation and must re-login.
- [ ] 4.6 Update `src/contexts/auth/README.md`.

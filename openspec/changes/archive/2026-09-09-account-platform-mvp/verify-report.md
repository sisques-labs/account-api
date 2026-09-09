# Verification Report: account-platform-mvp

**Change**: account-platform-mvp
**Branch verified**: chore/account-platform-mvp-archive (all 4 work-unit PRs #31-#34 consolidated into the feat/account-platform-mvp-wu1-jwks lineage)
**Mode**: Full artifact set (proposal + 3 delta specs + design + tasks)
**Verdict**: PASS WITH WARNINGS

## Task Completeness

40/40 tasks across 4 phases marked `[x]` in `tasks.md`. Verified against actual code, not just checkboxes (see Correctness section below).

## Command Evidence (executed live)

| Command | Result |
|---|---|
| `pnpm test:db:up` | Postgres + Keycloak test containers running |
| `pnpm test` | PASS — 89 suites / 415 tests, 51.3s |
| `pnpm test:integration` | PASS — 5 suites / 26 tests, 6.99s |
| `pnpm test:e2e` | PASS — 7 suites / 47 tests, 32.5s |
| `pnpm lint` (`eslint ... --fix`) | Clean — only pre-existing `eslint-plugin-boundaries` deprecation warnings (config-level), no errors |
| `npx tsc --noEmit` | Clean, zero output |
| `pnpm build` (`nest build`) | Exit 0 |
| `pnpm test:cov` | All files: 92.38% stmts / 81.38% branches / 87.75% funcs / 92.76% lines — exceeds the 80% `coverage_threshold` in `openspec/config.yaml` and the proposal's success criterion |

All numbers match the cumulative figures recorded during apply (WU-3b session: 415/26/47) — no regression since the last work-unit landed.

## Spec Compliance Matrix (9 requirements / 14 scenarios across 3 delta specs)

### auth-session-rotation (3 req / 5 scenarios) — all COMPLIANT
- Successful rotation → `session-typeorm-write.repository.ts::rotate()` (pessimistic_write lock) + integration/e2e green
- Concurrent refresh, same token → `test/identity-tenancy.e2e-spec.ts` "should reject exactly one of two concurrent refresh requests" → `[200,401]`
- Replay of a consumed token → `refresh-session.handler.spec.ts` reuse-detection block + `test/integration/session.repository.integration-spec.ts`
- Legitimate use after chain invalidation → `identity-tenancy.e2e-spec.ts` "should invalidate the whole chain on replay" (never-used successor also 401s)
- Deploy-time migration (breaking) → `src/database/migrations/1788200000000-SessionChainRotation.ts` (`DELETE FROM session` before schema change, both directions) + `test/integration/session-chain-migration.integration-spec.ts` up/down round-trip

### auth-token-signing (3 req / 4 scenarios) — 3 COMPLIANT, 1 CRITICAL-UNTESTED
- Token issuance (RS256 + kid) → COMPLIANT — `security.module.ts` (`algorithm: 'RS256'`, `keyid`) + `test/jwks.e2e-spec.ts`
- Unauthenticated JWKS fetch, no `d` → COMPLIANT — `jwks.controller.ts` + `jwks.service.ts` + e2e 200
- Verification against published key → COMPLIANT — `test/jwks.e2e-spec.ts` signs via `TokenSignService`, verifies with the fetched public key
- **Pre-cutover token presented after deploy (breaking)** → **CRITICAL — UNTESTED**. No test signs an HS256 token and asserts rejection. The enforcing mechanism exists (`verifyOptions.algorithms: ['RS256']` in `security.module.ts`; `TokenVerifyService` delegates straight to `JwtService.verify`, and `jsonwebtoken`'s algorithm allowlist rejects a mismatched `alg` header by construction), but searched all of `src/`, `test/*.e2e-spec.ts`, `test/integration/` for `HS256` and found no covering test. Low actual risk (standard library mechanism, not custom logic), but unproven at runtime for this scenario.

### platform-admin-bootstrap (3 req / 5 scenarios) — all COMPLIANT
- Email present in allowlist → `reconcile-platform-admin.service.spec.ts` full truth table + e2e grant test
- Email absent, flag already false → same truth-table spec (no-op branch)
- Revocation via allowlist removal → truth-table spec + e2e "grants on login, then revokes on a second login"
- Env var unset → skip entirely → `ReconcilePlatformAdminService.execute()` returns `null`; `login-user.handler.ts` short-circuits the port dispatch, signs `user.platformAdmin` unchanged
- Cross-context command path (port/adapter only) → `application/ports/user-platform-admin.port.ts` + `infrastructure/adapters/user-platform-admin.adapter.ts` (CommandBus dispatch only); confirmed no `src/contexts/auth/{domain,application}` file imports `src/contexts/user/{domain,application}` — also enforced and passing under the ESLint `boundaries/element-types` rule

**Net**: 13/14 scenarios COMPLIANT with runtime-passing tests. 1/14 CRITICAL-UNTESTED.

## Design Coherence

| Decision | Followed? | Evidence |
|---|---|---|
| RS256 + JWKS at `src/core/security/transport/rest/controllers/jwks.controller.ts` | YES | Exact path, `@Controller({ path: '.well-known', version: VERSION_NEUTRAL })`, unauthenticated |
| `main.ts` prefix exclusion (`VERSION_NEUTRAL` alone insufficient) | YES | `setGlobalPrefix('api', { exclude: ['.well-known/jwks.json'] })` |
| Session chain as linked-list (`replaced_by_session_id`/`revoked_at`, no `family_id`) | YES | `session.entity.ts`, `session.aggregate.ts`, migration — no `family_id` column anywhere |
| `pessimistic_write` lock, INSERT-successor-before-UPDATE-predecessor | YES | `session-typeorm-write.repository.ts::rotate()` — successor `manager.save()` runs before predecessor's, comment documents avoiding gardenia-api's FK-ordering bug |
| No reuse grace window | YES | `refresh-session.handler.ts` throws `RefreshTokenReuseDetectedException` immediately on `isRevoked()`, no grace-window logic anywhere |
| `platform_admin` tri-state reconciliation via new cross-context port | YES | `ReconcilePlatformAdminService` returns `boolean \| null`; port/adapter pattern matches `UserLookupAdapter` shape |
| Self-FK `ON DELETE SET NULL` on `replaced_by_session_id` | YES | Migration `ADD CONSTRAINT FK_session_replaced_by_session_id ... ON DELETE SET NULL` (entity has no `@ManyToOne` decorator — plain uuid column managed at migration level, consistent with this repo's existing self-referential FK patterns) |

No design deviations found beyond the two pre-accepted ones below.

## Known, Accepted Deviations (checked for documentation, not silently swept)

1. **Breaking session-schema migration forces re-login for all users on deploy.** Documented in `proposal.md` (Risks table + Rollback Plan), `design.md` (Migration/Rollout), the migration file's own JSDoc, and independently in PR #33's body ("forces re-login for all users on deploy. This is intentional per design.md, not an oversight."). Documented in 4 places, not silent.

2. **WU-3a and WU-3b exceeded the 400-line PR review budget.** WU-3a: +720/-44 (23 files, `git show --stat a2c1cab`). WU-3b: +346/-136 (10 files, `git show --stat df56135`). Both PR bodies (#33, #34, via `gh pr view`) contain an explicit "## Size exception" section stating `size:exception` with rationale (a breaking migration and its own multi-layer tests shouldn't be split from each other). An explicit, reasoned acceptance, not an absorbed overrun.

## Issues

### CRITICAL
1. **Pre-cutover HS256 token rejection scenario is untested.** `auth-token-signing/spec.md`'s "Signing Cutover Behavior" requirement / "Pre-cutover token presented after deploy" scenario has no unit, integration, or e2e test signing an HS256 token and asserting rejection by `TokenVerifyService`/the auth guard. The enforcing config (`verifyOptions.algorithms: ['RS256']`) is present, so actual runtime risk is low, but per this project's `strict_tdd: true` convention this scenario should have runtime proof before archive. Recommend adding one `token-verify.service.spec.ts` case or e2e case asserting rejection of a differently-signed token, or explicitly accepting this as a documented gap before merge to develop.

### WARNING
1. `.env.example`'s `REFRESH_TOKEN_TTL_DAYS` comment still reads "MVP: single active refresh token per user" — stale now that WU-3b removed that constraint (a user can hold multiple concurrent chains/devices). Cosmetic; not covered by the explicit README/doc-update task rule (which targets context READMEs and `docs/integration-guide.md`, both correctly updated).
2. `openspec/config.yaml`'s `context:` block remains stale (predates this change; still says NestJS 10 / pnpm 9.15.4 / "no bounded contexts yet") — already flagged at sdd-init/sdd-explore, re-confirmed here as still unfixed. Does not block this change.

### SUGGESTION
1. Consider pruning revoked session rows eventually — already flagged as an intentional deferral in `design.md`'s Migration/Rollout section.

## Summary

Every stated architectural decision (RS256 migration, JWKS placement, linked-list chain shape, INSERT-before-UPDATE lock ordering, no grace window, tri-state platform-admin reconciliation via port/adapter) is followed exactly and proven correct by passing tests at every layer. Both known deviations (forced re-login, 400-line budget exceptions) are properly documented in multiple places and were reasoned, explicit acceptances — not silent scope creep. The one CRITICAL finding is a missing test for the HS256-rejection scenario; the underlying enforcement mechanism is present and standard, but per this repo's own strict-TDD rule it should have runtime proof before archive.

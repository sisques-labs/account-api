# Proposal: Account Platform MVP — remaining gap

## Intent

Three MVP items from the Sisques Account architecture doc are unbuilt or built against a different design. Registration/login, `POST /tenants` with auto-owner, and adding an existing user as a member already ship. The gap is: refresh rotation deviates from the mandated gardenia-api pattern, tokens are signed HS256 with no JWKS, and `platform_admin` has guard machinery but no bootstrap. Blast radius is zero today (no external consumer holds `JWT_SECRET`), so this is the cheapest moment to close it.

## Scope

### In Scope
- Port gardenia-api's refresh rotation: pessimistic row lock on rotation plus reuse-chain detection (replaying a consumed token invalidates the whole chain). Schema/behavior change on `session`.
- Migrate JWT signing HS256 → RS256 (`TokenSignService`, `TokenVerifyService`, `SecurityModule`, `auth.config`).
- Expose `GET /.well-known/jwks.json` publishing the public key.
- `platform_admin` bootstrap from `PLATFORM_ADMIN_EMAILS`, reconciled on every login.
- Migration for the session schema change; README + integration-guide updates.

### Out of Scope
- `account-web` frontend; `tenant_invite` email invitations; migrating `gardenia-api` to delegate here.
- `GET /api/token` SPA endpoint; end-to-end `COOKIE_DOMAIN` verification.
- Archiving `add-tenancy-rbac` (separate housekeeping).

## Capabilities

### New Capabilities
- `auth-session-rotation`: locked refresh rotation with reuse-chain invalidation.
- `auth-token-signing`: RS256 asymmetric signing and JWKS publication.
- `platform-admin-bootstrap`: env-driven platform admin reconciliation at login.

### Modified Capabilities
- None (`openspec/specs/` is empty; no archived spec changes).

## Approach

Port, do not redesign. Replace the single-row `UNIQUE(user_id)` session model with the gardenia-api chain model (`SELECT … FOR UPDATE` on rotation, consumed-token marker, chain invalidation). Keep signing behind the existing `TokenSignService`/`TokenVerifyService` seam so RS256 is a config + key-source change, not a call-site change. Bootstrap runs inside `LoginUserCommandHandler` via a new user-context port/adapter driving a `SetUserPlatformAdmin` command — no direct cross-context import.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/contexts/auth/domain/aggregates/session.aggregate.ts` | Modified | Chain fields, consumption, invalidation |
| `src/contexts/auth/infrastructure/persistence/typeorm/` | Modified | Entity, mapper, locking repository |
| `src/contexts/auth/application/commands/refresh-session/` | Modified | Lock + reuse detection |
| `src/contexts/auth/application/commands/login-user/` | Modified | Admin reconciliation, chain start |
| `src/contexts/auth/transport/rest/controllers/` | New | JWKS controller (public) |
| `src/core/security/security.module.ts`, `src/core/config/auth.config.ts` | Modified | RS256 keypair config |
| `src/contexts/user/application/commands/` | New | `set-user-platform-admin` |
| `src/database/migrations/` | New | Session chain migration |
| `docs/integration-guide.md`, context READMEs | Modified | RS256/JWKS/admin docs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| RS256 cutover invalidates live sessions | Med | No external consumers yet; cut over in one deploy, document forced re-login |
| Private key handling in env/secrets | Med | Key from env/secret store only, never committed; JWKS exposes public key only |
| Lock contention on concurrent refresh | Low | Row-scoped `FOR UPDATE`, short transaction, integration test for concurrent rotation |
| Session migration drops active sessions | Med | Migration truncates sessions deliberately; documented as forced re-login |
| Stale `openspec/config.yaml` `context:` misleads later phases | High | Verify stack from `package.json` and existing contexts; fix config separately |

## Rollback Plan

Revert the change commits and run the migration `down()` (restores the single-session schema). Restore `JWT_SECRET` in the environment; `SecurityModule` returns to HS256 and the JWKS route disappears. All users must re-authenticate in either direction — rollback is safe but not session-preserving. `PLATFORM_ADMIN_EMAILS` becomes inert once unset; already-flagged users keep their flag until manually cleared.

## Dependencies

- RSA keypair provisioning (private key in the deployment secret store).
- gardenia-api's rotation implementation as the reference source.

## Success Criteria

- [ ] Replaying a consumed refresh token invalidates the entire session chain and returns 401.
- [ ] Concurrent refresh with the same token yields exactly one new token pair (integration test, real Postgres).
- [ ] Access tokens verify as RS256 against the key served by `GET /.well-known/jwks.json`, unauthenticated.
- [ ] A user whose email is in `PLATFORM_ADMIN_EMAILS` receives `platformAdmin: true` in claims after login; removal from the env var revokes it.
- [ ] `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, and `pnpm build` pass; coverage ≥ 80%.

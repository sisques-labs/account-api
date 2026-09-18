# Platform Admin Bootstrap Specification

## Purpose

Reconciles each user's `platformAdmin` flag against the `PLATFORM_ADMIN_EMAILS`
env var on every login, so platform admins are provisioned/revoked purely by
env config. Reconciliation runs inside `auth`'s `LoginUserCommandHandler` but
mutates `user`-context state exclusively through a public command reached via
a port/adapter — never a direct cross-context import.

## Requirements

### Requirement: Platform Admin Reconciliation on Login

When `PLATFORM_ADMIN_EMAILS` is set, every successful login MUST reconcile
the authenticating user's `platformAdmin` flag against it: set `true` when
the user's email is present and the flag is not already `true`; clear it to
`false` when the flag is `true` but the email is no longer present.

#### Scenario: Email present in allowlist

- GIVEN `PLATFORM_ADMIN_EMAILS` contains the authenticating user's email
- WHEN the user logs in successfully
- THEN the system sets/keeps `platformAdmin: true` on the user
- AND the issued access token claims include `platformAdmin: true`

#### Scenario: Email absent from allowlist, flag already false

- GIVEN `PLATFORM_ADMIN_EMAILS` is set and does not contain the user's email,
  and the user's `platformAdmin` flag is currently `false`
- WHEN the user logs in successfully
- THEN the system leaves `platformAdmin` as `false`
- AND the issued token claims include `platformAdmin: false`

#### Scenario: Revocation via allowlist removal

- GIVEN a user previously flagged `platformAdmin: true` whose email has been
  removed from `PLATFORM_ADMIN_EMAILS` (the var remains set)
- WHEN the user logs in again
- THEN the system clears `platformAdmin` to `false`
- AND the issued token claims reflect `platformAdmin: false`

### Requirement: Reconciliation Gated by Env Var Presence

The system MUST skip reconciliation entirely when `PLATFORM_ADMIN_EMAILS` is
unset, leaving any existing `platformAdmin` flag unchanged. Unsetting the
variable MUST NOT itself revoke previously granted flags.

#### Scenario: Env var unset

- GIVEN `PLATFORM_ADMIN_EMAILS` is not set in the environment
- WHEN a user logs in, regardless of their stored `platformAdmin` value
- THEN the system performs no reconciliation
- AND the user's `platformAdmin` flag remains unchanged

### Requirement: Cross-Context Command Path for Reconciliation

Because `UserAggregate.changePlatformAdmin()` is private and reachable only
via `update()`, the `auth` context MUST reconcile platform-admin status
through a dedicated public command (e.g. `SetUserPlatformAdmin`) exposed by
the `user` context, invoked exclusively through a port/adapter pair
(`application/ports/` + `infrastructure/adapters/`). `auth`'s
domain/application layers MUST NOT import `user`'s domain or application
code directly.

#### Scenario: Reconciliation invocation

- GIVEN `LoginUserCommandHandler` in the `auth` context determines a user's
  `platformAdmin` flag must change
- WHEN it performs reconciliation
- THEN it dispatches the change through its injected `user`-context port
- AND the port's adapter translates the call into a `CommandBus` dispatch of
  `SetUserPlatformAdmin`
- AND no file under `src/contexts/auth/domain/` or
  `src/contexts/auth/application/` imports from `src/contexts/user/domain/`
  or `src/contexts/user/application/`

# Auth Session Rotation Specification

## Purpose

Refresh-token rotation for the `auth` bounded context, hardened to the
gardenia-api reference pattern: pessimistic row locking on rotation and
reuse-chain detection. Replaces the current `UNIQUE(user_id)` single-session
model with a chain model where each rotation produces a new linked token and
reuse of any consumed token invalidates the whole chain.

## Requirements

### Requirement: Locked Refresh Rotation

The system MUST acquire a pessimistic row lock (`SELECT ... FOR UPDATE`) on
the session record identified by the presented refresh token before
evaluating rotation, and MUST mark the presented token consumed and issue its
successor within that same locked transaction.

#### Scenario: Successful rotation

- GIVEN a valid, unconsumed refresh token belonging to an active session chain
- WHEN the client submits a refresh request with that token
- THEN the system locks the session row for update
- AND marks the presented token as consumed
- AND issues a new access/refresh token pair linked to the same chain
- AND commits the transaction, releasing the lock

#### Scenario: Concurrent refresh with the same token

- GIVEN two concurrent refresh requests carrying the same valid refresh token
- WHEN both requests reach the rotation handler at nearly the same time
- THEN exactly one request acquires the row lock and completes rotation
- AND the other request, upon acquiring the lock afterward, finds the token
  already consumed and is rejected as a reuse attempt

### Requirement: Reuse Detection and Full Chain Invalidation

The system MUST treat redemption of an already-consumed refresh token as a
reuse/replay event. On detection, the system MUST invalidate every
session/token record in that chain — the original session and every
descendant token issued through prior rotations — so none can ever be
redeemed again, and MUST return `401 Unauthorized` to the triggering request.

#### Scenario: Replay of a consumed token

- GIVEN a refresh token that was already rotated (consumed) earlier in its
  chain
- WHEN a client attempts to redeem that consumed token again
- THEN the system marks every session/token record in the chain as
  invalidated
- AND returns `401 Unauthorized` to the replaying request
- AND any other token from the same chain also returns `401` on subsequent
  use

#### Scenario: Legitimate use after chain invalidation

- GIVEN a session chain invalidated by reuse detection
- WHEN the legitimate holder of the latest, never-consumed token attempts to
  refresh
- THEN the system rejects the request with `401` because the chain is
  invalidated
- AND the user MUST log in again to establish a new chain

### Requirement: Session Schema Migration (Breaking Change)

The system MUST replace the `UNIQUE(user_id)` constraint on `session` with a
chain-capable schema (chain/parent linkage, consumed-at marker) via a
migration. The migration MUST NOT silently preserve pre-migration single-row
sessions as valid; it MUST invalidate or remove them so no pre-migration
refresh token remains redeemable after deploy.

#### Scenario: Deploy-time migration

- GIVEN a production database with existing single-row sessions under the old
  schema
- WHEN the migration runs
- THEN existing session rows are invalidated or dropped
- AND every previously authenticated user MUST log in again to obtain a new
  session chain
- AND no pre-migration refresh token is accepted by the rotation endpoint
  after the migration completes

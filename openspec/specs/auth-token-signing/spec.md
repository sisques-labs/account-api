# Auth Token Signing Specification

## Purpose

Migrates access-token signing from HS256 (shared secret) to RS256
(asymmetric key pair) and publishes the public verification key via a
standard JWKS endpoint. Signing/verification stay centralized behind
`TokenSignService` / `TokenVerifyService` in `SecurityModule`, so this is a
key-source and algorithm change, not a call-site change.

## Requirements

### Requirement: RS256 Access Token Signing

The system MUST sign access tokens using RS256 with an asymmetric key pair
sourced from environment/secret configuration, exclusively through
`TokenSignService`. The system MUST NOT sign new tokens with HS256 after
cutover.

#### Scenario: Token issuance

- GIVEN a successful login or refresh
- WHEN the system issues an access token
- THEN the token is signed with the configured RS256 private key
- AND the token header's `kid` matches a key published at
  `GET /.well-known/jwks.json`

### Requirement: Public JWKS Endpoint

The system MUST expose `GET /.well-known/jwks.json`, unauthenticated,
returning a JSON Web Key Set containing the public key(s) that verify tokens
issued by `TokenSignService`. The endpoint MUST NOT expose private key
material.

#### Scenario: Unauthenticated JWKS fetch

- GIVEN the service is running with a configured RSA key pair
- WHEN an anonymous client sends `GET /.well-known/jwks.json`
- THEN the response is `200` with a JSON body containing a `keys` array
- AND each key entry includes `kty: "RSA"`, `use: "sig"`, `alg: "RS256"`,
  `kid`, `n`, `e`
- AND no `d` (private exponent) or other private-key field is present

#### Scenario: Verification against the published key

- GIVEN an access token signed by the current RSA private key
- WHEN a resource server verifies the token via `TokenVerifyService` using
  the public key fetched from `GET /.well-known/jwks.json`
- THEN the signature validates successfully

### Requirement: Signing Cutover Behavior (Breaking Change)

Because HS256-signed tokens cannot be verified by the RS256 verification
path, the system MUST accept that tokens issued before the cutover become
unverifiable after deploy. The system MUST NOT implement dual HS256/RS256
verification as a compatibility bridge.

#### Scenario: Pre-cutover token presented after deploy

- GIVEN an access token issued before the RS256 migration (signed HS256)
- WHEN it is presented to an endpoint protected by `TokenVerifyService`
  after deploy
- THEN verification fails and the request is rejected as unauthorized
- AND the client MUST re-authenticate to obtain a new RS256-signed token

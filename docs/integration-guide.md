# Integration guide — building an app on Sisques Account

Audience: engineers working on a **consumer app** (`gardenia-api`,
`nexora-api`, or a future one) that wants to delegate identity + tenancy to
this service instead of rolling its own. This is the "how does my app
actually log a user in" doc — for how `account-api` itself is built, see the
root `README.md` and each context's own `README.md`.

Full target design (including the parts not built yet) lives in
`/Users/javi/Documents/projects/sisques-labs/sisques-account-architecture.md`.
This guide only documents what's **actually implemented today** in this
repo, and calls out explicitly where today's shortcuts diverge from that
design.

---

## 1. Register / log in / refresh

Your app never talks to Keycloak. It talks to `account-api`'s REST API:

```
POST /api/v1/auth/register   { email, password, displayName }  -> 201
POST /api/v1/auth/login      { email, password }                -> 200 { accessToken, refreshToken }
POST /api/v1/auth/refresh    { refreshToken }                   -> 200 { accessToken, refreshToken }
```

- `login`/`refresh` responses also set `access_token`/`refresh_token` as
  `httpOnly` cookies (see §3 for why you likely can't rely on that yet).
- `refresh` **rotates** the refresh token — the old one is invalidated the
  moment you call this. There's no reuse-detection grace window (MVP
  simplification, see `src/contexts/auth/README.md`), so don't call it twice
  in parallel with the same token.
- Full multi-step example (register → login → create app/tenant → add
  member → refresh) is in the root `README.md`'s "Example flow" — same API,
  copy-paste-able with `curl`.

## 2. Validating the access token in your own app

This is the part the architecture doc describes as "SSR app validates the
JWT locally with Sisques Account's public key" — **that's not what's built**.
Today:

- The access token is signed **HS256 with a shared secret** (`JWT_SECRET`,
  see `src/core/config/auth.config.ts` / `security.module.ts`), not an
  asymmetric key pair. There is **no public key and no JWKS endpoint**
  exposed by `account-api`.
- Practical consequence: to validate a token locally today, your app's
  backend needs the **same `JWT_SECRET` value** as `account-api` (shared via
  your deployment's secrets, the same way you'd share a DB password) and
  verify with a standard JWT library (`jsonwebtoken`, `@nestjs/jwt`, etc.),
  algorithm `HS256`.
- **This is a known gap, not a final decision.** Sharing a symmetric secret
  across every consumer app works for now but doesn't match the design
  intent (issuer holds the private key, consumers only ever need the public
  one). Moving to RS256 + a `GET /.well-known/jwks.json`-style endpoint is
  the natural fix before a second real consumer app goes to production —
  it's flagged here so nobody mistakes "shared secret" for the intended
  end state.

### Claims shape (`IAccessTokenClaims`)

```json
{
  "sub": "<userId>",
  "email": "<email>",
  "platformAdmin": false,
  "tenants": [{ "tenantId": "...", "role": "owner" }]
}
```

- `tenants` is a snapshot taken at sign time (login/refresh) — creating a
  tenant or being added as a member doesn't retroactively update an
  already-issued token. A client needs to re-login or wait for its next
  refresh to see a new membership.
- `role` is a free-text label `account-api` stores but never interprets
  beyond `owner` (which controls invite/remove/rename/delete on the
  platform side). What each role *means* inside your app (e.g. Gardenia's
  "member" can water but not delete plants) is entirely your app's own
  authorization logic — `account-api` just carries the label.
- Token TTL is short (`JWT_EXPIRES_IN`, default 15m) by design, so budget
  for the refresh flow (§1) rather than trying to cache a token long-term.

## 3. Two consumption patterns (per the design) — status today

The architecture doc describes two patterns for how a consumer app plugs
in. Neither is exercised end-to-end yet because there's no consumer app or
`account-web` wired up — the notes below are what you'd need to build to
follow each one, not something you can drop in as-is.

**Pattern A — app with its own backend (SSR).** Read the `access_token`
cookie on each request, verify it locally (§2), attach the resulting claims
to the request. This works **only if** your app's backend and
`account-api` share a cookie domain (`Domain=.sisqueslabs.com` in
production) — `COOKIE_DOMAIN` is unset by default in this repo's
`.env.example` and no app currently sets it, so the cookie today only ever
round-trips to the same host it was issued from. Until that's turned on
end-to-end, use the `Authorization: Bearer` header (from the JSON body
instead of the cookie) — the same `JwtAuthGuard` pattern this repo uses
internally (`src/core/security/guards/jwt-auth.guard.ts`) reads only the
header, not the cookie, for exactly this reason.

**Pattern B — SPA + its own API.** The design calls for
`GET login.sisqueslabs.com/api/token` (`credentials: include`) so
browser JS can pull the JWT out of the httpOnly cookie via a same-site
request, then forward it as `Authorization: Bearer` to your own API. **This
endpoint does not exist in `account-api` yet.** Until it's added, a
browser-side client has no way to get the JWT out of an httpOnly cookie —
you'd need to call `/auth/login` yourself and hold the token client-side
(losing the httpOnly XSS protection), or wait for this endpoint.

**The redirect-to-`login.sisqueslabs.com` login page** (`account-web`)
also doesn't exist yet — it's explicitly out of MVP scope (see root
README). Until then, "logging a user in" from your app means calling
`/auth/login` directly (server-to-server or from your own login form),
not redirecting to a Sisques Account–hosted page.

## 4. Summary — what you can rely on today vs. not

| Capability | Status |
|---|---|
| Register / login / refresh via REST | ✅ Implemented (`/api/v1/auth/*`) |
| `Authorization: Bearer` validation in your own backend | ✅ Works, but requires sharing `JWT_SECRET` (see §2 gap) |
| Tenant creation / membership (capa 1 tenancy) | ✅ Implemented (`/api/v1/tenants*`, `/api/v1/apps*` — see root README example) |
| Shared-cookie SSO across `*.sisqueslabs.com` (Pattern A) | ❌ Not wired up (`COOKIE_DOMAIN` unset, untested end-to-end) |
| `GET /api/token` for SPA clients (Pattern B) | ❌ Not built |
| Hosted login page (`account-web`) + redirect flow | ❌ Not built (out of MVP scope) |
| Asymmetric signing (RS256) + JWKS endpoint | ❌ Not built — currently a shared HS256 secret |
| Email-based tenant invites | ❌ Not built (out of MVP scope) |

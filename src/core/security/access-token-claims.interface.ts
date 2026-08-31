/**
 * Payload of Sisques Account's own access token. Shared/core because every
 * bounded context's transport layer needs to authenticate requests — not
 * owned by `auth` even though `auth` is the only context that SIGNS tokens
 * (via its own TokenSignService, using the same JwtService this module
 * provides).
 */
export interface IAccessTokenClaims {
  sub: string;
  email: string;
  platformAdmin: boolean;
  tenants: Array<{ tenantId: string; role: string }>;
}

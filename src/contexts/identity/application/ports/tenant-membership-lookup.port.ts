import { ITenantMembershipClaim } from '@contexts/identity/application/ports/tenant-membership-claim.interface';

export const TENANT_MEMBERSHIP_LOOKUP_PORT = Symbol(
  'TENANT_MEMBERSHIP_LOOKUP_PORT',
);

/**
 * Cross-context port into the `tenancy` context — resolves a user's tenant
 * memberships/roles so they can be embedded in the access token claims.
 * Implemented by `TenantMembershipLookupAdapter`, which dispatches a query
 * via QueryBus. Never import `@contexts/tenancy` directly outside
 * `infrastructure/adapters/` (boundary rule).
 */
export interface ITenantMembershipLookupPort {
  findMembershipsByUserId(userId: string): Promise<ITenantMembershipClaim[]>;
}

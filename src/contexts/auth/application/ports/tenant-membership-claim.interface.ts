/** One row of the JWT `tenants` claim — a tenant/role pair for the subject. */
export interface ITenantMembershipClaim {
  tenantId: string;
  role: string;
}

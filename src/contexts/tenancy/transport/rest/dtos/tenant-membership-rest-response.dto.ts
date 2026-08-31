export interface TenantMembershipRestResponseDto {
  id: string;
  tenantId: string;
  userId: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

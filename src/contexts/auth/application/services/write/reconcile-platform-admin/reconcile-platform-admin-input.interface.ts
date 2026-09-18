export interface IReconcilePlatformAdminInput {
  email: string;
  currentPlatformAdmin: boolean;
  // `null` = `PLATFORM_ADMIN_EMAILS` absent from process.env (skip
  // reconciliation entirely). An empty array means the var is set but
  // empty, which revokes every admin.
  platformAdminEmails: string[] | null;
}

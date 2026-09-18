import { IReconcilePlatformAdminInput } from '@contexts/auth/application/services/write/reconcile-platform-admin/reconcile-platform-admin-input.interface';
import { Injectable } from '@nestjs/common';
import { IBaseService } from '@sisques-labs/nestjs-kit';

/**
 * Pure reconciliation logic for `platform-admin-bootstrap`. Returns the
 * value `LoginUserCommandHandler` must both dispatch through
 * `IUserPlatformAdminPort` and sign into the access-token claims:
 * - `null` when `PLATFORM_ADMIN_EMAILS` is unset (skip entirely — the
 *   caller keeps using `currentPlatformAdmin`), or when the target state
 *   already matches the current flag (no-op).
 * - The reconciled boolean when a change is actually needed.
 */
@Injectable()
export class ReconcilePlatformAdminService implements IBaseService<
  IReconcilePlatformAdminInput,
  boolean | null
> {
  async execute(input: IReconcilePlatformAdminInput): Promise<boolean | null> {
    const { email, currentPlatformAdmin, platformAdminEmails } = input;

    if (platformAdminEmails === null) return null;

    const normalizedEmail = email.trim().toLowerCase();
    const shouldBeAdmin = platformAdminEmails.includes(normalizedEmail);

    if (shouldBeAdmin === currentPlatformAdmin) return null;

    return shouldBeAdmin;
  }
}

import { BaseException } from '@sisques-labs/nestjs-kit';

/**
 * Thrown when an already-consumed (revoked) refresh token is redeemed
 * again. Maps to 401 — see `auth-session-rotation/spec.md`'s Reuse
 * Detection requirement. Not yet thrown by any handler in WU-3a; wired
 * into `RefreshSessionCommandHandler` by WU-3b.
 */
export class RefreshTokenReuseDetectedException extends BaseException {
  constructor() {
    super('Refresh token reuse detected; session chain invalidated');
  }
}

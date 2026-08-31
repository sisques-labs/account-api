import { BaseException } from '@sisques-labs/nestjs-kit';

/** No platform user exists with the given email/id — cannot add as a member. */
export class MemberUserNotFoundException extends BaseException {
  constructor(identifier: string) {
    super(`No user found for "${identifier}" to add as a tenant member`);
  }
}

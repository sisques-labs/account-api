import { DisplayNameValueObject } from '@contexts/user/domain/value-objects/display-name/display-name.vo';
import { ExternalIdValueObject } from '@contexts/user/domain/value-objects/external-id/external-id.vo';
import { UserEmailValueObject } from '@contexts/user/domain/value-objects/user-email/user-email.vo';

export interface CreateUserCommandInput {
  externalId: string;
  email: string;
  displayName?: string;
}

/**
 * Creates the local platform `user` row. Dispatched cross-context by
 * `auth`'s `UserProvisioningAdapter` (via `CommandBus`) after `auth` has
 * already registered the identity with the external provider (Keycloak) —
 * see the `user` context README's "One context or two?" section.
 */
export class CreateUserCommand {
  public readonly externalId: ExternalIdValueObject;
  public readonly email: UserEmailValueObject;
  public readonly displayName?: DisplayNameValueObject;

  constructor(input: CreateUserCommandInput) {
    this.externalId = new ExternalIdValueObject(input.externalId);
    this.email = new UserEmailValueObject(input.email);
    this.displayName =
      input.displayName !== undefined
        ? new DisplayNameValueObject(input.displayName)
        : undefined;
  }
}

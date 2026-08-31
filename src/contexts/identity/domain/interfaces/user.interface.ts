import { DisplayNameValueObject } from '@contexts/identity/domain/value-objects/display-name/display-name.vo';
import { ExternalIdValueObject } from '@contexts/identity/domain/value-objects/external-id/external-id.vo';
import { RefreshTokenHashValueObject } from '@contexts/identity/domain/value-objects/refresh-token-hash/refresh-token-hash.vo';
import { UserEmailValueObject } from '@contexts/identity/domain/value-objects/user-email/user-email.vo';
import { UserIdValueObject } from '@contexts/identity/domain/value-objects/user-id/user-id.vo';
import { BooleanValueObject, DateValueObject } from '@sisques-labs/nestjs-kit';

export interface IUser {
  id: UserIdValueObject;
  externalId: ExternalIdValueObject;
  email: UserEmailValueObject;
  displayName: DisplayNameValueObject;
  platformAdmin: BooleanValueObject;
  refreshTokenHash: RefreshTokenHashValueObject | null;
  refreshTokenExpiresAt: DateValueObject | null;
  createdAt: DateValueObject;
  updatedAt: DateValueObject;
}

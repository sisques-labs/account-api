import { DisplayNameValueObject } from '@contexts/user/domain/value-objects/display-name/display-name.vo';
import { ExternalIdValueObject } from '@contexts/user/domain/value-objects/external-id/external-id.vo';
import { UserEmailValueObject } from '@contexts/user/domain/value-objects/user-email/user-email.vo';
import { BooleanValueObject, IBaseAggregate } from '@sisques-labs/nestjs-kit';

export interface IUser extends IBaseAggregate {
  externalId: ExternalIdValueObject;
  email: UserEmailValueObject;
  displayName: DisplayNameValueObject;
  platformAdmin: BooleanValueObject;
}

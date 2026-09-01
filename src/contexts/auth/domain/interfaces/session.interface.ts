import { RefreshTokenHashValueObject } from '@contexts/auth/domain/value-objects/refresh-token-hash/refresh-token-hash.vo';
import {
  DateValueObject,
  IBaseAggregate,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

export interface ISession extends IBaseAggregate {
  userId: UuidValueObject;
  refreshTokenHash: RefreshTokenHashValueObject;
  expiresAt: DateValueObject;
}

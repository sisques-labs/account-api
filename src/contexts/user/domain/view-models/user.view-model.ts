import { IUserPrimitives } from '@contexts/user/domain/primitives/user.primitives';
import { BaseViewModel } from '@sisques-labs/nestjs-kit';

export class UserViewModel extends BaseViewModel {
  public readonly externalId: string;
  public readonly email: string;
  public readonly displayName: string | null;
  public readonly platformAdmin: boolean;

  constructor(
    props: Omit<IUserPrimitives, 'refreshTokenHash' | 'refreshTokenExpiresAt'>,
  ) {
    super(props.id, props.createdAt, props.updatedAt);
    this.externalId = props.externalId;
    this.email = props.email;
    this.displayName = props.displayName;
    this.platformAdmin = props.platformAdmin;
  }
}

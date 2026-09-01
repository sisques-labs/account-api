import { ISessionPrimitives } from '@contexts/auth/domain/primitives/session.primitives';
import { BaseViewModel } from '@sisques-labs/nestjs-kit';

export class SessionViewModel extends BaseViewModel {
  public readonly userId: string;
  public readonly expiresAt: Date;

  constructor(props: Omit<ISessionPrimitives, 'refreshTokenHash'>) {
    super(props.id, props.createdAt, props.updatedAt);
    this.userId = props.userId;
    this.expiresAt = props.expiresAt;
  }
}

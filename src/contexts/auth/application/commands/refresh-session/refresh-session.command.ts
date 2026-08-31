import { RefreshTokenValueObject } from '@contexts/auth/domain/value-objects/refresh-token/refresh-token.vo';

export interface RefreshSessionCommandInput {
  refreshToken: string;
}

export class RefreshSessionCommand {
  public readonly refreshToken: RefreshTokenValueObject;

  constructor(input: RefreshSessionCommandInput) {
    this.refreshToken = new RefreshTokenValueObject(input.refreshToken);
  }
}

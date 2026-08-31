import { StringValueObject } from '@sisques-labs/nestjs-kit';

export interface RefreshSessionCommandInput {
  refreshToken: string;
}

export class RefreshSessionCommand {
  public readonly refreshToken: StringValueObject;

  constructor(input: RefreshSessionCommandInput) {
    this.refreshToken = new StringValueObject(input.refreshToken, {
      minLength: 1,
    });
  }
}

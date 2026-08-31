import { IAccessTokenClaims } from '@core/security/access-token-claims.interface';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IBaseService } from '@sisques-labs/nestjs-kit';

/** Verifies and decodes Sisques Account's own access tokens. */
@Injectable()
export class TokenVerifyService implements IBaseService<
  string,
  IAccessTokenClaims
> {
  constructor(private readonly jwtService: JwtService) {}

  async execute(token: string): Promise<IAccessTokenClaims> {
    return this.jwtService.verify<IAccessTokenClaims>(token);
  }
}

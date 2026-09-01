import { IAccessTokenClaims } from '@core/security/access-token-claims.interface';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IBaseService } from '@sisques-labs/nestjs-kit';

/**
 * Signs Sisques Account's OWN access tokens. This is the platform's signing
 * boundary — apps only ever trust this token, never a Keycloak-issued one
 * (see architecture doc, "Modelo de sesión y tokens").
 */
@Injectable()
export class TokenSignService implements IBaseService<
  IAccessTokenClaims,
  string
> {
  constructor(private readonly jwtService: JwtService) {}

  async execute(claims: IAccessTokenClaims): Promise<string> {
    return this.jwtService.sign({ ...claims, sub: claims.sub });
  }
}

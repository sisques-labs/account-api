import { IAccessTokenClaims } from '@core/security/access-token-claims.interface';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Signs and verifies Sisques Account's OWN access tokens. This is the
 * platform's signing boundary — apps only ever trust this token, never a
 * Keycloak-issued one (see architecture doc, "Modelo de sesión y tokens").
 */
@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  sign(claims: IAccessTokenClaims): string {
    return this.jwtService.sign({ ...claims, sub: claims.sub });
  }

  verify(token: string): IAccessTokenClaims {
    return this.jwtService.verify<IAccessTokenClaims>(token);
  }
}

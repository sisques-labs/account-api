import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

/** Generates an opaque, high-entropy refresh token — never a JWT. */
@Injectable()
export class GenerateRefreshTokenService {
  execute(): string {
    return randomBytes(32).toString('base64url');
  }
}

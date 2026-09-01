import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { IBaseService } from '@sisques-labs/nestjs-kit';

/** Generates an opaque, high-entropy refresh token — never a JWT. */
@Injectable()
export class GenerateRefreshTokenService implements IBaseService<void, string> {
  async execute(): Promise<string> {
    return randomBytes(32).toString('base64url');
  }
}

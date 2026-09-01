import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { IBaseService } from '@sisques-labs/nestjs-kit';

/** SHA-256 hashes a raw refresh token for at-rest storage/lookup. */
@Injectable()
export class HashRefreshTokenService implements IBaseService<string, string> {
  async execute(rawToken: string): Promise<string> {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}

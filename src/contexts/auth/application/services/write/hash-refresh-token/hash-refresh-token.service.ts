import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

/** SHA-256 hashes a raw refresh token for at-rest storage/lookup. */
@Injectable()
export class HashRefreshTokenService {
  execute(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}

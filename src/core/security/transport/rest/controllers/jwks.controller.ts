import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwksService } from '@core/security/keys/jwks.service';
import { JwksResponseDto } from '@core/security/transport/rest/dtos/jwks-response.dto';

/**
 * Publishes the RSA public key(s) that verify Sisques Account's own access
 * tokens, at the standard `GET /.well-known/jwks.json` location.
 * Unauthenticated by design — `main.ts` excludes this path from the global
 * `api` prefix so it stays at the well-known root, not `/api/.well-known/...`.
 */
@ApiTags('jwks')
@Controller({ path: '.well-known', version: VERSION_NEUTRAL })
export class JwksController {
  private readonly logger = new Logger(JwksController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jwksService: JwksService,
  ) {}

  @Get('jwks.json')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publishes the RSA public key(s) that verify access tokens',
  })
  @ApiResponse({ status: 200, type: JwksResponseDto })
  async jwks(): Promise<JwksResponseDto> {
    this.logger.debug('JWKS requested');
    const key = await this.jwksService.execute({
      publicKeyPem: this.config.getOrThrow<string>('auth.jwtPublicKey'),
      kid: this.config.getOrThrow<string>('auth.jwtKeyId'),
    });
    return { keys: [key] };
  }
}

import { JwtAuthGuard } from '@core/security/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '@core/security/guards/platform-admin.guard';
import { JwksService } from '@core/security/keys/jwks.service';
import { JwksController } from '@core/security/transport/rest/controllers/jwks.controller';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';

const REST_CONTROLLERS = [JwksController];

/**
 * Cross-cutting JWT infrastructure: the one `JwtService` every bounded
 * context shares — `auth`'s `TokenSignService` signs with it, `JwtAuthGuard`
 * (exported here) verifies with it. `PlatformAdminGuard` is exported
 * alongside it (no JWT dependency of its own, but it must run after
 * `JwtAuthGuard` and is equally cross-cutting). `@Global()` so it's imported
 * once (in `CoreModule`) and available everywhere without per-context
 * re-registration (which would risk drifting configs).
 *
 * Signing is RS256 with the key pair resolved once by `auth.config.ts`
 * (`resolveSigningKeyPair`) and cached by `ConfigService` — every reader
 * (this factory, `JwksController`) sees the exact same key material, so a
 * dev-mode ephemeral key never drifts between signing and publication.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        privateKey: config.getOrThrow<string>('auth.jwtPrivateKey'),
        publicKey: config.getOrThrow<string>('auth.jwtPublicKey'),
        signOptions: {
          algorithm: 'RS256',
          keyid: config.getOrThrow<string>('auth.jwtKeyId'),
          expiresIn: config.getOrThrow<string>(
            'auth.jwtExpiresIn',
          ) as unknown as number,
        },
        verifyOptions: {
          algorithms: ['RS256'],
        },
      }),
    }),
  ],
  controllers: [...REST_CONTROLLERS],
  providers: [JwtAuthGuard, PlatformAdminGuard, JwksService],
  exports: [JwtModule, JwtAuthGuard, PlatformAdminGuard],
})
export class SecurityModule {}

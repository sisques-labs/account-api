import { JwtAuthGuard } from '@core/security/guards/jwt-auth.guard';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';

/**
 * Cross-cutting JWT infrastructure: the one `JwtService` every bounded
 * context shares — `auth`'s `TokenService` signs with it, `JwtAuthGuard`
 * (exported here) verifies with it. `@Global()` so it's imported once (in
 * `CoreModule`) and available everywhere without per-context re-registration
 * (which would risk drifting configs).
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: config.getOrThrow<string>(
            'auth.jwtExpiresIn',
          ) as unknown as number,
        },
      }),
    }),
  ],
  providers: [JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class SecurityModule {}

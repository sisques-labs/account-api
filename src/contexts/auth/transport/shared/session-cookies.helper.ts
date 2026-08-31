import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * Sets the two session cookies per the architecture doc's session model
 * (`Domain=.sisqueslabs.com`, httpOnly). No browser client exists yet
 * (account-web is out of MVP scope) — these are set best-effort alongside
 * the JSON body, which is what Postman/curl actually rely on for now.
 */
export function setSessionCookies(
  res: Response,
  configService: ConfigService,
  accessToken: string,
  refreshToken: string,
): void {
  const domain = configService.get<string | undefined>('auth.cookieDomain');
  const isProduction =
    configService.get<string>('app.nodeEnv') === 'production';

  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    domain,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    domain,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

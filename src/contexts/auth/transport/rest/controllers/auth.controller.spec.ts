import { LoginUserCommand } from '@contexts/auth/application/commands/login-user/login-user.command';
import { RefreshSessionCommand } from '@contexts/auth/application/commands/refresh-session/refresh-session.command';
import { RegisterUserCommand } from '@contexts/auth/application/commands/register-user/register-user.command';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  let commandBus: jest.Mocked<CommandBus>;
  let configService: jest.Mocked<ConfigService>;

  const buildMockResponse = () =>
    ({ cookie: jest.fn() }) as unknown as jest.Mocked<Response>;

  beforeEach(() => {
    commandBus = { execute: jest.fn() } as unknown as jest.Mocked<CommandBus>;
    configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as jest.Mocked<ConfigService>;
    controller = new AuthController(commandBus, configService);
  });

  describe('register()', () => {
    it('should dispatch a RegisterUserCommand with the DTO fields', async () => {
      commandBus.execute.mockResolvedValue({
        userId: 'user-1',
        email: 'new@example.com',
        displayName: 'New User',
      });

      const result = await controller.register({
        email: 'new@example.com',
        password: 'Sup3rStrongPassw0rd!',
        displayName: 'New User',
      });

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(RegisterUserCommand),
      );
      expect(result.userId).toBe('user-1');
    });
  });

  describe('login()', () => {
    it('should dispatch a LoginUserCommand and set session cookies', async () => {
      commandBus.execute.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      const res = buildMockResponse();

      const result = await controller.login(
        { email: 'user@example.com', password: 'pw' },
        res,
      );

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(LoginUserCommand),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'access-token',
        expect.any(Object),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        expect.any(Object),
      );
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('refresh()', () => {
    it('should dispatch a RefreshSessionCommand and set session cookies', async () => {
      commandBus.execute.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      const res = buildMockResponse();

      const result = await controller.refresh(
        { refreshToken: 'old-refresh-token' },
        res,
      );

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(RefreshSessionCommand),
      );
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(result.accessToken).toBe('new-access-token');
    });
  });
});

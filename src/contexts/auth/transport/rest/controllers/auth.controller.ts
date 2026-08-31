import { LoginUserCommand } from '@contexts/auth/application/commands/login-user/login-user.command';
import { ILoginSessionResult } from '@contexts/auth/application/commands/login-user/login-user.handler';
import { RefreshSessionCommand } from '@contexts/auth/application/commands/refresh-session/refresh-session.command';
import {
  RegisterUserCommand,
  RegisterUserCommandInput,
} from '@contexts/auth/application/commands/register-user/register-user.command';
import { RegisterUserResult } from '@contexts/auth/application/commands/register-user/register-user.handler';
import { LoginUserDto } from '@contexts/auth/transport/rest/dtos/login-user.dto';
import { RefreshTokenDto } from '@contexts/auth/transport/rest/dtos/refresh-token.dto';
import { RegisterUserDto } from '@contexts/auth/transport/rest/dtos/register-user.dto';
import { setSessionCookies } from '@contexts/auth/transport/shared/session-cookies.helper';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Res,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user (creates it in Keycloak too)' })
  @ApiResponse({ status: 201, description: 'User registered' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterUserDto): Promise<RegisterUserResult> {
    this.logger.log(`POST /auth/register email=${dto.email}`);
    const input: RegisterUserCommandInput = {
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
    };
    return this.commandBus.execute(new RegisterUserCommand(input));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login and receive Sisques Account access + refresh tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns accessToken + refreshToken',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ILoginSessionResult> {
    this.logger.log(`POST /auth/login email=${dto.email}`);
    const result = await this.commandBus.execute<
      LoginUserCommand,
      ILoginSessionResult
    >(new LoginUserCommand({ email: dto.email, password: dto.password }));

    setSessionCookies(
      res,
      this.configService,
      result.accessToken,
      result.refreshToken,
    );

    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  @ApiResponse({
    status: 200,
    description: 'Returns a new accessToken + refreshToken',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ILoginSessionResult> {
    this.logger.log('POST /auth/refresh');
    const result = await this.commandBus.execute<
      RefreshSessionCommand,
      ILoginSessionResult
    >(new RefreshSessionCommand({ refreshToken: dto.refreshToken }));

    setSessionCookies(
      res,
      this.configService,
      result.accessToken,
      result.refreshToken,
    );

    return result;
  }
}

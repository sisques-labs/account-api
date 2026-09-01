import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'k3f9...opaque-refresh-token' })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

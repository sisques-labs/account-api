import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440010' })
  @IsUUID()
  appId!: string;

  @ApiProperty({ example: 'My Garden' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({
    example: 'my-garden',
    description: 'Derived from `name` when omitted',
  })
  @IsOptional()
  @IsString()
  slug?: string;
}

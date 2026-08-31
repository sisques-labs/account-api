import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateAppDto {
  @ApiPropertyOptional({
    example: 'gardenia',
    description: 'If omitted, the slug is generated from the name',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase, alphanumeric, hyphen-separated',
  })
  slug?: string;

  @ApiProperty({ example: 'Gardenia' })
  @IsString()
  @MinLength(1)
  name!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class CreateAppDto {
  @ApiProperty({ example: 'gardenia' })
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase, alphanumeric, hyphen-separated',
  })
  slug!: string;

  @ApiProperty({ example: 'Gardenia' })
  @IsString()
  @MinLength(1)
  name!: string;
}

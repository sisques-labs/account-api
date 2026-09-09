import { ApiProperty } from '@nestjs/swagger';

import { JsonWebKeyDto } from './json-web-key.dto';

/** Response shape for `GET /.well-known/jwks.json` — a standard JWK Set. */
export class JwksResponseDto {
  @ApiProperty({ type: [JsonWebKeyDto] })
  keys!: JsonWebKeyDto[];
}

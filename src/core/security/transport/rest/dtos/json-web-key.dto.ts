import { ApiProperty } from '@nestjs/swagger';

/**
 * A single RSA public key entry in the JWKS response. MUST NEVER carry
 * private key material (no `d`, `p`, `q`, `dp`, `dq`, `qi`).
 */
export class JsonWebKeyDto {
  @ApiProperty({ example: 'RSA' })
  kty!: string;

  @ApiProperty({ example: 'sig' })
  use!: string;

  @ApiProperty({ example: 'RS256' })
  alg!: string;

  @ApiProperty()
  kid!: string;

  @ApiProperty({ description: 'RSA modulus, base64url-encoded' })
  n!: string;

  @ApiProperty({ description: 'RSA public exponent, base64url-encoded' })
  e!: string;
}

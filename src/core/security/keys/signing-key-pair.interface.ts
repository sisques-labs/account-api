/**
 * Resolved RSA key material used to sign and verify Sisques Account's own
 * access tokens (RS256). `kid` is the RFC 7638 JWK thumbprint of the public
 * key, so it rotates automatically with the key — never a hand-picked value.
 */
export interface ISigningKeyPair {
  privateKeyPem: string;
  publicKeyPem: string;
  kid: string;
}

import { StringValueObject } from '@sisques-labs/nestjs-kit';

/**
 * The identity provider's subject id (Keycloak `sub` today). Kept as a
 * generic string, not a UUID VO — a future non-Keycloak adapter (e.g.
 * Cognito) may issue subject ids in a different format.
 */
export class ExternalIdValueObject extends StringValueObject {
  constructor(value: string) {
    super(value, { minLength: 1, maxLength: 255, trim: true });
  }
}

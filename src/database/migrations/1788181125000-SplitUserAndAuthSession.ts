import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Splits the `identity` bounded context into `user` (platform identity) and
 * `auth` (login/register/refresh, Keycloak, JWT). The refresh token moves
 * off `user` and into its own `session` table, owned by `auth` — see the
 * `auth` context README for the "single active session per user" MVP
 * simplification this preserves (now table-backed instead of
 * column-backed).
 */
export class SplitUserAndAuthSession1788181125000 implements MigrationInterface {
  name = 'SplitUserAndAuthSession1788181125000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
        DROP CONSTRAINT "UQ_user_refresh_token_hash",
        DROP COLUMN "refresh_token_hash",
        DROP COLUMN "refresh_token_expires_at"
    `);

    await queryRunner.query(`
      CREATE TABLE "session" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "refresh_token_hash" varchar(255) NOT NULL,
        "refresh_token_expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_session_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_session_user_id" UNIQUE ("user_id"),
        CONSTRAINT "UQ_session_refresh_token_hash" UNIQUE ("refresh_token_hash"),
        CONSTRAINT "FK_session_user_id" FOREIGN KEY ("user_id")
          REFERENCES "user" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "session"`);

    await queryRunner.query(`
      ALTER TABLE "user"
        ADD COLUMN "refresh_token_hash" varchar(255),
        ADD COLUMN "refresh_token_expires_at" TIMESTAMP,
        ADD CONSTRAINT "UQ_user_refresh_token_hash" UNIQUE ("refresh_token_hash")
    `);
  }
}

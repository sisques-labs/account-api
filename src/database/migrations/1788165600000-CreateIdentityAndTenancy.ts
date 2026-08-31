import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the four MVP tables for the `identity` and `tenancy` bounded
 * contexts, per the Sisques Account data model:
 *
 *   app                — one row per app in the ecosystem (Gardenia, Nexora, ...)
 *   user               — the platform identity, backed by an external
 *                         identity provider (Keycloak today)
 *   tenant              — belongs to exactly one app; UNIQUE(app_id, slug)
 *   tenant_membership   — a user's role within a tenant; UNIQUE(tenant_id, user_id)
 *
 * `tenant_invite` is intentionally NOT created — it's schema-designed in the
 * architecture doc for a later, out-of-MVP email-invitation flow.
 *
 * `user.refresh_token_hash` / `user.refresh_token_expires_at` are an MVP
 * simplification: a single active opaque refresh token per user (no
 * multi-device session table) — see the `identity` context README.
 */
export class CreateIdentityAndTenancy1788165600000 implements MigrationInterface {
  name = 'CreateIdentityAndTenancy1788165600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "app" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" varchar(100) NOT NULL,
        "name" varchar(150) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_app_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "external_id" varchar(255) NOT NULL,
        "email" varchar(320) NOT NULL,
        "display_name" varchar(120),
        "platform_admin" boolean NOT NULL DEFAULT false,
        "refresh_token_hash" varchar(255),
        "refresh_token_expires_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_external_id" UNIQUE ("external_id"),
        CONSTRAINT "UQ_user_email" UNIQUE ("email"),
        CONSTRAINT "UQ_user_refresh_token_hash" UNIQUE ("refresh_token_hash")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tenant" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "app_id" uuid NOT NULL,
        "name" varchar(150) NOT NULL,
        "slug" varchar(100) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tenant_app_id_slug" UNIQUE ("app_id", "slug"),
        CONSTRAINT "FK_tenant_app_id" FOREIGN KEY ("app_id")
          REFERENCES "app" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_app_id" ON "tenant" ("app_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "tenant_membership" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" varchar(50) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_membership_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tenant_membership_tenant_id_user_id" UNIQUE ("tenant_id", "user_id"),
        CONSTRAINT "FK_tenant_membership_tenant_id" FOREIGN KEY ("tenant_id")
          REFERENCES "tenant" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tenant_membership_user_id" FOREIGN KEY ("user_id")
          REFERENCES "user" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_membership_tenant_id" ON "tenant_membership" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_membership_user_id" ON "tenant_membership" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tenant_membership"`);
    await queryRunner.query(`DROP TABLE "tenant"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TABLE "app"`);
  }
}

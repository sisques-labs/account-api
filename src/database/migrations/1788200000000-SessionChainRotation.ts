import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replaces the `session` table's `UNIQUE(user_id)` single-session model
 * with a chain-capable schema: nullable `revoked_at` marks a session
 * consumed, and `replaced_by_session_id` (self-referencing FK,
 * `ON DELETE SET NULL`) links it to its successor. Linked-list shape per
 * `design.md`'s Session Chain Shape decision — no `family_id`, no
 * recursive CTE.
 *
 * BREAKING: `DELETE FROM "session"` runs first in both directions. Every
 * pre-migration session is invalidated; every user must log in again after
 * deploy. See `auth-session-rotation/spec.md`'s Session Schema Migration
 * requirement — pre-migration sessions MUST NOT silently remain valid.
 *
 * Chain machinery introduced here (`revoke()`, `revokeAllByUserId()`,
 * `ISessionWriteRepository.rotate()`) is not yet wired into the refresh
 * endpoint — see WU-3b (Phase 4).
 */
export class SessionChainRotation1788200000000 implements MigrationInterface {
  name = 'SessionChainRotation1788200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "session"`);

    await queryRunner.query(`
      ALTER TABLE "session"
        DROP CONSTRAINT "UQ_session_user_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "session"
        ADD COLUMN "revoked_at" TIMESTAMP NULL,
        ADD COLUMN "replaced_by_session_id" uuid NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "session"
        ADD CONSTRAINT "FK_session_replaced_by_session_id"
        FOREIGN KEY ("replaced_by_session_id")
        REFERENCES "session" ("id") ON DELETE SET NULL
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_session_user_id" ON "session" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "session"`);

    await queryRunner.query(`DROP INDEX "IDX_session_user_id"`);

    await queryRunner.query(`
      ALTER TABLE "session"
        DROP CONSTRAINT "FK_session_replaced_by_session_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "session"
        DROP COLUMN "revoked_at",
        DROP COLUMN "replaced_by_session_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "session"
        ADD CONSTRAINT "UQ_session_user_id" UNIQUE ("user_id")
    `);
  }
}

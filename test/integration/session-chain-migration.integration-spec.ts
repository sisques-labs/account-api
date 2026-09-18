import { DataSource } from 'typeorm';

import {
  bootstrapTestDataSource,
  getTestDataSourceOptions,
} from '../helpers/test-data-source';

/**
 * Exercises `SessionChainRotation1788200000000` in isolation via
 * `undoLastMigration()`/`runMigrations()` on a dedicated connection. Safe
 * to run alongside other integration specs because `test:integration` runs
 * with `maxWorkers: 1` (files execute sequentially) and this file restores
 * the "up" state in `afterAll`, which every other integration spec assumes.
 */
describe('SessionChainRotation migration (integration)', () => {
  let dataSource: DataSource;

  const getColumnNames = async (): Promise<string[]> => {
    const rows: Array<{ column_name: string }> = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'session'`,
    );
    return rows.map((row) => row.column_name);
  };

  const getConstraintNames = async (): Promise<string[]> => {
    const rows: Array<{ conname: string }> = await dataSource.query(
      `SELECT conname FROM pg_constraint WHERE conrelid = '"session"'::regclass`,
    );
    return rows.map((row) => row.conname);
  };

  beforeAll(async () => {
    await bootstrapTestDataSource();
    dataSource = new DataSource(getTestDataSourceOptions());
    await dataSource.initialize();
  });

  afterAll(async () => {
    // Restore "up" state for every other integration spec in this run.
    await dataSource.runMigrations();
    await dataSource.destroy();
  });

  it('down() drops the chain columns and restores UQ_session_user_id; up() re-adds them', async () => {
    await dataSource.undoLastMigration();

    const columnsAfterDown = await getColumnNames();
    expect(columnsAfterDown).not.toContain('revoked_at');
    expect(columnsAfterDown).not.toContain('replaced_by_session_id');

    const constraintsAfterDown = await getConstraintNames();
    expect(constraintsAfterDown).toContain('UQ_session_user_id');
    expect(constraintsAfterDown).not.toContain(
      'FK_session_replaced_by_session_id',
    );

    await dataSource.runMigrations();

    const columnsAfterUp = await getColumnNames();
    expect(columnsAfterUp).toEqual(
      expect.arrayContaining(['revoked_at', 'replaced_by_session_id']),
    );

    const constraintsAfterUp = await getConstraintNames();
    expect(constraintsAfterUp).not.toContain('UQ_session_user_id');
    expect(constraintsAfterUp).toContain('FK_session_replaced_by_session_id');
  });
});

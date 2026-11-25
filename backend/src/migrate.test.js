import test from 'node:test';
import assert from 'node:assert/strict';
import { migrate } from './migrate.js';

test('migration removes legacy implicit access to the demo device only once', async () => {
  const calls = [];
  const appliedMigrations = new Set();
  const db = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.includes('SELECT 1 FROM app_migrations')) {
        return appliedMigrations.has(params[0])
          ? { rowCount: 1, rows: [{ '?column?': 1 }] }
          : { rowCount: 0, rows: [] };
      }
      if (sql.includes('INSERT INTO app_migrations')) {
        appliedMigrations.add(params[0]);
      }
      return { rowCount: 0, rows: [] };
    }
  };

  await migrate(db, { demoUser: 'teste', demoDeviceId: 'esp32c3-01' });
  await migrate(db, { demoUser: 'teste', demoDeviceId: 'esp32c3-01' });

  const revocations = calls.filter(({ sql }) =>
    sql.includes('DELETE FROM device_access WHERE device_id = $1 AND username <> $2')
  );
  assert.equal(revocations.length, 1);
  assert.deepEqual(revocations[0].params, ['esp32c3-01', 'teste']);
  assert.ok(calls.some(({ sql, params }) =>
    sql.includes('INSERT INTO device_access(username, device_id, is_owner)') &&
    params[0] === 'teste' && params[1] === 'esp32c3-01'
  ));
});

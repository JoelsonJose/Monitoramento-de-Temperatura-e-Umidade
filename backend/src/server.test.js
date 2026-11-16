import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from './server.js';

function mockDb() {
  return {
    async query(sql, params = []) {
      if (sql.includes('SELECT 1')) return { rowCount: 1, rows: [{ '?column?': 1 }] };
      if (sql.includes('SELECT d.device_id')) {
        if (params[0] === 'demo' && params[1] === 'esp32c3-01') {
          return { rowCount: 1, rows: [{ device_id: params[1], name: 'DHT11 ESP32-C3', last_seen_at: '2026-11-16T10:00:00Z' }] };
        }
        return { rowCount: 0, rows: [] };
      }
      if (sql.includes('SELECT r.device_id')) {
        return { rowCount: 1, rows: [{ device_id: 'esp32c3-01', sequence: 7, temperature_c: 29.7, humidity_percent: 78, last_seen_at: '2026-11-16T10:00:00Z' }] };
      }
      if (sql.includes('INSERT INTO readings')) return { rowCount: 1, rows: [{ id: 1 }] };
      if (sql.includes('INSERT INTO devices')) return { rowCount: 1, rows: [] };
      if (sql.includes('FROM readings r JOIN device_access')) return { rowCount: 1, rows: [{ device_id: 'esp32c3-01', sequence: 7 }] };
      throw new Error(`Unexpected query in route test: ${sql}`);
    },
  };
}

async function startTestServer(t) {
  const env = { DEMO_USER: 'demo', DEMO_PASSWORD: 'test-password', JWT_SECRET: 'test-secret-at-least-32-characters', DEVICE_API_KEY: 'test-device-key' };
  const server = createApiServer({ db: mockDb(), env });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return { base: `http://127.0.0.1:${server.address().port}`, env };
}

test('HTTP routes cover login, protected readings, device authorization and health', async t => {
  const { base } = await startTestServer(t);

  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);

  const wrongLogin = await fetch(`${base}/api/v1/auth/token`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'demo', password: 'wrong' }),
  });
  assert.equal(wrongLogin.status, 401);

  const login = await fetch(`${base}/api/v1/auth/token`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'demo', password: 'test-password' }),
  });
  assert.equal(login.status, 200);
  const { access_token: token } = await login.json();

  const noToken = await fetch(`${base}/api/v1/readings/latest`);
  assert.equal(noToken.status, 401);

  const forbidden = await fetch(`${base}/api/v1/devices/not-assigned`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(forbidden.status, 403);

  const allowed = await fetch(`${base}/api/v1/devices/esp32c3-01`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(allowed.status, 200);
  assert.equal((await allowed.json()).device.device_id, 'esp32c3-01');

  const latest = await fetch(`${base}/api/v1/readings/latest`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(latest.status, 200);
  assert.ok((await latest.json()).reading.last_seen_at);
});

test('ingest route rejects bad device key and accepts valid sensor payload', async t => {
  const { base } = await startTestServer(t);
  const payload = { device_id: 'esp32c3-01', sequence: 8, timestamp: '2026-11-16T10:00:00Z', temperature_c: 29.7, humidity_percent: 78 };
  const rejected = await fetch(`${base}/api/v1/ingest`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-device-key': 'wrong' }, body: JSON.stringify(payload),
  });
  assert.equal(rejected.status, 401);

  const accepted = await fetch(`${base}/api/v1/ingest`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-device-key': 'test-device-key' }, body: JSON.stringify(payload),
  });
  assert.equal(accepted.status, 201);
});

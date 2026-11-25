import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../server.js';
import { generateTotp } from './totp.js';
import { signToken } from '../security.js';

function authDb() {
  const users = new Map([
    ['teste', { username: 'teste', role: 'admin', password_hash: null, otp_enabled: true }]
  ]);
  const deviceAccess = new Map([['teste', new Set(['esp32c3-01'])]]);
  const reading = {
    device_id: 'esp32c3-01', sequence: 42, temperature_c: 29.5,
    humidity_percent: 68, timestamp: '2026-11-25T12:00:00Z',
    last_seen_at: '2026-11-25T12:00:00Z'
  };
  return {
    users,
    deviceAccess,
    async query(sql, params = []) {
      if (sql.includes('INSERT INTO users(username, password_hash, role)')) {
        const [username, passwordHash] = params;
        if (users.has(username)) return { rowCount: 0, rows: [] };
        users.set(username, {
          username,
          password_hash: passwordHash,
          role: 'viewer',
          otp_enabled: false,
          otp_secret_encrypted: null,
          otp_last_step: null,
          recovery_codes_hash: []
        });
        return { rowCount: 1, rows: [{ username }] };
      }
      if (sql.includes('SELECT d.device_id') && sql.includes('FROM devices d JOIN device_access')) {
        const [username, deviceId] = params;
        const assigned = deviceAccess.get(username) || new Set();
        const devices = [...assigned]
          .filter(id => !deviceId || id === deviceId)
          .map(id => ({ device_id: id, name: 'ESP32 principal' }));
        return { rowCount: devices.length, rows: devices };
      }
      if (sql.includes('FROM readings r') && sql.includes('JOIN devices d USING(device_id)')) {
        const assigned = deviceAccess.get(params[0]) || new Set();
        return assigned.has(reading.device_id)
          ? { rowCount: 1, rows: [reading] }
          : { rowCount: 0, rows: [] };
      }
      if (sql.includes('FROM readings r JOIN device_access')) {
        const username = params[params.length - 1];
        const assigned = deviceAccess.get(username) || new Set();
        const rows = assigned.has(reading.device_id) ? [reading] : [];
        return { rowCount: rows.length, rows };
      }
      if (sql.includes('SELECT username, password_hash, otp_enabled')) {
        const user = users.get(params[0]);
        return { rowCount: user ? 1 : 0, rows: user ? [user] : [] };
      }
      if (sql.includes('UPDATE users SET password_hash = $2')) {
        const user = users.get(params[0]);
        if (user && !user.password_hash) user.password_hash = params[1];
        return { rowCount: user ? 1 : 0, rows: [] };
      }
      if (sql.includes('otp_secret_encrypted = $2')) {
        const user = users.get(params[0]);
        if (!user) return { rowCount: 0, rows: [] };
        user.otp_secret_encrypted = params[1];
        user.otp_enabled = false;
        user.otp_last_step = null;
        user.recovery_codes_hash = [];
        return { rowCount: 1, rows: [user] };
      }
      if (sql.includes('SELECT otp_secret_encrypted') && sql.includes('otp_enabled = FALSE')) {
        const user = users.get(params[0]);
        return { rowCount: user?.otp_secret_encrypted ? 1 : 0, rows: user ? [user] : [] };
      }
      if (sql.includes('otp_enabled = TRUE')) {
        const user = users.get(params[0]);
        if (!user || user.otp_enabled) return { rowCount: 0, rows: [] };
        user.otp_enabled = true;
        user.otp_last_step = params[1];
        user.recovery_codes_hash = JSON.parse(params[2]);
        return { rowCount: 1, rows: [user] };
      }
      throw new Error(`Unexpected auth query: ${sql}`);
    }
  };
}

async function startServer(t, db) {
  const env = {
    DEMO_USER: 'demo',
    DEMO_PASSWORD: 'bootstrap-password',
    DEMO_DEVICE_ID: 'esp32c3-01',
    JWT_SECRET: 'test-secret-at-least-32-characters',
    OTP_ENCRYPTION_KEY: 'otp-encryption-key-at-least-32-characters',
    NODE_ENV: 'test'
  };
  const server = createApiServer({ db, env });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

async function register(base, username, password) {
  return fetch(`${base}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
}

test('registration creates a viewer with its own TOTP enrollment and password', async t => {
  const db = authDb();
  const base = await startServer(t, db);
  const password = 'correct horse battery staple';

  const created = await register(base, 'Alice.Team', password);
  assert.equal(created.status, 201);
  const registration = await created.json();
  assert.equal(registration.setup_required, true);
  assert.equal(db.users.get('alice.team').role, 'viewer');
  assert.match(db.users.get('alice.team').password_hash, /^scrypt\$/);
  assert.equal(db.deviceAccess.has('alice.team'), false, 'new users are not linked to the demo device');

  const duplicate = await register(base, 'alice.team', password);
  assert.equal(duplicate.status, 409);

  const wrongLogin = await fetch(`${base}/api/v1/auth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'alice.team', password: 'wrong password' })
  });
  assert.equal(wrongLogin.status, 401);

  const setup = await fetch(`${base}/api/v1/auth/otp/setup`, {
    method: 'POST',
    headers: { authorization: `Bearer ${registration.setup_token}` }
  });
  assert.equal(setup.status, 200);
  const aliceOtp = await setup.json();
  assert.match(aliceOtp.qr_code, /^data:image\/png;base64,/);

  const bobCreated = await register(base, 'bob', 'another correct horse battery');
  assert.equal(bobCreated.status, 201);
  const bobRegistration = await bobCreated.json();
  const bobSetup = await fetch(`${base}/api/v1/auth/otp/setup`, {
    method: 'POST',
    headers: { authorization: `Bearer ${bobRegistration.setup_token}` }
  });
  const bobOtp = await bobSetup.json();
  assert.notEqual(aliceOtp.secret, bobOtp.secret);

  const enable = await fetch(`${base}/api/v1/auth/otp/enable`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${registration.setup_token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ code: generateTotp(aliceOtp.secret) })
  });
  assert.equal(enable.status, 200);
  assert.equal((await enable.json()).recovery_codes.length, 8);

  const login = await fetch(`${base}/api/v1/auth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'alice.team', password })
  });
  assert.equal(login.status, 200);
  const challenge = await login.json();
  assert.equal(challenge.otp_required, true);
  assert.ok(challenge.challenge_token);

  const aliceToken = signToken('alice.team', 'test-secret-at-least-32-characters');
  const aliceHeaders = { authorization: `Bearer ${aliceToken}` };
  const aliceLatest = await fetch(`${base}/api/v1/readings/latest`, { headers: aliceHeaders });
  assert.deepEqual((await aliceLatest.json()).reading, null);
  const aliceHistory = await fetch(`${base}/api/v1/readings?limit=50`, { headers: aliceHeaders });
  assert.deepEqual((await aliceHistory.json()).readings, []);
  const aliceDevices = await fetch(`${base}/api/v1/devices`, { headers: aliceHeaders });
  assert.deepEqual((await aliceDevices.json()).devices, []);
  const deniedDevice = await fetch(`${base}/api/v1/devices/esp32c3-01`, { headers: aliceHeaders });
  assert.equal(deniedDevice.status, 403);

  const testeToken = signToken('teste', 'test-secret-at-least-32-characters');
  const testeLatest = await fetch(`${base}/api/v1/readings/latest`, {
    headers: { authorization: `Bearer ${testeToken}` }
  });
  assert.equal((await testeLatest.json()).reading.device_id, 'esp32c3-01');
  const testeDevices = await fetch(`${base}/api/v1/devices`, {
    headers: { authorization: `Bearer ${testeToken}` }
  });
  assert.deepEqual((await testeDevices.json()).devices.map(device => device.device_id), ['esp32c3-01']);
});

test('registration validates username and minimum password length', async t => {
  const base = await startServer(t, authDb());
  assert.equal((await register(base, 'ab', 'a sufficiently long password')).status, 400);
  assert.equal((await register(base, 'valid-user', 'short')).status, 400);
});

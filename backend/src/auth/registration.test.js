import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../server.js';
import { generateTotp } from './totp.js';

function authDb() {
  const users = new Map();
  return {
    users,
    async query(sql, params = []) {
      if (sql.includes('WITH new_user AS')) {
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
});

test('registration validates username and minimum password length', async t => {
  const base = await startServer(t, authDb());
  assert.equal((await register(base, 'ab', 'a sufficiently long password')).status, 400);
  assert.equal((await register(base, 'valid-user', 'short')).status, 400);
});

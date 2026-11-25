import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './password.js';

test('password hashes use unique salts and verify without storing the password', async () => {
  const first = await hashPassword('uma senha segura para o teste');
  const second = await hashPassword('uma senha segura para o teste');
  assert.match(first, /^scrypt\$/);
  assert.notEqual(first, second);
  assert.equal(first.includes('uma senha segura para o teste'), false);
  assert.equal(await verifyPassword('uma senha segura para o teste', first), true);
  assert.equal(await verifyPassword('senha errada', first), false);
});

test('password verification rejects malformed stored hashes', async () => {
  assert.equal(await verifyPassword('senha', 'invalid'), false);
});

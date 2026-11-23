import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeBase32, encodeBase32, generateTotp, generateTotpSecret, verifyTotp, buildTotpUri } from './totp.js';
import { generateRecoveryCodes, hashRecoveryCode, verifyRecoveryCode } from './recovery-codes.js';

test('Base32 round-trip', () => {
  const original = Buffer.from('Manga Trace - IoT');
  assert.deepEqual(decodeBase32(encodeBase32(original)), original);
});

test('generates and validates a six-digit TOTP', () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const now = 1_700_000_000_000;
  const code = generateTotp(secret, now);
  assert.match(code, /^\d{6}$/);
  assert.equal(verifyTotp(secret, code, { timestampMs: now, window: 0 }), true);
  assert.equal(verifyTotp(secret, '00000', { timestampMs: now }), false);
});

test('creates a random authenticator secret and provisioning URI', () => {
  const secret = generateTotpSecret();
  assert.match(secret, /^[A-Z2-7]+$/);
  assert.match(buildTotpUri({ secret, accountName: 'usuario-teste' }), /^otpauth:\/\/totp\//);
});

test('recovery codes are random, hashed and verifiable', () => {
  const [code] = generateRecoveryCodes(1);
  const hash = hashRecoveryCode(code);
  assert.equal(verifyRecoveryCode(code, hash), true);
  assert.equal(verifyRecoveryCode('AAAA-BBBB-CCCC', hash), false);
});


import test from 'node:test';
import assert from 'node:assert/strict';

import {
  encodeBase32,
  decodeBase32,
  generateTotp,
  verifyTotp,
  getMatchingTotpStep,
  buildTotpUri
} from './totp.js';

// Segredo sintético utilizado nos vetores do RFC 6238.
const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
const PERIOD_MS = 30_000;

test('UT-TOTP-001: valida vetores Base32, normalização e entradas inválidas', () => {
  for (const [plain, encoded] of [
    ['f', 'MY'],
    ['fo', 'MZXQ'],
    ['foo', 'MZXW6'],
    ['foob', 'MZXW6YQ'],
    ['fooba', 'MZXW6YTB'],
    ['foobar', 'MZXW6YTBOI']
  ]) {
    assert.equal(encodeBase32(Buffer.from(plain)), encoded);
    assert.deepEqual(decodeBase32(encoded), Buffer.from(plain));
  }

  assert.equal(encodeBase32(Buffer.alloc(0)), '');
  assert.deepEqual(decodeBase32('m y======'), Buffer.from('f'));

  for (const input of [
    undefined, null, '', '   ', 'M0', 'M8', 'M!'
  ]) {
    assert.throws(
      () => decodeBase32(input),
      /Invalid Base32 secret/
    );
  }
});

test('UT-TOTP-002: gera códigos de seis dígitos conforme vetores de referência', () => {
  // Últimos seis dígitos dos vetores SHA-1 do RFC 6238.
  for (const [seconds, expected] of [
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
    [20000000000, '353130']
  ]) {
    assert.equal(
      generateTotp(SECRET, seconds * 1000),
      expected
    );
  }
});

test('UT-TOTP-003: aceita somente códigos dentro da janela configurada', () => {
  const timestampMs = 1_700_000_010_000;

  const previous = generateTotp(SECRET, timestampMs - PERIOD_MS);
  const current = generateTotp(SECRET, timestampMs);
  const next = generateTotp(SECRET, timestampMs + PERIOD_MS);
  const outside = generateTotp(SECRET, timestampMs + 2 * PERIOD_MS);

  assert.equal(
    new Set([previous, current, next, outside]).size,
    4
  );

  for (const code of [previous, current, next]) {
    assert.equal(
      verifyTotp(SECRET, code, { timestampMs }),
      true
    );
  }

  assert.equal(
    verifyTotp(SECRET, previous, { timestampMs, window: 0 }),
    false
  );

  assert.equal(
    verifyTotp(SECRET, outside, { timestampMs, window: 1 }),
    false
  );

  assert.equal(
    verifyTotp(SECRET, undefined, { timestampMs }),
    false
  );
});

test('UT-TOTP-004: identifica intervalos vizinhos e ignora intervalos negativos', () => {
  const step = 1_000;
  const timestampMs = step * PERIOD_MS;

  for (const offset of [-1, 0, 1]) {
    const code = generateTotp(
      SECRET,
      (step + offset) * PERIOD_MS
    );

    assert.equal(
      getMatchingTotpStep(SECRET, code, { timestampMs }),
      step + offset
    );
  }

  const zeroCode = generateTotp(SECRET, 0);

  assert.equal(
    getMatchingTotpStep(SECRET, zeroCode, { timestampMs: 0 }),
    0
  );

  assert.equal(
    getMatchingTotpStep(SECRET, undefined, { timestampMs: 0 }),
    null
  );
});

test('UT-TOTP-005: valida parâmetros e campos da URI de provisionamento', () => {
  const issuer = 'Manga & IoT';
  const accountName = 'qa+teste@example.com';

  const uri = new URL(
    buildTotpUri({ secret: SECRET, accountName, issuer })
  );

  assert.equal(uri.protocol, 'otpauth:');
  assert.equal(uri.hostname, 'totp');

  assert.equal(
    decodeURIComponent(uri.pathname),
    `/${issuer}:${accountName}`
  );

  assert.equal(uri.searchParams.get('secret'), SECRET);
  assert.equal(uri.searchParams.get('issuer'), issuer);
  assert.equal(uri.searchParams.get('algorithm'), 'SHA1');
  assert.equal(uri.searchParams.get('digits'), '6');
  assert.equal(uri.searchParams.get('period'), '30');

  assert.equal(
    new URL(
      buildTotpUri({ secret: SECRET, accountName })
    ).searchParams.get('issuer'),
    'Manga Trace'
  );

  for (const params of [
    { accountName },
    { secret: SECRET },
    { secret: '', accountName }
  ]) {
    assert.throws(
      () => buildTotpUri(params),
      /Secret and account name are required/
    );
  }
});


import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCode
} from './recovery-codes.js';

const CODE = 'A1B2-C3D4-E5F6';

const HASH =
  '8ec2ba71a9cf0e2f802779698e4a2deaa81686e4462da41befe2d6bc8fae3123';

test('UT-RC-001: gera códigos no formato esperado e respeita os limites de quantidade', () => {
  for (const [count, expected] of [
    [undefined, 8],
    [1, 1],
    [20, 20]
  ]) {
    const codes = count === undefined
      ? generateRecoveryCodes()
      : generateRecoveryCodes(count);

    assert.equal(codes.length, expected);

    for (const code of codes) {
      assert.match(
        code,
        /^[A-F0-9]{4}(?:-[A-F0-9]{4}){2}$/
      );
    }
  }
});

test('UT-RC-002: rejeita quantidades inválidas', () => {
  for (const count of [
    0, -1, 21, 1.5, NaN, Infinity, '8', null
  ]) {
    assert.throws(
      () => generateRecoveryCodes(count),
      RangeError,
      `count=${count}`
    );
  }
});

test('UT-RC-003: normaliza o código e gera o SHA-256 esperado', () => {
  for (const code of [
    CODE,
    'a1b2c3d4e5f6',
    'a1b2 c3d4 e5f6'
  ]) {
    assert.equal(hashRecoveryCode(code), HASH);
  }
});

test('UT-RC-004: rejeita códigos vazios ou de tamanho inválido', () => {
  for (const code of [
    undefined,
    null,
    '',
    'ZZZZ',
    'A1B2-C3D4-E5',
    'A1B2-C3D4-E5F67'
  ]) {
    assert.throws(
      () => hashRecoveryCode(code),
      /Invalid recovery code format/
    );
  }
});

test('UT-RC-005: valida o hash correto e rejeita código ou hash inválido', () => {
  assert.equal(
    verifyRecoveryCode('a1b2c3d4e5f6', HASH),
    true
  );

  assert.equal(
    verifyRecoveryCode('0000-0000-0000', HASH),
    false
  );

  assert.equal(
    verifyRecoveryCode('invalid', HASH),
    false
  );

  for (const storedHash of [
    undefined,
    null,
    '',
    'zz',
    HASH.slice(0, 62),
    '0'.repeat(64)
  ]) {
    assert.equal(
      verifyRecoveryCode(CODE, storedHash),
      false
    );
  }
});

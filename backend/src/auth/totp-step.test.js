
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateTotp,
  getMatchingTotpStep
} from './totp.js';

const SECRET = 'JBSWY3DPEHPK3PXP';

test('identifica o intervalo correto do código TOTP', () => {
  const timestampMs = 1790000000000;
  const code = generateTotp(SECRET, timestampMs);

  const step = getMatchingTotpStep(SECRET, code, {
    timestampMs
  });

  assert.equal(
    step,
    Math.floor(timestampMs / 1000 / 30)
  );
});

test('retorna null para código inválido', () => {
  assert.equal(
    getMatchingTotpStep(SECRET, '123'),
    null
  );
});


test('retorna null para código que não corresponde ao intervalo', () => {
  const timestampMs = 1790000000000;
  const validCode = generateTotp(SECRET, timestampMs);

  const invalidCode = validCode === '000000'
    ? '000001'
    : '000000';

  assert.equal(
    getMatchingTotpStep(SECRET, invalidCode, {
      timestampMs,
      window: 0
    }),
    null
  );
});

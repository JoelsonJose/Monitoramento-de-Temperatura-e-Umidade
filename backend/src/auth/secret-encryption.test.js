
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  encryptSecret,
  decryptSecret
} from './secret-encryption.js';

const TEST_KEY = '0123456789abcdef0123456789abcdef';

test('criptografa e recupera a chave original', () => {
  const original = 'CHAVE-SECRETA-DO-AUTENTICADOR';

  const encrypted = encryptSecret(original, TEST_KEY);
  const decrypted = decryptSecret(encrypted, TEST_KEY);

  assert.notEqual(encrypted, original);
  assert.equal(decrypted, original);
});

test('gera criptografias diferentes para o mesmo conteúdo', () => {
  const original = 'MINHA-CHAVE-2FA';

  const first = encryptSecret(original, TEST_KEY);
  const second = encryptSecret(original, TEST_KEY);

  assert.notEqual(first, second);
  assert.equal(decryptSecret(first, TEST_KEY), original);
  assert.equal(decryptSecret(second, TEST_KEY), original);
});

test('rejeita uma chave de criptografia incorreta', () => {
  const encrypted = encryptSecret('SEGREDO', TEST_KEY);

  assert.throws(() => {
    decryptSecret(encrypted, 'abcdef0123456789abcdef0123456789');
  });
});

test('detecta alterações no conteúdo criptografado', () => {
  const encrypted = encryptSecret('SEGREDO', TEST_KEY);
  const parts = encrypted.split('.');

  parts[3] = (parts[3][0] === 'A' ? 'B' : 'A') + parts[3].slice(1);

  assert.throws(() => {
    decryptSecret(parts.join('.'), TEST_KEY);
  });
});

test('rejeita chave de criptografia muito curta', () => {
  assert.throws(() => {
    encryptSecret('SEGREDO', 'senha-curta');
  });
});

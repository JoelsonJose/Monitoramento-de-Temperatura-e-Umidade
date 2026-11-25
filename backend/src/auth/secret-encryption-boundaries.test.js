
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  encryptSecret,
  decryptSecret
} from './secret-encryption.js';

const KEY = '0123456789abcdef0123456789abcdef';
const TEXT = 'Segredo sintético de teste';

test('UT-ENC-001: rejeita conteúdo inválido para criptografia', () => {
  for (const value of [
    undefined, null, '', 123, {}, []
  ]) {
    assert.throws(
      () => encryptSecret(value, KEY),
      {
        name: 'TypeError',
        message: 'O conteúdo para criptografia deve ser um texto válido'
      }
    );
  }
});

test('UT-ENC-002: rejeita conteúdo criptografado que não seja texto', () => {
  for (const value of [
    undefined, null, 123, {}, []
  ]) {
    assert.throws(
      () => decryptSecret(value, KEY),
      {
        name: 'TypeError',
        message: 'O conteúdo criptografado deve ser um texto válido'
      }
    );
  }
});

test('UT-ENC-003: rejeita formato ou versão de criptografia inválidos', () => {
  const [, iv, tag, data] = encryptSecret(TEXT, KEY).split('.');

  for (const value of [
    '',
    'v1',
    `v1.${iv}.${tag}`,
    `v2.${iv}.${tag}.${data}`,
    `v1.${iv}.${tag}.${data}.extra`
  ]) {
    assert.throws(
      () => decryptSecret(value, KEY),
      {
        message: 'Formato de conteúdo criptografado inválido'
      }
    );
  }
});

test('UT-ENC-004: rejeita tamanhos inválidos de IV e tag de autenticação', () => {
  const [version, iv, tag, data] =
    encryptSecret(TEXT, KEY).split('.');

  for (const size of [0, 11, 13]) {
    const invalidIv = Buffer.alloc(size).toString('base64url');

    assert.throws(
      () => decryptSecret(
        [version, invalidIv, tag, data].join('.'),
        KEY
      ),
      {
        message: 'Dados de criptografia inválidos'
      }
    );
  }

  for (const size of [0, 15, 17]) {
    const invalidTag = Buffer.alloc(size).toString('base64url');

    assert.throws(
      () => decryptSecret(
        [version, iv, invalidTag, data].join('.'),
        KEY
      ),
      {
        message: 'Dados de criptografia inválidos'
      }
    );
  }
});

test('UT-ENC-005: utiliza a chave do ambiente e rejeita sua ausência', () => {
  const previous = process.env.OTP_ENCRYPTION_KEY;

  try {
    process.env.OTP_ENCRYPTION_KEY = KEY;

    const encrypted = encryptSecret(TEXT);

    assert.equal(decryptSecret(encrypted), TEXT);

    delete process.env.OTP_ENCRYPTION_KEY;

    for (const operation of [
      () => encryptSecret(TEXT),
      () => decryptSecret(encrypted)
    ]) {
      assert.throws(operation, {
        message: 'OTP_ENCRYPTION_KEY deve possuir pelo menos 32 caracteres'
      });
    }
  } finally {
    if (previous === undefined) {
      delete process.env.OTP_ENCRYPTION_KEY;
    } else {
      process.env.OTP_ENCRYPTION_KEY = previous;
    }
  }
});

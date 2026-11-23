
import test from 'node:test';
import assert from 'node:assert/strict';

import { signToken, verifyToken } from './security.js';

const SECRET = 'chave-de-teste-com-mais-de-32-caracteres';
const NOW = 1790000000;

test('aceita token de acesso nas rotas protegidas', () => {
  const token = signToken('usuario', SECRET, NOW);

  const result = verifyToken(token, SECRET, NOW);

  assert.equal(result.sub, 'usuario');
  assert.equal(result.purpose, 'access');
});

test('rejeita token de configuração como acesso normal', () => {
  const token = signToken('usuario', SECRET, NOW, {
    purpose: 'otp_setup',
    expiresInSeconds: 300
  });

  assert.equal(verifyToken(token, SECRET, NOW), null);
});

test('rejeita token de desafio como acesso normal', () => {
  const token = signToken('usuario', SECRET, NOW, {
    purpose: 'otp_challenge',
    expiresInSeconds: 300
  });

  assert.equal(verifyToken(token, SECRET, NOW), null);
});

test('aceita token de configuração somente na validação correspondente', () => {
  const token = signToken('usuario', SECRET, NOW, {
    purpose: 'otp_setup',
    expiresInSeconds: 300
  });

  const result = verifyToken(token, SECRET, NOW, {
    purpose: 'otp_setup'
  });

  assert.equal(result.sub, 'usuario');
  assert.equal(result.purpose, 'otp_setup');
});

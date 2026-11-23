
import test from 'node:test';
import assert from 'node:assert/strict';

import { consumeTotpStep } from './totp-replay.js';

function createFakeDb() {
  let lastStep = null;

  return {
    async query(sql, params) {
      const [username, step] = params;

      if (
        username !== 'usuario-teste' ||
        (lastStep !== null && lastStep >= step)
      ) {
        return { rowCount: 0 };
      }

      lastStep = step;
      return { rowCount: 1 };
    }
  };
}

test('aceita um intervalo TOTP ainda não utilizado', async () => {
  const db = createFakeDb();

  assert.equal(
    await consumeTotpStep(db, 'usuario-teste', 100),
    true
  );
});

test('rejeita a reutilização do mesmo intervalo', async () => {
  const db = createFakeDb();

  await consumeTotpStep(db, 'usuario-teste', 100);

  assert.equal(
    await consumeTotpStep(db, 'usuario-teste', 100),
    false
  );
});

test('rejeita intervalos anteriores', async () => {
  const db = createFakeDb();

  await consumeTotpStep(db, 'usuario-teste', 101);

  assert.equal(
    await consumeTotpStep(db, 'usuario-teste', 100),
    false
  );
});

test('rejeita usuário ou intervalo inválido', async () => {
  const db = createFakeDb();

  assert.equal(await consumeTotpStep(db, '', 100), false);
  assert.equal(await consumeTotpStep(db, 'usuario-teste', -1), false);
  assert.equal(await consumeTotpStep(db, 'usuario-teste', 1.5), false);
});

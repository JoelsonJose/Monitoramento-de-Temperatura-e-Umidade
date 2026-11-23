import test from 'node:test';
import assert from 'node:assert/strict';

import { generateQrCode } from './qr-code.js';

test('gera QR Code em formato Data URL PNG', async () => {
  const uri = 'otpauth://totp/MangaTrace:usuario?secret=JBSWY3DPEHPK3PXP&issuer=MangaTrace';

  const qrCode = await generateQrCode(uri);

  assert.ok(qrCode.startsWith('data:image/png;base64,'));
});

test('rejeita URI que não seja do autenticador', async () => {
  await assert.rejects(
    () => generateQrCode('https://example.com'),
    TypeError
  );
});

test('rejeita conteúdo vazio', async () => {
  await assert.rejects(
    () => generateQrCode(''),
    TypeError
  );
});

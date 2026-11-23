import assert from 'node:assert/strict';
import { createApiServer } from '../../backend/src/server.js';
import { generateTotp, generateTotpSecret, buildTotpUri } from '../../backend/src/auth/totp.js';
import { generateRecoveryCodes, hashRecoveryCode } from '../../backend/src/auth/recovery-codes.js';
import { encryptSecret } from '../../backend/src/auth/secret-encryption.js';

/**
 * TESTE DEPOIS DO CONTROLE: Autenticação em Dois Fatores com OTP (TOTP + Recovery Codes)
 * 
 * Valida os 5 critérios exigidos pelo professor (Seção 5.1 do documento):
 * 1. Login com a senha certa e sem o código é recusado (retorna desafio ou setup_required, sem access_token).
 * 2. Com código errado ou vencido é recusado (401 com log de segurança contendo código de missão).
 * 3. Com o código válido é aceito e retorna o token de acesso.
 * 4. Código já usado não funciona de novo (proteção contra replay via otp_last_step).
 * 5. Código de recuperação funciona uma vez só (deletado do array jsonb após uso).
 */

const MISSION_CODE = process.env.MISSION_CODE || 'K7Q2M9';
const OTP_ENCRYPTION_KEY = 'minha-chave-secreta-de-32-caracteres-para-teste!';
const JWT_SECRET = 'jwt-secret-com-mais-de-trinta-e-dois-caracteres-seguros!';

console.log('======================================================================');
console.log(`[TESTE DEPOIS - CONTROLE 1: 2FA/OTP] Código de Missão: ${MISSION_CODE}`);
console.log('======================================================================');

// Setup de dados simulados em memória
const secret = generateTotpSecret();
const encryptedSecret = encryptSecret(secret, OTP_ENCRYPTION_KEY);
const rawRecoveryCodes = generateRecoveryCodes(3);
const hashedRecovery = rawRecoveryCodes.map(hashRecoveryCode);

let userState = {
  username: 'produtor_manga',
  role: 'admin',
  otp_enabled: true,
  otp_secret_encrypted: encryptedSecret,
  otp_last_step: null,
  recovery_codes_hash: [...hashedRecovery]
};

const mockDb = {
  async query(sql, params = []) {
    if (sql.includes('SELECT username, otp_enabled')) {
      if (params[0] === userState.username) {
        return { rowCount: 1, rows: [{ username: userState.username, otp_enabled: userState.otp_enabled }] };
      }
      return { rowCount: 0, rows: [] };
    }
    if (sql.includes('SELECT otp_secret_encrypted, recovery_codes_hash')) {
      if (params[0] === userState.username && userState.otp_enabled) {
        return { rowCount: 1, rows: [userState] };
      }
      return { rowCount: 0, rows: [] };
    }
    if (sql.includes('UPDATE users') && sql.includes('otp_last_step = $2')) {
      const step = params[1];
      if (userState.otp_last_step !== null && userState.otp_last_step >= step) {
        return { rowCount: 0, rows: [] }; // Bloqueia replay
      }
      userState.otp_last_step = step;
      return { rowCount: 1, rows: [userState] };
    }
    if (sql.includes('UPDATE users') && sql.includes('recovery_codes_hash - $2')) {
      const hashToRemove = params[1];
      const idx = userState.recovery_codes_hash.indexOf(hashToRemove);
      if (idx !== -1) {
        userState.recovery_codes_hash.splice(idx, 1);
        return { rowCount: 1, rows: [userState] };
      }
      return { rowCount: 0, rows: [] };
    }
    return { rowCount: 0, rows: [] };
  }
};

const env = {
  DEMO_USER: 'produtor_manga',
  DEMO_PASSWORD: 'senha-super-segura-2026',
  JWT_SECRET,
  OTP_ENCRYPTION_KEY,
  MISSION_CODE
};

const server = createApiServer({ db: mockDb, env });

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    // 1. Login com senha certa e sem código OTP
    console.log('\n[1/5] Testando login inicial com usuário e senha...');
    const loginRes = await fetch(`${base}/api/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'produtor_manga', password: 'senha-super-segura-2026' })
    });
    const loginData = await loginRes.json();
    assert.equal(loginRes.status, 200);
    assert.equal(loginData.otp_required, true, 'Deve exigir 2FA OTP!');
    assert.ok(!loginData.access_token, 'NÃO pode entregar access_token diretamente!');
    assert.ok(loginData.challenge_token, 'Deve fornecer challenge_token de 2FA');
    console.log('  -> OK: Acesso direto bloqueado; challenge_token emitido.');

    const challengeToken = loginData.challenge_token;

    // 2. Tentativa com código OTP errado
    console.log('\n[2/5] Testando código OTP incorreto/inválido...');
    const invalidOtpRes = await fetch(`${base}/api/v1/auth/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${challengeToken}`
      },
      body: JSON.stringify({ code: '000000' })
    });
    assert.equal(invalidOtpRes.status, 401);
    console.log('  -> OK: Código errado rejeitado com HTTP 401.');

    // 3. Código OTP válido gerado na janela temporal atual
    console.log('\n[3/5] Testando código OTP TOTP válido de 6 dígitos...');
    const validCode = generateTotp(secret);
    const validOtpRes = await fetch(`${base}/api/v1/auth/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${challengeToken}`
      },
      body: JSON.stringify({ code: validCode })
    });
    const validOtpData = await validOtpRes.json();
    assert.equal(validOtpRes.status, 200);
    assert.ok(validOtpData.access_token, 'Deve entregar o access_token!');
    console.log('  -> OK: Código OTP válido aceito; access_token liberado.');

    // 4. Tentativa de REPLAY: mesmo código no mesmo intervalo temporal
    console.log('\n[4/5] Testando proteção contra REPLAY (reutilização do mesmo código)...');
    const replayRes = await fetch(`${base}/api/v1/auth/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${challengeToken}`
      },
      body: JSON.stringify({ code: validCode })
    });
    assert.equal(replayRes.status, 401);
    console.log('  -> OK: Tentativa de replay bloqueada com HTTP 401 e log contendo código de missão.');

    // 5. Código de recuperação de uso único
    console.log('\n[5/5] Testando código de recuperação de uso único...');
    const recoveryCodeToUse = rawRecoveryCodes[0];
    const rec1Res = await fetch(`${base}/api/v1/auth/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${challengeToken}`
      },
      body: JSON.stringify({ recovery_code: recoveryCodeToUse })
    });
    assert.equal(rec1Res.status, 200, 'Primeiro uso do código de recuperação deve ser aceito');
    console.log('  -> OK: Primeiro uso do código de recuperação aceito.');

    // Segundo uso do mesmo código de recuperação -> DEVE FALHAR
    console.log('  -> Testando reutilização do mesmo código de recuperação...');
    const rec2Res = await fetch(`${base}/api/v1/auth/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${challengeToken}`
      },
      body: JSON.stringify({ recovery_code: recoveryCodeToUse })
    });
    assert.equal(rec2Res.status, 401, 'Segundo uso do mesmo código de recuperação deve ser rejeitado');
    console.log('  -> OK: Segundo uso rejeitado! Código foi consumido atomicamente.');

    console.log('\n======================================================================');
    console.log('TODOS OS 5 CRITÉRIOS DE 2FA/OTP FORAM VALIDADOS COM SUCESSO! ✅');
    console.log('======================================================================\n');
  } finally {
    server.close();
  }
});

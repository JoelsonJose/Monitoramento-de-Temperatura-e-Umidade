import http from 'node:http';
import assert from 'node:assert/strict';

/**
 * TESTE ANTES DO CONTROLE: Autenticação de Fator Único (Apenas Usuário e Senha)
 * 
 * Simula a vulnerabilidade que existia antes da implementação do 2FA OTP:
 * O login aceitava apenas usuário e senha e entregava imediatamente o token de acesso (JWT).
 * Se um atacante interceptasse ou vazasse a credencial, assumia controle total sem restrição.
 */

console.log('======================================================================');
console.log('[TESTE ANTES - CONTROLE 1: 2FA/OTP] Simulando Login de Fator Único');
console.log('======================================================================');

// Servidor legado simulado (como era antes do 2FA)
const serverLegado = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/v1/auth/token') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', () => {
      const { username, password } = JSON.parse(bodyStr || '{}');
      if (username === 'demo' && password === 'demo') {
        // VULNERABILIDADE: entrega o access_token imediatamente sem segundo fator
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          access_token: 'fake-legacy-jwt-token-sem-segundo-fator',
          token_type: 'Bearer',
          expires_in: 3600,
          vulneravel: true,
          aviso: 'ALERTA: Acesso concedido apenas com senha. Sem proteção 2FA!'
        }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid credentials' }));
      }
    });
  }
});

serverLegado.listen(0, '127.0.0.1', async () => {
  const port = serverLegado.address().port;
  const url = `http://127.0.0.1:${port}/api/v1/auth/token`;

  try {
    console.log(`[*] Executando requisição de login em: ${url}`);
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'demo', password: 'demo' })
    });

    const data = await resp.json();
    console.log('[+] Status HTTP:', resp.status);
    console.log('[+] Resposta recebida:', JSON.stringify(data, null, 2));

    assert.equal(resp.status, 200);
    assert.ok(data.access_token, 'Token de acesso gerado diretamente!');
    assert.equal(data.vulneravel, true);

    console.log('\n[RESULTADO DO ANTES]:');
    console.log('-> VULNERABILIDADE COMPROVADA: Credencial roubada permite acesso imediato.');
    console.log('-> Não há exigência de segundo fator TOTP nem códigos de recuperação.');
  } finally {
    serverLegado.close();
  }
});

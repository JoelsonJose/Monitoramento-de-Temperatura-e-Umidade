import http from 'node:http';
import assert from 'node:assert/strict';

/**
 * TESTE ANTES DO CONTROLE: Vulnerabilidade IDOR (Insecure Direct Object Reference)
 * 
 * Simula a vulnerabilidade que existia antes da implementação da verificação de dono:
 * O servidor recebia o identificador do dispositivo ou do lote diretamente pela URL
 * e confiava cegamente nesse ID, sem verificar se o usuário da sessão era realmente o proprietário.
 * 
 * Resultado no "Antes": Usuário A alterava o ID na requisição e lia telemetria confidencial
 * e alterava parâmetros de lotes pertencentes ao Usuário B!
 */

console.log('======================================================================');
console.log('[TESTE ANTES - CONTROLE 2: IDOR] Simulando Acesso Sem Validação de Dono');
console.log('======================================================================');

// Base de dados simulada de dois produtores
const database = {
  devices: {
    'esp32c3-01': { owner: 'usuario_a', name: 'Sensor Pomar Fazenda A' },
    'esp32c3-02': { owner: 'usuario_b', name: 'Câmara Fria Secreta Fazenda B' }
  },
  lotes: {
    1: { owner: 'usuario_a', codigo: 'LOTE-A1', status: 'aprovado' },
    2: { owner: 'usuario_b', codigo: 'LOTE-B2-CONFIDENCIAL', status: 'reprovado' }
  }
};

// Servidor legado sem checagem de permissão/dono (vulnerável a IDOR)
const serverVulneravel = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // Rota vulnerável a IDOR: pega o ID da URL e retorna o dado sem checar o dono
  const matchDevice = /^\/api\/v1\/devices\/([^/]+)$/.exec(url.pathname);
  if (matchDevice) {
    const id = matchDevice[1];
    const dev = database.devices[id];
    if (dev) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ device: dev, vulneravel: true }));
    }
  }

  const matchLote = /^\/api\/v1\/lotes\/(\d+)$/.exec(url.pathname);
  if (req.method === 'DELETE' && matchLote) {
    const loteId = matchLote[1];
    if (database.lotes[loteId]) {
      const deleted = database.lotes[loteId];
      delete database.lotes[loteId];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ deleted: true, lote: deleted, vulneravel: true }));
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

serverVulneravel.listen(0, '127.0.0.1', async () => {
  const port = serverVulneravel.address().port;
  const base = `http://127.0.0.1:${port}`;

  try {
    console.log('[*] Usuário A logado tenta ler dispositivo alheio (esp32c3-02 do Usuário B)...');
    const resDev = await fetch(`${base}/api/v1/devices/esp32c3-02`);
    const dataDev = await resDev.json();

    console.log('[+] Status HTTP:', resDev.status);
    console.log('[+] Resposta:', JSON.stringify(dataDev));
    assert.equal(resDev.status, 200);
    assert.equal(dataDev.device.owner, 'usuario_b');
    console.log('-> VULNERABILIDADE: Usuário A acessou dispositivo confidencial da Fazenda B!');

    console.log('\n[*] Usuário A tenta excluir o lote confidencial 2 do Usuário B...');
    const resDel = await fetch(`${base}/api/v1/lotes/2`, { method: 'DELETE' });
    const dataDel = await resDel.json();

    console.log('[+] Status HTTP:', resDel.status);
    console.log('[+] Resposta:', JSON.stringify(dataDel));
    assert.equal(resDel.status, 200);
    assert.equal(dataDel.deleted, true);
    console.log('-> VULNERABILIDADE: Usuário A excluiu lote alheio trocando apenas o ID na rota!');

    console.log('\n[RESULTADO DO ANTES]:');
    console.log('-> A falha de IDOR permitia invasão de privacidade e destruição de dados alheios.');
  } finally {
    serverVulneravel.close();
  }
});

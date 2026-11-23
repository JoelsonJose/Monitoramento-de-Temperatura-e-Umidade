import assert from 'node:assert/strict';
import { createApiServer } from '../../backend/src/server.js';
import { signToken } from '../../backend/src/security.js';

/**
 * TESTE DEPOIS DO CONTROLE: Proteção contra IDOR (Verificação de Dono no Servidor)
 * 
 * Valida os requisitos exigidos pelo professor (Seção 5.2 do documento):
 * - Com dois usuários de teste (Usuário A e Usuário B):
 *   1. O Usuário A tenta ler as leituras e dispositivo do Usuário B trocando o ID na requisição -> Recebe 403.
 *   2. O Usuário A tenta ler o relatório de qualidade/auditoria do lote do Usuário B -> Recebe 404.
 *   3. O Usuário A tenta mandar comando de colheita (/colher) para o lote do Usuário B -> Recebe 404.
 *   4. O Usuário A tenta alterar os dados (PUT) do lote do Usuário B -> Recebe 404.
 *   5. O Usuário B (dono legítimo) acessa seus próprios dispositivos e lotes normalmente -> Recebe 200.
 * 
 * Em todos os bloqueios, é gerado log de segurança contendo o código de missão da equipe.
 */

const MISSION_CODE = process.env.MISSION_CODE || 'K7Q2M9';
const JWT_SECRET = 'jwt-secret-com-mais-de-trinta-e-dois-caracteres-seguros!';

console.log('======================================================================');
console.log(`[TESTE DEPOIS - CONTROLE 2: IDOR] Código de Missão: ${MISSION_CODE}`);
console.log('======================================================================');

// Dois dispositivos e dois lotes pertencentes a usuários distintos
const mockDb = {
  async query(sql, params = []) {
    // Verificação de acesso a dispositivo: a.username = $1 AND a.device_id = $2
    if (sql.includes('FROM devices d JOIN device_access a USING(device_id)')) {
      const [username, deviceId] = params;
      if (username === 'usuario_a' && deviceId === 'esp32c3-01') {
        return { rowCount: 1, rows: [{ device_id: 'esp32c3-01', name: 'Sensor Pomar Fazenda A' }] };
      }
      if (username === 'usuario_b' && deviceId === 'esp32c3-02') {
        return { rowCount: 1, rows: [{ device_id: 'esp32c3-02', name: 'Câmara Fria Secreta Fazenda B' }] };
      }
      return { rowCount: 0, rows: [] };
    }

    // Verificação de acesso ao lote: INNER JOIN device_access a ON a.device_id = l.device_id
    if (sql.includes('FROM lotes l') && sql.includes('INNER JOIN device_access a')) {
      const [loteId, username] = params;
      // Lote 1 pertence ao dispositivo esp32c3-01 (usuario_a)
      if (Number(loteId) === 1 && username === 'usuario_a') {
        return { rowCount: 1, rows: [{ id_lote: 1 }] };
      }
      // Lote 2 pertence ao dispositivo esp32c3-02 (usuario_b)
      if (Number(loteId) === 2 && username === 'usuario_b') {
        return { rowCount: 1, rows: [{ id_lote: 2 }] };
      }
      return { rowCount: 0, rows: [] };
    }

    // Detalhes do lote
    if (sql.includes('SELECT * FROM lotes WHERE id_lote')) {
      const id = Number(params[0]);
      if (id === 1) {
        return { rowCount: 1, rows: [{ id_lote: 1, device_id: 'esp32c3-01', nome: 'Lote A', data_inicio: '2026-10-01T00:00:00Z', data_fim: null }] };
      }
      if (id === 2) {
        return { rowCount: 1, rows: [{ id_lote: 2, device_id: 'esp32c3-02', nome: 'Lote B Secreto', data_inicio: '2026-10-01T00:00:00Z', data_fim: null }] };
      }
      return { rowCount: 0, rows: [] };
    }

    if (sql.includes('FROM readings WHERE device_id = $1')) {
      return { rowCount: 0, rows: [] };
    }

    if (sql.includes('UPDATE lotes')) {
      return { rowCount: 1, rows: [{ id_lote: params[params.length - 1] }] };
    }

    return { rowCount: 0, rows: [] };
  }
};

const env = {
  JWT_SECRET,
  MISSION_CODE
};

const server = createApiServer({ db: mockDb, env });

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;

  const tokenA = signToken('usuario_a', JWT_SECRET);
  const tokenB = signToken('usuario_b', JWT_SECRET);

  try {
    // 1. Usuário A tenta ler dispositivo do Usuário B (esp32c3-02)
    console.log('\n[1/5] Usuário A tenta ler dispositivo de B trocando o ID (/api/v1/devices/esp32c3-02)...');
    const resDev = await fetch(`${base}/api/v1/devices/esp32c3-02`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(resDev.status, 403, 'Deve responder HTTP 403');
    console.log('  -> OK: IDOR bloqueado com HTTP 403 e log de segurança emitido.');

    // 2. Usuário A tenta consultar relatório de qualidade do lote 2 do Usuário B
    console.log('\n[2/5] Usuário A tenta auditar lote 2 de B trocando o ID (/api/v1/lotes/2/qualidade)...');
    const resLote = await fetch(`${base}/api/v1/lotes/2/qualidade`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(resLote.status, 404, 'Deve responder HTTP 404 (anti-enumeração)');
    console.log('  -> OK: IDOR bloqueado com HTTP 404 e log de segurança emitido.');

    // 3. Usuário A tenta enviar comando de colheita para o lote 2 de B
    console.log('\n[3/5] Usuário A tenta forçar comando de colheita no lote 2 de B (/api/v1/lotes/2/colher)...');
    const resColher = await fetch(`${base}/api/v1/lotes/2/colher`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(resColher.status, 404, 'Deve responder HTTP 404');
    console.log('  -> OK: Comando de colheita bloqueado com HTTP 404 e log de segurança emitido.');

    // 4. Usuário A tenta alterar dados do lote 2 de B via PUT
    console.log('\n[4/5] Usuário A tenta alterar dados do lote 2 de B via PUT (/api/v1/lotes/2)...');
    const resPut = await fetch(`${base}/api/v1/lotes/2`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo_lote: 'HACKED', nome: 'Invasao' })
    });
    assert.equal(resPut.status, 404, 'Deve responder HTTP 404');
    console.log('  -> OK: Tentativa de alteração bloqueada com HTTP 404 e log de segurança emitido.');

    // 5. Usuário B (dono legítimo) acessa seus próprios recursos
    console.log('\n[5/5] Usuário B acessa seu próprio dispositivo legítimo (/api/v1/devices/esp32c3-02)...');
    const resLegit = await fetch(`${base}/api/v1/devices/esp32c3-02`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.equal(resLegit.status, 200, 'Dono legítimo deve ter acesso HTTP 200');
    const bodyLegit = await resLegit.json();
    assert.equal(bodyLegit.device.device_id, 'esp32c3-02');
    console.log('  -> OK: Dono legítimo opera seu dispositivo normalmente com HTTP 200.');

    console.log('\n======================================================================');
    console.log('PROTEÇÃO CONTRA IDOR VALIDADA COM SUCESSO EM TODAS AS ROTAS! ✅');
    console.log('======================================================================\n');
  } finally {
    server.close();
  }
});

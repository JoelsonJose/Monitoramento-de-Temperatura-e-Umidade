import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer, avaliarQualidadeLote } from './server.js';

function mockDb() {
  const lotesState = [
    {
      id_lote: 1,
      codigo_lote: 'LOTE-MNG-2026-01',
      nome: 'Safra Vale do São Francisco (Certificação Completa)',
      variedade: 'Tommy Atkins',
      device_id: 'esp32c3-01',
      etapa_atual: 'estoque',
      data_inicio: '2026-10-22T00:00:00Z',
      data_colheita: '2026-11-09T00:00:00Z',
      data_fim: '2026-11-19T00:00:00Z',
      status_selo: 'aprovado',
      percentual_pomar: 88.5,
      percentual_estoque: 92.0,
      percentual_conformidade: 90.3
    },
    {
      id_lote: 2,
      codigo_lote: 'LOTE-MNG-2026-02',
      nome: 'Câmara Fria Pós-Colheita (Falha Térmica no Estoque)',
      variedade: 'Palmer',
      device_id: 'esp32c3-01',
      etapa_atual: 'estoque',
      data_inicio: '2026-10-27T00:00:00Z',
      data_colheita: '2026-11-11T00:00:00Z',
      data_fim: '2026-11-20T00:00:00Z',
      status_selo: 'reprovado',
      percentual_pomar: 85.0,
      percentual_estoque: 48.0,
      percentual_conformidade: 66.5
    },
    {
      id_lote: 3,
      codigo_lote: 'LOTE-MNG-2026-03',
      nome: 'Safra Sertão Central (Estresse Térmico no Pomar)',
      variedade: 'Keitt',
      device_id: 'esp32c3-01',
      etapa_atual: 'estoque',
      data_inicio: '2026-11-01T00:00:00Z',
      data_colheita: '2026-11-13T00:00:00Z',
      data_fim: '2026-11-20T00:00:00Z',
      status_selo: 'reprovado',
      percentual_pomar: 42.0,
      percentual_estoque: 90.0,
      percentual_conformidade: 66.0
    },
    {
      id_lote: 4,
      codigo_lote: 'LOTE-MNG-2026-04',
      nome: 'Safra Petrolina - Exportação Europa',
      variedade: 'Kent',
      device_id: 'esp32c3-01',
      etapa_atual: 'estoque',
      data_inicio: '2026-11-03T00:00:00Z',
      data_colheita: '2026-11-14T00:00:00Z',
      data_fim: '2026-11-21T00:00:00Z',
      status_selo: 'aprovado',
      percentual_pomar: 79.0,
      percentual_estoque: 84.5,
      percentual_conformidade: 81.8
    },
    {
      id_lote: 5,
      codigo_lote: 'LOTE-MNG-2026-05',
      nome: 'Lote Atual em Maturação (Pendente Câmara Fria)',
      variedade: 'Tommy Atkins',
      device_id: 'esp32c3-01',
      etapa_atual: 'pomar',
      data_inicio: '2026-11-21T14:00:00Z',
      data_colheita: null,
      data_fim: null,
      status_selo: 'em_analise',
      percentual_pomar: 89.0,
      percentual_estoque: 0,
      percentual_conformidade: 89.0
    }
  ];

  const readingsMap = {
    // Lote 1: Aprovado nas duas (Pomar 100%, Estoque 100%)
    1: [
      { device_id: 'esp32c3-01', sequence: 101, timestamp: '2026-10-25T12:00:00Z', temperature_c: 26.5, humidity_percent: 58.0, luminosity_lux: 48000 },
      { device_id: 'esp32c3-01', sequence: 102, timestamp: '2026-10-28T14:00:00Z', temperature_c: 27.2, humidity_percent: 54.0, luminosity_lux: 51000 },
      // Colheita foi em 2026-11-09 -> readings após essa data são do Estoque
      { device_id: 'esp32c3-01', sequence: 103, timestamp: '2026-11-11T13:00:00Z', temperature_c: 11.5, humidity_percent: 88.0, luminosity_lux: 20 },
      { device_id: 'esp32c3-01', sequence: 104, timestamp: '2026-11-15T15:00:00Z', temperature_c: 12.0, humidity_percent: 87.0, luminosity_lux: 25 }
    ],
    // Lote 2: Aprovado no Pomar, mas Reprovado no Estoque (refrigeração falhou)
    2: [
      { device_id: 'esp32c3-01', sequence: 201, timestamp: '2026-10-30T12:00:00Z', temperature_c: 26.0, humidity_percent: 55.0, luminosity_lux: 50000 },
      // Colheita em 2026-11-11 -> Estoque com falha térmica
      { device_id: 'esp32c3-01', sequence: 202, timestamp: '2026-11-13T12:00:00Z', temperature_c: 22.0, humidity_percent: 55.0, luminosity_lux: 80 }
    ],
    // Lote 3: Reprovado no Pomar por onda de calor, apesar do Estoque estar bom
    3: [
      { device_id: 'esp32c3-01', sequence: 301, timestamp: '2026-11-05T12:00:00Z', temperature_c: 38.5, humidity_percent: 25.0, luminosity_lux: 50000 },
      // Colheita em 2026-11-13 -> Estoque bom
      { device_id: 'esp32c3-01', sequence: 302, timestamp: '2026-11-15T12:00:00Z', temperature_c: 11.5, humidity_percent: 88.0, luminosity_lux: 20 }
    ]
  };

  return {
    async query(sql, params = []) {
      if (sql.includes('SELECT 1')) return { rowCount: 1, rows: [{ '?column?': 1 }] };
      if (sql.includes('SELECT d.device_id')) {
        if (params[0] === 'demo' && params[1] === 'esp32c3-01') {
          return { rowCount: 1, rows: [{ device_id: params[1], name: 'ESP32-C3 Manga Trace', last_seen_at: '2026-11-16T10:00:00Z' }] };
        }
        return { rowCount: 0, rows: [] };
      }
      if (sql.includes('SELECT r.device_id')) {
        return { rowCount: 1, rows: [{ device_id: 'esp32c3-01', sequence: 7, temperature_c: 27.5, humidity_percent: 60.0, luminosity_lux: 45000, last_seen_at: '2026-11-16T10:00:00Z' }] };
      }
      if (sql.includes('INSERT INTO readings')) return { rowCount: 1, rows: [{ id: 1 }] };
      if (sql.includes('INSERT INTO devices')) return { rowCount: 1, rows: [] };
      if (sql.includes('FROM readings r JOIN device_access')) return { rowCount: 1, rows: [{ device_id: 'esp32c3-01', sequence: 7, luminosity_lux: 45000 }] };
      
      // Lotes e Filtros
      if (sql.includes('FROM lotes l')) {
        if (sql.includes("status_selo = 'aprovado'")) {
          const comSelo = lotesState.filter(l => l.status_selo === 'aprovado');
          return { rowCount: comSelo.length, rows: comSelo };
        }
        return { rowCount: lotesState.length, rows: lotesState };
      }
      if (sql.includes('SELECT * FROM lotes WHERE id_lote')) {
        const found = lotesState.find(l => l.id_lote === params[0]);
        return { rowCount: found ? 1 : 0, rows: found ? [found] : [] };
      }
      if (sql.includes('FROM readings') && sql.includes('device_id = $1') && sql.includes('timestamp >=')) {
        const isLote2 = String(params[1]).includes('2026-10-27');
        const isLote3 = String(params[1]).includes('2026-11-01');
        const rows = isLote2 ? readingsMap[2] : (isLote3 ? readingsMap[3] : readingsMap[1]);
        return { rowCount: rows.length, rows };
      }
      if (sql.includes('UPDATE lotes')) {
        return { rowCount: 1, rows: [lotesState[0]] };
      }

      throw new Error(`Unexpected query in route test: ${sql}`);
    },
  };
}

async function startTestServer(t) {
  const env = { DEMO_USER: 'demo', DEMO_PASSWORD: 'test-password', JWT_SECRET: 'test-secret-at-least-32-characters', DEVICE_API_KEY: 'test-device-key' };
  const server = createApiServer({ db: mockDb(), env });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return { base: `http://127.0.0.1:${server.address().port}`, env };
}

test('Selo de Qualidade da Manga: Regra das Duas Etapas (>= 70% no Pomar E no Estoque)', () => {
  const loteCompleto = {
    id_lote: 1,
    codigo_lote: 'LOTE-TEST-DUAS-ETAPAS',
    nome: 'Lote Teste 2 Etapas',
    etapa_atual: 'estoque',
    data_inicio: '2026-10-01T00:00:00Z',
    data_colheita: '2026-10-20T00:00:00Z',
    data_fim: '2026-11-01T00:00:00Z'
  };

  // 1. Aprovado em AMBAS as etapas (Pomar 100% E Estoque 100%) -> SELO CONCEDIDO
  const leiturasAprovadasAmbas = [
    // Pomar (antes de 2026-10-20)
    { temperature_c: 26.0, humidity_percent: 55.0, luminosity_lux: 45000, timestamp: '2026-10-10T12:00:00Z' },
    // Estoque (após 2026-10-20)
    { temperature_c: 11.5, humidity_percent: 88.0, luminosity_lux: 20, timestamp: '2026-10-25T12:00:00Z' }
  ];
  const resAmbas = avaliarQualidadeLote(loteCompleto, leiturasAprovadasAmbas);
  assert.equal(resAmbas.aprovado_pomar, true);
  assert.equal(resAmbas.aprovado_estoque, true);
  assert.equal(resAmbas.elegivel_selo, true);
  assert.equal(resAmbas.status_selo, 'aprovado');

  // 2. Aprovado no Pomar (100%), mas REPROVADO no Estoque (0%) -> SELO NÃO CONCEDIDO
  const leiturasFalhaEstoque = [
    { temperature_c: 26.0, humidity_percent: 55.0, luminosity_lux: 45000, timestamp: '2026-10-10T12:00:00Z' },
    { temperature_c: 22.0, humidity_percent: 55.0, luminosity_lux: 80, timestamp: '2026-10-25T12:00:00Z' }
  ];
  const resFalhaEstoque = avaliarQualidadeLote(loteCompleto, leiturasFalhaEstoque);
  assert.equal(resFalhaEstoque.aprovado_pomar, true);
  assert.equal(resFalhaEstoque.aprovado_estoque, false);
  assert.equal(resFalhaEstoque.elegivel_selo, false);
  assert.equal(resFalhaEstoque.status_selo, 'reprovado');

  // 3. REPROVADO no Pomar (0%), mas Aprovado no Estoque (100%) -> SELO NÃO CONCEDIDO
  const leiturasFalhaPomar = [
    { temperature_c: 38.0, humidity_percent: 20.0, luminosity_lux: 1000, timestamp: '2026-10-10T12:00:00Z' },
    { temperature_c: 11.5, humidity_percent: 88.0, luminosity_lux: 20, timestamp: '2026-10-25T12:00:00Z' }
  ];
  const resFalhaPomar = avaliarQualidadeLote(loteCompleto, leiturasFalhaPomar);
  assert.equal(resFalhaPomar.aprovado_pomar, false);
  assert.equal(resFalhaPomar.aprovado_estoque, true);
  assert.equal(resFalhaPomar.elegivel_selo, false);
  assert.equal(resFalhaPomar.status_selo, 'reprovado');

  // 4. Lote apenas na etapa Pomar (ainda não colhido) -> EM ANÁLISE / PENDENTE
  const lotePendente = { ...loteCompleto, data_colheita: null, etapa_atual: 'pomar' };
  const leiturasSoPomar = [
    { temperature_c: 26.0, humidity_percent: 55.0, luminosity_lux: 45000, timestamp: '2026-10-10T12:00:00Z' }
  ];
  const resPendente = avaliarQualidadeLote(lotePendente, leiturasSoPomar);
  assert.equal(resPendente.elegivel_selo, false);
  assert.equal(resPendente.status_selo, 'em_analise');
});

test('HTTP routes cover login, protected readings, device authorization, luminosity and health', async t => {
  const { base } = await startTestServer(t);

  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);

  const login = await fetch(`${base}/api/v1/auth/token`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'demo', password: 'test-password' }),
  });
  assert.equal(login.status, 200);
  const { access_token: token } = await login.json();

  const latest = await fetch(`${base}/api/v1/readings/latest`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(latest.status, 200);
  const latestBody = await latest.json();
  assert.equal(latestBody.reading.luminosity_lux, 45000);
});

test('HTTP routes: Lotes com Selo (Filtro) e Auditoria das Duas Etapas', async t => {
  const { base } = await startTestServer(t);
  const login = await fetch(`${base}/api/v1/auth/token`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'demo', password: 'test-password' }),
  });
  const { access_token: token } = await login.json();

  // 1. Listagem completa de todos os lotes
  const lotesRes = await fetch(`${base}/api/v1/lotes`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(lotesRes.status, 200);
  const lotesBody = await lotesRes.json();
  assert.equal(lotesBody.lotes.length, 5);

  // 2. Filtro: "Lotes com Selos" (apenas aprovados em ambas as etapas)
  const seloFilterRes = await fetch(`${base}/api/v1/lotes?apenas_com_selo=true`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(seloFilterRes.status, 200);
  const comSeloBody = await seloFilterRes.json();
  assert.equal(comSeloBody.lotes.length, 2); // Lote 1 e Lote 4
  assert.ok(comSeloBody.lotes.every(l => l.status_selo === 'aprovado'));

  // 3. Auditoria do Lote 1 (Aprovado em ambas as etapas)
  const lote1Res = await fetch(`${base}/api/v1/lotes/1/qualidade`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(lote1Res.status, 200);
  const lote1Body = await lote1Res.json();
  assert.equal(lote1Body.aprovado_pomar, true);
  assert.equal(lote1Body.aprovado_estoque, true);
  assert.equal(lote1Body.elegivel_selo, true);
  assert.equal(lote1Body.status_selo, 'aprovado');

  // 4. Auditoria do Lote 2 (Falhou no Estoque)
  const lote2Res = await fetch(`${base}/api/v1/lotes/2/qualidade`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(lote2Res.status, 200);
  const lote2Body = await lote2Res.json();
  assert.equal(lote2Body.aprovado_pomar, true);
  assert.equal(lote2Body.aprovado_estoque, false);
  assert.equal(lote2Body.elegivel_selo, false);
  assert.equal(lote2Body.status_selo, 'reprovado');
});

test('ingest route rejects bad device key and accepts sensor payload with luminosity', async t => {
  const { base } = await startTestServer(t);
  const payload = {
    device_id: 'esp32c3-01',
    sequence: 8,
    timestamp: '2026-11-16T10:00:00Z',
    temperature_c: 29.7,
    humidity_percent: 78,
    luminosity_lux: 48500
  };

  const rejected = await fetch(`${base}/api/v1/ingest`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-device-key': 'wrong' }, body: JSON.stringify(payload),
  });
  assert.equal(rejected.status, 401);

  const accepted = await fetch(`${base}/api/v1/ingest`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-device-key': 'test-device-key' }, body: JSON.stringify(payload),
  });
  assert.equal(accepted.status, 201);
});

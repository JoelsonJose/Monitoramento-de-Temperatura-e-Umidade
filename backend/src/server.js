import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import { signToken, verifyToken, validReading } from './security.js';
import { migrate } from './migrate.js';

const { Pool } = pg;
const port = Number(process.env.PORT || 3000);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const THINGSPEAK_MIN_INTERVAL_MS = 16_000;
let lastThingSpeakAttemptAt = 0;

function forwardToThingSpeak(reading, env = process.env) {
  const writeKey = env.THINGSPEAK_WRITE_API_KEY;
  if (!writeKey) return;

  const now = Date.now();
  if (now - lastThingSpeakAttemptAt < THINGSPEAK_MIN_INTERVAL_MS) return;
  lastThingSpeakAttemptAt = now;

  const fields = new URLSearchParams({
    api_key: writeKey,
    field1: String(reading.temperature_c),
    field2: String(reading.humidity_percent),
  });
  if (reading.luminosity_lux !== undefined && reading.luminosity_lux !== null) {
    fields.append('field3', String(reading.luminosity_lux));
  }

  void fetch('https://api.thingspeak.com/update', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: fields,
  }).then(async response => {
    const responseBody = (await response.text()).trim();
    const entryId = Number(responseBody);
    if (!response.ok || !Number.isInteger(entryId) || entryId <= 0) {
      console.error(JSON.stringify({ event: 'thingspeak_write_failed', http_status: response.status }));
      return;
    }
    console.log(JSON.stringify({ event: 'thingspeak_write_ok', http_status: response.status, entry_id: entryId }));
  }).catch(() => {
    console.error(JSON.stringify({ event: 'thingspeak_write_failed', http_status: 0 }));
  });
}

function reply(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function bodyJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 32768) throw Object.assign(new Error('Request too large'), { status: 413 });
  }
  try { return JSON.parse(raw || '{}'); }
  catch { throw Object.assign(new Error('Malformed JSON'), { status: 400 }); }
}

function bearer(req) {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  return match?.[1];
}

// Avalia um subconjunto de leituras para uma etapa específica
function avaliarSubconjunto(readings, etapa) {
  if (!readings.length) {
    return { total: 0, pctTemp: 0, pctUmid: 0, pctLux: 0, pctGeral: 0, aprovado: false };
  }
  let tempOk = 0, umidOk = 0, luxOk = 0;

  for (const r of readings) {
    const temp = Number(r.temperature_c);
    const umid = Number(r.humidity_percent);
    const lux = (r.luminosity_lux !== null && r.luminosity_lux !== undefined) ? Number(r.luminosity_lux) : null;
    const date = new Date(r.timestamp);
    const hour = Number.isFinite(date.getTime()) ? date.getUTCHours() : 12;

    if (etapa === 'pomar') {
      if (temp >= 24 && temp <= 30) tempOk++;
      if (umid >= 45 && umid <= 70) umidOk++;
      if (lux !== null) {
        const isDayTime = hour >= 9 && hour <= 21; // 06h às 18h no Nordeste (UTC-3)
        if (isDayTime) {
          if (lux >= 40000) luxOk++;
        } else {
          if (lux <= 500) luxOk++;
        }
      } else {
        luxOk++;
      }
    } else {
      // Estoque (Câmara Fria)
      if (temp >= 10 && temp <= 13) tempOk++;
      if (umid >= 85 && umid <= 90) umidOk++;
      if (lux !== null) {
        if (lux <= 50) luxOk++;
      } else {
        luxOk++;
      }
    }
  }

  const pctTemp = Number(((tempOk / readings.length) * 100).toFixed(1));
  const pctUmid = Number(((umidOk / readings.length) * 100).toFixed(1));
  const pctLux = Number(((luxOk / readings.length) * 100).toFixed(1));
  const pctGeral = Number(((pctTemp + pctUmid + pctLux) / 3).toFixed(1));
  const aprovado = pctGeral >= 70.0;

  return { total: readings.length, pctTemp, pctUmid, pctLux, pctGeral, aprovado };
}

// Avaliação do Selo de Qualidade: EXIGE >= 70% EM AMBAS AS ETAPAS (Pomar E Estoque)
export function avaliarQualidadeLote(lote, allReadings) {
  const dataColheita = lote.data_colheita ? new Date(lote.data_colheita).getTime() : null;
  const leiturasPomar = [];
  const leiturasEstoque = [];

  for (const r of allReadings) {
    const rTime = new Date(r.timestamp).getTime();
    if (dataColheita) {
      if (rTime < dataColheita) leiturasPomar.push(r);
      else leiturasEstoque.push(r);
    } else {
      if (lote.etapa_atual === 'estoque') leiturasEstoque.push(r);
      else leiturasPomar.push(r);
    }
  }

  const resPomar = avaliarSubconjunto(leiturasPomar, 'pomar');
  const resEstoque = avaliarSubconjunto(leiturasEstoque, 'estoque');

  const temPomar = resPomar.total > 0;
  const temEstoque = resEstoque.total > 0;

  let percentualGeral = 0;
  let elegivelSelo = false;
  let statusSelo = 'em_analise';
  let justificativa = '';

  if (temPomar && temEstoque) {
    percentualGeral = Number(((resPomar.pctGeral + resEstoque.pctGeral) / 2).toFixed(1));
    // REGRA DAS DUAS ETAPAS: TEM QUE BATER >= 70% NO POMAR E >= 70% NO ESTOQUE!
    elegivelSelo = resPomar.aprovado && resEstoque.aprovado;
    statusSelo = elegivelSelo ? 'aprovado' : 'reprovado';
    if (elegivelSelo) {
      justificativa = `Aprovado em ambas as etapas: Pomar (${resPomar.pctGeral}%) e Estoque (${resEstoque.pctGeral}%). Selo de Qualidade concedido!`;
    } else {
      if (!resPomar.aprovado && !resEstoque.aprovado) {
        justificativa = `Reprovado em ambas as etapas: Pomar (${resPomar.pctGeral}%) e Estoque (${resEstoque.pctGeral}%). Abaixo da meta de 70%.`;
      } else if (!resPomar.aprovado) {
        justificativa = `Reprovado no Pomar (${resPomar.pctGeral}% < 70%), apesar de aprovado no Estoque (${resEstoque.pctGeral}%). Selo exige aprovação nas duas etapas.`;
      } else {
        justificativa = `Aprovado no Pomar (${resPomar.pctGeral}%), mas REPROVADO no Estoque (${resEstoque.pctGeral}% < 70%). Selo exige aprovação nas duas etapas.`;
      }
    }
  } else if (temPomar) {
    percentualGeral = resPomar.pctGeral;
    statusSelo = 'em_analise';
    elegivelSelo = false;
    justificativa = `Etapa de Pomar com ${resPomar.pctGeral}%. Aguardando conclusão da etapa de Estoque/Câmara Fria para auditoria final do Selo.`;
  } else if (temEstoque) {
    percentualGeral = resEstoque.pctGeral;
    statusSelo = 'em_analise';
    elegivelSelo = false;
    justificativa = `Etapa de Estoque com ${resEstoque.pctGeral}%. Aguardando dados do Pomar para auditoria completa das duas etapas.`;
  } else {
    statusSelo = 'em_analise';
    elegivelSelo = false;
    justificativa = 'Aguardando leituras dos sensores.';
  }

  const dataFim = lote.data_fim || new Date().toISOString();
  const diasTotais = Math.max(1, Math.round((new Date(dataFim) - new Date(lote.data_inicio)) / 86400000));

  return {
    lote_id: lote.id_lote,
    codigo_lote: lote.codigo_lote,
    nome: lote.nome,
    variedade: lote.variedade || 'Tommy Atkins',
    etapa_atual: lote.etapa_atual,
    periodo: {
      data_inicio: lote.data_inicio,
      data_colheita: lote.data_colheita,
      data_fim: dataFim,
      dias_totais: diasTotais
    },
    total_leituras: allReadings.length,
    percentual_geral: percentualGeral,
    percentual_pomar: resPomar.pctGeral,
    percentual_estoque: resEstoque.pctGeral,
    aprovado_pomar: resPomar.aprovado,
    aprovado_estoque: resEstoque.aprovado,
    elegivel_selo: elegivelSelo,
    status_selo: statusSelo,
    justificativa,
    detalhamento_por_criterio: {
      pomar: {
        total_leituras: resPomar.total,
        conformidade_geral: resPomar.pctGeral,
        aprovado: resPomar.aprovado,
        temperatura: { conformidade_percent: resPomar.pctTemp, ideal_min: 24, ideal_max: 30 },
        umidade: { conformidade_percent: resPomar.pctUmid, ideal_min: 45, ideal_max: 70 },
        luminosidade: { conformidade_percent: resPomar.pctLux, ideal_min: 40000, ideal_max: null, descricao: 'Acima de 40.000 lux (dia)' }
      },
      estoque: {
        total_leituras: resEstoque.total,
        conformidade_geral: resEstoque.pctGeral,
        aprovado: resEstoque.aprovado,
        temperatura: { conformidade_percent: resEstoque.pctTemp, ideal_min: 10, ideal_max: 13 },
        umidade: { conformidade_percent: resEstoque.pctUmid, ideal_min: 85, ideal_max: 90 },
        luminosidade: { conformidade_percent: resEstoque.pctLux, ideal_min: 0, ideal_max: 50, descricao: 'Abaixo de 50 lux (escuro)' }
      }
    }
  };
}

async function handler(req, res, db = pool, env = process.env) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      await db.query('SELECT 1');
      return reply(res, 200, { status: 'ok', database: 'connected' });
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/auth/token') {
      const body = await bodyJson(req);
      if (!env.DEMO_USER || !env.DEMO_PASSWORD || !env.JWT_SECRET) {
        return reply(res, 503, { error: 'User authentication is not configured' });
      }
      if (body.username !== env.DEMO_USER || body.password !== env.DEMO_PASSWORD) {
        return reply(res, 401, { error: 'Invalid credentials' });
      }
      return reply(res, 200, { access_token: signToken(body.username, env.JWT_SECRET), token_type: 'Bearer', expires_in: 3600 });
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/ingest') {
      const expected = env.DEVICE_API_KEY;
      if (!expected || req.headers['x-device-key'] !== expected) return reply(res, 401, { error: 'Invalid device key' });
      const body = await bodyJson(req);
      if (!validReading(body)) return reply(res, 400, { error: 'Invalid reading payload' });
      await db.query(`INSERT INTO devices(device_id, last_seen_at) VALUES($1, NOW())
        ON CONFLICT(device_id) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at`, [body.device_id]);
      const result = await db.query(
        `INSERT INTO readings(device_id, sequence, timestamp, temperature_c, humidity_percent, luminosity_lux)
         VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(device_id, sequence) DO NOTHING RETURNING id`,
        [body.device_id, body.sequence, body.timestamp, body.temperature_c, body.humidity_percent, body.luminosity_lux ?? null]
      );
      if (result.rowCount) forwardToThingSpeak(body, env);
      return reply(res, result.rowCount ? 201 : 200, { accepted: Boolean(result.rowCount), duplicate: !result.rowCount });
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/readings/latest') {
      const identity = verifyToken(bearer(req), env.JWT_SECRET);
      if (!identity) return reply(res, 401, { error: 'Bearer token required or expired' });
      const result = await db.query(`SELECT r.device_id, r.sequence, r.timestamp, r.temperature_c,
        r.humidity_percent, r.luminosity_lux, d.last_seen_at FROM readings r
        JOIN devices d USING(device_id)
        JOIN device_access a USING(device_id)
        WHERE a.username = $1 AND a.can_read = TRUE
        ORDER BY r.timestamp DESC LIMIT 1`, [identity.sub]);
      return reply(res, 200, { reading: result.rows[0] || null });
    }

    const deviceRoute = /^\/api\/v1\/devices\/([^/]+)(?:\/readings)?$/.exec(url.pathname);
    if (req.method === 'GET' && deviceRoute) {
      const identity = verifyToken(bearer(req), env.JWT_SECRET);
      if (!identity) return reply(res, 401, { error: 'Bearer token required or expired' });
      const deviceId = decodeURIComponent(deviceRoute[1]);
      const access = await db.query(`SELECT d.device_id, d.name, d.created_at, d.last_seen_at
        FROM devices d JOIN device_access a USING(device_id)
        WHERE a.username = $1 AND a.device_id = $2 AND a.can_read = TRUE`, [identity.sub, deviceId]);
      if (!access.rowCount) return reply(res, 403, { error: 'You do not have access to this device' });
      if (url.pathname.endsWith('/readings')) {
        const readings = await db.query(`SELECT device_id, sequence, timestamp, temperature_c, humidity_percent, luminosity_lux
          FROM readings WHERE device_id = $1 ORDER BY timestamp DESC LIMIT 100`, [deviceId]);
        return reply(res, 200, { device: access.rows[0], readings: readings.rows });
      }
      return reply(res, 200, { device: access.rows[0] });
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/readings') {
      const identity = verifyToken(bearer(req), env.JWT_SECRET);
      if (!identity) return reply(res, 401, { error: 'Bearer token required or expired' });
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 50)));
      const before = url.searchParams.get('before');
      const result = before
        ? await db.query(`SELECT r.device_id, r.sequence, r.timestamp, r.temperature_c, r.humidity_percent, r.luminosity_lux
            FROM readings r JOIN device_access a USING(device_id)
            WHERE a.username = $3 AND a.can_read = TRUE AND r.timestamp < $1
            ORDER BY r.timestamp DESC LIMIT $2`, [before, limit, identity.sub])
        : await db.query(`SELECT r.device_id, r.sequence, r.timestamp, r.temperature_c, r.humidity_percent, r.luminosity_lux
            FROM readings r JOIN device_access a USING(device_id)
            WHERE a.username = $2 AND a.can_read = TRUE
            ORDER BY r.timestamp DESC LIMIT $1`, [limit, identity.sub]);
      return reply(res, 200, { readings: result.rows, count: result.rowCount });
    }

    // --- ROTAS DO SELO DE QUALIDADE DA MANGA & LOTES COM SELO ---
    if (req.method === 'GET' && url.pathname === '/api/v1/lotes') {
      const identity = verifyToken(bearer(req), env.JWT_SECRET);
      if (!identity) return reply(res, 401, { error: 'Bearer token required or expired' });
      const apenasComSelo = url.searchParams.get('apenas_com_selo') === 'true' || url.searchParams.get('status') === 'aprovado';
      const statusFilter = url.searchParams.get('status');

      let query = `
        SELECT l.id_lote, l.codigo_lote, l.nome, l.variedade, l.device_id, l.etapa_atual,
               l.data_inicio, l.data_colheita, l.data_fim, l.percentual_pomar, l.percentual_estoque,
               l.status_selo, l.percentual_conformidade, l.created_at
        FROM lotes l
        LEFT JOIN device_access a ON (l.device_id = a.device_id AND a.username = $1)
      `;
      const params = [identity.sub];
      if (apenasComSelo) {
        query += ` WHERE l.status_selo = 'aprovado'`;
      } else if (statusFilter) {
        params.push(statusFilter);
        query += ` WHERE l.status_selo = $2`;
      }
      query += ` ORDER BY l.id_lote ASC`;

      const lotes = await db.query(query, params);
      return reply(res, 200, { lotes: lotes.rows });
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/lotes') {
      const identity = verifyToken(bearer(req), env.JWT_SECRET);
      if (!identity) return reply(res, 401, { error: 'Bearer token required or expired' });
      const body = await bodyJson(req);
      if (!body.codigo_lote || !body.nome) {
        return reply(res, 400, { error: 'codigo_lote and nome are required' });
      }
      const etapa = body.etapa_atual === 'estoque' ? 'estoque' : 'pomar';
      const inicio = body.data_inicio ? new Date(body.data_inicio).toISOString() : new Date().toISOString();
      const colheita = body.data_colheita ? new Date(body.data_colheita).toISOString() : null;
      const fim = body.data_fim ? new Date(body.data_fim).toISOString() : null;
      const deviceId = body.device_id || 'esp32c3-01';

      const result = await db.query(`
        INSERT INTO lotes(codigo_lote, nome, variedade, device_id, etapa_atual, data_inicio, data_colheita, data_fim)
        VALUES($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [body.codigo_lote, body.nome, body.variedade || 'Tommy Atkins', deviceId, etapa, inicio, colheita, fim]);
      return reply(res, 201, { lote: result.rows[0] });
    }

    const loteQualidadeMatch = /^\/api\/v1\/lotes\/(\d+)\/qualidade$/.exec(url.pathname);
    if (req.method === 'GET' && loteQualidadeMatch) {
      const identity = verifyToken(bearer(req), env.JWT_SECRET);
      if (!identity) return reply(res, 401, { error: 'Bearer token required or expired' });
      const loteId = Number(loteQualidadeMatch[1]);
      const loteRes = await db.query(`SELECT * FROM lotes WHERE id_lote = $1`, [loteId]);
      if (!loteRes.rowCount) return reply(res, 404, { error: 'Lote não encontrado' });
      const lote = loteRes.rows[0];

      // Busca leituras do dispositivo vinculadas ao lote
      const leiturasRes = await db.query(`
        SELECT temperature_c, humidity_percent, luminosity_lux, timestamp
        FROM readings
        WHERE device_id = $1
          AND timestamp >= $2
          AND ($3::timestamptz IS NULL OR timestamp <= $3)
        ORDER BY timestamp ASC
      `, [lote.device_id, lote.data_inicio, lote.data_fim]);

      const relatorio = avaliarQualidadeLote(lote, leiturasRes.rows);

      // Atualiza o lote com status, percentuais de ambas as etapas
      await db.query(`
        UPDATE lotes
        SET status_selo = $1,
            percentual_pomar = $2,
            percentual_estoque = $3,
            percentual_conformidade = $4
        WHERE id_lote = $5
      `, [relatorio.status_selo, relatorio.percentual_pomar, relatorio.percentual_estoque, relatorio.percentual_geral, lote.id_lote]);

      return reply(res, 200, relatorio);
    }

    const loteEtapaMatch = /^\/api\/v1\/lotes\/(\d+)$/.exec(url.pathname);
    if (req.method === 'PATCH' && loteEtapaMatch) {
      const identity = verifyToken(bearer(req), env.JWT_SECRET);
      if (!identity) return reply(res, 401, { error: 'Bearer token required or expired' });
      const loteId = Number(loteEtapaMatch[1]);
      const body = await bodyJson(req);
      const updates = [];
      const values = [];
      let idx = 1;
      if (body.etapa_atual && ['pomar', 'estoque'].includes(body.etapa_atual)) {
        updates.push(`etapa_atual = $${idx++}`);
        values.push(body.etapa_atual);
        if (body.etapa_atual === 'estoque' && !body.data_colheita) {
          updates.push(`data_colheita = $${idx++}`);
          values.push(new Date().toISOString());
        }
      }
      if (body.data_colheita !== undefined) {
        updates.push(`data_colheita = $${idx++}`);
        values.push(body.data_colheita ? new Date(body.data_colheita).toISOString() : null);
      }
      if (body.data_fim !== undefined) {
        updates.push(`data_fim = $${idx++}`);
        values.push(body.data_fim ? new Date(body.data_fim).toISOString() : null);
      }
      if (!updates.length) return reply(res, 400, { error: 'No fields to update' });
      values.push(loteId);
      const result = await db.query(`
        UPDATE lotes SET ${updates.join(', ')} WHERE id_lote = $${idx} RETURNING *
      `, values);
      if (!result.rowCount) return reply(res, 404, { error: 'Lote não encontrado' });
      return reply(res, 200, { lote: result.rows[0] });
    }

    if (req.method === 'GET' && url.pathname === '/') {
      const html = await readFile(path.join(publicDir, 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    return reply(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error(JSON.stringify({ event: 'request_error', message: error.message }));
    return reply(res, error.status || 500, { error: error.status ? error.message : 'Internal server error' });
  }
}

export function createApiServer({ db = pool, env = process.env } = {}) {
  return http.createServer((req, res) => handler(req, res, db, env));
}

async function start() {
  await migrate(pool, { demoUser: process.env.DEMO_USER, demoDeviceId: process.env.DEMO_DEVICE_ID || 'esp32c3-01' });
  const server = createApiServer();
  server.listen(port, '0.0.0.0', () => console.log(`API listening on ${port}`));
  if (!process.env.THINGSPEAK_WRITE_API_KEY) console.log('ThingSpeak forwarding disabled: set THINGSPEAK_WRITE_API_KEY to enable it.');
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async () => { server.close(); await pool.end(); process.exit(0); });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  start().catch(error => { console.error('API startup failed:', error.message); process.exit(1); });
}

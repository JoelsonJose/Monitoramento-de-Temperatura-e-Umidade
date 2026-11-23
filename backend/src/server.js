import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import { signToken, verifyToken, validReading } from './security.js';
import { migrate } from './migrate.js';
import { encryptSecret, decryptSecret } from './auth/secret-encryption.js';import {
  generateTotpSecret,
  generateTotp,
  verifyTotp,
  buildTotpUri,
  getMatchingTotpStep
} from './auth/totp.js';

import {
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCode
} from './auth/recovery-codes.js';

import { generateQrCode } from './auth/qr-code.js';
import { consumeTotpStep } from './auth/totp-replay.js';

// Auto-carregamento de variáveis de ambiente do .env ou defaults inteligentes
const rootDir = fileURLToPath(new URL('../../', import.meta.url));
const envPath = path.join(rootDir, '.env');
if (existsSync(envPath)) {
  try {
    const envContent = readFileSync(envPath, 'utf8');
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
    }
  } catch {}
}

process.env.DEMO_USER = process.env.DEMO_USER || 'demo';
process.env.DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'manga-trace-jwt-secret-key-32-bytes-minimum';
process.env.DEVICE_API_KEY = process.env.DEVICE_API_KEY || 'test-device-key';
process.env.OTP_ENCRYPTION_KEY = process.env.OTP_ENCRYPTION_KEY || 'manga-trace-otp-key-minimum-32-chars-long!';
process.env.MISSION_CODE = process.env.MISSION_CODE || 'MISSAO';

export function logSecurityBlock(control, reason, details = {}, env = process.env) {
  const missionCode = (env && env.MISSION_CODE) || process.env.MISSION_CODE || 'MISSAO';
  console.warn(`[SEGURANCA][${missionCode}][${control}] Bloqueio: ${reason} | detalhes=${JSON.stringify(details)}`);
}

const { Pool } = pg;
const port = Number(process.env.PORT || 3000);
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const THINGSPEAK_MIN_INTERVAL_MS = 16_000;
let lastThingSpeakAttemptAt = 0;

function createInMemoryDb() {
  console.log('[Manga Trace] Modo Plug & Play Local (Banco em Memória ativo com 5 lotes pré-carregados).');
  const demoUsername = process.env.DEMO_USER || 'demo';
  const usersState = {
    demo: {
      username: 'demo',
      role: 'admin',
      otp_enabled: false,
      otp_secret_encrypted: null,
      otp_last_step: null,
      recovery_codes_hash: [],
      otp_enrolled_at: null
    },
    [demoUsername]: {
      username: demoUsername,
      role: 'admin',
      otp_enabled: false,
      otp_secret_encrypted: null,
      otp_last_step: null,
      recovery_codes_hash: [],
      otp_enrolled_at: null
    }
  };
  const lotesState = [
    {
      id_lote: 1,
      codigo_lote: 'LOTE-MNG-2026-01',
      nome: 'Safra Vale do São Francisco',
      variedade: 'Tommy Atkins',
      device_id: 'esp32c3-01',
      etapa_atual: 'estoque',
      data_inicio: '2026-10-23T00:00:00Z',
      data_colheita: '2026-11-09T00:00:00Z',
      data_fim: '2026-11-20T00:00:00Z',
      status_selo: 'aprovado',
      percentual_pomar: 100.0,
      percentual_estoque: 100.0,
      percentual_conformidade: 100.0
    },
    {
      id_lote: 2,
      codigo_lote: 'LOTE-MNG-2026-02',
      nome: 'Safra Petrolina',
      variedade: 'Palmer',
      device_id: 'esp32c3-01',
      etapa_atual: 'estoque',
      data_inicio: '2026-10-27T00:00:00Z',
      data_colheita: '2026-11-11T00:00:00Z',
      data_fim: '2026-11-18T00:00:00Z',
      status_selo: 'reprovado',
      percentual_pomar: 100.0,
      percentual_estoque: 33.3,
      percentual_conformidade: 66.7
    },
    {
      id_lote: 3,
      codigo_lote: 'LOTE-MNG-2026-03',
      nome: 'Safra Sertão Central',
      variedade: 'Keitt',
      device_id: 'esp32c3-01',
      etapa_atual: 'estoque',
      data_inicio: '2026-11-01T00:00:00Z',
      data_colheita: '2026-11-13T00:00:00Z',
      data_fim: '2026-11-19T00:00:00Z',
      status_selo: 'reprovado',
      percentual_pomar: 33.3,
      percentual_estoque: 100.0,
      percentual_conformidade: 66.7
    },
    {
      id_lote: 4,
      codigo_lote: 'LOTE-MNG-2026-04',
      nome: 'Safra Juazeiro',
      variedade: 'Kent',
      device_id: 'esp32c3-01',
      etapa_atual: 'estoque',
      data_inicio: '2026-11-03T00:00:00Z',
      data_colheita: '2026-11-14T00:00:00Z',
      data_fim: '2026-11-21T00:00:00Z',
      status_selo: 'aprovado',
      percentual_pomar: 100.0,
      percentual_estoque: 100.0,
      percentual_conformidade: 100.0
    },
    {
      id_lote: 5,
      codigo_lote: 'LOTE-MNG-2026-05',
      nome: 'Safra Maturação no Pé',
      variedade: 'Tommy Atkins',
      device_id: 'esp32c3-01',
      etapa_atual: 'pomar',
      data_inicio: '2026-11-21T14:00:00Z',
      data_colheita: null,
      data_fim: null,
      status_selo: 'em_analise',
      percentual_pomar: 100.0,
      percentual_estoque: 0,
      percentual_conformidade: 100.0
    }
  ];

  const readingsMap = {
    // Lote 1: Aprovado nas duas etapas (Pomar 100%, Estoque 100%)
    1: [
      { device_id: 'esp32c3-01', sequence: 101, timestamp: '2026-10-25T12:00:00Z', temperature_c: 26.5, humidity_percent: 58.0, luminosity_lux: 48000 },
      { device_id: 'esp32c3-01', sequence: 102, timestamp: '2026-10-28T14:00:00Z', temperature_c: 27.2, humidity_percent: 54.0, luminosity_lux: 51000 },
      { device_id: 'esp32c3-01', sequence: 103, timestamp: '2026-11-11T13:00:00Z', temperature_c: 11.5, humidity_percent: 88.0, luminosity_lux: 20 },
      { device_id: 'esp32c3-01', sequence: 104, timestamp: '2026-11-15T15:00:00Z', temperature_c: 12.0, humidity_percent: 87.0, luminosity_lux: 25 }
    ],
    // Lote 2: Aprovado no Pomar, mas Reprovado no Estoque (falha de refrigeração)
    2: [
      { device_id: 'esp32c3-01', sequence: 201, timestamp: '2026-10-30T12:00:00Z', temperature_c: 26.0, humidity_percent: 55.0, luminosity_lux: 50000 },
      { device_id: 'esp32c3-01', sequence: 202, timestamp: '2026-11-13T12:00:00Z', temperature_c: 22.0, humidity_percent: 55.0, luminosity_lux: 80 }
    ],
    // Lote 3: Reprovado no Pomar por onda de calor, Estoque bom
    3: [
      { device_id: 'esp32c3-01', sequence: 301, timestamp: '2026-11-05T12:00:00Z', temperature_c: 38.5, humidity_percent: 25.0, luminosity_lux: 50000 },
      { device_id: 'esp32c3-01', sequence: 302, timestamp: '2026-11-15T12:00:00Z', temperature_c: 11.5, humidity_percent: 88.0, luminosity_lux: 20 }
    ],
    // Lote 4: Aprovado nas duas etapas
    4: [
      { device_id: 'esp32c3-01', sequence: 401, timestamp: '2026-11-06T12:00:00Z', temperature_c: 26.5, humidity_percent: 57.0, luminosity_lux: 47000 },
      { device_id: 'esp32c3-01', sequence: 402, timestamp: '2026-11-17T12:00:00Z', temperature_c: 12.0, humidity_percent: 88.0, luminosity_lux: 22 }
    ],
    // Lote 5: Pomar ativo em maturação
    5: [
      { device_id: 'esp32c3-01', sequence: 501, timestamp: '2026-11-22T08:00:00Z', temperature_c: 27.0, humidity_percent: 62.0, luminosity_lux: 46000 }
    ]
  };

  const readingsState = [
    ...readingsMap[1],
    ...readingsMap[2],
    ...readingsMap[3],
    ...readingsMap[4],
    ...readingsMap[5],
    { device_id: 'esp32c3-01', sequence: 999, timestamp: new Date().toISOString(), temperature_c: 27.5, humidity_percent: 62.0, luminosity_lux: 46000, last_seen_at: new Date().toISOString() }
  ];

  return {
    async query(sql, params = []) {
      if (sql.includes('SELECT 1')) return { rowCount: 1, rows: [{ '?column?': 1 }] };
      if (sql.includes('SELECT d.device_id')) {
        return { rowCount: 1, rows: [{ device_id: 'esp32c3-01', name: 'ESP32-C3 Manga Trace', last_seen_at: new Date().toISOString() }] };
      }
      if (sql.includes('SELECT r.device_id') && sql.includes('ORDER BY r.timestamp DESC LIMIT 1')) {
        const latest = readingsState[readingsState.length - 1];
        return { rowCount: 1, rows: [{ ...latest, last_seen_at: latest.timestamp }] };
      }
      if (sql.includes('INSERT INTO readings')) {
        const newReading = {
          device_id: params[0],
          sequence: params[1],
          timestamp: params[2],
          temperature_c: params[3],
          humidity_percent: params[4],
          luminosity_lux: params[5],
          last_seen_at: new Date().toISOString()
        };
        readingsState.push(newReading);
        return { rowCount: 1, rows: [{ id: readingsState.length }] };
      }
      if (sql.includes('INSERT INTO devices')) return { rowCount: 1, rows: [] };
      if (sql.includes('FROM readings r JOIN device_access')) {
        const limit = Number(params[params.length - 1] || 50);
        const rows = readingsState.slice(-limit).reverse();
        return { rowCount: rows.length, rows };
      }
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
        const tInicio = String(params[1]);
        let matching = readingsMap[1];
        if (tInicio.includes('2026-10-27')) matching = readingsMap[2];
        else if (tInicio.includes('2026-11-01')) matching = readingsMap[3];
        else if (tInicio.includes('2026-11-03')) matching = readingsMap[4];
        else if (tInicio.includes('2026-11-21')) matching = readingsMap[5];
        return { rowCount: matching.length, rows: matching };
      }
      if (sql.includes('UPDATE lotes')) {
        const id = params[params.length - 1];
        const found = lotesState.find(l => l.id_lote === Number(id)) || lotesState[0];
        if (sql.includes('status_selo = $1')) {
          found.status_selo = params[0];
          found.percentual_pomar = params[1];
          found.percentual_estoque = params[2];
          found.percentual_conformidade = params[3];
        }
        if (sql.includes('etapa_atual = $1')) {
          found.etapa_atual = params[0];
          if (params[1] && sql.includes('data_colheita')) {
            found.data_colheita = params[1];
          }
        }
        if (sql.includes("etapa_atual = 'estoque'")) {
          found.etapa_atual = 'estoque';
          if (!found.data_colheita) found.data_colheita = params[0] || new Date().toISOString();
        }
        return { rowCount: 1, rows: [found] };
      }
      if (sql.includes('INSERT INTO lotes')) {
        const novo = {
          id_lote: lotesState.length + 1,
          codigo_lote: params[0],
          nome: params[1],
          variedade: params[2],
          device_id: params[3],
          etapa_atual: params[4],
          data_inicio: params[5],
          data_colheita: params[6],
          data_fim: params[7],
          status_selo: 'em_analise',
          percentual_pomar: 0,
          percentual_estoque: 0,
          percentual_conformidade: 0
        };
        lotesState.push(novo);
        return { rowCount: 1, rows: [novo] };
      }
      if (sql.includes('DELETE FROM lotes WHERE id_lote')) {
        const id = Number(params[0]);
        const idx = lotesState.findIndex(l => l.id_lote === id);
        if (idx === -1) return { rowCount: 0, rows: [] };
        lotesState.splice(idx, 1);
        return { rowCount: 1, rows: [{ id_lote: id }] };
      }
      if (sql.startsWith('UPDATE lotes SET\n          codigo_lote')) {
        const id = Number(params[7]);
        const found = lotesState.find(l => l.id_lote === id);
        if (!found) return { rowCount: 0, rows: [] };
        found.codigo_lote = params[0];
        found.nome = params[1];
        found.variedade = params[2];
        found.etapa_atual = params[3];
        found.data_inicio = params[4];
        found.data_colheita = params[5];
        found.data_fim = params[6];
        return { rowCount: 1, rows: [found] };
      }
      if (sql.includes('FROM users')) {
        const username = params[0];
        let u = usersState[username];
        if (!u && username === demoUsername) {
          u = { username, role: 'admin', otp_enabled: false, otp_secret_encrypted: null, otp_last_step: null, recovery_codes_hash: [] };
          usersState[username] = u;
        }
        if (!u) return { rowCount: 0, rows: [] };
        if (sql.includes('otp_enabled = TRUE') && !u.otp_enabled) return { rowCount: 0, rows: [] };
        if (sql.includes('otp_enabled = FALSE') && u.otp_enabled) return { rowCount: 0, rows: [] };
        return { rowCount: 1, rows: [u] };
      }
      if (sql.includes('UPDATE users')) {
        const username = params[0];
        let u = usersState[username];
        if (!u) {
          u = { username, role: 'viewer', otp_enabled: false, otp_secret_encrypted: null, otp_last_step: null, recovery_codes_hash: [] };
          usersState[username] = u;
        }
        if (sql.includes('otp_secret_encrypted = $2')) {
          u.otp_secret_encrypted = params[1];
          u.otp_enabled = false;
          u.otp_last_step = null;
          u.recovery_codes_hash = [];
        } else if (sql.includes('otp_enabled = TRUE')) {
          u.otp_enabled = true;
          u.otp_last_step = params[1];
          u.recovery_codes_hash = typeof params[2] === 'string' ? JSON.parse(params[2]) : params[2];
          u.otp_enrolled_at = new Date().toISOString();
        } else if (sql.includes('otp_last_step = $2')) {
          const step = params[1];
          if (u.otp_last_step !== null && u.otp_last_step >= step) {
            return { rowCount: 0, rows: [] };
          }
          u.otp_last_step = step;
        } else if (sql.includes('recovery_codes_hash = recovery_codes_hash - $2')) {
          const hashToRemove = params[1];
          u.recovery_codes_hash = (u.recovery_codes_hash || []).filter(h => h !== hashToRemove);
        }
        return { rowCount: 1, rows: [u] };
      }
      if (sql.includes('FROM device_access')) {
        const username = params[0];
        const devId = params[1];
        if ((username === 'demo' || username === demoUsername) && (!devId || devId === 'esp32c3-01')) {
          return { rowCount: 1, rows: [{ username, device_id: 'esp32c3-01', is_owner: true, can_read: true }] };
        }
        return { rowCount: 0, rows: [] };
      }
      if (sql.includes('INNER JOIN device_access a ON a.device_id = l.device_id')) {
        const [loteId, username] = params;
        if ((username === 'demo' || username === demoUsername) && lotesState.some(l => l.id_lote === Number(loteId))) {
          return { rowCount: 1, rows: [{ id_lote: Number(loteId) }] };
        }
        return { rowCount: 0, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    }
  };
}

let activeDb = null;

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
async function verificarAcessoLote(db, username, loteId, exigirProprietario = false) {
  const result = await db.query(`
    SELECT l.id_lote
    FROM lotes l
    INNER JOIN device_access a ON a.device_id = l.device_id
    WHERE l.id_lote = $1
      AND a.username = $2
      AND a.can_read = TRUE
      ${exigirProprietario ? 'AND a.is_owner = TRUE' : ''}
    LIMIT 1
  `, [loteId, username]);

  return result.rowCount > 0;
}
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
        const isDayTime = hour >= 9 && hour <= 21;
        if (isDayTime) {
          if (lux >= 40000) luxOk++;
        } else {
          if (lux <= 500) luxOk++;
        }
      } else {
        luxOk++;
      }
    } else {
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

async function handler(req, res, db = (activeDb || pool), env = process.env) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      await db.query('SELECT 1');
      return reply(res, 200, { status: 'ok', database: 'connected' });
    }

  
    if (req.method === 'POST' && url.pathname === '/api/v1/auth/token') {
      const body = await bodyJson(req);

      const isDefaultDemo = body.username === 'demo' && body.password === 'demo';
      const isEnvConfigured = body.username === env.DEMO_USER && body.password === env.DEMO_PASSWORD;

      if (!isDefaultDemo && !isEnvConfigured) {
        logSecurityBlock('2FA_OTP', 'Credenciais inválidas no login primário', { username: body.username }, env);
        return reply(res, 401, { error: 'Invalid credentials' });
      }

      const result = await db.query(
        `SELECT username, otp_enabled
         FROM users
         WHERE username = $1`,
        [body.username]
      );

      if (!result.rowCount) {
        logSecurityBlock('2FA_OTP', 'Usuário não localizado no banco', { username: body.username }, env);
        return reply(res, 401, { error: 'User not found' });
      }

      const user = result.rows[0];

      if (!user.otp_enabled) {
        const setupToken = signToken(
          user.username,
          env.JWT_SECRET,
          undefined,
          { purpose: 'otp_setup', expiresInSeconds: 600 }
        );

        return reply(res, 200, {
          setup_required: true,
          setup_token: setupToken,
          message: 'Two-factor authentication setup required'
        });
      }

      const challengeToken = signToken(
        user.username,
        env.JWT_SECRET,
        undefined,
        { purpose: 'otp_challenge', expiresInSeconds: 300 }
      );

      return reply(res, 200, {
        otp_required: true,
        challenge_token: challengeToken
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/auth/otp/setup') {
      const identity = verifyToken(
        bearer(req),
        env.JWT_SECRET,
        undefined,
        { purpose: 'otp_setup' }
      );

      if (!identity) {
        return reply(res, 401, { error: 'Invalid or expired setup token' });
      }

      if (!env.OTP_ENCRYPTION_KEY) {
        return reply(res, 500, { error: 'OTP_ENCRYPTION_KEY is not configured' });
      }

      const secret = generateTotpSecret();
      const encryptedSecret = encryptSecret(secret, env.OTP_ENCRYPTION_KEY);

      await db.query(
        `UPDATE users
         SET otp_secret_encrypted = $2,
             otp_enabled = FALSE,
             otp_last_step = NULL,
             recovery_codes_hash = '[]'::jsonb
         WHERE username = $1`,
        [identity.sub, encryptedSecret]
      );

      const uri = buildTotpUri({
        secret,
        accountName: identity.sub,
        issuer: 'Manga Trace'
      });

      const qrCode = await generateQrCode(uri);

      return reply(res, 200, {
        qr_code: qrCode,
        secret,
        message: 'Scan the QR code with your authenticator app'
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/auth/otp/enable') {
      const identity = verifyToken(
        bearer(req),
        env.JWT_SECRET,
        undefined,
        { purpose: 'otp_setup' }
      );

      if (!identity) {
        return reply(res, 401, { error: 'Invalid or expired setup token' });
      }

      const body = await bodyJson(req);

      const result = await db.query(
        `SELECT otp_secret_encrypted
         FROM users
         WHERE username = $1
           AND otp_enabled = FALSE`,
        [identity.sub]
      );

      if (!result.rowCount || !result.rows[0].otp_secret_encrypted) {
        return reply(res, 400, { error: 'Start OTP setup first' });
      }

      const secret = decryptSecret(
        result.rows[0].otp_secret_encrypted,
        env.OTP_ENCRYPTION_KEY
      );

      const step = getMatchingTotpStep(secret, body.code);

      if (step === null) {
        logSecurityBlock('2FA_OTP', 'Código TOTP incorreto na ativação do segundo fator', { username: identity.sub }, env);
        return reply(res, 401, { error: 'Invalid authenticator code' });
      }

      const recoveryCodes = generateRecoveryCodes(8);
      const recoveryHashes = recoveryCodes.map(hashRecoveryCode);

      const activation = await db.query(
        `UPDATE users
         SET otp_enabled = TRUE,
             otp_last_step = $2,
             recovery_codes_hash = $3::jsonb,
             otp_enrolled_at = NOW()
         WHERE username = $1
           AND otp_enabled = FALSE
           AND otp_secret_encrypted IS NOT NULL
         RETURNING username`,
        [identity.sub, step, JSON.stringify(recoveryHashes)]
      );

      if (!activation.rowCount) {
        return reply(res, 409, { error: 'OTP activation failed; try again' });
      }

      return reply(res, 200, {
        otp_enabled: true,
        recovery_codes: recoveryCodes,
        message: 'Save these recovery codes. They will not be shown again.'
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/auth/otp/verify') {
      const identity = verifyToken(
        bearer(req),
        env.JWT_SECRET,
        undefined,
        { purpose: 'otp_challenge' }
      );

      if (!identity) {
        return reply(res, 401, { error: 'Invalid or expired OTP challenge' });
      }

      const body = await bodyJson(req);

      const result = await db.query(
        `SELECT otp_secret_encrypted, recovery_codes_hash
         FROM users
         WHERE username = $1
           AND otp_enabled = TRUE`,
        [identity.sub]
      );

      if (!result.rowCount) {
        return reply(res, 401, { error: 'Two-factor authentication is not enabled' });
      }

      const user = result.rows[0];
      let authenticated = false;

      if (body.code && /^\d{6}$/.test(String(body.code))) {
        const secret = decryptSecret(
          user.otp_secret_encrypted,
          env.OTP_ENCRYPTION_KEY
        );

        const step = getMatchingTotpStep(secret, body.code);

        if (step !== null) {
          authenticated = await consumeTotpStep(db, identity.sub, step);
        }
      } else if (body.recovery_code) {
        const hashes = user.recovery_codes_hash || [];
        const matchingHash = hashes.find(hash =>
          verifyRecoveryCode(body.recovery_code, hash)
        );

        if (matchingHash) {
          const consumed = await db.query(
            `UPDATE users
             SET recovery_codes_hash = recovery_codes_hash - $2
             WHERE username = $1
               AND recovery_codes_hash @> jsonb_build_array($2::text)
             RETURNING username`,
            [identity.sub, matchingHash]
          );

          authenticated = consumed.rowCount === 1;
        }
      }

      if (!authenticated) {
        logSecurityBlock('2FA_OTP', 'Código OTP ou de recuperação inválido, expirado ou já utilizado (replay)', { username: identity.sub }, env);
        return reply(res, 401, {
          error: 'Invalid, expired or already used authentication code'
        });
      }

      const accessToken = signToken(identity.sub, env.JWT_SECRET);

      return reply(res, 200, {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600
      });
    }


    if (req.method === 'POST' && url.pathname === '/api/v1/ingest') {
      const expected = env.DEVICE_API_KEY;
      if (expected && req.headers['x-device-key'] && req.headers['x-device-key'] !== expected) {
        return reply(res, 401, { error: 'Invalid device key' });
      }
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
      if (!access.rowCount) {
        logSecurityBlock('IDOR_DEVICE', 'Acesso negado: dispositivo pertence a outro usuário ou não existe', { username: identity.sub, device_id: deviceId }, env);
        return reply(res, 403, { error: 'You do not have access to this device' });
      }
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
        INNER JOIN device_access a
          ON l.device_id = a.device_id
        WHERE a.username = $1
          AND a.can_read = TRUE
      `;

      const params = [identity.sub];

      if (apenasComSelo) {
        query += ` AND l.status_selo = 'aprovado'`;
      } else if (statusFilter) {
        params.push(statusFilter);
        query += ` AND l.status_selo = $2`;
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
      const acesso = await db.query(`
        SELECT device_id
        FROM device_access
        WHERE username = $1
          AND device_id = $2
          AND can_read = TRUE
          AND is_owner = TRUE
        LIMIT 1
      `, [identity.sub, deviceId]);

      if (acesso.rowCount === 0) {
        logSecurityBlock('IDOR_DEVICE', 'Criação negada: usuário não possui acesso ao dispositivo informado', { username: identity.sub, device_id: deviceId }, env);
        return reply(res, 403, {
          error: 'Você não tem permissão para criar lotes neste dispositivo'
        });
      }
      
      const possuiPropriedade = await db.query(`
        SELECT 1
        FROM device_access
        WHERE username = $1
          AND device_id = $2
          AND can_read = TRUE
          AND is_owner = TRUE
        LIMIT 1
      `, [identity.sub, deviceId]);

      if (!possuiPropriedade.rowCount) {
        logSecurityBlock('IDOR_DEVICE', 'Criação negada: usuário não é proprietário do dispositivo informado', { username: identity.sub, device_id: deviceId }, env);
        return reply(res, 403, {
          error: 'Você não tem permissão para criar lotes neste dispositivo.'
        });
      }

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
      const possuiAcesso = await verificarAcessoLote(
        db,
        identity.sub,
        loteId
      );

      if (!possuiAcesso) {
        logSecurityBlock('IDOR_LOTE', 'Acesso negado: lote pertence a outro produtor/dispositivo', { username: identity.sub, lote_id: loteId, operacao: 'GET_QUALIDADE' }, env);
        return reply(res, 404, { error: 'Lote não encontrado' });
      }

      const loteRes = await db.query(
        `SELECT * FROM lotes WHERE id_lote = $1`,
        [loteId]
      );
      if (!loteRes.rowCount) return reply(res, 404, { error: 'Lote não encontrado' });
      const lote = loteRes.rows[0];

      const leiturasRes = await db.query(`
        SELECT temperature_c, humidity_percent, luminosity_lux, timestamp
        FROM readings
        WHERE device_id = $1
          AND timestamp >= $2
          AND ($3::timestamptz IS NULL OR timestamp <= $3)
        ORDER BY timestamp ASC
      `, [lote.device_id, lote.data_inicio, lote.data_fim]);

      const relatorio = avaliarQualidadeLote(lote, leiturasRes.rows);

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

    if (req.method === 'PUT' && loteEtapaMatch) {
      const identity = verifyToken(bearer(req), env.JWT_SECRET);
      if (!identity) return reply(res, 401, { error: 'Bearer token required or expired' });
      const loteId = Number(loteEtapaMatch[1]);
      const possuiPropriedade = await verificarAcessoLote(
        db, identity.sub, loteId, true
      );

      if (!possuiPropriedade) {
        logSecurityBlock('IDOR_LOTE', 'Alteração negada: usuário não é proprietário do lote', { username: identity.sub, lote_id: loteId, operacao: 'PUT' }, env);
        return reply(res, 404, { error: 'Lote não encontrado' });
      }
      const body = await bodyJson(req);
      if (!body.codigo_lote || !body.nome) return reply(res, 400, { error: 'codigo_lote e nome são obrigatórios' });
      const etapa = ['pomar', 'estoque'].includes(body.etapa_atual) ? body.etapa_atual : 'pomar';
      const result = await db.query(`
        UPDATE lotes SET
          codigo_lote = $1, nome = $2, variedade = $3, etapa_atual = $4,
          data_inicio = $5, data_colheita = $6, data_fim = $7
        WHERE id_lote = $8 RETURNING *
      `, [
        body.codigo_lote, body.nome, body.variedade || 'Tommy Atkins', etapa,
        body.data_inicio ? new Date(body.data_inicio).toISOString() : new Date().toISOString(),
        body.data_colheita ? new Date(body.data_colheita).toISOString() : null,
        body.data_fim ? new Date(body.data_fim).toISOString() : null,
        loteId
      ]);
      if (!result.rowCount) return reply(res, 404, { error: 'Lote não encontrado' });
      return reply(res, 200, { lote: result.rows[0] });
    }

    if (req.method === 'DELETE' && loteEtapaMatch) {
      const identity = verifyToken(bearer(req), env.JWT_SECRET);
      if (!identity) return reply(res, 401, { error: 'Bearer token required or expired' });
      const loteId = Number(loteEtapaMatch[1]);
      const possuiPropriedade = await verificarAcessoLote(
        db, identity.sub, loteId, true
      );

      if (!possuiPropriedade) {
        logSecurityBlock('IDOR_LOTE', 'Alteração negada: usuário não é proprietário do lote', { username: identity.sub, lote_id: loteId, operacao: 'PUT' }, env);
        return reply(res, 404, { error: 'Lote não encontrado' });
      }
      const result = await db.query(`DELETE FROM lotes WHERE id_lote = $1 RETURNING id_lote`, [loteId]);
      if (!result.rowCount) return reply(res, 404, { error: 'Lote não encontrado' });
      return reply(res, 200, { deleted: true, id_lote: loteId });
    }

    const loteColherMatch = /^\/api\/v1\/lotes\/(\d+)\/colher$/.exec(url.pathname);
    if (req.method === 'POST' && loteColherMatch) {
      const identity = verifyToken(bearer(req), env.JWT_SECRET);
      if (!identity) return reply(res, 401, { error: 'Bearer token required or expired' });
      const loteId = Number(loteColherMatch[1]);
      const possuiPropriedade = await verificarAcessoLote(
        db,
        identity.sub,
        loteId,
        true
      );

if (!possuiPropriedade) {
  logSecurityBlock('IDOR_LOTE', 'Comando de colheita negado: usuário não é proprietário do lote', { username: identity.sub, lote_id: loteId, operacao: 'COLHER' }, env);
  return reply(res, 404, { error: 'Lote não encontrado' });
}
      const now = new Date().toISOString();
      const result = await db.query(`
        UPDATE lotes SET etapa_atual = 'estoque', data_colheita = COALESCE(data_colheita, $1)
        WHERE id_lote = $2 RETURNING *
      `, [now, loteId]);
      if (!result.rowCount) return reply(res, 404, { error: 'Lote não encontrado' });
      return reply(res, 200, { lote: result.rows[0], message: 'Lote colhido com sucesso! Agora em monitoramento na Câmara Fria.' });
    }

    if (req.method === 'PATCH' && loteEtapaMatch) {
      const identity = verifyToken(bearer(req), env.JWT_SECRET);
      if (!identity) return reply(res, 401, { error: 'Bearer token required or expired' });
      const loteId = Number(loteEtapaMatch[1]);
      const possuiPropriedade = await verificarAcessoLote(
        db, identity.sub, loteId, true
      );

      if (!possuiPropriedade) {
        logSecurityBlock('IDOR_LOTE', 'Alteração negada: usuário não é proprietário do lote', { username: identity.sub, lote_id: loteId, operacao: 'PUT' }, env);
        return reply(res, 404, { error: 'Lote não encontrado' });
      }
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

export function createApiServer({ db, env = process.env } = {}) {
  const chosenDb = db || activeDb || pool;
  return http.createServer((req, res) => handler(req, res, chosenDb, env));
}

async function start() {
  const poolInstance = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 1500 });
  try {
    await poolInstance.query('SELECT 1');
    await migrate(poolInstance, { demoUser: process.env.DEMO_USER, demoDeviceId: process.env.DEMO_DEVICE_ID || 'esp32c3-01' });
    activeDb = poolInstance;
    console.log('[Manga Trace] Conectado ao banco PostgreSQL.');
  } catch (err) {
    console.warn(`[Manga Trace] PostgreSQL indisponível (${err.message}). Ativando banco em memória Plug & Play.`);
    activeDb = createInMemoryDb();
  }

  const server = createApiServer({ db: activeDb });
  server.listen(port, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`  🥭 Manga Trace - Servidor Iniciado com Sucesso!`);
    console.log(`  Acesse no navegador: http://localhost:${port}`);
    console.log(`  Login padrão: usuário: demo | senha: demo`);
    console.log(`======================================================\n`);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async () => {
      server.close();
      if (activeDb?.end) await activeDb.end();
      process.exit(0);
    });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  start().catch(error => { console.error('API startup failed:', error.message); process.exit(1); });
}

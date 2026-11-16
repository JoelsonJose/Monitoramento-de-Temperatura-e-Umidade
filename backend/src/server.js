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

  // Use Node's HTTPS certificate validation; never log or return the channel key.
  void fetch('https://api.thingspeak.com/update', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: fields,
  }).then(async response => {
    const responseBody = (await response.text()).trim();
    const entryId = Number(responseBody);
    if (!response.ok || !Number.isInteger(entryId) || entryId <= 0) {
      const lowerBody = responseBody.toLowerCase();
      const reason = /api.?key|write key/.test(lowerBody) ? 'write_key_rejected'
        : /frequency|15 seconds|rate limit/.test(lowerBody) ? 'channel_rate_limit'
          : /field|channel/.test(lowerBody) ? 'channel_or_field_rejected' : 'provider_rejected_write';
      console.error(JSON.stringify({ event: 'thingspeak_write_failed', http_status: response.status, reason }));
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
    if (raw.length > 16384) throw Object.assign(new Error('Request too large'), { status: 413 });
  }
  try { return JSON.parse(raw || '{}'); }
  catch { throw Object.assign(new Error('Malformed JSON'), { status: 400 }); }
}

function bearer(req) {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  return match?.[1];
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
        `INSERT INTO readings(device_id, sequence, timestamp, temperature_c, humidity_percent)
         VALUES($1,$2,$3,$4,$5) ON CONFLICT(device_id, sequence) DO NOTHING RETURNING id`,
        [body.device_id, body.sequence, body.timestamp, body.temperature_c, body.humidity_percent]
      );
      if (result.rowCount) forwardToThingSpeak(body, env);
      return reply(res, result.rowCount ? 201 : 200, { accepted: Boolean(result.rowCount), duplicate: !result.rowCount });
    }
    if (req.method === 'GET' && url.pathname === '/api/v1/readings/latest') {
      const identity = verifyToken(bearer(req), env.JWT_SECRET);
      if (!identity) return reply(res, 401, { error: 'Bearer token required or expired' });
      const result = await db.query(`SELECT r.device_id, r.sequence, r.timestamp, r.temperature_c,
        r.humidity_percent, d.last_seen_at FROM readings r
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
        const readings = await db.query(`SELECT device_id, sequence, timestamp, temperature_c, humidity_percent
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
        ? await db.query(`SELECT r.device_id, r.sequence, r.timestamp, r.temperature_c, r.humidity_percent
            FROM readings r JOIN device_access a USING(device_id)
            WHERE a.username = $3 AND a.can_read = TRUE AND r.timestamp < $1
            ORDER BY r.timestamp DESC LIMIT $2`, [before, limit, identity.sub])
        : await db.query(`SELECT r.device_id, r.sequence, r.timestamp, r.temperature_c, r.humidity_percent
            FROM readings r JOIN device_access a USING(device_id)
            WHERE a.username = $2 AND a.can_read = TRUE
            ORDER BY r.timestamp DESC LIMIT $1`, [limit, identity.sub]);
      return reply(res, 200, { readings: result.rows, count: result.rowCount });
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

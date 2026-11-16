import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import { signToken, verifyToken, validReading } from './security.js';

const { Pool } = pg;
const port = Number(process.env.PORT || 3000);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));

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

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      await pool.query('SELECT 1');
      return reply(res, 200, { status: 'ok', database: 'connected' });
    }
    if (req.method === 'POST' && url.pathname === '/api/v1/auth/token') {
      const body = await bodyJson(req);
      if (!process.env.DEMO_USER || !process.env.DEMO_PASSWORD || !process.env.JWT_SECRET) {
        return reply(res, 503, { error: 'User authentication is not configured' });
      }
      if (body.username !== process.env.DEMO_USER || body.password !== process.env.DEMO_PASSWORD) {
        return reply(res, 401, { error: 'Invalid credentials' });
      }
      return reply(res, 200, { access_token: signToken(body.username, process.env.JWT_SECRET), token_type: 'Bearer', expires_in: 3600 });
    }
    if (req.method === 'POST' && url.pathname === '/api/v1/ingest') {
      const expected = process.env.DEVICE_API_KEY;
      if (!expected || req.headers['x-device-key'] !== expected) return reply(res, 401, { error: 'Invalid device key' });
      const body = await bodyJson(req);
      if (!validReading(body)) return reply(res, 400, { error: 'Invalid reading payload' });
      const result = await pool.query(
        `INSERT INTO readings(device_id, sequence, timestamp, temperature_c, humidity_percent)
         VALUES($1,$2,$3,$4,$5) ON CONFLICT(device_id, sequence) DO NOTHING RETURNING id`,
        [body.device_id, body.sequence, body.timestamp, body.temperature_c, body.humidity_percent]
      );
      return reply(res, result.rowCount ? 201 : 200, { accepted: Boolean(result.rowCount), duplicate: !result.rowCount });
    }
    if (req.method === 'GET' && url.pathname === '/api/v1/readings/latest') {
      const identity = verifyToken(bearer(req), process.env.JWT_SECRET);
      if (!identity) return reply(res, 401, { error: 'Bearer token required or expired' });
      const result = await pool.query('SELECT device_id, sequence, timestamp, temperature_c, humidity_percent FROM readings ORDER BY timestamp DESC LIMIT 1');
      return reply(res, 200, { reading: result.rows[0] || null });
    }
    if (req.method === 'GET' && url.pathname === '/api/v1/readings') {
      const identity = verifyToken(bearer(req), process.env.JWT_SECRET);
      if (!identity) return reply(res, 401, { error: 'Bearer token required or expired' });
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 50)));
      const before = url.searchParams.get('before');
      const result = before
        ? await pool.query('SELECT device_id, sequence, timestamp, temperature_c, humidity_percent FROM readings WHERE timestamp < $1 ORDER BY timestamp DESC LIMIT $2', [before, limit])
        : await pool.query('SELECT device_id, sequence, timestamp, temperature_c, humidity_percent FROM readings ORDER BY timestamp DESC LIMIT $1', [limit]);
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

const server = http.createServer(handler);
server.listen(port, '0.0.0.0', () => console.log(`API listening on ${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => { server.close(); await pool.end(); process.exit(0); });
}

import { createHmac, timingSafeEqual } from 'node:crypto';

const b64url = (value) => Buffer.from(value).toString('base64url');

export function signToken(subject, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ sub: subject, iat: nowSeconds, exp: nowSeconds + 3600 }));
  const input = `${head}.${body}`;
  return `${input}.${createHmac('sha256', secret).update(input).digest('base64url')}`;
}

export function verifyToken(token, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  const parts = String(token ?? '').split('.');
  if (parts.length !== 3 || !secret) return null;
  const input = `${parts[0]}.${parts[1]}`;
  const expected = createHmac('sha256', secret).update(input).digest();
  let supplied;
  try { supplied = Buffer.from(parts[2], 'base64url'); } catch { return null; }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (header.alg !== 'HS256' || typeof payload.sub !== 'string' || payload.exp <= nowSeconds) return null;
    return payload;
  } catch { return null; }
}

export function validReading(body) {
  const base = body && typeof body.device_id === 'string' && body.device_id.length > 0 && body.device_id.length <= 80 &&
    Number.isSafeInteger(body.sequence) && body.sequence >= 0 &&
    typeof body.timestamp === 'string' && Number.isFinite(Date.parse(body.timestamp)) &&
    Number.isFinite(body.temperature_c) && body.temperature_c >= -40 && body.temperature_c <= 80 &&
    Number.isFinite(body.humidity_percent) && body.humidity_percent >= 0 && body.humidity_percent <= 100;
  if (!base) return false;
  if (body.luminosity_lux !== undefined && body.luminosity_lux !== null) {
    if (!Number.isFinite(body.luminosity_lux) || body.luminosity_lux < 0) return false;
  }
  return true;
}

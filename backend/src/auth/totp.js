import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIOD_SECONDS = 30;
const DIGITS = 6;

export function generateTotpSecret(bytes = 20) {
  return encodeBase32(randomBytes(bytes));
}

export function encodeBase32(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function decodeBase32(input) {
  const normalized = String(input || '').toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');
  if (!normalized || /[^A-Z2-7]/.test(normalized)) throw new Error('Invalid Base32 secret');
  let bits = 0;
  let value = 0;
  const output = [];
  for (const char of normalized) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function generateTotp(secret, timestampMs = Date.now()) {
  const counter = Math.floor(timestampMs / 1000 / PERIOD_SECONDS);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % (10 ** DIGITS)).padStart(DIGITS, '0');
}

export function verifyTotp(secret, code, { timestampMs = Date.now(), window = 1 } = {}) {
  if (!/^\d{6}$/.test(String(code || ''))) return false;
  const supplied = Buffer.from(String(code));
  for (let offset = -window; offset <= window; offset += 1) {
    const expected = Buffer.from(generateTotp(secret, timestampMs + offset * PERIOD_SECONDS * 1000));
    if (supplied.length === expected.length && timingSafeEqual(supplied, expected)) return true;
  }
  return false;
}

export function getMatchingTotpStep(
  secret,
  code,
  { timestampMs = Date.now(), window = 1 } = {}
) {
  if (!/^\d{6}$/.test(String(code || ''))) {
    return null;
  }

  const currentStep = Math.floor(
    timestampMs / 1000 / PERIOD_SECONDS
  );

  const supplied = Buffer.from(String(code));

  for (let offset = -window; offset <= window; offset += 1) {
    const candidateStep = currentStep + offset;

    if (candidateStep < 0) continue;

    const candidateTimeMs = candidateStep * PERIOD_SECONDS * 1000;

    const expected = Buffer.from(
      generateTotp(secret, candidateTimeMs)
    );

    if (
      supplied.length === expected.length &&
      timingSafeEqual(supplied, expected)
    ) {
      return candidateStep;
    }
  }

  return null;
}


export function buildTotpUri({ secret, accountName, issuer = 'Manga Trace' }) {
  if (!secret || !accountName) throw new Error('Secret and account name are required');
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS)
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

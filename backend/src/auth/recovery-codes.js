import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function generateRecoveryCodes(count = 8) {
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new RangeError('Recovery code count must be between 1 and 20');
  }
  return Array.from({ length: count }, () => {
    const raw = randomBytes(6).toString('hex').toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  });
}

export function hashRecoveryCode(code) {
  const normalized = String(code || '').replace(/[^a-f0-9]/gi, '').toUpperCase();
  if (!/^[A-F0-9]{12}$/.test(normalized)) throw new Error('Invalid recovery code format');
  return createHash('sha256').update(normalized).digest('hex');
}

export function verifyRecoveryCode(code, storedHash) {
  try {
    const actual = Buffer.from(hashRecoveryCode(code), 'hex');
    const expected = Buffer.from(String(storedHash || ''), 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { signToken, verifyToken, validReading } from './security.js';

test('JWT accepts a valid signed token and rejects a wrong secret', () => {
  const token = signToken('demo', 'test-secret', 1000);
  assert.equal(verifyToken(token, 'test-secret', 1001).sub, 'demo');
  assert.equal(verifyToken(token, 'wrong-secret', 1001), null);
});

test('JWT rejects expired tokens', () => {
  const token = signToken('demo', 'test-secret', 1000);
  assert.equal(verifyToken(token, 'test-secret', 4601), null);
});

test('reading validation accepts realistic DHT11 and luminosity data and rejects out-of-range data', () => {
  const reading = { device_id: 'esp32c3-01', sequence: 1, timestamp: '2026-11-15T12:00:00Z', temperature_c: 31.3, humidity_percent: 65, luminosity_lux: 45000 };
  assert.equal(validReading(reading), true);
  assert.equal(validReading({ ...reading, luminosity_lux: -5 }), false);
  assert.equal(validReading({ ...reading, humidity_percent: 101 }), false);
  assert.equal(validReading({ ...reading, sequence: -1 }), false);
  // Compatibilidade com leitura legada sem luminosidade
  const legacy = { device_id: 'esp32c3-01', sequence: 2, timestamp: '2026-11-15T12:00:00Z', temperature_c: 25.0, humidity_percent: 50.0 };
  assert.equal(validReading(legacy), true);
});

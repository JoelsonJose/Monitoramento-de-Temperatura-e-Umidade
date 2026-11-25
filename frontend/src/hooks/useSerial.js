import { useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { DEVICE_ID } from '../lib/format.js';

const DEMO_DEVICE_KEY = 'test-device-key';

function parseLine(line) {
  const start = line.indexOf('{');
  const end = line.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const data = JSON.parse(line.slice(start, end + 1));
    if (data.temperature_c === undefined || data.humidity_percent === undefined) return null;
    return data;
  } catch {
    return null;
  }
}

export function useSerial(onReading) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const readingRef = useRef(onReading);
  readingRef.current = onReading;

  async function connect() {
    if (!('serial' in navigator)) {
      setError('Este navegador não oferece conexão por cabo USB. Use Chrome, Edge, Opera ou Brave.');
      return;
    }
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      setConnected(true);
      setError('');
      const decoder = new TextDecoderStream();
      const closed = port.readable.pipeTo(decoder.writable);
      const reader = decoder.readable.getReader();
      let buffer = '';
      closed.catch(() => setConnected(false));
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        for (const line of lines) {
          const reading = parseLine(line.trim());
          if (reading) readingRef.current(reading);
        }
      }
      setConnected(false);
    } catch (err) {
      if (err?.name !== 'NotFoundError') {
        setError(err?.message || 'Não foi possível abrir a porta da ESP32.');
      }
    }
  }

  return { connected, error, connect };
}

export async function forwardUsbReading(reading) {
  await api('/api/v1/ingest', {
    method: 'POST',
    headers: { 'x-device-key': DEMO_DEVICE_KEY },
    body: {
      device_id: reading.device_id || DEVICE_ID,
      sequence: reading.sequence || Date.now(),
      timestamp: new Date().toISOString(),
      temperature_c: Number(reading.temperature_c),
      humidity_percent: Number(reading.humidity_percent),
      luminosity_lux: Number(reading.luminosity_lux || 0),
    },
  });
}

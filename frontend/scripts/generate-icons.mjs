import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

function png(size, paint) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = paint(x + 0.5, y + 0.5, size);
      const index = y * stride + 1 + x * 4;
      raw[index] = r;
      raw[index + 1] = g;
      raw[index + 2] = b;
      raw[index + 3] = a;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function blend(base, over) {
  const alpha = over[3] / 255;
  return [
    Math.round(over[0] * alpha + base[0] * (1 - alpha)),
    Math.round(over[1] * alpha + base[1] * (1 - alpha)),
    Math.round(over[2] * alpha + base[2] * (1 - alpha)),
    255,
  ];
}

function roundedRect(x, y, size, radius) {
  const inset = Math.min(x, y, size - x, size - y);
  if (inset >= radius) return true;
  const cornerX = x < radius ? radius : size - radius;
  const cornerY = y < radius ? radius : size - radius;
  const dx = x - cornerX;
  const dy = y - cornerY;
  return dx * dx + dy * dy <= radius * radius;
}

function icon(size, { padding = 0, background = [35, 108, 74, 255] } = {}) {
  return png(size, (x, y, canvas) => {
    const radius = canvas * 0.22;
    if (!roundedRect(x, y, canvas, radius)) return [0, 0, 0, 0];
    let color = background;
    const inner = canvas - padding * 2;
    const nx = (x - padding) / inner;
    const ny = (y - padding) / inner;
    if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return color;

    const fruitX = 0.56;
    const fruitY = 0.58;
    const dx = (nx - fruitX) / 0.24;
    const dy = (ny - fruitY) / 0.3;
    if (dx * dx + dy * dy <= 1) color = blend(color, [242, 165, 26, 255]);

    const leafX = 0.62;
    const leafY = 0.3;
    const lx = (nx - leafX) / 0.16;
    const ly = (ny - leafY) / 0.09;
    if (lx * lx + ly * ly <= 1 && ny < 0.36) color = blend(color, [232, 244, 226, 255]);

    return color;
  });
}

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, 'icon-192.png'), icon(192));
writeFileSync(path.join(outDir, 'icon-512.png'), icon(512));
writeFileSync(path.join(outDir, 'icon-512-maskable.png'), icon(512, { padding: 64, background: [246, 248, 241, 255] }));
writeFileSync(path.join(outDir, 'apple-touch-icon.png'), icon(180, { padding: 0 }));
console.log(`Ícones gravados em ${outDir}`);

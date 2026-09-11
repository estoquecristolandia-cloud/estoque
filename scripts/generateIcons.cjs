const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crc = crc32(typeAndData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, typeAndData, crcBuf]);
}

function createPng(width, height, isMaskable) {
  const rowSize = width * 4 + 1;
  const buffer = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    buffer[y * rowSize] = 0; // Filter type 0
    const ny = (y / height) * 2 - 1; // -1 to 1

    for (let x = 0; x < width; x++) {
      const idx = y * rowSize + 1 + x * 4;
      const nx = (x / width) * 2 - 1; // -1 to 1

      // Background color: Slate-950 (#020617)
      let r = 2, g = 6, b = 23, a = 255;

      // Rounded container boundary (if not maskable, round corners)
      const distCorner = Math.pow(Math.abs(nx), 3.5) + Math.pow(Math.abs(ny), 3.5);
      if (!isMaskable && distCorner > 0.85) {
        // Transparent outside rounded squircle
        r = 0; g = 0; b = 0; a = 0;
      } else {
        // Inner scale factor: maskable has safe margin
        const scale = isMaskable ? 0.72 : 0.88;
        const sx = nx / scale;
        const sy = (ny + 0.05) / scale;

        // Ambient radial glow in center
        const distCenter = Math.sqrt(sx * sx + sy * sy);
        if (distCenter < 0.9) {
          const glow = (1 - distCenter / 0.9) * 0.25;
          r = Math.min(255, Math.floor(r + 37 * glow));
          g = Math.min(255, Math.floor(g + 99 * glow));
          b = Math.min(255, Math.floor(b + 235 * glow));
        }

        // Supply Box / Crate Outline & Geometry
        // Isometric Diamond Top: |sx|/0.55 + |sy + 0.2|/0.28 <= 1
        const topDiamond = Math.abs(sx) / 0.55 + Math.abs(sy + 0.18) / 0.28;
        // Box Body Front: |sx| <= 0.55 && sy >= -0.18 && sy <= 0.45
        const insideBoxWidth = Math.abs(sx) <= 0.55;
        const insideBoxBody = insideBoxWidth && sy >= -0.18 && sy <= 0.45;

        // Top Lid
        if (topDiamond <= 1.0 && sy <= -0.18) {
          // Blue-500 (#3b82f6) to Blue-600 (#2563eb)
          r = 45; g = 120; b = 240;
          if (Math.abs(topDiamond - 1.0) < 0.08) {
            // Highlight border
            r = 96; g = 165; b = 250;
          }
        } else if (insideBoxBody && (sy >= -0.18 + Math.abs(sx) * 0.45)) {
          // Front Faces of Box
          if (sx < 0) {
            // Left Face (darker blue #1e3a8a)
            r = 24; g = 50; b = 120;
          } else {
            // Right Face (medium blue #1d4ed8)
            r = 29; g = 78; b = 216;
          }

          // Center dividing line
          if (Math.abs(sx) < 0.03) {
            r = 96; g = 165; b = 250;
          }

          // Box Outer Border
          if (Math.abs(Math.abs(sx) - 0.55) < 0.04 || Math.abs(sy - 0.45) < 0.04) {
            r = 59; g = 130; b = 246;
          }

          // Emblem: Shield + Golden Cross in center front
          const ex = sx;
          const ey = sy - 0.16;
          const distEmblem = Math.sqrt(ex * ex + ey * ey);

          if (distEmblem <= 0.20) {
            // Shield circular badge (#020617)
            r = 2; g = 6; b = 23;
            if (distEmblem >= 0.17) {
              // Sky blue ring (#38bdf8)
              r = 56; g = 189; b = 248;
            } else {
              // Golden Cross inside badge
              const inCrossH = Math.abs(ex) <= 0.12 && Math.abs(ey) <= 0.04;
              const inCrossV = Math.abs(ex) <= 0.04 && Math.abs(ey) <= 0.12;
              if (inCrossH || inCrossV) {
                // Amber/Gold (#fbbf24)
                r = 251; g = 191; b = 36;
              }
            }
          }
        }
      }

      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(buffer);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.join(__dirname, '..', 'public');

console.log('Gerando ícones PWA...');

fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createPng(512, 512, false));
console.log('✓ icon-512.png criado');

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createPng(192, 192, false));
console.log('✓ icon-192.png criado');

fs.writeFileSync(path.join(publicDir, 'icon-180.png'), createPng(180, 180, false));
console.log('✓ icon-180.png (Apple Touch Icon) criado');

fs.writeFileSync(path.join(publicDir, 'icon-512-maskable.png'), createPng(512, 512, true));
console.log('✓ icon-512-maskable.png criado');

fs.writeFileSync(path.join(publicDir, 'icon-192-maskable.png'), createPng(192, 192, true));
console.log('✓ icon-192-maskable.png criado');

console.log('Todos os ícones PWA gerados com sucesso!');

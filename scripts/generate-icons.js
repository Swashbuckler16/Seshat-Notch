import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createStarPng(size, maskable = false) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const cx = size / 2;
  const cy = size / 2;
  const scale = maskable ? 0.72 : 0.88;
  const outerR = (size / 2) * scale;
  const ringR = outerR * 0.86;
  const starOuter = outerR * 0.74;
  const starInner = outerR * 0.36;

  // Precompute 14 vertices of the 7-pointed star
  const pts = [];
  for (let i = 0; i < 14; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 7;
    const r = i % 2 === 0 ? starOuter : starInner;
    pts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }

  function pointInStar(px, py) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0], yi = pts[i][1];
      const xj = pts[j][0], yj = pts[j][1];
      const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function minEdgeDist(px, py) {
    let minD = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      const d = distToSegment(px, py, x1, y1, x2, y2);
      if (d < minD) minD = d;
    }
    return minD;
  }

  const strokeW = Math.max(2, size * 0.028);

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter type 0
    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 4;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.hypot(dx, dy);

      // Warm paper background (#faf7ee -> 250, 247, 238)
      let r = 250, g = 247, b = 238, a = 255;

      // Subtle outer ring
      if (Math.abs(dist - ringR) <= strokeW * 0.65) {
        r = 13; g = 148; b = 136; // #0d9488
      }

      // Star interior fill (soft leaf-teal tint)
      if (pointInStar(x + 0.5, y + 0.5)) {
        r = 212; g = 240; b = 235;
      }

      // Star outline & center dot (#0d9488)
      if (minEdgeDist(x + 0.5, y + 0.5) <= strokeW * 0.75 || dist <= size * 0.048) {
        r = 13; g = 148; b = 136;
      }

      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw, { level: 9 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

const publicDir = path.resolve('public');
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createStarPng(192, false));
fs.writeFileSync(path.join(publicDir, 'icon-256.png'), createStarPng(256, false));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createStarPng(512, false));
fs.writeFileSync(path.join(publicDir, 'icon-maskable-512.png'), createStarPng(512, true));

const tauriIconsDir = path.resolve('src-tauri', 'icons');
fs.mkdirSync(tauriIconsDir, { recursive: true });
fs.writeFileSync(path.join(tauriIconsDir, 'icon.png'), createStarPng(256, false));

console.log('Generated icon-192.png, icon-256.png, icon-512.png, icon-maskable-512.png, and src-tauri/icons/icon.png');

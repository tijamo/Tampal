/*
 * Generates the PWA PNG icons without any image library: it builds an RGBA
 * pixel buffer and encodes a valid PNG using Node's built-in zlib.
 * Draws a "TF" monogram (from a small bitmap font) on the brand background.
 * Run: node scripts/generate-icons.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BRAND = [31, 69, 119]; // #1f4577
const WHITE = [255, 255, 255];

// 5x7 bitmap glyphs.
const GLYPHS = {
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
};

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // no filter
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function makeIcon(size, { maskable } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const setPx = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    rgba[i] = r;
    rgba[i + 1] = g;
    rgba[i + 2] = b;
    rgba[i + 3] = 255;
  };

  // Background. Maskable icons need full-bleed colour (safe zone is central 80%).
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) setPx(x, y, BRAND);
  }

  // Draw "TF" centred. Keep glyphs within the maskable safe zone.
  const glyphCols = 5;
  const glyphRows = 7;
  const gap = 1; // columns between glyphs
  const totalCols = glyphCols * 2 + gap;
  const safe = maskable ? 0.6 : 0.72; // fraction of icon used by the monogram
  const scale = Math.floor((size * safe) / totalCols);
  const drawW = totalCols * scale;
  const drawH = glyphRows * scale;
  const startX = Math.floor((size - drawW) / 2);
  const startY = Math.floor((size - drawH) / 2);

  const letters = ['T', 'F'];
  letters.forEach((letter, li) => {
    const glyph = GLYPHS[letter];
    const colOffset = li * (glyphCols + gap);
    for (let gy = 0; gy < glyphRows; gy++) {
      for (let gx = 0; gx < glyphCols; gx++) {
        if (glyph[gy][gx] !== '1') continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            setPx(
              startX + (colOffset + gx) * scale + sx,
              startY + gy * scale + sy,
              WHITE,
            );
          }
        }
      }
    }
  });

  return encodePng(size, size, rgba);
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon-192.png'), makeIcon(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), makeIcon(512));
fs.writeFileSync(path.join(outDir, 'icon-maskable-512.png'), makeIcon(512, { maskable: true }));
console.log('Icons written to', outDir);

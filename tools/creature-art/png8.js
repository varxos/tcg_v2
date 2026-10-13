// Indexed PNG with alpha: median-cut palette over RGBA, Floyd–Steinberg dithering, zlib level 9.
// Painted sprites keep their look at a fraction of the RGBA size; the canvas grain hides the dither.
'use strict';
const zlib = require('zlib');

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  return table;
})();
const crc32 = (buffer) => { let c = 0xffffffff; for (let i = 0; i < buffer.length; i += 1) c = crcTable[(c ^ buffer[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

const buildPalette = (data, maxColors) => {
  const histogram = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 6) continue;
    const key = ((data[i] >> 3) << 14) | ((data[i + 1] >> 3) << 9) | ((data[i + 2] >> 3) << 4) | (a >> 4);
    let entry = histogram.get(key);
    if (!entry) { entry = [0, 0, 0, 0, 0]; histogram.set(key, entry); }
    entry[0] += data[i]; entry[1] += data[i + 1]; entry[2] += data[i + 2]; entry[3] += a; entry[4] += 1;
  }
  const entries = [...histogram.values()].map((e) => [e[0] / e[4], e[1] / e[4], e[2] / e[4], e[3] / e[4], e[4]]);
  if (entries.length === 0) return [[0, 0, 0, 0]];
  const stats = (box) => {
    let count = 0; let best = 0; let channel = 0;
    for (const e of box) count += e[4];
    for (let c = 0; c < 4; c += 1) {
      let min = Infinity; let max = -Infinity;
      for (const e of box) { if (e[c] < min) min = e[c]; if (e[c] > max) max = e[c]; }
      const range = (max - min) * (c === 3 ? 1.3 : 1);
      if (range > best) { best = range; channel = c; }
    }
    return { box, count, score: box.length > 1 ? best * Math.sqrt(count) : 0, channel };
  };
  const boxes = [stats(entries)];
  while (boxes.length < maxColors - 1) {
    let pick = 0;
    for (let i = 1; i < boxes.length; i += 1) if (boxes[i].score > boxes[pick].score) pick = i;
    const { box, count, score, channel } = boxes[pick];
    if (score <= 0) break;
    box.sort((a, b) => a[channel] - b[channel]);
    let accumulated = 0; let cut = 1;
    for (let i = 0; i < box.length; i += 1) { accumulated += box[i][4]; if (accumulated >= count / 2) { cut = Math.max(1, Math.min(box.length - 1, i + 1)); break; } }
    boxes.splice(pick, 1, stats(box.slice(0, cut)), stats(box.slice(cut)));
  }
  return [[0, 0, 0, 0], ...boxes.map(({ box }) => {
    let w = 0; let r = 0; let g = 0; let b = 0; let a = 0;
    for (const e of box) { r += e[0] * e[4]; g += e[1] * e[4]; b += e[2] * e[4]; a += e[3] * e[4]; w += e[4]; }
    return [Math.round(r / w), Math.round(g / w), Math.round(b / w), Math.round(a / w)];
  })];
};

const encodeIndexed = (data, width, height, { maxColors = 256, dither = 0.75 } = {}) => {
  const palette = buildPalette(data, maxColors);
  const lookup = new Int16Array(1 << 19).fill(-1);
  const nearest = (r, g, b, a) => {
    const key = ((r >> 3) << 14) | ((g >> 3) << 9) | ((b >> 3) << 4) | (a >> 4);
    const cached = lookup[key];
    if (cached >= 0) return cached;
    let best = 1; let bestDistance = Infinity;
    const weight = (a + 40) / 295;
    for (let i = 1; i < palette.length; i += 1) {
      const p = palette[i];
      const distance = ((r - p[0]) ** 2 + (g - p[1]) ** 2 + (b - p[2]) ** 2) * weight + (a - p[3]) ** 2 * 1.6;
      if (distance < bestDistance) { bestDistance = distance; best = i; }
    }
    lookup[key] = best;
    return best;
  };
  const indices = new Uint8Array(width * height);
  let current = new Float32Array((width + 2) * 4);
  let next = new Float32Array((width + 2) * 4);
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const e = (x + 1) * 4;
      if (data[i + 3] < 6) { indices[y * width + x] = 0; continue; }
      const r = clamp(data[i] + current[e]); const g = clamp(data[i + 1] + current[e + 1]); const b = clamp(data[i + 2] + current[e + 2]); const a = clamp(data[i + 3] + current[e + 3]);
      const index = nearest(Math.round(r), Math.round(g), Math.round(b), Math.round(a));
      indices[y * width + x] = index;
      const p = palette[index];
      const err = [(r - p[0]) * dither, (g - p[1]) * dither, (b - p[2]) * dither, (a - p[3]) * dither];
      for (let c = 0; c < 4; c += 1) {
        current[e + 4 + c] += (err[c] * 7) / 16;
        next[e - 4 + c] += (err[c] * 3) / 16;
        next[e + c] += (err[c] * 5) / 16;
        next[e + 4 + c] += err[c] / 16;
      }
    }
    const swap = current; current = next; next = swap; next.fill(0);
  }
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width + 1)] = 0;
    raw.set(indices.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 3; header[10] = 0; header[11] = 0; header[12] = 0;
  const plte = Buffer.alloc(palette.length * 3);
  const trns = Buffer.alloc(palette.length);
  palette.forEach((p, i) => { plte[i * 3] = p[0]; plte[i * 3 + 1] = p[1]; plte[i * 3 + 2] = p[2]; trns[i] = p[3]; });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header), chunk('PLTE', plte), chunk('tRNS', trns),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9, memLevel: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

module.exports = { encodeIndexed };

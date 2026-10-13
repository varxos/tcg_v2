// Production build: renders every creature's layers with Chrome, crops them, compresses them to
// indexed PNGs in the game's assets, and writes src/ui/creatures/sprites.ts for the app.
//   node build.js                 all creatures
//   node build.js moss koi        only these (sprites.ts keeps entries already built)
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT = path.resolve(__dirname, '../..');
const { PNG } = require(path.join(PROJECT, 'node_modules/pngjs'));
const { buildLayers } = require('./creature');
const { backdrop, palettes } = require('./backdrop');
const { encodeIndexed } = require('./png8');
const roster = require('./roster');

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ASSETS = path.join(PROJECT, 'assets/creatures');
const WORK = path.join(__dirname, 'build');
const META = path.join(WORK, 'meta.json');
// Each cell renders a generous window of the 600-unit canvas so horns, halos and big wings are never cut.
const VIEW = { x: -100, y: -150, size: 800 };
const CELLS = [{ key: 'fb', scale: 0.9 }, { key: 'fh', scale: 0.9 }, { key: 'w', scale: 0.9 }, { key: 'bb', scale: 0.62 }, { key: 'bh', scale: 0.62 }];
const CONCURRENCY = 4;

const motionFor = (wings) => ({ feather: 'flap', angel: 'flap', fire: 'flap', membrane: 'flap', leaf: 'flap', glass: 'flap', ember: 'flap', insect: 'flutter', moth: 'flutter', butterfly: 'flutter', fin: 'wave', crystalFin: 'wave', ray: 'wave', claw: 'snap', stub: 'wave' }[wings] ?? 'flap');

const renderPage = (htmlPath, pngPath, width, height, profile) => new Promise((resolve, reject) => {
  const child = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--default-background-color=00000000', `--user-data-dir=${profile}`, `--window-size=${width},${height}`, `--screenshot=${pngPath}`, `file:///${htmlPath.replace(/\\/g, '/')}`], { stdio: 'ignore' });
  child.on('exit', () => (fs.existsSync(pngPath) ? resolve() : reject(new Error(`no screenshot for ${htmlPath}`))));
  child.on('error', reject);
});

const page = (svgs, width, height) => `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;width:${width}px;height:${height}px}svg{position:absolute;top:0;display:block}</style></head><body>${svgs}</body></html>`;

const crop = (png, left, top, width, height) => {
  let minX = width; let minY = height; let maxX = -1; let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (png.data[((top + y) * png.width + left + x) * 4 + 3] > 4) {
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  minX = Math.max(0, minX - 2); minY = Math.max(0, minY - 2); maxX = Math.min(width - 1, maxX + 2); maxY = Math.min(height - 1, maxY + 2);
  const w = maxX - minX + 1; const h = maxY - minY + 1;
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    const from = ((top + minY + y) * png.width + left + minX) * 4;
    png.data.copy(data, y * w * 4, from, from + w * 4);
  }
  return { data, w, h, minX, minY };
};

const buildCreature = async (spec, index) => {
  const { L, s, wingPivot, neck } = buildLayers({ ...spec, key: 'k' });
  let left = 0;
  const layout = CELLS.map((cell) => { const px = Math.round(VIEW.size * cell.scale); const out = { ...cell, px, left }; left += px; return out; });
  const height = Math.max(...layout.map((cell) => cell.px));
  const svgs = layout.map((cell) => `<svg xmlns="http://www.w3.org/2000/svg" style="left:${cell.left}px" width="${cell.px}" height="${cell.px}" viewBox="${VIEW.x} ${VIEW.y} ${VIEW.size} ${VIEW.size}">${L[cell.key].empty ? '' : L[cell.key].content()}</svg>`).join('');
  const html = path.join(WORK, `${spec.id}.html`);
  const shot = path.join(WORK, `${spec.id}.png`);
  fs.writeFileSync(html, page(svgs, left, height));
  if (fs.existsSync(shot)) fs.unlinkSync(shot);
  await renderPage(html, shot, left, height, path.join(os.tmpdir(), `chrome-creature-build-${index % CONCURRENCY}`));
  const png = PNG.sync.read(fs.readFileSync(shot));
  const dir = path.join(ASSETS, spec.id);
  fs.mkdirSync(dir, { recursive: true });
  const layers = {};
  let bytes = 0;
  for (const cell of layout) {
    if (L[cell.key].empty) continue;
    const region = crop(png, cell.left, 0, cell.px, cell.px);
    if (!region) continue;
    const file = path.join(dir, `${cell.key}.png`);
    const encoded = encodeIndexed(region.data, region.w, region.h);
    fs.writeFileSync(file, encoded);
    bytes += encoded.length;
    const unit = 1 / cell.scale;
    layers[cell.key] = { x: Math.round((VIEW.x + region.minX * unit) * 10) / 10, y: Math.round((VIEW.y + region.minY * unit) * 10) / 10, w: Math.round(region.w * unit * 10) / 10, h: Math.round(region.h * unit * 10) / 10 };
  }
  return {
    id: spec.id, layers, bytes,
    wing: layers.w ? { px: wingPivot[0], py: wingPivot[1], motion: motionFor(s.wings) } : null,
    neck, floating: s.rig === 'floater' || s.legs === 'none', rig: s.rig ?? 'sitter',
  };
};

const buildBackdrops = async () => {
  const dir = path.join(ASSETS, 'backdrops');
  fs.mkdirSync(dir, { recursive: true });
  const types = Object.keys(palettes);
  const width = 360; const height = 480;
  const svgs = types.map((type, i) => `<svg xmlns="http://www.w3.org/2000/svg" style="left:${i * width}px" width="${width}" height="${height}" viewBox="0 -100 600 800">${backdrop(type, `bd${i}`, 'Common', 11 + i)}</svg>`).join('');
  const rays = `<svg xmlns="http://www.w3.org/2000/svg" style="left:${types.length * width}px" width="600" height="600" viewBox="0 0 600 600"><defs><filter id="rb" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter><radialGradient id="rf" cx="50%" cy="50%" r="50%"><stop offset="0.1" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="rm"><rect width="600" height="600" fill="url(#rf)"/></mask></defs><g filter="url(#rb)" mask="url(#rm)">${Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; const b = a + (i % 2 ? 0.05 : 0.09); return `<path d="M 300 300 L ${(300 + Math.cos(a) * 420).toFixed(0)} ${(300 + Math.sin(a) * 420).toFixed(0)} L ${(300 + Math.cos(b) * 420).toFixed(0)} ${(300 + Math.sin(b) * 420).toFixed(0)} Z" fill="#fff" opacity="${i % 2 ? 0.55 : 0.9}"/>`; }).join('')}</g></svg>`;
  const total = types.length * width + 600;
  const html = path.join(WORK, 'backdrops.html'); const shot = path.join(WORK, 'backdrops.png');
  fs.writeFileSync(html, page(svgs + rays, total, 600));
  await renderPage(html, shot, total, 600, path.join(os.tmpdir(), 'chrome-creature-build-bd'));
  const png = PNG.sync.read(fs.readFileSync(shot));
  let bytes = 0;
  types.forEach((type, i) => {
    const data = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y += 1) png.data.copy(data, y * width * 4, (y * png.width + i * width) * 4, (y * png.width + i * width + width) * 4);
    const encoded = encodeIndexed(data, width, height, { dither: 0.9 });
    fs.writeFileSync(path.join(dir, `${type.toLowerCase()}.png`), encoded); bytes += encoded.length;
  });
  const region = crop(png, types.length * width, 0, 600, 600);
  const encoded = encodeIndexed(region.data, region.w, region.h, { dither: 0.9 });
  fs.writeFileSync(path.join(dir, 'rays.png'), encoded); bytes += encoded.length;
  return { types, bytes };
};

const writeSprites = (meta, types) => {
  const missing = roster.filter((spec) => meta[spec.id]).flatMap((spec) => ['fb', 'fh', 'bb', 'bh'].filter((key) => !meta[spec.id].layers[key]).map((key) => `${spec.id}.${key}`));
  if (missing.length) throw new Error(`layers with nothing painted: ${missing.join(', ')}`);
  const layer = (id, key, l) => `{ src: require('../../../assets/creatures/${id}/${key}.png'), x: ${l.x}, y: ${l.y}, w: ${l.w}, h: ${l.h} }`;
  const entries = roster.filter((spec) => meta[spec.id]).map((spec) => {
    const m = meta[spec.id]; const l = m.layers;
    const wing = m.wing && l.w ? `, wing: { ...${layer(spec.id, 'w', l.w)}, px: ${m.wing.px}, py: ${m.wing.py}, motion: '${m.wing.motion}' }` : '';
    return `  '${spec.id}': { front: { body: ${layer(spec.id, 'fb', l.fb)}, head: ${layer(spec.id, 'fh', l.fh)} }, back: { body: ${layer(spec.id, 'bb', l.bb)}, head: ${layer(spec.id, 'bh', l.bh)} }${wing}, floating: ${m.floating} },`;
  });
  const source = `// Generated by the creature art build (painted layers rendered offline). Do not edit by hand.
// Coordinates are in the 600-unit creature canvas; the neck pivot is (300, 352).
import { CreatureType } from '../../game/creatures';

export type SpriteLayer = { src: number; x: number; y: number; w: number; h: number };
export type WingMotion = 'flap' | 'flutter' | 'wave' | 'snap';
export type CreatureSprite = {
  front: { body: SpriteLayer; head: SpriteLayer };
  back: { body: SpriteLayer; head: SpriteLayer };
  wing?: SpriteLayer & { px: number; py: number; motion: WingMotion };
  floating: boolean;
};

export const SPRITE_CANVAS = 600;
export const NECK = { x: 300, y: 352 };

export const creatureSprites: Record<string, CreatureSprite> = {
${entries.join('\n')}
};

export const cardBackdrops: Record<CreatureType, number> = {
${types.map((type) => `  ${type}: require('../../../assets/creatures/backdrops/${type.toLowerCase()}.png'),`).join('\n')}
};
export const raysOverlay = require('../../../assets/creatures/backdrops/rays.png');
`;
  fs.writeFileSync(path.join(PROJECT, 'src/ui/creatures/sprites.ts'), source);
};

(async () => {
  fs.mkdirSync(WORK, { recursive: true });
  const args = process.argv.slice(2);
  const backdropsOnly = args.includes('--backdrops');
  const only = args.filter((arg) => !arg.startsWith('--'));
  const list = backdropsOnly ? [] : only.length ? roster.filter((spec) => only.includes(spec.id)) : roster;
  const meta = fs.existsSync(META) ? JSON.parse(fs.readFileSync(META, 'utf8')) : {};
  const started = Date.now();
  let next = 0; let done = 0; let bytes = 0;
  const worker = async (slot) => {
    while (next < list.length) {
      const index = next; next += 1;
      const result = await buildCreature(list[index], slot);
      meta[result.id] = result; bytes += result.bytes; done += 1;
      // Saved after every creature so a later failure never loses finished work.
      fs.writeFileSync(META, JSON.stringify(meta, null, 1));
      process.stdout.write(`\r${done}/${list.length} ${result.id.padEnd(26)} ${(bytes / 1048576).toFixed(1)} Mo`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, slot) => worker(slot)));
  const backdrops = await buildBackdrops();
  writeSprites(meta, backdrops.types);
  const all = Object.values(meta).reduce((sum, m) => sum + m.bytes, 0);
  console.log(`\n${list.length} créatures en ${((Date.now() - started) / 1000).toFixed(0)} s — sprites ${(all / 1048576).toFixed(2)} Mo, décors ${(backdrops.bytes / 1024).toFixed(0)} Ko`);
})().catch((error) => { console.error(error); process.exit(1); });

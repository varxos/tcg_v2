// QA sheet: for each creature, the front card composition and the back view, rendered by Chrome.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildLayers } = require('./creature');
const { backdrop } = require('./backdrop');

const chrome = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const roster = require('./roster');
const args = process.argv.slice(2);
const pageArg = args.find((arg) => arg.startsWith('--page='));
const wanted = args.filter((arg) => !arg.startsWith('--'));
const perPage = 12;
const list = pageArg ? roster.slice((Number(pageArg.slice(7)) - 1) * perPage, Number(pageArg.slice(7)) * perPage) : wanted.length ? roster.filter((spec) => wanted.includes(spec.id)) : roster;

const cell = (spec, index) => {
  const { L } = buildLayers({ ...spec, key: `q${index}` });
  const wing = L.w.empty ? '' : L.w.content();
  const bg = backdrop(spec.type, `q${index}bg`, spec.rarity);
  const front = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480" viewBox="0 -100 600 800">${bg}
    <g transform="translate(600 0) scale(-1 1)">${wing}</g>${wing}${L.fb.content()}${L.fh.content()}</svg>`;
  const back = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360" viewBox="0 0 600 600" style="background:#2A3A5C">${L.bb.content()}<g transform="translate(600 0) scale(-1 1)">${wing}</g>${wing}${L.bh.content()}</svg>`;
  return `<div class="c"><div class="t">${spec.name} · ${spec.rarity}</div>${front}${back}</div>`;
};

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#120C22;font:600 18px system-ui;color:#EEE;display:flex;flex-wrap:wrap;width:${list.length > 2 ? 1460 : 740}px}
  .c{width:730px;height:520px;display:flex;align-items:flex-end;gap:6px;position:relative}
  .t{position:absolute;top:6px;left:10px}
  svg{display:block}
</style></head><body>${list.map(cell).join('')}</body></html>`;

const out = path.join(__dirname, 'out');
fs.mkdirSync(out, { recursive: true });
const tag = pageArg ? `preview-${pageArg.slice(7)}` : 'preview';
const page = path.join(out, `${tag}.html`);
fs.writeFileSync(page, html);
const width = list.length > 2 ? 1460 : 740;
const height = Math.ceil(list.length / (list.length > 2 ? 2 : 1)) * 520;
const started = Date.now();
execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--user-data-dir=${path.join(require('os').tmpdir(), `chrome-creature-${tag}`)}`, `--window-size=${width},${height}`, `--screenshot=${path.join(out, `${tag}.png`)}`, `file:///${page.replace(/\\/g, '/')}`], { stdio: 'ignore' });
console.log(`${tag}.png ${width}x${height} in ${Date.now() - started} ms`);

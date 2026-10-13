// Creature parts and rigs. Every creature is split into five layers on a shared 600x600 canvas:
//   fb/fh = front body/head, bb/bh = back body/head, w = right wing (mirrored in the app for the left).
// The app animates them separately: head around the neck, wings around the shoulder.
'use strict';
const P = require('./paint');
const { f1, rad, rng, lighten, darken, tone, blob, tube, bezier, spindle, polar, paint, gloss, glowDot, sparkle, catmull } = P;

const NECK = [300, 352];
const WING = [364, 396];
const mirrorX = (svg) => `<g transform="translate(600 0) scale(-1 1)">${svg}</g>`;
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// Fur strands: short directional strokes, lighter and darker than the base, inside a painted shape.
const strands = (L, cx, cy, rx, ry, t, count, seed, length = 16) => {
  const random = rng(seed);
  return Array.from({ length: count }, () => {
    const a = random() * Math.PI * 2; const r = Math.sqrt(random());
    const x = cx + Math.cos(a) * rx * r; const y = cy + Math.sin(a) * ry * r;
    const dir = Math.atan2(y - cy + ry * 0.6, x - cx) + (random() - 0.5) * 0.6;
    const len = length * (0.6 + random() * 0.7);
    const light = random() > 0.45;
    return `<path d="M ${f1(x)} ${f1(y)} q ${f1(Math.cos(dir) * len * 0.5 + 3)} ${f1(Math.sin(dir) * len * 0.5)} ${f1(Math.cos(dir) * len)} ${f1(Math.sin(dir) * len)}" stroke="${light ? t.highlight : t.shade}" stroke-width="${f1(2 + random() * 2)}" fill="none" stroke-linecap="round" opacity="${f1(0.14 + random() * 0.16)}"/>`;
  }).join('');
};

// ——— eyes & faces ———
const eye = (L, cx, cy, rx, ry, o) => {
  const iris = L.id('iris');
  const color = o.color;
  L.defs.push(`<radialGradient id="${iris}" cx="42%" cy="34%" r="74%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.2" stop-color="${lighten(color, 0.62)}"/><stop offset="0.62" stop-color="${color}"/><stop offset="1" stop-color="${darken(color, 0.58)}"/></radialGradient>`);
  const pupil = o.pupil === 'slit'
    ? `<ellipse cx="${f1(cx)}" cy="${f1(cy + ry * 0.08)}" rx="${f1(rx * 0.17)}" ry="${f1(ry * 0.64)}" fill="#0C0618"/>`
    : o.pupil === 'star' ? sparkle(cx, cy + ry * 0.08, rx * 0.5, '#0C0618', 1)
      : o.pupil === 'none' ? ''
        : `<ellipse cx="${f1(cx)}" cy="${f1(cy + ry * 0.12)}" rx="${f1(rx * 0.44)}" ry="${f1(ry * 0.48)}" fill="#0C0618"/>`;
  const lid = o.fierce
    ? `<path d="M ${f1(cx - rx * 1.15)} ${f1(cy - ry * 0.62)} L ${f1(cx + rx * 1.1)} ${f1(cy - ry * 0.18)}" stroke="#120818" stroke-width="${f1(rx * 0.32)}" stroke-linecap="round"/>`
    : `<path d="M ${f1(cx - rx * 1.02)} ${f1(cy - ry * 0.18)} Q ${f1(cx)} ${f1(cy - ry * 1.3)} ${f1(cx + rx * 1.02)} ${f1(cy - ry * 0.18)}" stroke="#150A22" stroke-width="${f1(rx * 0.2)}" fill="none" stroke-linecap="round"/>`;
  const lash = o.lash ? `<path d="M ${f1(cx + rx * Math.sign(o.lash) * 0.95)} ${f1(cy - ry * 0.5)} q ${f1(rx * Math.sign(o.lash) * 0.35)} ${f1(-ry * 0.2)} ${f1(rx * Math.sign(o.lash) * 0.5)} ${f1(-ry * 0.5)}" stroke="#150A22" stroke-width="${f1(rx * 0.13)}" fill="none" stroke-linecap="round"/>` : '';
  return `<g transform="rotate(${o.tilt ?? 0} ${f1(cx)} ${f1(cy)})">
    <ellipse cx="${f1(cx)}" cy="${f1(cy + ry * 0.15)}" rx="${f1(rx * 1.3)}" ry="${f1(ry * 1.2)}" fill="${o.socket}" opacity="0.4" filter="${L.blur(7)}"/>
    <ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="#150A22"/>
    <ellipse cx="${f1(cx)}" cy="${f1(cy + ry * 0.06)}" rx="${f1(rx * 0.85)}" ry="${f1(ry * 0.86)}" fill="url(#${iris})"/>
    ${pupil}
    <ellipse cx="${f1(cx)}" cy="${f1(cy + ry * 0.22)}" rx="${f1(rx * 0.7)}" ry="${f1(ry * 0.5)}" fill="${lighten(color, 0.25)}" opacity="${o.glow ? 0.6 : 0.28}" filter="${L.blur(o.glow ? 9 : 5)}"/>
    ${o.glow ? `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx * 1.5)}" ry="${f1(ry * 1.4)}" fill="${color}" opacity="0.28" filter="${L.blur(16)}"/>` : ''}
    <ellipse cx="${f1(cx - rx * 0.32)}" cy="${f1(cy - ry * 0.32)}" rx="${f1(rx * 0.3)}" ry="${f1(ry * 0.26)}" fill="#FFFFFF"/>
    <circle cx="${f1(cx + rx * 0.3)}" cy="${f1(cy + ry * 0.36)}" r="${f1(rx * 0.13)}" fill="#FFFFFF" opacity="0.85"/>
    ${lid}${lash}
  </g>`;
};

const faceFor = (L, H, s, T) => {
  const out = [];
  const ex = H.rx * (s.eyeSpread ?? 0.42);
  const ey = H.cy + H.ry * (s.eyeY ?? 0.06);
  const erx = H.rx * (s.eyeSize ?? 0.21);
  const ery = erx * (H.ry / H.rx) * 1.42;
  const eyeOpts = { color: s.colors.eye, socket: T.fur.shade, pupil: s.pupil, glow: s.tier >= 3 || s.eyeGlow, fierce: s.fierce, lash: s.lash };
  const muzzle = s.muzzle ?? 'cat';
  const ny = H.cy + H.ry * 0.36;
  const line = T.fur.line;
  if (muzzle === 'cat' || muzzle === 'bear' || muzzle === 'deer') {
    const patch = blob(H.cx, H.cy + H.ry * 0.46, H.rx * (muzzle === 'deer' ? 0.36 : muzzle === 'bear' ? 0.46 : 0.42), H.ry * 0.3, { seed: s.seed + 3, flatTop: 0.2 });
    out.push(paint(L, patch, T.muzzle, { line: 0, shift: 14, soft: 11, shadeOpacity: 0.35 }));
    const noseW = muzzle === 'bear' ? 20 : 14;
    out.push(`<path d="M ${f1(H.cx - noseW)} ${f1(ny)} Q ${f1(H.cx)} ${f1(ny - 5)} ${f1(H.cx + noseW)} ${f1(ny)} Q ${f1(H.cx + 6)} ${f1(ny + 15)} ${f1(H.cx)} ${f1(ny + 17)} Q ${f1(H.cx - 6)} ${f1(ny + 15)} ${f1(H.cx - noseW)} ${f1(ny)} Z" fill="${s.colors.nose ?? line}"/>`,
      gloss(L, H.cx - 4, ny + 2, 6, 3, 0.7, -10),
      `<path d="M ${f1(H.cx)} ${f1(ny + 17)} L ${f1(H.cx)} ${f1(ny + 25)} M ${f1(H.cx - 20)} ${f1(ny + 22)} Q ${f1(H.cx - 10)} ${f1(ny + 34)} ${f1(H.cx)} ${f1(ny + 25)} Q ${f1(H.cx + 10)} ${f1(ny + 34)} ${f1(H.cx + 20)} ${f1(ny + 22)}" stroke="${line}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
    if (s.whiskers) [-1, 1].forEach((dir) => out.push(`<path d="M ${f1(H.cx + dir * 40)} ${f1(ny + 12)} q ${dir * 50} -12 ${dir * 96} -6 M ${f1(H.cx + dir * 40)} ${f1(ny + 20)} q ${dir * 50} 0 ${dir * 92} 14" stroke="${lighten(s.colors.fur, 0.7)}" stroke-width="2.5" fill="none" opacity="0.7" stroke-linecap="round"/>`));
  } else if (muzzle === 'snout' || muzzle === 'fangs') {
    const snout = blob(H.cx, H.cy + H.ry * 0.5, H.rx * 0.5, H.ry * 0.34, { seed: s.seed + 5, flatTop: 0.15 });
    out.push(paint(L, snout, T.muzzle, { shift: 16, soft: 11, lineOpacity: 0.45 }));
    [-1, 1].forEach((dir) => out.push(`<ellipse cx="${f1(H.cx + dir * 20)}" cy="${f1(H.cy + H.ry * 0.42)}" rx="7" ry="4.5" fill="${line}" transform="rotate(${dir * 18} ${f1(H.cx + dir * 20)} ${f1(H.cy + H.ry * 0.42)})"/>`));
    if (muzzle === 'fangs') {
      out.push(`<path d="M ${f1(H.cx - 50)} ${f1(H.cy + H.ry * 0.58)} Q ${f1(H.cx)} ${f1(H.cy + H.ry * 0.9)} ${f1(H.cx + 50)} ${f1(H.cy + H.ry * 0.58)} Q ${f1(H.cx)} ${f1(H.cy + H.ry * 0.7)} ${f1(H.cx - 50)} ${f1(H.cy + H.ry * 0.58)} Z" fill="#1E0506"/>`,
        `<path d="M ${f1(H.cx - 36)} ${f1(H.cy + H.ry * 0.63)} l 8 18 l 8 -15 Z M ${f1(H.cx + 20)} ${f1(H.cy + H.ry * 0.65)} l 8 16 l 8 -18 Z" fill="#FFF6EA"/>`);
    } else {
      out.push(`<path d="M ${f1(H.cx - 44)} ${f1(H.cy + H.ry * 0.6)} Q ${f1(H.cx)} ${f1(H.cy + H.ry * 0.8)} ${f1(H.cx + 44)} ${f1(H.cy + H.ry * 0.6)}" stroke="${line}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
        `<path d="M ${f1(H.cx + 22)} ${f1(H.cy + H.ry * 0.68)} l 6 13 l 6 -14 Z" fill="#FFF8EC"/>`);
    }
  } else if (muzzle === 'beak') {
    const by = H.cy + H.ry * 0.3;
    const w = 26 * (s.beakSize ?? 1);
    const upper = `M ${f1(H.cx - w)} ${f1(by)} Q ${f1(H.cx)} ${f1(by - 12)} ${f1(H.cx + w)} ${f1(by)} Q ${f1(H.cx + w * 0.4)} ${f1(by + w * 1.15)} ${f1(H.cx)} ${f1(by + w * (s.hooked ? 2 : 1.75))} Q ${f1(H.cx - w * 0.4)} ${f1(by + w * 1.15)} ${f1(H.cx - w)} ${f1(by)} Z`;
    out.push(paint(L, upper, T.beak, { shift: 10, soft: 7, lineOpacity: 0.6, line: 2.5 }), gloss(L, H.cx - 8, by + 6, 7, 4, 0.55, -20));
  } else if (muzzle === 'fish') {
    out.push(`<ellipse cx="${f1(H.cx)}" cy="${f1(H.cy + H.ry * 0.46)}" rx="15" ry="11" fill="${line}"/><ellipse cx="${f1(H.cx)}" cy="${f1(H.cy + H.ry * 0.46 + 2)}" rx="9" ry="5" fill="#E86A8A" opacity="0.8"/>`);
  } else if (muzzle === 'smile' || muzzle === 'wide') {
    const w = muzzle === 'wide' ? 58 : 20;
    out.push(`<path d="M ${f1(H.cx - w)} ${f1(H.cy + H.ry * 0.42)} Q ${f1(H.cx)} ${f1(H.cy + H.ry * (muzzle === 'wide' ? 0.66 : 0.58))} ${f1(H.cx + w)} ${f1(H.cy + H.ry * 0.42)}" stroke="${line}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`);
    if (s.fang) out.push(`<path d="M ${f1(H.cx + 8)} ${f1(H.cy + H.ry * 0.5)} l 6 13 l 6 -14 Z" fill="#FFFFFF"/>`);
  }
  if (s.freckles) [-1, 1].forEach((dir) => out.push([0, 1, 2, 3].map((i) => `<circle cx="${f1(H.cx + dir * (H.rx * 0.62 + (i % 2) * 14))}" cy="${f1(ey + H.ry * 0.36 + (i > 1 ? 12 : 0))}" r="3.4" fill="${s.colors.freckles ?? '#FFB07A'}" opacity="0.75"/>`).join('')));
  if (s.blush !== false && s.tier <= 3 && !s.fierce) {
    [-1, 1].forEach((dir) => out.push(`<ellipse cx="${f1(H.cx + dir * H.rx * 0.64)}" cy="${f1(ey + H.ry * 0.32)}" rx="${f1(H.rx * 0.13)}" ry="${f1(H.ry * 0.07)}" fill="#FF7FA0" opacity="0.45" filter="${L.blur(5)}"/>`));
  }
  if (s.eyes === 4) [-1, 1].forEach((dir) => out.push(eye(L, H.cx + dir * ex * 0.72, ey - H.ry * 0.36, erx * 0.5, ery * 0.5, { ...eyeOpts, tilt: dir * -8 })));
  if (s.eyes === 6) [[-0.3, -0.4, 0.46], [0.3, -0.4, 0.46], [-0.62, -0.18, 0.36], [0.62, -0.18, 0.36]].forEach(([dx, dy, k]) => out.push(eye(L, H.cx + H.rx * dx, ey + H.ry * dy, erx * k, ery * k, eyeOpts)));
  out.push(eye(L, H.cx - ex, ey, erx, ery, { ...eyeOpts, tilt: s.fierce ? 8 : 4, lash: s.lash ? -1 : 0 }), eye(L, H.cx + ex, ey, erx, ery, { ...eyeOpts, tilt: s.fierce ? -8 : -4, lash: s.lash ? 1 : 0 }));
  if (s.fierce) out.push(`<path d="M ${f1(H.cx - ex - erx * 1.3)} ${f1(ey - ery * 1.25)} L ${f1(H.cx - ex + erx * 1.1)} ${f1(ey - ery * 0.75)} M ${f1(H.cx + ex + erx * 1.3)} ${f1(ey - ery * 1.25)} L ${f1(H.cx + ex - erx * 1.1)} ${f1(ey - ery * 0.75)}" stroke="${line}" stroke-width="11" stroke-linecap="round"/>`);
  if (s.third === 'void') {
    const tx = H.cx; const ty = H.cy - H.ry * 0.5;
    out.push(`<circle cx="${tx}" cy="${f1(ty)}" r="34" fill="${s.colors.eye}" opacity="0.45" filter="${L.blur(11)}"/><ellipse cx="${tx}" cy="${f1(ty)}" rx="34" ry="8" fill="${lighten(s.colors.eye, 0.5)}" opacity="0.9" transform="rotate(-9 ${tx} ${f1(ty)})"/><circle cx="${tx}" cy="${f1(ty)}" r="14" fill="#000"/><circle cx="${tx}" cy="${f1(ty)}" r="15" fill="none" stroke="${lighten(s.colors.eye, 0.6)}" stroke-width="2.4"/>`);
  } else if (s.third) {
    out.push(glowDot(L, H.cx, H.cy - H.ry * 0.46, 10, s.colors.eye));
  }
  if (s.gem) {
    const gy = H.cy - H.ry * 0.46;
    const color = s.colors.gem ?? s.colors.accent;
    if (s.gem === 'crescent') out.push(`<path d="M ${H.cx + 10} ${f1(gy - 20)} A 20 20 0 1 0 ${H.cx + 10} ${f1(gy + 20)} A 15 15 0 1 1 ${H.cx + 10} ${f1(gy - 20)} Z" fill="${lighten(color, 0.4)}"/><circle cx="${H.cx}" cy="${f1(gy)}" r="26" fill="${color}" opacity="0.45" filter="${L.blur(11)}"/>`);
    else out.push(`<circle cx="${H.cx}" cy="${f1(gy)}" r="28" fill="${color}" opacity="0.45" filter="${L.blur(11)}"/>`, `<path d="M ${H.cx} ${f1(gy - 18)} L ${H.cx + 13} ${f1(gy)} L ${H.cx} ${f1(gy + 18)} L ${H.cx - 13} ${f1(gy)} Z" fill="${color}" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="2"/>`, `<path d="M ${H.cx} ${f1(gy - 18)} L ${H.cx + 13} ${f1(gy)} L ${H.cx} ${f1(gy)} Z" fill="#FFFFFF" opacity="0.55"/>`);
  }
  return out.join('');
};

// ——— ears ———
const earSpecs = {
  fox: { at: 36, axis: 20, len: 1.0, width: 0.74, profile: (u) => (1 - u) * (1 + 0.45 * u), inner: 0.56 },
  cat: { at: 42, axis: 28, len: 0.72, width: 0.64, profile: (u) => (1 - u) * (1 + 0.35 * u), inner: 0.54 },
  long: { at: 22, axis: 8, len: 1.55, width: 0.36, profile: (u) => Math.sin(Math.PI * Math.pow(u, 0.62)) * 0.9 + 0.1 * (1 - u), inner: 0.5 },
  leaf: { at: 52, axis: 60, len: 1.15, width: 0.5, profile: (u) => Math.sin(Math.PI * u) * 0.94 + 0.06 * (1 - u), inner: 0.46 },
  droop: { at: 62, axis: 118, len: 0.7, width: 0.46, profile: (u) => Math.sin(Math.PI * Math.pow(u, 0.7)) * 0.9 + 0.1 * (1 - u), inner: 0.5 },
  tuft: { at: 40, axis: 26, len: 0.95, width: 0.6, profile: (u) => (1 - u) * (1 + 0.3 * u), inner: 0.52 },
  fin: { at: 72, axis: 72, len: 0.9, width: 0.52, profile: (u) => (1 - u) * (0.72 + 0.28 * Math.cos(u * 18)), inner: 0 },
  feather: { at: 32, axis: 26, len: 0.7, width: 0.3, profile: (u) => Math.sin(Math.PI * Math.pow(u, 0.5)) * (1 - u * 0.3), inner: 0 },
  bat: { at: 44, axis: 32, len: 1.3, width: 0.78, profile: (u) => Math.pow(1 - u, 0.62) * (0.86 + 0.14 * Math.sin(u * 12)), inner: 0.58 },
  gill: { at: 78, axis: 80, len: 0.62, width: 0.22, profile: (u) => Math.sin(Math.PI * Math.pow(u, 0.5)), inner: 0 },
};

const earShape = (kind, H, dir, s) => {
  const size = s.earSize ?? 1;
  const spec = earSpecs[kind];
  const base = polar(H.cx, H.cy, H.rx, H.ry, 270 + dir * spec.at, 0.86);
  const axis = 270 + dir * (spec.axis + (s.earTilt ?? 0));
  const len = H.ry * size * spec.len;
  const width = H.rx * size * spec.width;
  const bend = (kind === 'leaf' ? 0.12 : kind === 'long' ? 0.06 : kind === 'droop' ? -0.2 : 0.02) * dir;
  return {
    outer: spindle(base, axis, len, width, { profile: spec.profile, bend }),
    inner: spec.inner ? spindle(polar(base[0], base[1], 1, 1, axis, len * 0.1), axis, len * 0.76, width * spec.inner, { profile: spec.profile, bend }) : null,
    tip: spindle(polar(base[0], base[1], 1, 1, axis, len * 0.7), axis, len * 0.3, width * 0.3, { profile: (u) => (1 - u) * 1.1, bend }),
    base, axis, len,
  };
};

const ears = (L, H, s, T, view) => {
  if (!s.ears || s.ears === 'none') return '';
  if (s.ears === 'round') {
    return [-1, 1].map((dir) => {
      const size = s.earSize ?? 1; const r = H.rx * 0.3 * size;
      const c = polar(H.cx, H.cy, H.rx, H.ry, 270 + dir * 48, 0.9);
      const outer = blob(c[0], c[1] - 6, r, r, { seed: s.seed + dir, tufts: s.furry === false ? [] : [{ from: 180, to: 359, count: 5, len: 0.12 }] });
      return paint(L, outer, T.fur, { shift: 16, soft: 11 }) + (view === 'front' ? paint(L, blob(c[0], c[1], r * 0.55, r * 0.55, { seed: s.seed + dir * 3 }), T.inner, { line: 0, shift: 8, soft: 7 }) : '');
    }).join('');
  }
  if (s.ears === 'feather') {
    // Soft feather tufts, three per side, fanning outward like an owl's or a seraph's ear plumes.
    const size = s.earSize ?? 1;
    return [-1, 1].map((dir) => [0, 1, 2].map((i) => {
      const base = polar(H.cx, H.cy, H.rx, H.ry, 270 + dir * (34 + i * 12), 0.84);
      return paint(L, spindle(base, 270 + dir * (30 + i * 22), (96 - i * 18) * size, 40 * size, { profile: featherProfile, bend: dir * 0.1 }), i === 1 ? T.crest : T.fur, { shift: 10, soft: 7, lineOpacity: 0.5 });
    }).reverse().join('')).join('');
  }
  if (s.ears === 'antenna' || s.ears === 'feelers') {
    return [-1, 1].map((dir) => {
      const c = bezier(polar(H.cx, H.cy, H.rx, H.ry, 270 + dir * 26, 0.9), [H.cx + dir * H.rx * 0.5, H.cy - H.ry * 1.5], [H.cx + dir * H.rx * 0.9, H.cy - H.ry * 1.62], [H.cx + dir * H.rx * 1.02, H.cy - H.ry * 1.38], 10);
      const tipColor = s.colors.antenna ?? s.colors.accent;
      const tip = s.ears === 'feelers'
        ? Array.from({ length: 6 }, (_, i) => paint(L, spindle(c[4 + (i % 6)], 270 + dir * (40 + i * 6), 30, 12), T.accent, { shift: 4, soft: 3, line: 1.5 })).join('')
        : s.antennaTip === 'leaf' ? paint(L, spindle(c[9], 270 + dir * 40, 58, 40, { profile: (u) => Math.sin(Math.PI * u) }), T.leaf, { shift: 8, soft: 6 })
          : glowDot(L, c[9][0], c[9][1], 13, tipColor);
      return `<path d="${catmull(c, false)}" stroke="${T.fur.line}" stroke-width="7" fill="none" stroke-linecap="round"/>${tip}`;
    }).join('');
  }
  return [-1, 1].map((dir) => {
    const shape = earShape(s.ears, H, dir, s);
    const earTone = s.ears === 'fin' || s.ears === 'gill' ? T.fin : T.fur;
    const out = [paint(L, shape.outer, earTone, { shift: 18, soft: 11, glow: s.earGlow ? s.colors.fin ?? s.colors.rim : null, glowOpacity: 0.5, glowSize: 16 })];
    if (view === 'front' && shape.inner) out.push(paint(L, shape.inner, T.inner, { shift: 12, soft: 8, line: 0, glow: s.innerGlow ? s.colors.inner : null, glowOpacity: 0.55, glowSize: 11 }));
    if (s.earTips) out.push(paint(L, shape.tip, T.tips, { shift: 8, soft: 6, line: 0, glow: s.earTipsGlow ? s.colors.tips : null, glowOpacity: 0.8, glowSize: 11 }));
    if (s.ears === 'tuft') {
      const tip = polar(shape.base[0], shape.base[1], 1, 1, shape.axis, shape.len);
      out.push(paint(L, spindle(tip, shape.axis - dir * 6, 40, 12, { profile: (u) => 1 - u }), T.fur, { shift: 4, soft: 3, line: 2 }));
    }
    return out.join('');
  }).join('');
};

// ——— horns & antlers ———
const horns = (L, H, s, T) => {
  const kind = s.horns;
  if (!kind || kind === 'none') return '';
  const size = s.hornSize ?? 1;
  const glow = s.hornGlow ? s.colors.crystal ?? s.colors.horn : null;
  return [-1, 1].map((dir) => {
    if (kind === 'nubs') {
      const base = polar(H.cx, H.cy, H.rx, H.ry, 270 + dir * 22, 0.9);
      return paint(L, spindle(base, 270 + dir * 14, 46 * size, 32 * size, { profile: (u) => Math.pow(1 - u, 0.7) }), T.horn, { shift: 8, soft: 6, line: 2.5, glow, glowOpacity: 0.6, glowSize: 11 });
    }
    if (kind === 'curve' || kind === 'swept' || kind === 'moon') {
      const base = polar(H.cx, H.cy, H.rx, H.ry, 270 + dir * 30, 0.84);
      const reach = kind === 'swept' ? [150, 70] : kind === 'moon' ? [60, 150] : [110, 130];
      const c = bezier(base, [base[0] + dir * 30 * size, base[1] - 70 * size], [base[0] + dir * 90 * size, base[1] - 90 * size], [base[0] + dir * reach[0] * size, base[1] - reach[1] * size], 14);
      const final = kind === 'moon' ? bezier(base, [base[0] + dir * 90 * size, base[1] - 30 * size], [base[0] + dir * 110 * size, base[1] - 130 * size], [base[0] + dir * 30 * size, base[1] - 160 * size], 14) : c;
      return paint(L, tube(final, final.map((_, i) => 36 * size * Math.pow(1 - i / (final.length - 1), 0.8) + 2)), T.horn, { shift: 10, soft: 7, line: 2.5, glow, glowOpacity: 0.55, glowSize: 16 });
    }
    if (kind === 'ram') {
      const base = polar(H.cx, H.cy, H.rx, H.ry, 270 + dir * 50, 0.92);
      const pts = Array.from({ length: 24 }, (_, i) => {
        const t = i / 23; const a = (dir > 0 ? -1.9 : Math.PI + 1.9) + dir * t * 4.8; const r = (70 - t * 44) * size;
        return [base[0] + dir * 44 * size + Math.cos(a) * r, base[1] + 36 * size + Math.sin(a) * r];
      });
      const ridges = pts.filter((_, i) => i % 2 === 1 && i < 20).map(([x, y], i) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(4 - i * 0.12)}" fill="${T.horn.line}" opacity="0.3"/>`).join('');
      return paint(L, tube(pts, pts.map((_, i) => (46 - i * 1.4) * size)), T.horn, { shift: 12, soft: 8, line: 2.5, glow, glowOpacity: 0.5 }) + ridges;
    }
    if (kind === 'antler' || kind === 'crystalAntler' || kind === 'coral') {
      const base = polar(H.cx, H.cy, H.rx, H.ry, 270 + dir * 26, 0.9);
      const main = bezier(base, [base[0] + dir * 20, base[1] - 70 * size], [base[0] + dir * 70 * size, base[1] - 120 * size], [base[0] + dir * 116 * size, base[1] - 176 * size], 14);
      const t = kind === 'antler' ? T.horn : T.crystal;
      const branch = (i, len, ang) => spindle(main[i], 270 + dir * ang, len * size, 18 * size, { profile: (u) => Math.pow(1 - u, 0.8) + 0.08 });
      const shapes = [tube(main, main.map((_, i) => 24 * size * (1 - i / 15) + 5)), branch(4, 72, -14), branch(7, 62, 50), branch(10, 48, -6)];
      if (kind === 'coral') shapes.push(branch(5, 40, 80), branch(11, 36, 30));
      const leaves = s.antlerLeaves ? [main[7], main[12]].map((p, i) => paint(L, spindle(p, 270 + dir * (70 - i * 40), 50, 34, { profile: (u) => Math.sin(Math.PI * u) }), T.leaf, { shift: 6, soft: 5, line: 2 })).join('') : '';
      return shapes.map((d) => paint(L, d, t, { shift: 8, soft: 6, line: 2.2, glow: kind !== 'antler' || glow ? s.colors.crystal ?? s.colors.horn : null, glowOpacity: 0.5, glowSize: 11 })).join('') + leaves;
    }
    if (kind === 'crystal' || kind === 'unicorn') {
      if (kind === 'unicorn' && dir > 0) return '';
      const base = kind === 'unicorn' ? [H.cx, H.cy - H.ry * 0.82] : polar(H.cx, H.cy, H.rx, H.ry, 270 + dir * 30, 0.86);
      const axis = kind === 'unicorn' ? 270 : 270 + dir * 20;
      const len = (kind === 'unicorn' ? 136 : 100) * size; const width = (kind === 'unicorn' ? 44 : 38) * size;
      const a = rad(axis); const tip = [base[0] + Math.cos(a) * len, base[1] + Math.sin(a) * len];
      const px = -Math.sin(a) * width / 2; const py = Math.cos(a) * width / 2;
      const mid = (sign) => [base[0] + sign * px * 0.9 + Math.cos(a) * len * 0.55, base[1] + sign * py * 0.9 + Math.sin(a) * len * 0.55];
      const d = `M ${f1(base[0] + px)} ${f1(base[1] + py)} L ${f1(mid(1)[0])} ${f1(mid(1)[1])} L ${f1(tip[0])} ${f1(tip[1])} L ${f1(mid(-1)[0])} ${f1(mid(-1)[1])} L ${f1(base[0] - px)} ${f1(base[1] - py)} Z`;
      const facet = `M ${f1(base[0])} ${f1(base[1])} L ${f1(tip[0])} ${f1(tip[1])} L ${f1(mid(1)[0])} ${f1(mid(1)[1])} Z`;
      return paint(L, d, T.crystal, { shift: 8, soft: 6, line: 2.4, glow: s.colors.crystal, glowOpacity: 0.55, glowSize: 16 }) + `<path d="${facet}" fill="#FFFFFF" opacity="0.35"/>`;
    }
    return '';
  }).join('');
};

// ——— tails (screen right in front view; the back view mirrors them) ———
const tailShape = (s) => {
  const kind = s.tail;
  const k = s.tailSize ?? 1;
  const base = [372, 516];
  if (kind === 'bushy' || kind === 'striped') {
    const c = bezier(base, [base[0] + 110 * k, base[1] + 40 * k], [base[0] + 170 * k, base[1] - 90 * k], [base[0] + 110 * k, base[1] - 210 * k], 18);
    const width = (i) => { const t = i / 17; return 26 + 118 * k * Math.sin(Math.PI * Math.pow(t, 0.7)) * (t < 0.95 ? 1 : 0.4); };
    return { main: tube(c, c.map((_, i) => width(i))), tip: tube(c.slice(13), c.slice(13).map((_, i) => width(i + 13) * 1.04 + 4)), centre: c, width };
  }
  if (['thin', 'spade', 'flame', 'lantern', 'tadpole', 'tuftTip'].includes(kind)) {
    const c = kind === 'tadpole'
      ? bezier([300, 540], [380, 580], [460, 540], [520, 470], 16)
      : bezier(base, [base[0] + 120 * k, base[1] + 30 * k], [base[0] + 150 * k, base[1] - 110 * k], [base[0] + 90 * k, base[1] - 190 * k], 18);
    const w0 = kind === 'tadpole' ? 90 : 40 * k;
    return { main: tube(c, c.map((_, i) => w0 * (1 - i / (c.length - 1)) + 8)), centre: c };
  }
  if (kind === 'serpent') {
    const c = bezier(base, [base[0] + 140 * k, base[1] + 60 * k], [base[0] + 190 * k, base[1] - 80 * k], [base[0] + 120 * k, base[1] - 170 * k], 20);
    return { main: tube(c, c.map((_, i) => 52 * (1 - i / 19) + 8)), centre: c };
  }
  if (kind === 'puff') return { main: blob(base[0] + 18, base[1] + 14, 46 * k, 42 * k, { seed: s.seed + 17, tufts: [{ from: 0, to: 359, count: 10, len: 0.13 }] }), centre: [[base[0] + 18, base[1] + 14]] };
  if (kind === 'fan') return { fan: [-44, -16, 12, 40].map((a) => spindle([300, 468], 90 + a, 118 * k, 72 * k, { profile: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.6)), 0.55) })), centre: [[300, 560]] };
  if (kind === 'petal' || kind === 'leaf') {
    const c = bezier(base, [base[0] + 90 * k, base[1] + 20 * k], [base[0] + 140 * k, base[1] - 70 * k], [base[0] + 120 * k, base[1] - 130 * k], 12);
    return { main: tube(c, c.map((_, i) => 26 * k * (1 - i / 11) + 6)), leaf: spindle(c[11], -70, 130 * k, 90 * k, { profile: (u) => Math.sin(Math.PI * u), bend: 0.1 }), centre: c };
  }
  if (kind === 'comet') {
    const c = bezier([330, 520], [430, 560], [520, 480], [560, 380], 14);
    return { comet: tube(c, c.map((_, i) => 70 * (1 - i / 13) + 4)), centre: c };
  }
  return null;
};

const tail = (L, s, T, view) => {
  const shape = tailShape(s);
  if (!shape) return '';
  const out = [];
  if (shape.fan) shape.fan.forEach((d, i) => out.push(paint(L, d, i % 2 ? T.wingInner : T.wing, { shift: 14, soft: 10, glow: s.tail === 'fan' && s.tailGlow ? s.colors.wingGlow ?? s.colors.rim : null, glowOpacity: 0.4 })));
  if (shape.comet) out.push(paint(L, shape.comet, T.trail, { line: 0, shift: 10, soft: 12, opacity: 0.9, glow: s.colors.trail, glowOpacity: 0.7, glowSize: 24 }));
  if (shape.main) {
    let inner = strands(L, shape.centre[9]?.[0] ?? 450, shape.centre[9]?.[1] ?? 450, 80, 90, T.fur, s.furry === false ? 0 : 18, s.seed + 5, 18);
    if (s.tail === 'striped') {
      const c = shape.centre;
      inner += [5, 9, 13].map((i) => `<path d="${tube([c[i - 1], c[i], c[i + 1]], [shape.width(i) * 1.3, shape.width(i) * 1.3, shape.width(i) * 1.3])}" fill="${s.colors.stripe ?? T.fur.line}" opacity="0.55"/>`).join('');
    }
    if (s.tail === 'serpent' && s.pattern === 'stars') inner += shape.centre.filter((_, i) => i % 4 === 2).map(([x, y]) => sparkle(x, y, 8, s.colors.accent)).join('');
    out.push(paint(L, shape.main, s.tail === 'tadpole' ? T.fin : T.fur, { shift: 22, soft: 14, inner }));
  }
  if (shape.tip && s.tailTip !== false) out.push(paint(L, shape.tip, T.tips, { shift: 12, soft: 9, line: 0, glow: s.tailGlow ? s.colors.tips : null, glowOpacity: 0.7, glowSize: 16 }));
  if (shape.leaf) out.push(paint(L, shape.leaf, s.tail === 'petal' ? T.petal : T.leaf, { shift: 12, soft: 8 }), `<path d="M ${f1(shape.centre[11][0])} ${f1(shape.centre[11][1])} l 36 -110" stroke="${T.leaf.highlight}" stroke-width="3" opacity="0.5"/>`);
  const end = shape.centre[shape.centre.length - 1];
  if (s.tail === 'spade') out.push(paint(L, spindle([end[0] + 6, end[1] + 16], -80, 74, 68, { profile: (u) => Math.sin(Math.PI * Math.pow(u, 0.5)) }), T.accent, { shift: 10, soft: 7 }));
  if (s.tail === 'tuftTip') out.push(paint(L, blob(end[0], end[1], 30, 36, { seed: s.seed + 3, tufts: [{ from: 180, to: 359, count: 5, len: 0.25 }] }), T.tips, { shift: 8, soft: 6 }));
  if (s.tail === 'flame' || (s.tail === 'serpent' && s.tailFlame)) {
    out.push(paint(L, spindle([end[0], end[1] + 20], -95, 120, 80, { profile: (u) => Math.sin(Math.PI * Math.pow(u, 0.6)), bend: -0.18 }), T.flame, { line: 0, shift: 8, soft: 8, glow: s.colors.flame, glowOpacity: 0.75, glowSize: 24 }));
    out.push(paint(L, spindle([end[0] + 4, end[1] + 6], -95, 66, 40, { profile: (u) => Math.sin(Math.PI * Math.pow(u, 0.6)), bend: -0.2 }), tone(lighten(s.colors.flame, 0.6)), { line: 0, shift: 4, soft: 4 }));
  }
  if (s.tail === 'lantern') out.push(glowDot(L, end[0] + 4, end[1] - 8, 24, s.colors.tips ?? '#FFE27A'));
  if (s.tailWorlds) [[0.45, 16, s.colors.accent], [0.7, 12, '#9AE8FF'], [0.9, 9, '#FFE27A']].forEach(([t, r, c]) => { const p = shape.centre[Math.round(t * (shape.centre.length - 1))]; out.push(glowDot(L, p[0], p[1], r, c)); });
  const svg = out.join('');
  return view === 'back' ? mirrorX(svg) : svg;
};

// ——— wings (right wing only, pivot at WING) ———
const featherProfile = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.6)), 0.6);

// A raised wing read as one solid silhouette first (so it stays a wing at thumbnail size), then
// rounded primary feathers along the outer edge and a band of coverts along the leading edge.
const featherWing = (L, s, T, base, kk, t, tInner, glow) => {
  const at = (x, y) => [base[0] + x * 0.8 * kk, base[1] + y * 0.8 * kk];
  const centre = at(110, -40);
  const tips = [[226, -186], [266, -128], [286, -64], [284, 2], [258, 62], [210, 106], [150, 124]].map(([x, y]) => at(x, y));
  const outline = [at(-20, 22), at(-2, -40), at(46, -116), at(116, -178), at(180, -206), tips[0]];
  tips.slice(1).forEach((tip, i) => outline.push(lerp(lerp(tips[i], tip, 0.5), centre, 0.2), tip));
  outline.push(at(94, 108), at(36, 74));
  const out = [paint(L, catmull(outline), t, { shift: 26, soft: 16, glow, glowOpacity: 0.5, glowSize: 24, lineOpacity: 0.6 })];
  tips.forEach((tip, i) => {
    const angle = (Math.atan2(tip[1] - centre[1], tip[0] - centre[0]) * 180) / Math.PI;
    const length = Math.hypot(tip[0] - centre[0], tip[1] - centre[1]);
    const feather = spindle(lerp(centre, tip, 0.3), angle, length * 0.74, 62 * 0.8 * kk, { profile: featherProfile, bend: 0.03 });
    const quill = `<path d="M ${f1(lerp(centre, tip, 0.34)[0])} ${f1(lerp(centre, tip, 0.34)[1])} L ${f1(lerp(centre, tip, 0.96)[0])} ${f1(lerp(centre, tip, 0.96)[1])}" stroke="${t.highlight}" stroke-width="2.5" opacity="0.45"/>`;
    out.push(paint(L, feather, i % 2 ? t : tInner, { shift: 12, soft: 9, lineOpacity: 0.45, lightOpacity: 0.5, inner: quill }));
  });
  // Coverts: a broad soft patch over the inner wing, edged with two rows of small scalloped feathers.
  const coverts = catmull([at(-24, 24), at(-6, -42), at(44, -118), at(114, -180), at(180, -208), at(214, -150), at(190, -80), at(140, -10), at(84, 52), at(30, 74)]);
  const row = (from, to, count, size) => Array.from({ length: count }, (_, i) => { const p = lerp(from, to, i / (count - 1)); return `<path d="M ${f1(p[0] - size * kk)} ${f1(p[1] - 4 * kk)} q ${f1(size * kk)} ${f1(size * 1.2 * kk)} ${f1(size * 2 * kk)} 0" stroke="${t.line}" stroke-width="2.4" fill="none" opacity="0.32"/>`; }).join('');
  out.push(paint(L, coverts, tInner, { shift: 18, soft: 14, inner: row(at(40, 50), at(196, -120), 7, 16) + row(at(14, 10), at(150, -150), 6, 13), lineOpacity: 0.28, line: 2.4 }));
  return out.join('');
};

const wing = (L, s, T) => {
  const kind = s.wings;
  if (!kind || kind === 'none') return '';
  const k = s.wingSize ?? 1;
  const [px, py] = s.wingPivot ?? WING;
  const out = [];
  const glow = s.wingGlow ? s.colors.wingGlow ?? s.colors.rim : null;
  if (kind === 'feather' || kind === 'fire') {
    out.push(featherWing(L, s, T, [px, py], k, kind === 'fire' ? T.flame : T.wing, kind === 'fire' ? T.flameInner : T.wingInner, kind === 'fire' ? s.colors.flame : glow));
  } else if (kind === 'angel') {
    out.push(`<g transform="rotate(38 ${px} ${py})">${featherWing(L, s, T, [px, py + 20], k * 0.74, T.wing, T.wingInner, glow)}</g>`);
    out.push(featherWing(L, s, T, [px, py - 12], k, T.wing, T.wingInner, glow));
  } else if (['membrane', 'leaf', 'glass', 'ember'].includes(kind)) {
    const E = [px + 70 * k, py - 96 * k]; const W = [px + 150 * k, py - 150 * k];
    const tips = [[px + 228 * k, py - 118 * k], [px + 232 * k, py - 28 * k], [px + 172 * k, py + 46 * k]];
    const end = [px + 40 * k, py + 46 * k];
    const scallop = (a, b, depth) => { const m = lerp(a, b, 0.5); const dx = W[0] - m[0]; const dy = W[1] - m[1]; const l = Math.hypot(dx, dy) || 1; return [m[0] + (dx / l) * depth, m[1] + (dy / l) * depth]; };
    const pts = [[px, py], E, W, tips[0], scallop(tips[0], tips[1], 36 * k), tips[1], scallop(tips[1], tips[2], 34 * k), tips[2], scallop(tips[2], end, 30 * k), end];
    const membraneTone = kind === 'leaf' ? T.leaf : kind === 'glass' ? T.glass : kind === 'ember' ? T.flame : T.wing;
    let inner = '';
    if (s.wingStars) inner += Array.from({ length: 9 }, (_, i) => { const p = lerp(lerp([px, py], tips[i % 3], 0.4 + (i % 4) * 0.14), W, 0.2); return sparkle(p[0], p[1], 7 + (i % 3) * 3, s.colors.accent, 0.9); }).join('');
    if (kind === 'leaf') inner += tips.map((tip) => `<path d="M ${f1(W[0])} ${f1(W[1])} Q ${f1((W[0] + tip[0]) / 2 + 10)} ${f1((W[1] + tip[1]) / 2 + 12)} ${f1(tip[0])} ${f1(tip[1])}" stroke="${T.leaf.highlight}" stroke-width="3" fill="none" opacity="0.55"/>`).join('');
    if (kind === 'glass') inner += tips.map((tip, i) => `<path d="M ${f1(W[0])} ${f1(W[1])} L ${f1(tip[0])} ${f1(tip[1])} L ${f1(lerp(tip, end, 0.3)[0])} ${f1(lerp(tip, end, 0.3)[1])} Z" fill="#FFFFFF" opacity="${0.12 + i * 0.05}"/>`).join('');
    inner += `<path d="${catmull(pts)}" fill="none" stroke="${T.wing.shade}" stroke-width="30" opacity="0.25" filter="${L.blur(11)}"/>`;
    out.push(paint(L, catmull(pts), membraneTone, { shift: 26, soft: 16, opacity: kind === 'glass' ? 0.84 : 0.97, glow: glow ?? (kind === 'ember' ? s.colors.flame : null), glowOpacity: 0.45, glowSize: 24, inner }));
    const bone = kind === 'glass' ? T.crystal : T.bone;
    out.push(paint(L, tube([[px, py], [px + 34 * k, py - 50 * k], E, [px + 110 * k, py - 128 * k], W], [28 * k, 24 * k, 19 * k, 16 * k, 14 * k]), bone, { shift: 8, soft: 6, line: 2.2 }));
    tips.forEach((tip) => out.push(paint(L, tube([W, lerp(W, tip, 0.5), tip], [12 * k, 8 * k, 3 * k]), bone, { shift: 6, soft: 5, line: 1.8 })));
    out.push(paint(L, spindle(W, -60, 36 * k, 16 * k, { profile: (u) => 1 - u }), T.horn, { shift: 5, soft: 4, line: 1.8 }));
    if (kind === 'ember') tips.forEach((tip) => out.push(glowDot(L, tip[0], tip[1], 10 * k, s.colors.flame)));
  } else if (['insect', 'moth', 'butterfly'].includes(kind)) {
    const translucent = kind === 'insect';
    const upper = spindle([px - 10, py - 6], -54, 236 * k, (translucent ? 96 : 156) * k, { profile: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.62)), 0.8), bend: 0.08 });
    const lower = spindle([px - 10, py + 12], 26, 170 * k, (translucent ? 76 : 136) * k, { profile: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.8), bend: -0.08 });
    const veins = (a, len) => [0.25, 0, -0.25].map((bend) => `<path d="${catmull(bezier([px, py], polar(px, py, 1, 1, a + bend * 40, len * k * 0.3), polar(px, py, 1, 1, a + bend * 50, len * k * 0.66), polar(px, py, 1, 1, a + bend * 30, len * k * 0.92), 6), false)}" stroke="${translucent ? lighten(s.colors.wing, 0.7) : darken(s.colors.wing, 0.45)}" stroke-width="3" fill="none" opacity="0.5"/>`).join('');
    const eyespot = translucent ? '' : `<circle cx="${f1(px + 128 * k)}" cy="${f1(py - 124 * k)}" r="${f1(30 * k)}" fill="${s.colors.accent}" opacity="0.9"/><circle cx="${f1(px + 128 * k)}" cy="${f1(py - 124 * k)}" r="${f1(14 * k)}" fill="${lighten(s.colors.accent, 0.65)}"/><circle cx="${f1(px + 128 * k)}" cy="${f1(py - 124 * k)}" r="${f1(46 * k)}" fill="${s.colors.accent}" opacity="0.4" filter="${L.blur(11)}"/>`;
    const edge = kind === 'butterfly' ? `<path d="${upper}" fill="none" stroke="${s.colors.edge ?? '#1A1030'}" stroke-width="18" opacity="0.8"/>${Array.from({ length: 7 }, (_, i) => { const p = polar(px, py, 1, 1, -80 + i * 10, 214 * k); return `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="5" fill="#FFFFFF" opacity="0.85"/>`; }).join('')}` : '';
    out.push(paint(L, lower, T.wingInner, { shift: 20, soft: 14, opacity: translucent ? 0.6 : 0.97, glow, glowOpacity: 0.4, inner: veins(26, 170) }));
    out.push(paint(L, upper, T.wing, { shift: 24, soft: 16, opacity: translucent ? 0.64 : 0.98, glow, glowOpacity: 0.4, inner: veins(-54, 236) + eyespot + edge }));
  } else if (kind === 'fin' || kind === 'crystalFin' || kind === 'ray') {
    const ray = kind === 'ray';
    const fin = ray
      ? catmull([[px - 60, py - 110], [px + 60 * k, py - 150 * k], [px + 200 * k, py - 110 * k], [px + 250 * k, py - 20 * k], [px + 150 * k, py + 20 * k], [px + 20 * k, py + 30 * k], [px - 60, py - 10]])
      : spindle([px + 28, py - 44], s.finAngle ?? 8, 186 * k, 124 * k, { profile: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.5)), 0.8), bend: 0.16 });
    const rays = [-0.25, 0, 0.25].map((off) => `<path d="M ${f1(px + 30)} ${f1(py - 44)} q ${f1(84 * k)} ${f1((off * 90 - 10) * k)} ${f1(156 * k)} ${f1((off * 170 + 10) * k)}" stroke="${lighten(s.colors.fin ?? s.colors.fur, 0.55)}" stroke-width="3" fill="none" opacity="0.5"/>`).join('');
    out.push(paint(L, fin, kind === 'crystalFin' ? T.glass : ray ? T.fur : T.fin, { shift: 20, soft: 13, opacity: ray ? 1 : 0.92, glow, glowOpacity: 0.45, inner: ray ? '' : rays }));
  } else if (kind === 'claw') {
    // A raised pincer: segmented arm, a heavy upper jaw curling over a slimmer lower jaw, open gap between.
    const elbow = [px + 60 * k, py - 20 * k]; const wrist = [px + 110 * k, py - 86 * k];
    out.push(paint(L, tube([[px - 30, py + 30], elbow, wrist], [56 * k, 46 * k, 40 * k]), T.claw, { shift: 12, soft: 8, inner: `<circle cx="${f1(elbow[0])}" cy="${f1(elbow[1])}" r="${f1(10 * k)}" fill="${T.claw.shade}" opacity="0.4"/>` }));
    // Pincer: a rounded claw with an open wedge pointing up and out, like a crab's.
    const c = [wrist[0] + 44 * k, wrist[1] - 52 * k]; const rx = 78 * k; const ry = 64 * k; const rot = rad(-40);
    const at = (deg, scale = 1) => { const a = rad(deg); const x = Math.cos(a) * rx * scale; const y = Math.sin(a) * ry * scale; return [c[0] + x * Math.cos(rot) - y * Math.sin(rot), c[1] + x * Math.sin(rot) + y * Math.cos(rot)]; };
    const pincer = [];
    for (let deg = 26; deg <= 334; deg += 14) pincer.push(at(deg, deg > 300 || deg < 60 ? 1.08 : 1));
    pincer.push(at(348, 0.95), at(0, 0.3), at(12, 0.95));
    const teeth = [0.55, 0.75].map((f) => { const p = at(8, f); return `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(5 * k)}" fill="${T.claw.highlight}" opacity="0.8"/>`; }).join('');
    out.push(paint(L, catmull(pincer), T.claw, { shift: 22, soft: 14, glow, glowOpacity: 0.5, inner: teeth + gloss(L, c[0] - 24 * k, c[1] - 20 * k, 20 * k, 9 * k, 0.45) }));
  } else if (kind === 'stub') {
    out.push(paint(L, spindle([px - 6, py + 10], 20, 110 * k, 70 * k, { profile: (u) => Math.sin(Math.PI * Math.pow(u, 0.6)) * 0.92 + 0.08, bend: 0.12 }), T.fur, { shift: 14, soft: 10 }));
  }
  return out.join('');
};

// ——— accessories ———
const crown = (L, H, s) => {
  const y = H.cy - H.ry * 0.94;
  const gold = tone(s.colors.crown ?? '#FFD45E', { rim: '#FFF6C8' });
  const d = `M 234 ${f1(y + 28)} L 226 ${f1(y - 16)} L 262 ${f1(y + 4)} L 300 ${f1(y - 44)} L 338 ${f1(y + 4)} L 374 ${f1(y - 16)} L 366 ${f1(y + 28)} Q 300 ${f1(y + 44)} 234 ${f1(y + 28)} Z`;
  const gem = s.colors.gem ?? s.colors.eye;
  return paint(L, d, gold, { shift: 10, soft: 7, line: 2.4, glow: s.colors.crown ?? '#FFD45E', glowOpacity: 0.55, glowSize: 16 }) + glowDot(L, 300, y - 2, 10, gem) + glowDot(L, 252, y + 14, 6, gem) + glowDot(L, 348, y + 14, 6, gem);
};

const halo = (L, H, s) => {
  const y = H.cy - H.ry * 1.22;
  const color = s.colors.halo ?? '#FFE36A';
  if (s.halo === 'eclipse') {
    const cy = f1(y - 34);
    const flares = Array.from({ length: 12 }, (_, i) => `<path d="${spindle([300, y - 34], i * 30, 96 + (i % 2) * 34, 22, { profile: (u) => Math.pow(1 - u, 1.4) })}" fill="${lighten(color, 0.3)}" opacity="0.6"/>`).join('');
    return `<g filter="${L.blur(4)}">${flares}</g><circle cx="300" cy="${cy}" r="92" fill="${color}" opacity="0.55" filter="${L.blur(24)}"/><circle cx="300" cy="${cy}" r="58" fill="none" stroke="${color}" stroke-width="18" opacity="0.9" filter="${L.blur(7)}"/><circle cx="300" cy="${cy}" r="48" fill="#05030C"/><circle cx="300" cy="${cy}" r="50" fill="none" stroke="${lighten(color, 0.7)}" stroke-width="4"/>`;
  }
  if (s.halo === 'crescent') return `<path d="M 330 ${f1(y - 60)} A 52 52 0 1 0 330 ${f1(y + 40)} A 40 40 0 1 1 330 ${f1(y - 60)} Z" fill="${lighten(color, 0.5)}"/><circle cx="300" cy="${f1(y - 10)}" r="60" fill="${color}" opacity="0.35" filter="${L.blur(16)}"/>`;
  return `<ellipse cx="300" cy="${f1(y)}" rx="${f1(H.rx * 0.74)}" ry="${f1(H.ry * 0.17)}" fill="none" stroke="${color}" stroke-width="26" opacity="0.55" filter="${L.blur(11)}"/><ellipse cx="300" cy="${f1(y)}" rx="${f1(H.rx * 0.74)}" ry="${f1(H.ry * 0.17)}" fill="none" stroke="${lighten(color, 0.65)}" stroke-width="8"/>`;
};

const flower = (L, cx, cy, s, size = 1) => {
  const petal = tone(s.colors.petal ?? '#FF9AC8');
  return Array.from({ length: 5 }, (_, i) => paint(L, spindle([cx, cy], i * 72 - 90, 42 * size, 34 * size, { profile: (u) => Math.sin(Math.PI * Math.pow(u, 0.6)) }), petal, { shift: 6, soft: 5, line: 1.6 })).join('') + glowDot(L, cx, cy, 9 * size, '#FFE27A');
};

const hat = (L, H, s, T, view) => {
  const kind = s.hat;
  const top = H.cy - H.ry * 0.62;
  if (kind === 'witch') {
    const brim = blob(300, top + 8, H.rx * 1.25, 34, { seed: s.seed + 81 });
    const cone = catmull([[300 - H.rx * 0.62, top], [300 - H.rx * 0.2, top - 150], [300 + 70, top - 250], [300 + 150, top - 230], [300 + 60, top - 160], [300 + H.rx * 0.62, top]]);
    const band = `<path d="M ${f1(300 - H.rx * 0.6)} ${f1(top - 16)} Q 300 ${f1(top - 4)} ${f1(300 + H.rx * 0.6)} ${f1(top - 16)}" stroke="${s.colors.band ?? '#FFD45E'}" stroke-width="16" fill="none"/>`;
    const stars = [[250, top - 70], [330, top - 120], [290, top - 40]].map(([x, y], i) => sparkle(x, y, 9 + i * 3, '#FFE9A0'));
    return paint(L, brim, T.hat, { shift: 14, soft: 10 }) + paint(L, cone, T.hat, { shift: 26, soft: 16, inner: band + stars.join('') }) + glowDot(L, 300 + 150, top - 230, 12, '#FFE36A');
  }
  if (kind === 'hood' || kind === 'veil' || kind === 'frog') {
    const t = kind === 'veil' ? T.veil : T.hat;
    const back = blob(300, H.cy - 6, H.rx * 1.22, H.ry * 1.18, { seed: s.seed + 83, narrowBottom: 0.25 });
    if (view === 'behind') return paint(L, back, t, { shift: 26, soft: 16, opacity: kind === 'veil' ? 0.85 : 1, glow: kind === 'veil' ? s.colors.halo : null, glowOpacity: 0.35 });
    if (view === 'backTop') {
      if (kind !== 'frog') return '';
      return [-1, 1].map((dir) => paint(L, blob(300 + dir * H.rx * 0.46, H.cy - H.ry * 1.02, 46, 40, { seed: s.seed + dir + 85 }), t, { shift: 12, soft: 9 })).join('');
    }
    const rimArc = `M ${f1(300 - H.rx * 1.02)} ${f1(H.cy + H.ry * 0.1)} C ${f1(300 - H.rx * 1.05)} ${f1(H.cy - H.ry * 1.25)}, ${f1(300 + H.rx * 1.05)} ${f1(H.cy - H.ry * 1.25)}, ${f1(300 + H.rx * 1.02)} ${f1(H.cy + H.ry * 0.1)} L ${f1(300 + H.rx * 0.86)} ${f1(H.cy + H.ry * 0.05)} C ${f1(300 + H.rx * 0.8)} ${f1(H.cy - H.ry * 0.78)}, ${f1(300 - H.rx * 0.8)} ${f1(H.cy - H.ry * 0.78)}, ${f1(300 - H.rx * 0.86)} ${f1(H.cy + H.ry * 0.05)} Z`;
    const bumps = kind === 'frog' ? [-1, 1].map((dir) => paint(L, blob(300 + dir * H.rx * 0.46, H.cy - H.ry * 1.02, 46, 40, { seed: s.seed + dir + 85 }), t, { shift: 12, soft: 9 }) + `<circle cx="${f1(300 + dir * H.rx * 0.46)}" cy="${f1(H.cy - H.ry * 1.04)}" r="20" fill="#FFFFFF"/><circle cx="${f1(300 + dir * H.rx * 0.46)}" cy="${f1(H.cy - H.ry * 1.02)}" r="11" fill="#150A22"/>`).join('') : '';
    return paint(L, rimArc, t, { shift: 20, soft: 12, opacity: kind === 'veil' ? 0.92 : 1 }) + bumps;
  }
  return '';
};

// Things carried on the body (front layer) — a flask, a star staff, a satchel.
const held = (L, s, B) => {
  const kind = s.held;
  if (kind === 'flask') {
    const x = 392; const y = B.cy + 30;
    return paint(L, catmull([[x - 12, y - 56], [x + 12, y - 56], [x + 12, y - 30], [x + 40, y + 6], [x + 30, y + 40], [x - 30, y + 40], [x - 40, y + 6], [x - 12, y - 30]]), tone('#BFEFFF', { light: 0.7 }), { shift: 14, soft: 9, opacity: 0.9, inner: `<rect x="${x - 50}" y="${y}" width="100" height="50" fill="${s.colors.potion ?? '#7AF0C8'}" opacity="0.9"/>` }) + glowDot(L, x, y + 16, 18, s.colors.potion ?? '#7AF0C8') + `<rect x="${x - 14}" y="${y - 70}" width="28" height="16" rx="4" fill="#8A5A3A"/>`;
  }
  if (kind === 'staff') {
    return `<path d="M 420 590 L 438 300" stroke="#6A4A3A" stroke-width="12" stroke-linecap="round"/>` + glowDot(L, 440, 292, 22, s.colors.staff ?? '#FFE36A') + sparkle(440, 292, 30, '#FFFFFF', 0.95);
  }
  if (kind === 'satchel') {
    return `<path d="M 230 ${f1(B.cy - B.ry * 0.7)} L 380 ${f1(B.cy + B.ry * 0.3)}" stroke="#7A4A2A" stroke-width="14" stroke-linecap="round"/>` + paint(L, blob(386, B.cy + B.ry * 0.36, 44, 34, { seed: 5 }), tone('#A86A3A'), { shift: 10, soft: 7 }) + glowDot(L, 386, B.cy + B.ry * 0.3, 7, '#9EEBFF');
  }
  if (kind === 'orb') return glowDot(L, 300, B.cy + 6, 30, s.colors.orb ?? s.colors.accent);
  return '';
};

// Small companions and orbiting things, attached to the head layer.
const extras = (L, H, s, T, view) => {
  const out = [];
  if (s.moon) out.push(`<g>${glowDot(L, H.cx + H.rx * 1.02, H.cy - H.ry * 0.9, 22, s.colors.moon ?? '#FFF1C8')}<circle cx="${f1(H.cx + H.rx * 1.02 + 8)}" cy="${f1(H.cy - H.ry * 0.9 - 6)}" r="19" fill="${darken(s.colors.fur, 0.3)}" opacity="0.8"/></g>`);
  if (s.heart) out.push(`<path d="M 300 ${f1(H.cy - H.ry * 1.05)} c -18 -26 -60 -14 -50 18 c 8 22 50 42 50 42 c 0 0 42 -20 50 -42 c 10 -32 -32 -44 -50 -18 Z" fill="${s.colors.carry ?? '#FF9AC8'}"/><circle cx="300" cy="${f1(H.cy - H.ry * 0.96)}" r="54" fill="${s.colors.carry ?? '#FF9AC8'}" opacity="0.4" filter="${L.blur(16)}"/>`);
  if (s.spout && view === 'front') out.push(Array.from({ length: 5 }, (_, i) => glowDot(L, 300 + (i - 2) * 24, H.cy - H.ry * 1.05 - Math.abs(i - 2) * -14 - 30, 8, '#BFF4FF')).join(''));
  if (s.companion === 'crab') out.push(paint(L, blob(H.cx + H.rx * 0.2, H.cy - H.ry * 0.98, 34, 24, { seed: 3 }), tone('#FFC24A'), { shift: 8, soft: 6 }) + `<circle cx="${f1(H.cx + H.rx * 0.2 - 10)}" cy="${f1(H.cy - H.ry * 1.1)}" r="5" fill="#150A22"/><circle cx="${f1(H.cx + H.rx * 0.2 + 10)}" cy="${f1(H.cy - H.ry * 1.1)}" r="5" fill="#150A22"/>`);
  if (s.companion === 'lanternfish') out.push(paint(L, blob(H.cx - H.rx * 1.08, H.cy + H.ry * 0.2, 36, 26, { seed: 4 }), tone('#5A6AC8'), { shift: 8, soft: 6 }) + glowDot(L, H.cx - H.rx * 1.08 - 10, H.cy + H.ry * 0.2 - 44, 10, '#FFE36A') + `<circle cx="${f1(H.cx - H.rx * 1.08 - 10)}" cy="${f1(H.cy + H.ry * 0.2 - 3)}" r="5" fill="#FFFFFF"/>`);
  if (s.ring && view !== 'bodyBack') out.push(`<path d="M ${f1(H.cx - H.rx * 1.5)} ${f1(H.cy + 20)} A ${f1(H.rx * 1.5)} ${f1(H.ry * 0.36)} 0 0 0 ${f1(H.cx + H.rx * 1.5)} ${f1(H.cy + 20)}" stroke="${s.colors.ring ?? '#FFB8E0'}" stroke-width="22" fill="none" opacity="0.95"/><path d="M ${f1(H.cx - H.rx * 1.5)} ${f1(H.cy + 20)} A ${f1(H.rx * 1.5)} ${f1(H.ry * 0.36)} 0 0 0 ${f1(H.cx + H.rx * 1.5)} ${f1(H.cy + 20)}" stroke="${s.colors.ring ?? '#FFB8E0'}" stroke-width="34" fill="none" opacity="0.45" filter="${L.blur(11)}"/>`);
  if (s.petalRing) out.push(Array.from({ length: 6 }, (_, i) => paint(L, spindle(polar(H.cx, H.cy, H.rx, H.ry, i * 60 - 90, 0.8), i * 60 - 90, 110, 90, { profile: (u) => Math.sin(Math.PI * Math.pow(u, 0.6)) }), T.petal, { shift: 14, soft: 10, glow: s.colors.petal, glowOpacity: 0.3 })).join(''));
  return out.join('');
};

// ——— sitter rig: most animals, drakes, birds ———
const sitterGeometry = (s) => {
  const hs = s.headScale ?? 1;
  const H = { cx: 300, cy: 236 + (s.headY ?? 0), rx: 150 * hs * (s.headWide ?? 1), ry: 132 * hs };
  const B = { cx: 300, cy: 440 + (s.bodyY ?? 0), rx: 104 * (s.bodyWide ?? 1), ry: 110 * (s.bodyTall ?? 1) };
  return { H, B };
};
const furTufts = (s, arcs) => (s.furry === false ? [] : arcs.map(([from, to, count, len]) => ({ from, to, count, len: len * (s.fluff ?? 1) })));

const spiderLegs = (L, s, T, B, view) => [-1, 1].map((dir) => Array.from({ length: 4 }, (_, i) => {
  const root = [300 + dir * B.rx * 0.6, B.cy - 30 + i * 26];
  const knee = [300 + dir * (B.rx + 90 - i * 6), B.cy - 110 + i * 56];
  const foot = [300 + dir * (B.rx + 120 - i * 10), 560 - (3 - i) * 8];
  return paint(L, tube([root, lerp(root, knee, 0.5), knee, lerp(knee, foot, 0.5), foot], [26, 22, 20, 14, 8]), T.leg, { shift: 8, soft: 6, line: 2.2 });
}).join('')).join('');

const sitterBody = (L, s, T, view) => {
  const { B } = sitterGeometry(s);
  const out = [];
  if (view === 'front') out.push(tail(L, s, T, view));
  // The spider's glowing abdomen rises behind it from the front, and faces us from behind.
  const abdomen = s.abdomen ? paint(L, blob(300, B.cy - 80, B.rx * 1.45, B.ry * 1.12, { seed: s.seed + 90 }), T.shell, {
    shift: 34, soft: 20, glow: s.colors.orb, glowOpacity: 0.5, glowSize: 36,
    inner: view === 'back'
      ? glowDot(L, 300, B.cy - 80, 50, s.colors.orb) + Array.from({ length: 8 }, (_, i) => `<path d="M 300 ${B.cy - 80} L ${f1(300 + Math.cos(i * 0.785) * 180)} ${f1(B.cy - 80 + Math.sin(i * 0.785) * 140)}" stroke="${lighten(s.colors.orb, 0.6)}" stroke-width="2.5" opacity="0.45"/>`).join('') + [60, 110].map((r) => `<ellipse cx="300" cy="${B.cy - 80}" rx="${r}" ry="${r * 0.8}" fill="none" stroke="${lighten(s.colors.orb, 0.6)}" stroke-width="2.5" opacity="0.4"/>`).join('')
      : glowDot(L, 300, B.cy - 80 - B.ry * 0.78, 22, s.colors.orb),
  }) : '';
  if (view === 'front') out.push(abdomen);
  if (s.shell && view === 'front') out.push(paint(L, blob(300, B.cy - 16, B.rx * 1.3, B.ry * 1.12, { seed: s.seed + 70, flatBottom: 0.2 }), T.shell, { shift: 36, soft: 20, glow: s.shellGlow ? s.colors.accent : null, glowOpacity: 0.3 }));
  if (s.legs === 'spider') out.push(spiderLegs(L, s, T, B, view));
  if (s.quills) {
    const quills = Array.from({ length: 15 }, (_, i) => spindle(polar(B.cx, B.cy, B.rx, B.ry, 170 + i * 14, 0.72), 170 + i * 14, 100, 36, { profile: (u) => Math.pow(1 - u, 0.9) }));
    out.push(quills.map((d, i) => paint(L, d, i % 3 === 0 ? T.quillTip : T.quill, { shift: 8, soft: 6, line: 2.2, glow: s.quillGlow ? s.colors.quillTip ?? s.colors.quill : null, glowOpacity: 0.5, glowSize: 11 })).join(''));
  }
  if (s.robe) {
    const hem = Array.from({ length: 7 }, (_, i) => [180 + i * 40, 556 + (i % 2) * 12]);
    const robe = catmull([[300 - 70, 330], [300 + 70, 330], [300 + 118, 470], ...hem.reverse(), [300 - 118, 470]]);
    out.push(paint(L, robe, T.robe, { shift: 34, soft: 20, inner: `<ellipse cx="300" cy="330" rx="120" ry="40" fill="${T.robe.shade}" opacity="0.6" filter="${L.blur(16)}"/>` + (s.pattern === 'stars' ? Array.from({ length: 8 }, (_, i) => sparkle(210 + (i * 37) % 180, 400 + (i * 53) % 150, 7 + (i % 3) * 3, s.colors.accent)).join('') : '') }));
    if (view === 'front') [-1, 1].forEach((dir) => out.push(paint(L, spindle([300 + dir * 62, 360], 90 + dir * -40, 130, 56, { profile: (u) => 0.7 + 0.3 * u }), T.robe, { shift: 14, soft: 10 }), paint(L, blob(300 + dir * 104, 470, 22, 20, { seed: dir + 8 }), T.fur, { shift: 6, soft: 5 })));
    out.push(held(L, s, B));
    if (view === 'back') out.push(tail(L, s, T, view));
    return out.join('');
  }
  const noLegs = s.legs === 'none' || s.legs === 'talons' || s.legs === 'spider';
  const haunch = (dir) => blob(B.cx + dir * B.rx * 0.9, B.cy + B.ry * 0.62, B.rx * 0.5, B.ry * 0.42, { seed: s.seed + 20 + dir, tufts: furTufts(s, [[dir > 0 ? 300 : 150, dir > 0 ? 30 : 250, 3, 0.07]]) });
  if (!noLegs) out.push(paint(L, haunch(-1), T.fur, { shift: 18, soft: 12 }), paint(L, haunch(1), T.fur, { shift: 18, soft: 12 }));
  const body = blob(B.cx, B.cy, B.rx, B.ry, { seed: s.seed + 30, narrowTop: s.narrowTop ?? 0.22, flatBottom: 0.06, tufts: furTufts(s, [[150, 210, 3, 0.05], [330, 30, 3, 0.05]]) });
  let inner = `<ellipse cx="300" cy="${f1(B.cy - B.ry * 0.95)}" rx="${f1(B.rx * 1.1)}" ry="${f1(B.ry * 0.5)}" fill="${T.fur.shade}" opacity="0.6" filter="${L.blur(16)}"/>`;
  inner += strands(L, B.cx, B.cy, B.rx * 0.9, B.ry * 0.9, T.fur, s.furry === false ? 0 : 34, s.seed + 31);
  if (view === 'back') inner += `<path d="M 300 ${f1(B.cy - B.ry)} Q 314 ${f1(B.cy)} 300 ${f1(B.cy + B.ry)}" stroke="${s.colors.saddle ?? T.fur.shade}" stroke-width="${f1(B.rx * (s.colors.saddle ? 0.9 : 0.5))}" fill="none" opacity="${s.colors.saddle ? 0.7 : 0.28}" filter="${L.blur(11)}"/>`;
  if (s.pattern === 'stripes') inner += [-0.35, 0, 0.35].map((dy) => `<path d="M ${f1(B.cx - B.rx)} ${f1(B.cy + dy * B.ry)} q ${f1(B.rx * 0.5)} -18 ${f1(B.rx * 0.8)} 4 M ${f1(B.cx + B.rx)} ${f1(B.cy + dy * B.ry)} q ${f1(-B.rx * 0.5)} -18 ${f1(-B.rx * 0.8)} 4" stroke="${s.colors.stripe ?? T.fur.line}" stroke-width="12" fill="none" opacity="0.45" stroke-linecap="round"/>`).join('');
  if (s.pattern === 'spots' || s.pattern === 'stars' || s.pattern === 'glowspots') {
    inner += Array.from({ length: 8 }, (_, i) => {
      const p = polar(B.cx, B.cy, B.rx, B.ry, 190 + i * 38 + (s.seed % 30), 0.55 + (i % 3) * 0.13);
      if (s.pattern === 'stars') return sparkle(p[0], p[1], 9 + (i % 3) * 3, s.colors.accent, 0.95) + `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="14" fill="${s.colors.accent}" opacity="0.35" filter="${L.blur(7)}"/>`;
      if (s.pattern === 'glowspots') return glowDot(L, p[0], p[1], 7 + (i % 2) * 3, s.colors.accent);
      return `<ellipse cx="${f1(p[0])}" cy="${f1(p[1])}" rx="${10 + (i % 3) * 3}" ry="${7 + (i % 2) * 3}" fill="${s.colors.spot ?? s.colors.accent}" opacity="0.75"/>`;
    }).join('');
  }
  if (s.pattern === 'runes') inner += `<g stroke="${s.colors.accent}" stroke-width="5" fill="none" stroke-linecap="round"><path d="M 262 ${B.cy - 40} l 18 26 l -18 26 M 338 ${B.cy - 40} l -18 26 l 18 26 M 300 ${B.cy + 30} l 0 40"/></g><g opacity="0.7" filter="${L.blur(7)}" stroke="${s.colors.accent}" stroke-width="12" fill="none"><path d="M 262 ${B.cy - 40} l 18 26 l -18 26 M 338 ${B.cy - 40} l -18 26 l 18 26 M 300 ${B.cy + 30} l 0 40"/></g>`;
  if (s.patches) inner += s.patches.map(([x, y, rx, ry, color], i) => `<path d="${blob(x, y + 200, rx, ry, { seed: s.seed + i * 11, wobble: 0.14 })}" fill="${color}" opacity="0.7" filter="${L.blur(4)}"/>`).join('');
  out.push(paint(L, body, T.fur, { shift: 30, soft: 18, inner, glow: s.bodyGlow ? s.colors.rim : null, glowOpacity: 0.3 }));
  if (view === 'front' && s.belly !== false) {
    const belly = blob(B.cx, B.cy + B.ry * 0.12, B.rx * 0.6, B.ry * 0.72, { seed: s.seed + 31, narrowTop: 0.3, tufts: s.ruff ? furTufts(s, [[200, 340, 6, 0.12]]) : [] });
    let bellyInner = strands(L, B.cx, B.cy + 20, B.rx * 0.5, B.ry * 0.6, T.belly, s.furry === false ? 0 : 14, s.seed + 32, 12);
    if (s.plates) bellyInner = Array.from({ length: 5 }, (_, i) => `<path d="M ${f1(B.cx - B.rx * 0.7)} ${f1(B.cy - B.ry * 0.3 + i * 34)} Q 300 ${f1(B.cy - B.ry * 0.3 + i * 34 + 16)} ${f1(B.cx + B.rx * 0.7)} ${f1(B.cy - B.ry * 0.3 + i * 34)}" stroke="${T.belly.line}" stroke-width="3" fill="none" opacity="0.4"/>`).join('');
    if (s.feathers) bellyInner = Array.from({ length: 9 }, (_, i) => { const x = 250 + (i % 3) * 50; const y = B.cy - 20 + Math.floor(i / 3) * 42; return `<path d="M ${x - 14} ${y} q 14 16 28 0" stroke="${T.belly.line}" stroke-width="3" fill="none" opacity="0.35"/>`; }).join('');
    out.push(paint(L, belly, T.belly, { shift: 18, soft: 14, line: s.ruff ? 2.5 : 0, lineOpacity: 0.35, inner: bellyInner }));
  }
  if (view === 'front' && s.chestGem) out.push(glowDot(L, 300, B.cy - 12, 16, s.colors.gem ?? s.colors.accent));
  if (s.legs === 'talons') {
    [-1, 1].forEach((dir) => out.push([-18, 0, 18].map((dx) => paint(L, spindle([300 + dir * 44 + dx, 540], 90 + dx * 1.4, 32, 16, { profile: (u) => Math.pow(1 - u, 0.6) }), T.beak, { shift: 5, soft: 4, line: 2 })).join('')));
  } else if (!noLegs) {
    [-1, 1].forEach((dir) => {
      const x = 300 + dir * B.rx * 0.46;
      const legTone = s.socks ? T.belly : s.legTone === 'leg' ? T.leg : T.fur;
      if (view === 'front') {
        out.push(paint(L, tube([[x, B.cy + B.ry * 0.1], [x + dir * 2, B.cy + B.ry * 0.6], [x, 548]], [48, 43, 45]), legTone, { shift: 12, soft: 9 }));
        out.push(paint(L, blob(x, 550, 33, 17, { seed: s.seed + dir, flatBottom: 0.3 }), s.hooves ? T.hoof : legTone, { shift: 8, soft: 6 }));
        if (!s.hooves) out.push(`<path d="M ${x - 9} 546 l 0 9 M ${x + 9} 546 l 0 9" stroke="${T.fur.line}" stroke-width="3" stroke-linecap="round" opacity="0.6"/>`);
        if (s.claws) out.push([-13, 0, 13].map((dx) => paint(L, spindle([x + dx, 556], 90, 22, 12, { profile: (u) => 1 - u }), T.claw, { shift: 4, soft: 3, line: 1.6, glow: s.clawGlow ? s.colors.claw : null, glowOpacity: 0.6, glowSize: 7 })).join(''));
      } else {
        out.push(paint(L, blob(x + dir * 16, 548, 35, 19, { seed: s.seed + dir + 9, flatBottom: 0.25 }), s.hooves ? T.hoof : legTone, { shift: 8, soft: 6 }));
      }
    });
  }
  if (s.mane) {
    const mane = blob(300, B.cy - B.ry * 0.78, B.rx * 1.2, B.ry * 0.5, { seed: s.seed + 50, tufts: [{ from: 0, to: 359, count: 12, len: 0.12, sharp: 1.3 }] });
    out.push(paint(L, mane, T.mane, { shift: 20, soft: 14, glow: s.maneGlow ? s.colors.mane : null, glowOpacity: 0.55, inner: s.maneStars ? Array.from({ length: 6 }, (_, i) => sparkle(220 + i * 32, B.cy - B.ry * 0.8 + (i % 2) * 20, 8, '#FFFFFF')).join('') : '' }));
  }
  if (view === 'front') out.push(held(L, s, B));
  if (view === 'back') {
    out.push(abdomen);
    if (s.shell) out.push(shellBack(L, s, T, B));
    if (s.spine) {
      const t = s.spine === 'crystals' ? T.crystal : s.spine === 'leaves' ? T.leaf : s.spine === 'flames' ? T.flame : T.accent;
      out.push(Array.from({ length: 5 }, (_, i) => paint(L, spindle([300, B.cy - B.ry * 0.62 + i * 40], -90, 40 - i * 3, 42 - i * 3, { profile: (u) => Math.pow(1 - u, 0.8) }), t, { shift: 6, soft: 5, line: 2, glow: s.spine === 'crystals' || s.spine === 'flames' ? s.colors.crystal ?? s.colors.flame : null, glowOpacity: 0.5, glowSize: 11 })).join(''));
    }
    if (s.carry) out.push(paint(L, blob(300, B.cy - B.ry * 0.25, 56, 50, { seed: 12 }), T.carry, { shift: 14, soft: 10, glow: s.colors.carry, glowOpacity: 0.6, glowSize: 24 }));
    if (s.wings && !['none', 'fin', 'claw', 'ray'].includes(s.wings)) [-1, 1].forEach((dir) => out.push(paint(L, blob(300 + dir * 64, WING[1] + 4, 34, 24, { seed: s.seed + dir + 60 }), T.fur, { shift: 8, soft: 7, lineOpacity: 0.4 })));
    if (s.robe === undefined && s.held === 'satchel') out.push(`<path d="M 370 ${f1(B.cy - B.ry * 0.7)} L 220 ${f1(B.cy + B.ry * 0.3)}" stroke="#7A4A2A" stroke-width="14" stroke-linecap="round"/>`);
    out.push(tail(L, s, T, view));
  }
  return out.join('');
};

const shellBack = (L, s, T, B) => {
  const dome = blob(300, B.cy - 14, B.rx * 1.22, B.ry * 1.08, { seed: s.seed + 70, flatBottom: 0.2 });
  const plates = [[300, B.cy - 50, 46, 40], [236, B.cy + 6, 40, 36], [364, B.cy + 6, 40, 36], [300, B.cy + 46, 42, 32]].map(([x, y, rx, ry]) => `<path d="${blob(x, y, rx, ry, { seed: x + y, wobble: 0.06 })}" fill="none" stroke="${T.shell.line}" stroke-width="6" opacity="0.5"/>`).join('');
  const runes = s.shellGlow ? [[300, B.cy - 50], [236, B.cy + 6], [364, B.cy + 6], [300, B.cy + 46]].map(([x, y]) => glowDot(L, x, y, 8, s.colors.accent)).join('') : '';
  const coral = s.shellCoral ? Array.from({ length: 5 }, (_, i) => paint(L, spindle([220 + i * 40, B.cy - 70 + (i % 2) * 20], -90 + (i - 2) * 14, 60, 22, { profile: (u) => Math.pow(1 - u, 0.6) + 0.1 }), T.accent, { shift: 5, soft: 4, line: 1.8 })).join('') : '';
  return paint(L, dome, T.shell, { shift: 40, soft: 22, inner: plates + runes, glow: s.shellGlow ? s.colors.accent : null, glowOpacity: 0.35 }) + coral + gloss(L, 250, B.cy - 80, 42, 18, 0.35);
};

const sitterHead = (L, s, T, view) => {
  const { H } = sitterGeometry(s);
  const out = [];
  if (s.maneHead) {
    const flame = s.maneTone === 'flame';
    const mane = blob(H.cx, H.cy + 12, H.rx * (flame ? 1.36 : 1.26), H.ry * (flame ? 1.32 : 1.24), { seed: s.seed + 51, tufts: [flame ? { from: 0, to: 359, count: 16, len: 0.24, sharp: 2.4 } : { from: 0, to: 359, count: 13, len: 0.12, sharp: 1.3 }] });
    out.push(paint(L, mane, T.mane, { shift: 22, soft: 16, glow: s.maneGlow ? s.colors.mane : null, glowOpacity: 0.6, glowSize: 24, line: flame ? 0 : undefined, inner: flame ? '' : strands(L, H.cx, H.cy, H.rx * 1.2, H.ry * 1.15, T.mane, 60, s.seed + 52, 22) }));
  }
  const hooded = s.hat === 'hood' || s.hat === 'veil' || s.hat === 'frog';
  if (hooded && view === 'front') out.push(hat(L, H, s, T, 'behind'));
  if (s.halo) out.push(halo(L, H, s));
  out.push(extras(L, H, s, T, view));
  if (s.quills && view === 'front') out.push(quillCrown(L, H, s, T, 'front'));
  if (view === 'front') out.push(ears(L, H, s, T, view), horns(L, H, s, T));
  if (s.crest) out.push(crest(L, H, s, T));
  const head = blob(H.cx, H.cy, H.rx, H.ry, { seed: s.seed + 1, flatBottom: 0.05, narrowBottom: s.jaw ?? 0.08, tufts: furTufts(s, view === 'front' ? [[145, 195, 3, 0.07], [345, 35, 3, 0.07]] : [[40, 140, 7, 0.08]]) });
  // Fur takes a soft sheen, scales and smooth skin keep the glossy highlight.
  let inner = gloss(L, H.cx - H.rx * 0.36, H.cy - H.ry * 0.48, H.rx * 0.34, H.ry * 0.16, s.furry === false ? (view === 'front' ? 0.3 : 0.22) : 0.12);
  inner += strands(L, H.cx, H.cy - H.ry * 0.2, H.rx * 0.85, H.ry * 0.6, T.fur, s.furry === false ? 0 : 26, s.seed + 2, 14);
  if (s.mask && view === 'front') inner += `<path d="${blob(H.cx, H.cy + H.ry * 0.04, H.rx * 0.8, H.ry * 0.26, { seed: s.seed + 9, wobble: 0.05 })}" fill="${s.colors.mask}" opacity="0.88" filter="${L.blur(2)}"/>`;
  if (s.headStripe) inner += `<path d="${blob(H.cx, H.cy - H.ry * 0.38, H.rx * 0.15, H.ry * 0.7, { seed: s.seed + 8, wobble: 0.04 })}" fill="${s.colors.stripe ?? '#FFFFFF'}" opacity="0.92"/>`;
  if (s.pattern === 'stars' || s.headStars) inner += Array.from({ length: 5 }, (_, i) => sparkle(H.cx + (i - 2) * 46, H.cy - H.ry * (0.55 + (i % 2) * 0.12), 7 + (i % 2) * 3, s.colors.accent, 0.9)).join('');
  if (s.patches) inner += s.patches.filter(([, y]) => y < 330).map(([x, y, rx, ry, color], i) => `<path d="${blob(x, y, rx, ry, { seed: s.seed + i * 13, wobble: 0.14 })}" fill="${color}" opacity="0.7" filter="${L.blur(4)}"/>`).join('');
  if (view === 'back') inner += `<ellipse cx="${H.cx}" cy="${f1(H.cy + H.ry * 0.9)}" rx="${f1(H.rx * 0.9)}" ry="${f1(H.ry * 0.4)}" fill="${T.fur.shade}" opacity="0.5" filter="${L.blur(16)}"/>` + (s.colors.saddle ? `<ellipse cx="${H.cx}" cy="${f1(H.cy - H.ry * 0.2)}" rx="${f1(H.rx * 0.5)}" ry="${f1(H.ry * 0.7)}" fill="${s.colors.saddle}" opacity="0.5" filter="${L.blur(16)}"/>` : '');
  out.push(paint(L, head, T.fur, { shift: 34, soft: 20, inner, glow: s.aura ? s.colors.rim : null, glowOpacity: 0.3, glowSize: 36 }));
  if (view === 'front') {
    if (s.cap) out.push(capFront(L, H, s, T));
    out.push(faceFor(L, H, s, T));
    if (s.hat) out.push(hat(L, H, s, T, 'front'));
    if (s.flower) out.push(flower(L, H.cx + H.rx * 0.52, H.cy - H.ry * 0.74, s));
  } else {
    out.push(ears(L, H, s, T, view), horns(L, H, s, T));
    if (s.cap) out.push(capFront(L, H, s, T));
    // Seen from behind, a hood covers the whole head.
    if (hooded) out.push(hat(L, H, s, T, 'behind'));
    if (s.hat) out.push(hat(L, H, s, T, hooded ? 'backTop' : 'front'));
    if (s.quills) out.push(quillCrown(L, H, s, T, 'back'));
    if (s.flower) out.push(flower(L, H.cx - H.rx * 0.52, H.cy - H.ry * 0.74, s));
  }
  if (s.crown) out.push(crown(L, H, s));
  return out.join('');
};

// Hedgehog quills: a crown framing the head from the front, a full mound covering it from behind.
const quillCrown = (L, H, s, T, view) => {
  const out = [];
  const rows = view === 'back' ? [[0.55, 12, 96, 44], [0.2, 10, 80, 40]] : [[0.72, 13, 104, 44]];
  rows.forEach(([depth, count, length, width], row) => {
    for (let i = 0; i < count; i += 1) {
      const angle = 188 + (i * 164) / (count - 1) + row * 7;
      const base = polar(H.cx, H.cy + (view === 'back' ? 18 : 0), H.rx, H.ry, angle, depth);
      out.push(paint(L, spindle(base, angle, length * (0.8 + ((i * 7) % 5) * 0.06), width, { profile: (u) => Math.pow(1 - u, 0.85) }), (i + row) % 3 === 0 ? T.quillTip : T.quill, { shift: 8, soft: 6, line: 2.2, glow: s.quillGlow ? s.colors.quillTip ?? s.colors.quill : null, glowOpacity: 0.45, glowSize: 11 }));
    }
  });
  return out.join('');
};

// Long flowing hair: locks hanging behind the head, a fringe over the brow.
const longHair = (L, H, s, T, part) => {
  if (part === 'behind') {
    return [-1, 1].map((dir) => [2, 1, 0].map((i) => paint(L, spindle(polar(H.cx, H.cy, H.rx, H.ry, 270 + dir * (40 + i * 32), 0.82), 90 - dir * (26 - i * 8), H.ry * (1.45 - i * 0.22), 92, { profile: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.38)), 0.8), bend: dir * 0.22 }), T.mane, { shift: 18, soft: 12, glow: s.maneGlow ? s.colors.mane : null, glowOpacity: 0.4, inner: strands(L, H.cx + dir * H.rx, H.cy + H.ry * 0.5, 80, 140, T.mane, 18, s.seed + i, 26) })).join('')).join('');
  }
  const fringe = blob(H.cx, H.cy - H.ry * (part === 'back' ? 0.2 : 0.58), H.rx * 1.04, H.ry * (part === 'back' ? 0.95 : 0.52), { seed: s.seed + 61, tufts: [{ from: 25, to: 155, count: 6, len: 0.14, sharp: 1.5 }] });
  return paint(L, fringe, T.mane, { shift: 20, soft: 14, inner: strands(L, H.cx, H.cy - H.ry * 0.5, H.rx, H.ry * 0.5, T.mane, 30, s.seed + 62, 22) + gloss(L, H.cx - H.rx * 0.3, H.cy - H.ry * 0.8, H.rx * 0.3, 10, 0.35) });
};

const crest = (L, H, s, T) => {
  const kind = s.crest;
  const count = kind === 'plume' ? 3 : 5;
  return Array.from({ length: count }, (_, i) => {
    const offset = i - (count - 1) / 2;
    const base = polar(H.cx, H.cy, H.rx, H.ry, 270 + offset * 12, 0.84);
    const length = (kind === 'plume' ? 126 : kind === 'flame' ? 120 : 88) * (1 - Math.abs(offset) * 0.14) * (s.crestSize ?? 1);
    const profile = kind === 'plume' ? (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.5)), 0.7) : kind === 'flame' || kind === 'leaf' ? (u) => Math.sin(Math.PI * Math.pow(u, 0.6)) : (u) => Math.pow(1 - u, 0.8);
    const d = spindle(base, 270 + offset * 16 + (kind === 'plume' ? 10 : 0), length, kind === 'plume' ? 44 : 48, { profile, bend: kind === 'plume' ? 0.18 : kind === 'flame' ? -0.12 : 0 });
    const t = kind === 'crystal' ? T.crystal : kind === 'flame' ? T.flame : kind === 'leaf' ? T.leaf : T.crest;
    const glow = s.crestGlow || kind === 'flame' ? (kind === 'flame' ? s.colors.flame : s.colors.crystal ?? s.colors.accent) : null;
    return paint(L, d, t, { shift: 10, soft: 7, line: kind === 'flame' ? 0 : 2.2, glow, glowOpacity: 0.6, glowSize: 16 });
  }).join('');
};

const capFront = (L, H, s, T) => {
  const top = H.cy - H.ry * 0.25;
  const d = `M ${f1(H.cx - H.rx * 1.32)} ${f1(top + 42)} C ${f1(H.cx - H.rx * 1.28)} ${f1(top - H.ry * 1.25)}, ${f1(H.cx + H.rx * 1.28)} ${f1(top - H.ry * 1.25)}, ${f1(H.cx + H.rx * 1.32)} ${f1(top + 42)} Q ${f1(H.cx)} ${f1(top + 8)} ${f1(H.cx - H.rx * 1.32)} ${f1(top + 42)} Z`;
  const spots = Array.from({ length: 6 }, (_, i) => {
    const x = H.cx - H.rx * 0.9 + i * H.rx * 0.36; const y = top - H.ry * (0.35 + ((i * 7) % 3) * 0.14);
    if (s.capSpots === 'glow') return glowDot(L, x, y, 9 + (i % 2) * 4, s.colors.accent, 0.95);
    if (s.capSpots === 'dew') return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${9 + (i % 2) * 4}" fill="#E8FAFF" opacity="0.85"/><circle cx="${f1(x - 3)}" cy="${f1(y - 3)}" r="3" fill="#FFFFFF"/>`;
    if (s.capSpots === 'crystal') return `<path d="M ${f1(x)} ${f1(y - 16)} L ${f1(x + 10)} ${f1(y)} L ${f1(x)} ${f1(y + 12)} L ${f1(x - 10)} ${f1(y)} Z" fill="${s.colors.accent}" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.7"/>`;
    return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${14 + (i % 2) * 6}" ry="${10 + (i % 2) * 4}" fill="${lighten(s.colors.cap, 0.72)}" opacity="0.85"/>`;
  }).join('');
  const gills = `<path d="M ${f1(H.cx - H.rx * 1.2)} ${f1(top + 36)} Q ${f1(H.cx)} ${f1(top + 4)} ${f1(H.cx + H.rx * 1.2)} ${f1(top + 36)}" stroke="${T.cap.shade}" stroke-width="10" fill="none" opacity="0.4"/>`;
  return paint(L, d, T.cap, { shift: 34, soft: 18, inner: spots + gills, glow: s.capGlow ? s.colors.cap : null, glowOpacity: 0.5, glowSize: 24 }) + gloss(L, H.cx - H.rx * 0.5, top - H.ry * 0.72, 46, 17, 0.4);
};

// ——— floater rig: fish, whales, rays, sprites, wisps, octopus, crab ———
const floaterGeometry = (s) => ({ H: { cx: 300, cy: 292 + (s.headY ?? 0), rx: 168 * (s.headScale ?? 1) * (s.headWide ?? 1), ry: 150 * (s.headScale ?? 1) * (s.headTall ?? 1) } });

const floaterBody = (L, s, T, view) => {
  const { H } = floaterGeometry(s);
  const out = [];
  const side = view === 'back' ? -1 : 1;
  if (s.trail) {
    const c = bezier([300, H.cy + H.ry * 0.5], [260, H.cy + H.ry * 1.05], [360, H.cy + H.ry * 1.25], [300 + side * 70, 578], 14);
    out.push(paint(L, tube(c, c.map((_, i) => 150 * (1 - i / 13) + 6)), T.trail, { line: 0, shift: 10, soft: 12, opacity: 0.88, glow: s.colors.trail, glowOpacity: 0.65, glowSize: 24 }));
  }
  if (s.fishTail) {
    const k = s.tailSize ?? 1;
    const base = [300, H.cy + H.ry * 0.78];
    [-1, 1].forEach((dir) => {
      const tip = polar(base[0], base[1], 1, 1, 90 + dir * 34, 190 * k);
      const rays = [0.3, 0.55, 0.8].map((f) => `<path d="M ${f1(base[0])} ${f1(base[1])} Q ${f1(lerp(base, tip, 0.5)[0] - dir * 20)} ${f1(lerp(base, tip, 0.5)[1])} ${f1(lerp(base, tip, f + 0.15)[0] + dir * (f - 0.55) * 90)} ${f1(lerp(base, tip, f + 0.15)[1])}" stroke="${lighten(s.colors.fin ?? s.colors.fur, 0.6)}" stroke-width="3" fill="none" opacity="0.45"/>`).join('');
      out.push(paint(L, spindle(base, 90 + dir * 34, 200 * k, 140 * k, { profile: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.42)), 0.8), bend: dir * -0.16 }), T.fin, { shift: 20, soft: 14, opacity: 0.93, glow: s.finGlow ? s.colors.fin : null, glowOpacity: 0.5, inner: rays }));
    });
  }
  if (s.flukes) {
    const k = s.tailSize ?? 1;
    const tip = [300 + side * 170 * k, H.cy + H.ry * 0.35];
    const c = bezier([300, H.cy + H.ry * 0.62], [300 + side * 90, H.cy + H.ry * 0.98], [tip[0] - side * 20, tip[1] + 60], tip, 12);
    out.push(paint(L, tube(c, c.map((_, i) => (120 - i * 8) * k)), T.fur, { shift: 20, soft: 14 }));
    [-1, 1].forEach((dir) => out.push(paint(L, spindle(tip, -90 + dir * 46 + side * 20, 120 * k, 76 * k, { profile: (u) => Math.sin(Math.PI * Math.pow(u, 0.5)) }), T.fin, { shift: 14, soft: 10, glow: s.finGlow ? s.colors.fin : null, glowOpacity: 0.55, glowSize: 24 })));
    if (s.tailWorlds) [[0.45, 16, s.colors.accent], [0.72, 12, '#9AE8FF'], [0.95, 10, '#FFE27A']].forEach(([t, r, color]) => { const p = c[Math.round(t * (c.length - 1))]; out.push(glowDot(L, p[0], p[1], r, color)); });
  }
  if (s.rayTail) {
    const c = bezier([300, H.cy + H.ry * 0.5], [310, H.cy + H.ry * 1.1], [300 + side * 60, H.cy + H.ry * 1.4], [300 + side * 20, 590], 12);
    out.push(paint(L, tube(c, c.map((_, i) => 26 * (1 - i / 11) + 4)), T.fur, { shift: 6, soft: 5 }));
  }
  if (s.arms) [-1, 1].forEach((dir) => out.push(paint(L, spindle([300 + dir * H.rx * 0.62, H.cy + H.ry * 0.42], 90 + dir * -58, 92, 52, { profile: (u) => Math.sin(Math.PI * Math.pow(u, 0.6)) * 0.9 + 0.1 }), T.fur, { shift: 12, soft: 9 })));
  if (s.tentacles) {
    Array.from({ length: 6 }, (_, i) => {
      const x = 300 + (i - 2.5) * 52; const dir = x < 300 ? -1 : 1;
      const c = bezier([x, H.cy + H.ry * 0.5], [x + dir * 30, H.cy + H.ry * 1.08], [x + dir * 96, H.cy + H.ry * 1.14], [x + dir * (60 + (i % 2) * 44), H.cy + H.ry * 0.86], 14);
      out.push(paint(L, tube(c, c.map((_, j) => 54 * (1 - j / 13) + 6)), T.fur, { shift: 12, soft: 9, inner: view === 'front' ? c.filter((_, j) => j % 3 === 1 && j < 12).map(([px, py]) => `<circle cx="${f1(px)}" cy="${f1(py + 8)}" r="6" fill="${T.belly.base}" opacity="0.85"/>`).join('') : '' }));
    });
  }
  if (s.crabLegs) [-1, 1].forEach((dir) => [2, 1, 0].forEach((i) => {
    // Jointed walking legs: up and out to a knee, then down to a pointed foot.
    const root = [300 + dir * H.rx * 0.55, H.cy + H.ry * 0.35 + i * 22];
    const knee = [300 + dir * (H.rx * 1.08 + i * 22), H.cy + H.ry * 0.2 + i * 34];
    const foot = [300 + dir * (H.rx * 1.3 + i * 30), 574];
    out.push(paint(L, tube([root, lerp(root, knee, 0.5), knee, lerp(knee, foot, 0.55), foot], [34, 30, 26, 16, 4]), T.claw, { shift: 8, soft: 6, line: 2.2 }));
  }));
  if (s.ring) out.push(`<path d="M ${f1(H.cx - H.rx * 1.5)} ${f1(H.cy + 20)} A ${f1(H.rx * 1.5)} ${f1(H.ry * 0.36)} 0 0 1 ${f1(H.cx + H.rx * 1.5)} ${f1(H.cy + 20)}" stroke="${s.colors.ring ?? '#FFB8E0'}" stroke-width="22" fill="none" opacity="0.8"/>`);
  if (view === 'back' && s.shell) out.push('');
  return out.join('');
};

const floaterHead = (L, s, T, view) => {
  const { H } = floaterGeometry(s);
  const out = [];
  if (s.hat === 'hood' || s.hat === 'veil') out.push(hat(L, H, s, T, 'behind'));
  if (s.maneHead) out.push(paint(L, blob(H.cx, H.cy + 20, H.rx * 1.2, H.ry * 1.18, { seed: s.seed + 51, narrowBottom: 0.3, tufts: [{ from: 20, to: 160, count: 7, len: 0.18, sharp: 1.6 }] }), T.mane, { shift: 24, soft: 16, glow: s.maneGlow ? s.colors.mane : null, glowOpacity: 0.5 }));
  if (s.halo) out.push(halo(L, H, s));
  out.push(extras(L, H, s, T, view));
  if (s.dorsal) {
    const root = [300, H.cy - H.ry * 0.7];
    const rays = [-40, -10, 20].map((dx) => `<path d="M ${f1(root[0] + dx * 0.4)} ${f1(root[1] + 20)} q ${f1(dx * 0.5 + 20)} -70 ${f1(dx + 40)} -130" stroke="${lighten(s.colors.fin ?? s.colors.fur, 0.6)}" stroke-width="3" fill="none" opacity="0.45"/>`).join('');
    out.push(paint(L, spindle(root, -90 + (s.dorsalLean ?? 14), 150, 170, { profile: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.5)), 0.8), bend: 0.22 }), s.dorsal === 'crystal' ? T.glass : T.fin, { shift: 18, soft: 12, opacity: 0.95, glow: s.finGlow ? s.colors.fin : null, glowOpacity: 0.45, inner: rays }));
  }
  if (s.starPoints) Array.from({ length: s.starPoints }, (_, i) => out.push(paint(L, spindle([300, H.cy], -90 + i * (360 / s.starPoints), H.ry * 1.45, 114, { profile: (u) => (u < 0.55 ? 1 : Math.pow((1 - u) / 0.45, 1.2)) }), T.fur, { shift: 20, soft: 14, glow: s.colors.rim, glowOpacity: 0.4 })));
  if (s.flameTop) {
    // A living flame: two side tongues and a tall central one, each with a hot white-yellow core.
    const flameProfile = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.4)), 0.85);
    [[-1, 0.9], [1, 0.9], [0, 1.25]].forEach(([dir, scale]) => {
      const base = [300 + dir * H.rx * 0.42, H.cy - H.ry * 0.35];
      out.push(paint(L, spindle(base, -90 + dir * 24, H.ry * 1.25 * scale, H.rx * 0.95 * scale, { profile: flameProfile, bend: 0.14 - dir * 0.08 }), T.flame, { line: 0, shift: 14, soft: 14, glow: s.colors.flame, glowOpacity: 0.8, glowSize: 36 }));
      out.push(paint(L, spindle([base[0], base[1] + 30], -90 + dir * 24, H.ry * 0.9 * scale, H.rx * 0.5 * scale, { profile: flameProfile, bend: 0.16 - dir * 0.08 }), tone(lighten(s.colors.flame, 0.6)), { line: 0, shift: 6, soft: 6 }));
    });
  }
  if (s.hair === 'long') out.push(longHair(L, H, s, T, 'behind'));
  // Hermit shell: a big spiral shell rising behind the body; seen from behind it covers the creature.
  const spiralShell = () => {
    const sx = H.cx + (view === 'back' ? -1 : 1) * H.rx * 0.22; const sy = H.cy - H.ry * 0.72;
    const spiral = `<path d="M ${f1(sx)} ${f1(sy)} m -12 0 a 12 12 0 1 1 24 0 a 32 32 0 1 1 -64 0 a 56 56 0 1 1 112 0 a 84 84 0 1 1 -168 0" stroke="${T.shell.line}" stroke-width="9" fill="none" opacity="0.45"/>`;
    const stars = s.pattern === 'stars' ? Array.from({ length: 6 }, (_, i) => sparkle(sx - 100 + i * 40, sy - 40 + ((i * 37) % 80), 9 + (i % 2) * 3, s.colors.accent)).join('') : '';
    return paint(L, blob(sx, sy, H.rx * 1.02, H.ry * 0.95, { seed: s.seed + 95, narrowTop: 0.2 }), T.shell, { shift: 34, soft: 20, glow: s.shellGlow ? s.colors.accent : null, glowOpacity: 0.45, inner: spiral + stars }) + gloss(L, sx - 50, sy - 60, 40, 16, 0.4);
  };
  if (s.shellSpiral && view === 'front') out.push(spiralShell());
  if (view === 'front' || view === 'back') out.push(ears(L, H, s, T, view), horns(L, H, s, T));
  if (s.crest) out.push(crest(L, H, s, T));
  let inner = gloss(L, H.cx - H.rx * 0.36, H.cy - H.ry * 0.5, H.rx * 0.3, H.ry * 0.14, s.furry ? 0.12 : 0.32);
  inner += strands(L, H.cx, H.cy, H.rx * 0.85, H.ry * 0.8, T.fur, s.furry ? 40 : 0, s.seed + 2, 16);
  if (s.scales) inner += Array.from({ length: 20 }, (_, i) => { const x = 180 + (i % 5) * 60 + (Math.floor(i / 5) % 2) * 30; const y = H.cy - 40 + Math.floor(i / 5) * 40; return `<path d="M ${x - 26} ${y} q 26 26 52 0" stroke="${T.fur.line}" stroke-width="3" fill="none" opacity="${view === 'front' && y < H.cy + 30 ? 0 : 0.3}"/>`; }).join('');
  if (s.patches) inner += s.patches.map(([x, y, rx, ry, color], i) => `<path d="${blob(x, y, rx, ry, { seed: s.seed + i * 11, wobble: 0.14 })}" fill="${color}" opacity="0.82" filter="${L.blur(4)}"/>`).join('');
  if (s.pattern === 'stars') inner += Array.from({ length: 9 }, (_, i) => { const p = polar(H.cx, H.cy, H.rx, H.ry, (i * 47 + (s.seed % 40)) % 360, 0.5 + (i % 3) * 0.13); return sparkle(p[0], p[1], 8 + (i % 3) * 4, s.colors.accent, 0.9) + `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="14" fill="${s.colors.accent}" opacity="0.3" filter="${L.blur(7)}"/>`; }).join('');
  if (s.pattern === 'nebula') inner += [[220, H.cy - 40, 90, 60, s.colors.accent], [380, H.cy + 40, 80, 70, s.colors.accent2 ?? '#6AD8FF']].map(([x, y, rx, ry, c], i) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" opacity="0.45" filter="${L.blur(24)}"/>`).join('');
  if (view === 'front' && s.belly !== false) inner += `<path d="${blob(H.cx, H.cy + H.ry * 0.56, H.rx * 0.62, H.ry * 0.42, { seed: s.seed + 4 })}" fill="${T.belly.base}" opacity="0.75" filter="${L.blur(7)}"/>`;
  if (view === 'back') inner += `<ellipse cx="${H.cx}" cy="${f1(H.cy + H.ry * 0.85)}" rx="${f1(H.rx * 0.9)}" ry="${f1(H.ry * 0.4)}" fill="${T.fur.shade}" opacity="0.4" filter="${L.blur(16)}"/>` + (s.dorsal ? `<path d="M 300 ${f1(H.cy - H.ry * 0.9)} L 300 ${f1(H.cy + H.ry * 0.6)}" stroke="${T.fin.base}" stroke-width="26" opacity="0.5" filter="${L.blur(7)}"/>` : '');
  const shape = blob(H.cx, H.cy, H.rx, H.ry, { seed: s.seed + 1, narrowBottom: s.narrowBottom ?? 0.1, flatBottom: s.flatBottom ?? 0, narrowTop: s.narrowTopHead ?? 0, tufts: s.furry ? furTufts(s, [[0, 359, 22, 0.05]]) : [] });
  out.push(paint(L, shape, T.fur, { shift: 40, soft: 22, inner, glow: s.aura || s.glowBody ? s.colors.rim : null, glowOpacity: s.glowBody ? 0.6 : 0.3, glowSize: 36 }));
  if (s.shellSpiral && view === 'back') out.push(spiralShell());
  if (s.hair === 'long') out.push(longHair(L, H, s, T, view));
  if (s.whiskers && view === 'front') [-1, 1].forEach((dir) => out.push(`<path d="${catmull(bezier([300 + dir * 30, H.cy + H.ry * 0.5], [300 + dir * 110, H.cy + H.ry * 0.62], [300 + dir * 170, H.cy + H.ry * 0.3], [300 + dir * 214, H.cy + H.ry * 0.64], 10), false)}" stroke="${s.colors.accent}" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.9"/>`));
  if (view === 'front') out.push(faceFor(L, H, s, T));
  if (s.hat === 'witch' || s.hat === 'frog' || s.hat === 'hood' || s.hat === 'veil') out.push(hat(L, H, s, T, 'front'));
  if (s.crown) out.push(crown(L, H, s));
  return out.join('');
};

// ——— serpent rig: eels and wyrms (sitter head on a coiled body) ———
const serpentBody = (L, s, T, view) => {
  const side = view === 'back' ? -1 : 1;
  const coil = [[300 + side * 190, 470], [300 + side * 230, 540], [300 + side * 120, 588], [300 - side * 40, 584], [300 - side * 170, 548], [300 - side * 160, 470], [300 - side * 40, 450], [300 + side * 60, 420], [300 + side * 30, 370], [300, 330]];
  const widths = [26, 56, 90, 110, 118, 118, 112, 104, 96, 90];
  const centre = bezier(coil[0], coil[1], coil[2], coil[3], 8).concat(bezier(coil[3], coil[4], coil[5], coil[6], 8).slice(1), bezier(coil[6], coil[7], coil[8], coil[9], 8).slice(1));
  const w = centre.map((_, i) => { const t = i / (centre.length - 1); const idx = Math.min(widths.length - 2, Math.floor(t * (widths.length - 1))); const f = t * (widths.length - 1) - idx; return widths[idx] + (widths[idx + 1] - widths[idx]) * f; });
  const out = [];
  if (s.tailFlame) out.push(paint(L, spindle(centre[0], side > 0 ? -60 : -120, 110, 70, { profile: (u) => Math.sin(Math.PI * Math.pow(u, 0.6)) }), T.flame, { line: 0, glow: s.colors.flame, glowOpacity: 0.7 }));
  if (s.tailFin) out.push(paint(L, spindle(centre[0], side > 0 ? -50 : -130, 130, 110, { profile: (u) => Math.sin(Math.PI * Math.pow(u, 0.5)), bend: 0.2 }), T.fin, { shift: 14, soft: 10, opacity: 0.94, glow: s.finGlow ? s.colors.fin : null, glowOpacity: 0.45 }));
  let inner = '';
  if (view === 'front') inner += `<path d="${tube(centre.slice(4), w.slice(4).map((v) => v * 0.42))}" fill="${T.belly.base}" opacity="0.85" filter="${L.blur(4)}"/>` + centre.slice(5).filter((_, i) => i % 2 === 0).map(([x, y]) => `<path d="M ${f1(x - 24)} ${f1(y)} q 24 10 48 0" stroke="${T.belly.line}" stroke-width="3" fill="none" opacity="0.3"/>`).join('');
  if (s.pattern === 'stars') inner += centre.filter((_, i) => i % 3 === 1).map(([x, y], i) => sparkle(x + (i % 2 ? 20 : -20), y - 14, 9, s.colors.accent)).join('');
  if (s.pattern === 'crystals') inner += centre.filter((_, i) => i % 3 === 2).map(([x, y]) => `<path d="M ${f1(x)} ${f1(y - 26)} L ${f1(x + 14)} ${f1(y - 4)} L ${f1(x)} ${f1(y + 10)} L ${f1(x - 14)} ${f1(y - 4)} Z" fill="${s.colors.crystal}" opacity="0.85"/>`).join('');
  out.push(paint(L, tube(centre, w), T.fur, { shift: 30, soft: 18, inner, glow: s.aura ? s.colors.rim : null, glowOpacity: 0.3, glowSize: 36 }));
  if (view === 'back' || s.dorsalRidge) {
    const t = s.spine === 'crystals' ? T.crystal : T.fin;
    out.push(centre.filter((_, i) => i % 3 === 1 && i > 1).map(([x, y], i) => paint(L, spindle([x, y - 20], -90 + (i % 2 ? 12 : -12), 56, 50, { profile: (u) => Math.pow(1 - u, 0.7) }), t, { shift: 6, soft: 5, line: 2, opacity: 0.95, glow: s.finGlow ? s.colors.fin ?? s.colors.crystal : null, glowOpacity: 0.45, glowSize: 11 })).join(''));
  }
  return out.join('');
};

module.exports = { NECK, WING, sitterBody, sitterHead, floaterBody, floaterHead, serpentBody, wing, mirrorX };

// Painterly SVG toolkit: every shape is lit, shaded, rim-lit and textured so the creatures read as
// painted illustrations once Chrome rasterises them (filters are resolved offline, not in the app).
'use strict';

const TAU = Math.PI * 2;
const rad = (deg) => (deg * Math.PI) / 180;
const f1 = (value) => Math.round(value * 10) / 10;
const hashSeed = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
};
const rng = (seed) => {
  let state = (seed >>> 0) || 1;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
};

// ——— colour ———
const hexRgb = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
const rgbHex = (r, g, b) => `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => { const A = hexRgb(a); const B = hexRgb(b); return rgbHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
const lighten = (color, t) => mix(color, '#FFFFFF', t);
const darken = (color, t) => mix(color, '#000000', t);

// A tone is everything needed to paint one material: warm light, cool shadow, coloured rim, ink line.
const tone = (base, o = {}) => ({
  base,
  light: mix(lighten(base, o.light ?? 0.32), '#FFF3D6', 0.18),
  dark: mix(darken(base, o.dark ?? 0.32), o.cool ?? '#2B1A5A', 0.22),
  shade: mix(darken(base, 0.55), o.cool ?? '#1C1040', 0.38),
  highlight: mix(lighten(base, 0.6), '#FFFFFF', 0.25),
  line: mix(darken(base, 0.74), '#140A26', 0.45),
  rim: o.rim ?? null,
});

// ——— geometry ———
const catmull = (input, closed = true) => {
  const points = input.filter((point, index) => index === 0 || Math.hypot(point[0] - input[index - 1][0], point[1] - input[index - 1][1]) > 0.05);
  const n = points.length;
  if (n < 2) return '';
  const at = (index) => (closed ? points[(index + n) % n] : points[Math.max(0, Math.min(n - 1, index))]);
  let d = `M ${f1(points[0][0])} ${f1(points[0][1])}`;
  const segments = closed ? n : n - 1;
  for (let index = 0; index < segments; index += 1) {
    const p0 = at(index - 1); const p1 = at(index); const p2 = at(index + 1); const p3 = at(index + 2);
    d += ` C ${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return closed ? `${d} Z` : d;
};

// Organic ellipse. Angles in degrees on screen: 0 right, 90 bottom, 180 left, 270 top.
// tufts: [{ from, to, count, len, sharp }] push fur spikes out of the silhouette in that arc.
const blob = (cx, cy, rx, ry, o = {}) => {
  const n = o.n ?? 120;
  const random = rng(o.seed ?? 7);
  const phases = [random() * TAU, random() * TAU, random() * TAU];
  const wobble = o.wobble ?? 0.016;
  const points = [];
  for (let k = 0; k < n; k += 1) {
    const deg = (k / n) * 360;
    const a = rad(deg);
    let r = 1 + wobble * (Math.sin(a * 3 + phases[0]) * 0.6 + Math.sin(a * 5 + phases[1]) * 0.3 + Math.sin(a * 8 + phases[2]) * 0.1);
    for (const tuft of o.tufts ?? []) {
      let span = tuft.to - tuft.from; if (span <= 0) span += 360;
      let rel = deg - tuft.from; if (rel < 0) rel += 360;
      if (rel <= span) {
        const phase = ((rel / span) * tuft.count) % 1;
        r += tuft.len * Math.pow(1 - Math.abs(2 * phase - 1), tuft.sharp ?? 3);
      }
    }
    let x = Math.cos(a) * rx * r;
    let y = Math.sin(a) * ry * r;
    if (o.flatBottom && y > 0) y *= 1 - o.flatBottom;
    if (o.flatTop && y < 0) y *= 1 - o.flatTop;
    if (o.narrowTop && y < 0) x *= 1 - o.narrowTop * Math.min(1, -y / ry);
    if (o.narrowBottom && y > 0) x *= 1 - o.narrowBottom * Math.min(1, y / ry);
    points.push([cx + x, cy + y]);
  }
  return catmull(points);
};

// Tapered tube along a centre line; widths are full widths at each centre point.
const tube = (centre, widths) => {
  const left = []; const right = [];
  centre.forEach((point, index) => {
    const prev = centre[Math.max(0, index - 1)]; const next = centre[Math.min(centre.length - 1, index + 1)];
    let tx = next[0] - prev[0]; let ty = next[1] - prev[1]; const length = Math.hypot(tx, ty) || 1; tx /= length; ty /= length;
    const half = widths[index] / 2;
    left.push([point[0] - ty * half, point[1] + tx * half]);
    right.push([point[0] + ty * half, point[1] - tx * half]);
  });
  return catmull([...left, ...right.reverse()]);
};

const bezier = (p0, p1, p2, p3, n = 16) => Array.from({ length: n }, (_, index) => {
  const t = index / (n - 1); const u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
});

// A shape grown from a base point along an angle: ears, horns, feathers, petals, fins, flames.
// width(u) is the half-width profile from base (u=0) to tip (u=1); bend curls the axis sideways.
const spindle = (base, angle, length, width, o = {}) => {
  const a = rad(angle); const ax = Math.cos(a); const ay = Math.sin(a); const px = -ay; const py = ax;
  const n = o.n ?? 16;
  const profile = o.profile ?? ((u) => Math.sin(Math.PI * Math.pow(u, 0.75)));
  const bend = o.bend ?? 0;
  const side = (sign) => Array.from({ length: n }, (_, index) => {
    const u = index / (n - 1);
    const lateral = bend * length * u * u + sign * (width / 2) * profile(u);
    return [base[0] + ax * length * u + px * lateral, base[1] + ay * length * u + py * lateral];
  });
  return catmull([...side(1), ...side(-1).reverse()]);
};

const polar = (cx, cy, rx, ry, deg, scale = 1) => [cx + Math.cos(rad(deg)) * rx * scale, cy + Math.sin(rad(deg)) * ry * scale];

// ——— layers ———
const blurSizes = [2, 4, 7, 11, 16, 24, 36];
class Layer {
  constructor(prefix, seed) { this.prefix = prefix; this.seed = seed; this.defs = []; this.parts = []; this.count = 0; }
  id(tag) { this.count += 1; return `${this.prefix}${tag}${this.count}`; }
  blur(size) { const snap = blurSizes.reduce((best, value) => (Math.abs(value - size) < Math.abs(best - size) ? value : best)); return `url(#${this.prefix}b${snap})`; }
  add(...svg) { this.parts.push(...svg.filter(Boolean)); }
  get empty() { return this.parts.length === 0; }
  baseDefs() {
    const blurs = blurSizes.map((size) => `<filter id="${this.prefix}b${size}" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="${size}"/></filter>`).join('');
    // Brush pass: a gentle warp so no curve is geometrically perfect, then canvas grain inside the paint.
    const brush = `<filter id="${this.prefix}brush" filterUnits="userSpaceOnUse" x="-60" y="-60" width="720" height="720" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.013" numOctaves="2" seed="${(this.seed % 89) + 1}" result="warp"/>
      <feDisplacementMap in="SourceGraphic" in2="warp" scale="6" xChannelSelector="R" yChannelSelector="G" result="warped"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="2" seed="${((this.seed >>> 5) % 89) + 1}" result="grain"/>
      <feColorMatrix in="grain" type="saturate" values="0" result="grey"/>
      <feComposite in="warped" in2="grey" operator="arithmetic" k1="0" k2="1" k3="0.11" k4="-0.055" result="textured"/>
      <feComposite in="textured" in2="warped" operator="in"/>
    </filter>`;
    return blurs + brush;
  }
  content() { return `<defs>${this.baseDefs()}${this.defs.join('')}</defs><g filter="url(#${this.prefix}brush)">${this.parts.join('')}</g>`; }
  svg(px) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 600 600">${this.content()}</svg>`; }
}

// Paints a closed path as a lit volume: gradient body, cool core shadow on the far side, warm light
// on the near side, coloured rim light hugging the shadow edge, optional glow and gloss, soft ink line.
const paint = (L, d, t, o = {}) => {
  const grad = L.id('g'); const clip = L.id('c'); const shadeMask = L.id('s'); const lightMask = L.id('l');
  const shift = o.shift ?? 30;
  const sx = -0.6 * shift; const sy = -0.8 * shift;
  const soft = o.soft ?? 16;
  const big = 'x="-400" y="-400" width="1400" height="1400"';
  L.defs.push(
    `<linearGradient id="${grad}" x1="${o.gx1 ?? 0.3}" y1="${o.gy1 ?? 0}" x2="${o.gx2 ?? 0.7}" y2="${o.gy2 ?? 1}"><stop offset="0" stop-color="${t.light}"/><stop offset="0.52" stop-color="${t.base}"/><stop offset="1" stop-color="${t.dark}"/></linearGradient>`,
    `<clipPath id="${clip}"><path d="${d}"/></clipPath>`,
    `<mask id="${shadeMask}" maskUnits="userSpaceOnUse" ${big}><rect ${big} fill="#fff"/><path d="${d}" transform="translate(${f1(sx)} ${f1(sy)})" fill="#000" filter="${L.blur(soft)}"/></mask>`,
    `<mask id="${lightMask}" maskUnits="userSpaceOnUse" ${big}><rect ${big} fill="#fff"/><path d="${d}" transform="translate(${f1(-sx * 0.55)} ${f1(-sy * 0.55)})" fill="#000" filter="${L.blur(soft * 0.8)}"/></mask>`,
  );
  return `<g${o.opacity != null ? ` opacity="${o.opacity}"` : ''}>
    ${o.glow ? `<path d="${d}" fill="${o.glow}" opacity="${o.glowOpacity ?? 0.45}" filter="${L.blur(o.glowSize ?? 24)}"/>` : ''}
    <path d="${d}" fill="url(#${grad})"/>
    <g clip-path="url(#${clip})">
      <rect ${big} fill="${t.shade}" opacity="${o.shadeOpacity ?? 0.62}" mask="url(#${shadeMask})"/>
      ${t.rim ? `<path d="${d}" fill="none" stroke="${t.rim}" stroke-width="${o.rimWidth ?? 16}" opacity="${o.rimOpacity ?? 0.85}" filter="${L.blur(6)}" mask="url(#${shadeMask})"/>` : ''}
      <rect ${big} fill="${t.highlight}" opacity="${o.lightOpacity ?? 0.42}" mask="url(#${lightMask})"/>
      ${o.inner ?? ''}
    </g>
    ${o.line === 0 ? '' : `<path d="${d}" fill="none" stroke="${t.line}" stroke-width="${o.line ?? 3.4}" stroke-opacity="${o.lineOpacity ?? 0.72}" stroke-linejoin="round"/>`}
  </g>`;
};

// Specular spot: a crisp bright shape softened only at its edge.
const gloss = (L, cx, cy, rx, ry, opacity = 0.5, rotate = -25) => `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="#FFFFFF" opacity="${opacity}" transform="rotate(${rotate} ${f1(cx)} ${f1(cy)})" filter="${L.blur(2)}"/>`;

const glowDot = (L, cx, cy, r, color, opacity = 0.9) => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r * 2.6)}" fill="${color}" opacity="${f1(opacity * 0.45)}" filter="${L.blur(r * 1.6)}"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${lighten(color, 0.55)}" opacity="${opacity}"/>`;

const sparkle = (cx, cy, size, color, opacity = 0.95) => `<path d="M ${f1(cx)} ${f1(cy - size)} Q ${f1(cx + size * 0.18)} ${f1(cy - size * 0.18)} ${f1(cx + size)} ${f1(cy)} Q ${f1(cx + size * 0.18)} ${f1(cy + size * 0.18)} ${f1(cx)} ${f1(cy + size)} Q ${f1(cx - size * 0.18)} ${f1(cy + size * 0.18)} ${f1(cx - size)} ${f1(cy)} Q ${f1(cx - size * 0.18)} ${f1(cy - size * 0.18)} ${f1(cx)} ${f1(cy - size)} Z" fill="${color}" opacity="${opacity}"/>`;

module.exports = { TAU, rad, f1, hashSeed, rng, mix, lighten, darken, tone, catmull, blob, tube, bezier, spindle, polar, Layer, paint, gloss, glowDot, sparkle };

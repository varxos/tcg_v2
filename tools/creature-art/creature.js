// Turns a creature spec into its five painted layers (SVG strings on the 600x600 canvas).
'use strict';
const P = require('./paint');
const parts = require('./parts');
const { tone, lighten, darken, mix } = P;

const typeRim = { Flame: '#FFB35C', Nature: '#C4F58E', Tide: '#86E4FF', Crystal: '#D2BEFF', Lunar: '#E2B2FF', Stellar: '#FFE890' };
const typeCool = { Flame: '#3A1430', Nature: '#123A3A', Tide: '#10265A', Crystal: '#2A1C5E', Lunar: '#241046', Stellar: '#3A2A5A' };
const tierOf = { Common: 0, Rare: 1, 'Very Rare': 2, Epic: 3, Legendary: 4, Angelic: 5, Demonic: 6 };

const tonesFor = (s) => {
  const c = s.colors;
  const rim = c.rim ?? typeRim[s.type];
  const cool = typeCool[s.type];
  const t = (base, extra = {}) => tone(base, { rim, cool, ...extra });
  const flame = c.flame ?? '#FF8A2A';
  return {
    fur: t(c.fur),
    belly: t(c.belly ?? lighten(c.fur, 0.55), { rim: null }),
    muzzle: t(c.muzzle ?? c.belly ?? lighten(c.fur, 0.55), { rim: null }),
    inner: t(c.inner ?? mix(c.fur, '#FF9AB0', 0.55), { rim: null }),
    tips: t(c.tips ?? lighten(c.fur, 0.6), { rim: null }),
    accent: t(c.accent ?? lighten(c.fur, 0.3)),
    crest: t(c.crest ?? c.accent ?? lighten(c.fur, 0.3)),
    horn: t(c.horn ?? '#F3E4C4', { rim: null }),
    hoof: t(c.hoof ?? darken(c.fur, 0.5), { rim: null }),
    claw: t(c.claw ?? '#FFF1DE', { rim: null }),
    leg: t(c.leg ?? darken(c.fur, 0.25)),
    bone: t(c.bone ?? c.fur),
    wing: t(c.wing ?? c.fur),
    wingInner: t(c.wingInner ?? lighten(c.wing ?? c.fur, 0.25)),
    leaf: t(c.leaf ?? '#6FCF6A'),
    petal: t(c.petal ?? '#FF9AC8'),
    glass: t(c.glass ?? '#9EE8FF', { light: 0.6 }),
    crystal: t(c.crystal ?? '#B7A2FF', { light: 0.55 }),
    flame: tone(flame, { light: 0.55, dark: 0.12, cool: '#C21A10', rim: lighten(flame, 0.6) }),
    flameInner: tone(lighten(flame, 0.35), { light: 0.6, dark: 0.1, cool: flame }),
    fin: t(c.fin ?? lighten(c.fur, 0.35), { light: 0.5 }),
    beak: t(c.beak ?? '#FFB84A', { rim: null }),
    mane: c.maneTone === 'flame' ? tone(c.mane ?? flame, { light: 0.55, dark: 0.12, cool: '#C21A10' }) : t(c.mane ?? lighten(c.fur, 0.4)),
    cap: t(c.cap ?? c.accent ?? c.fur),
    shell: t(c.shell ?? darken(c.fur, 0.1)),
    quill: t(c.quill ?? darken(c.fur, 0.2)),
    quillTip: t(c.quillTip ?? c.quill ?? darken(c.fur, 0.2)),
    trail: tone(c.trail ?? lighten(c.fur, 0.4), { light: 0.6, dark: 0.1 }),
    hat: t(c.hat ?? darken(c.fur, 0.3)),
    veil: t(c.veil ?? '#EDE4FF', { light: 0.6 }),
    robe: t(c.robe ?? darken(c.fur, 0.2)),
    carry: t(c.carry ?? '#FF9AC8'),
  };
};

const buildLayers = (spec) => {
  const s = { ...spec, seed: spec.seed ?? P.hashSeed(spec.id), tier: tierOf[spec.rarity] ?? 0 };
  s.colors = { ...spec.colors };
  if (s.colors.maneTone) s.maneTone = s.colors.maneTone;
  if (s.tier >= 3 && s.aura === undefined) s.aura = true;
  const T = tonesFor(s);
  const L = { fb: new P.Layer(`${s.key}fb`, s.seed), fh: new P.Layer(`${s.key}fh`, s.seed), bb: new P.Layer(`${s.key}bb`, s.seed), bh: new P.Layer(`${s.key}bh`, s.seed), w: new P.Layer(`${s.key}w`, s.seed) };
  const rig = s.rig ?? 'sitter';
  const body = rig === 'floater' ? parts.floaterBody : rig === 'serpent' ? parts.serpentBody : parts.sitterBody;
  const head = rig === 'floater' ? parts.floaterHead : parts.sitterHead;
  if (rig === 'serpent') { s.headScale = s.headScale ?? 0.86; s.headY = s.headY ?? 10; }
  L.fb.add(body(L.fb, s, T, 'front'));
  L.fh.add(head(L.fh, s, T, 'front'));
  L.bb.add(body(L.bb, s, T, 'back'));
  L.bh.add(head(L.bh, s, T, 'back'));
  L.w.add(parts.wing(L.w, s, T));
  return { s, L, wingPivot: s.wingPivot ?? parts.WING, neck: parts.NECK };
};

module.exports = { buildLayers, tierOf, typeRim };

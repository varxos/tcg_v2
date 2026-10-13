// Painted card backdrops, one per type: nebula clouds, stars and a soft type-coloured light behind the creature.
'use strict';
const P = require('./paint');

const palettes = {
  Flame: { inner: '#7A2A18', mid: '#2E0E14', edge: '#0C0408', nebula: [1.0, 0.42, 0.16], glow: '#FF8A3D' },
  Nature: { inner: '#2E6A3E', mid: '#10281E', edge: '#040C0A', nebula: [0.45, 0.9, 0.5], glow: '#9BE58A' },
  Tide: { inner: '#1C5E8E', mid: '#0A1E3C', edge: '#030814', nebula: [0.3, 0.75, 1.0], glow: '#6FD6FF' },
  Crystal: { inner: '#4A3A9A', mid: '#181042', edge: '#06041A', nebula: [0.7, 0.6, 1.0], glow: '#BBA4FF' },
  Lunar: { inner: '#4C2A82', mid: '#170C36', edge: '#060314', nebula: [0.78, 0.5, 1.0], glow: '#D7A8FF' },
  Stellar: { inner: '#5A4A8A', mid: '#1C1640', edge: '#070618', nebula: [1.0, 0.86, 0.5], glow: '#FFE38A' },
};

// Drawn in a 600x800 card space with the creature canvas occupying y 0..600 (offset by -100 in previews).
const backdrop = (type, key, rarity = 'Common', seed = 7) => {
  const p = palettes[type] ?? palettes.Stellar;
  const random = P.rng(seed + type.length * 13);
  const stars = Array.from({ length: 70 }, () => `<circle cx="${(random() * 600).toFixed(1)}" cy="${(random() * 800 - 100).toFixed(1)}" r="${(0.6 + random() * 1.8).toFixed(2)}" fill="#FFFFFF" opacity="${(0.2 + random() * 0.7).toFixed(2)}"/>`).join('');
  const [r, g, b] = p.nebula;
  const rays = ['Legendary', 'Angelic', 'Demonic'].includes(rarity)
    ? `<g opacity="0.35" filter="url(#${key}soft)">${Array.from({ length: 14 }, (_, i) => `<path d="M 300 300 L ${(300 + Math.cos((i / 14) * Math.PI * 2) * 700).toFixed(0)} ${(300 + Math.sin((i / 14) * Math.PI * 2) * 700).toFixed(0)} L ${(300 + Math.cos((i / 14 + 0.025) * Math.PI * 2) * 700).toFixed(0)} ${(300 + Math.sin((i / 14 + 0.025) * Math.PI * 2) * 700).toFixed(0)} Z" fill="${p.glow}"/>`).join('')}</g>` : '';
  return `<defs>
    <radialGradient id="${key}bg" cx="50%" cy="42%" r="78%"><stop offset="0" stop-color="${p.inner}"/><stop offset="0.55" stop-color="${p.mid}"/><stop offset="1" stop-color="${p.edge}"/></radialGradient>
    <radialGradient id="${key}light" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${p.glow}" stop-opacity="0.55"/><stop offset="0.5" stop-color="${p.glow}" stop-opacity="0.14"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></radialGradient>
    <filter id="${key}neb" x="0" y="-100" width="600" height="800" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="0.005 0.008" numOctaves="4" seed="${seed}"/><feColorMatrix type="matrix" values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 1.6 -0.66"/></filter>
    <filter id="${key}soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
    <linearGradient id="${key}floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/></linearGradient>
  </defs>
  <rect x="0" y="-100" width="600" height="800" fill="url(#${key}bg)"/>
  <rect x="0" y="-100" width="600" height="800" filter="url(#${key}neb)" opacity="0.55"/>
  ${rays}
  ${stars}
  <circle cx="300" cy="330" r="330" fill="url(#${key}light)"/>
  <ellipse cx="300" cy="566" rx="190" ry="34" fill="#000" opacity="0.45" filter="url(#${key}soft)"/>
  <rect x="0" y="560" width="600" height="140" fill="url(#${key}floor)"/>`;
};

module.exports = { backdrop, palettes };

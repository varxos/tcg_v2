import { BoosterId, Card, Rarity, catalog, inventoryKey } from '../data/catalog';

export type ConstellationGroup = { boosterId: BoosterId; rarity: Rarity; golden?: boolean };
export type SkyPoint = { x: number; y: number };
// Coordinates are normalized: x is a fraction of the sky width, y a fraction of its height.
// Edge ids use "p" for playable stars (one per group) and "d" for decorative stars.
export type ConstellationShape = { points: SkyPoint[]; decor: SkyPoint[]; edges: [string, string][] };
export type Constellation = { id: string; name: string; copy: string; lore: string; reward: number; icon: string; color: string; groups: ConstellationGroup[]; shape: ConstellationShape; unlock?: string };

const constellationStars: BoosterId[] = ['dawn', 'twilight', 'celestial'];
const standardGroups = (rarities: Rarity[]): ConstellationGroup[] => constellationStars.flatMap((boosterId) => rarities.map((rarity) => ({ boosterId, rarity })));
const goldenGroups = (rarity: Rarity): ConstellationGroup[] => constellationStars.map((boosterId) => ({ boosterId, rarity, golden: true }));

export const constellations: Constellation[] = [
  {
    id: 'first-light', name: 'First Light', icon: '✦', color: '#8ED0A7', reward: 150, groups: standardGroups(['Common', 'Rare']), unlock: 'Title “First Light” & Dawn banner',
    copy: 'Discover every Common and Rare creature of the three stars.', lore: 'The kite of dawn, the first shape every young collector learns to trace.',
    shape: {
      points: [{ x: 0.16, y: 0.3 }, { x: 0.36, y: 0.15 }, { x: 0.57, y: 0.3 }, { x: 0.82, y: 0.2 }, { x: 0.46, y: 0.58 }, { x: 0.72, y: 0.8 }],
      decor: [{ x: 0.2, y: 0.74 }, { x: 0.9, y: 0.52 }],
      edges: [['p0', 'p1'], ['p1', 'p2'], ['p2', 'p3'], ['p2', 'p4'], ['p4', 'p5'], ['p4', 'd0'], ['p3', 'd1']],
    },
  },
  {
    id: 'astral-guardians', name: 'Astral Guardians', icon: '✧', color: '#D79CF7', reward: 260, groups: standardGroups(['Very Rare', 'Epic']), unlock: 'Title “Astral Guardian” & Astral Halo frame',
    copy: 'Discover every Very Rare and Epic creature.', lore: 'Six guardians circling a sleeping heart of light.',
    shape: {
      points: [{ x: 0.5, y: 0.16 }, { x: 0.8, y: 0.32 }, { x: 0.8, y: 0.64 }, { x: 0.5, y: 0.8 }, { x: 0.2, y: 0.64 }, { x: 0.2, y: 0.32 }],
      decor: [{ x: 0.5, y: 0.48 }],
      edges: [['p0', 'p1'], ['p1', 'p2'], ['p2', 'p3'], ['p3', 'p4'], ['p4', 'p5'], ['p5', 'p0'], ['p0', 'd0'], ['p2', 'd0'], ['p4', 'd0']],
    },
  },
  {
    id: 'crown-of-comets', name: 'Crown of Comets', icon: '♛', color: '#FFC75F', reward: 320, groups: standardGroups(['Legendary']),
    copy: 'Discover every Legendary creature.', lore: 'A crown worn by the sky itself on the brightest night of the year.',
    shape: {
      points: [{ x: 0.17, y: 0.3 }, { x: 0.5, y: 0.15 }, { x: 0.83, y: 0.3 }],
      decor: [{ x: 0.34, y: 0.48 }, { x: 0.66, y: 0.48 }, { x: 0.24, y: 0.76 }, { x: 0.76, y: 0.76 }],
      edges: [['p0', 'd0'], ['d0', 'p1'], ['p1', 'd1'], ['d1', 'p2'], ['p2', 'd3'], ['d3', 'd2'], ['d2', 'p0']],
    },
  },
  {
    id: 'seraphic-vow', name: 'Seraphic Vow', icon: '☼', color: '#FFF1C9', reward: 520, groups: standardGroups(['Angelic']),
    copy: 'Discover every Angelic creature.', lore: 'Two wings of light promised to the one who finds every seraph.',
    shape: {
      points: [{ x: 0.5, y: 0.2 }, { x: 0.15, y: 0.56 }, { x: 0.85, y: 0.56 }],
      decor: [{ x: 0.5, y: 0.8 }, { x: 0.32, y: 0.38 }, { x: 0.68, y: 0.38 }],
      edges: [['p0', 'd1'], ['d1', 'p1'], ['p0', 'd2'], ['d2', 'p2'], ['p1', 'd0'], ['d0', 'p2']],
    },
  },
  {
    id: 'gilded-epic', name: 'Gilded Epic', icon: '✦', color: '#FFD54A', reward: 420, groups: goldenGroups('Epic'),
    copy: 'Obtain every Epic creature with a Golden outline.', lore: 'A golden triangle forged from the rarest Epic glimmers.',
    shape: {
      points: [{ x: 0.5, y: 0.17 }, { x: 0.84, y: 0.74 }, { x: 0.16, y: 0.74 }],
      decor: [{ x: 0.5, y: 0.53 }],
      edges: [['p0', 'p1'], ['p1', 'p2'], ['p2', 'p0']],
    },
  },
  {
    id: 'gilded-legend', name: 'Gilded Legend', icon: '♛', color: '#FFD54A', reward: 640, groups: goldenGroups('Legendary'),
    copy: 'Obtain every Legendary creature with a Golden outline.', lore: 'A golden arrow that points to the legends of every star.',
    shape: {
      points: [{ x: 0.16, y: 0.58 }, { x: 0.5, y: 0.18 }, { x: 0.84, y: 0.58 }],
      decor: [{ x: 0.5, y: 0.82 }, { x: 0.5, y: 0.46 }],
      edges: [['p0', 'p1'], ['p1', 'p2'], ['p2', 'd0'], ['d0', 'p0'], ['p1', 'd1']],
    },
  },
  {
    id: 'gilded-seraph', name: 'Gilded Seraph', icon: '☼', color: '#FFF1C9', reward: 950, groups: goldenGroups('Angelic'),
    copy: 'Obtain every Angelic creature with a Golden outline.', lore: 'The golden diamond. Almost no collector has ever seen it lit.',
    shape: {
      points: [{ x: 0.5, y: 0.14 }, { x: 0.85, y: 0.5 }, { x: 0.5, y: 0.86 }],
      decor: [{ x: 0.15, y: 0.5 }, { x: 0.5, y: 0.5 }],
      edges: [['p0', 'p1'], ['p1', 'p2'], ['p2', 'd0'], ['d0', 'p0']],
    },
  },
];

export const starLabels: Record<BoosterId, string> = { dawn: 'DAWN', twilight: 'TWILIGHT', celestial: 'CELESTIAL', sparkle: 'SUPERNOVA', crimson: 'CRIMSON' };
export const starColors: Record<BoosterId, string> = { dawn: '#FFBB68', twilight: '#A48AF4', celestial: '#73DDEC', sparkle: '#FFE9A8', crimson: '#FF5B6E' };

const groupCache = new Map<string, Card[]>();
export const groupCards = (group: ConstellationGroup) => {
  const key = `${group.boosterId}-${group.rarity}`;
  let cards = groupCache.get(key);
  if (!cards) {
    cards = catalog.filter((card) => card.rarity === group.rarity && card.boosterIds.includes(group.boosterId));
    groupCache.set(key, cards);
  }
  return cards;
};
export const ownsForGroup = (group: ConstellationGroup, inventory: Record<string, number>, card: Card) => {
  if (group.golden) return (inventory[inventoryKey(card, true)] ?? 0) > 0;
  return (inventory[inventoryKey(card)] ?? 0) > 0 || (inventory[inventoryKey(card, true)] ?? 0) > 0;
};
export const groupOwnedCount = (group: ConstellationGroup, inventory: Record<string, number>) => groupCards(group).filter((card) => ownsForGroup(group, inventory, card)).length;
export const groupComplete = (group: ConstellationGroup, inventory: Record<string, number>) => {
  const cards = groupCards(group);
  return cards.length > 0 && groupOwnedCount(group, inventory) === cards.length;
};
export const constellationProgress = (constellation: Constellation, inventory: Record<string, number>) => constellation.groups.filter((group) => groupComplete(group, inventory)).length;
export const constellationComplete = (constellation: Constellation, inventory: Record<string, number>) => constellationProgress(constellation, inventory) === constellation.groups.length;
export const totalStarsLit = (inventory: Record<string, number>) => constellations.reduce((sum, constellation) => sum + constellationProgress(constellation, inventory), 0);
export const totalStars = constellations.reduce((sum, constellation) => sum + constellation.groups.length, 0);

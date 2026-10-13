import { Card, Rarity, catalog, goldenEligible } from '../data/catalog';
import type { ItemId } from './items';
import type { QuestReward } from './quests';

// The Void Quasar: a black hole that grants three rewards per opening, with a tiny heirloom-style chance of Demon Essence.
export type VoidVariant = 'gargantua' | 'crimson' | 'violet' | 'azure';
export const voidVariants: Record<VoidVariant, { body: string; hot: string; glow: string; ring: string }> = {
  gargantua: { body: '#FFAE62', hot: '#FFF4E2', glow: '#FF9A3D', ring: '#FFF1D6' },
  crimson: { body: '#FF4A1C', hot: '#FFC27A', glow: '#FF3A12', ring: '#FFD2A6' },
  violet: { body: '#9B6BFF', hot: '#F0E6FF', glow: '#7A3CFF', ring: '#E9DDFF' },
  azure: { body: '#35A8FF', hot: '#E3F7FF', glow: '#1C7CFF', ring: '#D9F2FF' },
};
export const voidVariantOrder: VoidVariant[] = ['gargantua', 'crimson', 'violet', 'azure'];

export const voidQuasar = { name: 'Void Quasar', cost: 45, slots: 3 };
export const essencePerDrop = 50;
export const essenceGoal = 150;
// Chance per opening, plus a guarantee once this many openings pass without any essence (like heirloom shards).
export const essenceChance = 0.0035;
export const essencePity = 120;
export const voidGoldenRate = 0.015;
export const voidCosmeticChance = 3;
export const voidItemChance = 35;
export const voidOdds: Record<Rarity, number> = { Common: 48, Rare: 29, 'Very Rare': 14, Epic: 6.5, Legendary: 2.2, Angelic: 0.3, Demonic: 0 };
export const voidCosmeticPool: { kind: 'banner' | 'frame'; id: string; variant: VoidVariant }[] = voidVariantOrder.flatMap((variant) => [
  { kind: 'banner' as const, id: `void-${variant}`, variant },
  { kind: 'frame' as const, id: `void-${variant}`, variant },
]);
export const voidCosmeticKey = (kind: 'banner' | 'frame', id: string) => `${kind}:${id}`;
export const voidVariantOf = (id: string): VoidVariant | null => {
  const variant = id.startsWith('void-') ? id.slice(5) : '';
  return (voidVariantOrder as string[]).includes(variant) ? (variant as VoidVariant) : null;
};

export type VoidReward =
  | { kind: 'creature'; card: Card; golden: boolean }
  | { kind: 'item'; itemId: ItemId; amount: number }
  | { kind: 'cosmetic'; cosmeticKind: 'banner' | 'frame'; cosmeticId: string }
  | { kind: 'essence'; amount: number }
  | { kind: 'celesti'; amount: number };

const itemTable: { itemId: ItemId; weight: number; min: number; max: number }[] = [
  { itemId: 'tonic', weight: 34, min: 2, max: 4 },
  { itemId: 'dew', weight: 22, min: 1, max: 3 },
  { itemId: 'elixir', weight: 18, min: 1, max: 2 },
  { itemId: 'revive', weight: 16, min: 1, max: 2 },
  { itemId: 'candy', weight: 10, min: 1, max: 1 },
];
const rarityValue: Record<Rarity, number> = { Common: 1, Rare: 2, 'Very Rare': 3, Epic: 4, Legendary: 5, Angelic: 6, Demonic: 7 };
// Rewards are revealed from the least to the most valuable, so the best one always comes last.
export const rewardValue = (reward: VoidReward) => {
  switch (reward.kind) {
    case 'item': return 0;
    case 'creature': return rarityValue[reward.card.rarity] + (reward.golden ? 1.5 : 0);
    case 'celesti': return 7.2;
    case 'cosmetic': return 7.5;
    case 'essence': return 10;
  }
};

const drawCreature = (rng: () => number): VoidReward => {
  const rarities = Object.keys(voidOdds) as Rarity[];
  const total = rarities.reduce((sum, rarity) => sum + voidOdds[rarity], 0);
  let roll = rng() * total;
  let rarity: Rarity = 'Common';
  for (const entry of rarities) {
    roll -= voidOdds[entry];
    if (roll <= 0 && voidOdds[entry] > 0) { rarity = entry; break; }
  }
  const pool = catalog.filter((card) => card.rarity === rarity && card.rarity !== 'Demonic');
  const card = pool[Math.floor(rng() * pool.length)] ?? catalog[0];
  return { kind: 'creature', card, golden: goldenEligible.includes(card.rarity) && rng() < voidGoldenRate };
};
const drawItem = (rng: () => number): VoidReward => {
  const total = itemTable.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * total;
  const entry = itemTable.find((candidate) => (roll -= candidate.weight) <= 0) ?? itemTable[0];
  return { kind: 'item', itemId: entry.itemId, amount: entry.min + Math.floor(rng() * (entry.max - entry.min + 1)) };
};

export const rollVoidOpening = ({ pity, ownedCosmeticKeys, demonsLeft }: { pity: number; ownedCosmeticKeys: string[]; demonsLeft: number }, rng: () => number = Math.random) => {
  const rewards: VoidReward[] = [];
  const essence = pity + 1 >= essencePity || rng() < essenceChance;
  // Once every demon is awakened, the essence roll turns into a Celesti jackpot instead.
  if (essence) rewards.push(demonsLeft > 0 ? { kind: 'essence', amount: essencePerDrop } : { kind: 'celesti', amount: 300 });
  const taken = new Set<string>();
  while (rewards.length < voidQuasar.slots) {
    const roll = rng() * 100;
    const available = voidCosmeticPool.filter((entry) => !ownedCosmeticKeys.includes(voidCosmeticKey(entry.kind, entry.id)) && !taken.has(voidCosmeticKey(entry.kind, entry.id)));
    if (roll < voidCosmeticChance && available.length > 0) {
      const pick = available[Math.floor(rng() * available.length)];
      taken.add(voidCosmeticKey(pick.kind, pick.id));
      rewards.push({ kind: 'cosmetic', cosmeticKind: pick.kind, cosmeticId: pick.id });
    } else if (roll < voidCosmeticChance + voidItemChance) rewards.push(drawItem(rng));
    else rewards.push(drawCreature(rng));
  }
  // Every opening contains at least one creature.
  if (!rewards.some((reward) => reward.kind === 'creature')) {
    const itemIndex = rewards.findIndex((reward) => reward.kind === 'item');
    if (itemIndex !== -1) rewards[itemIndex] = drawCreature(rng);
  }
  return { rewards: rewards.sort((a, b) => rewardValue(a) - rewardValue(b)), essence };
};

// "Dive into the Horizon": the black hole's own progression, lived as a descent instead of a star map.
export type VoidGoal = { kind: 'opened' | 'cosmetics' | 'essence' | 'demons'; target: number };
export type VoidStage = { id: string; depth: number; goal: VoidGoal; reward: QuestReward; distance: string; color: string };
export const voidStages: VoidStage[] = [
  { id: 'accretion', depth: 1, goal: { kind: 'opened', target: 3 }, reward: { celesti: 60 }, distance: '1.2 Gm', color: '#FFB066' },
  { id: 'photon', depth: 2, goal: { kind: 'opened', target: 15 }, reward: { celesti: 120, items: [{ itemId: 'candy', amount: 1 }] }, distance: '340 Mm', color: '#FFD9A0' },
  { id: 'lensing', depth: 3, goal: { kind: 'cosmetics', target: 2 }, reward: { celesti: 180, items: [{ itemId: 'revive', amount: 2 }] }, distance: '48 Mm', color: '#C9A6FF' },
  { id: 'horizon', depth: 4, goal: { kind: 'essence', target: essencePerDrop }, reward: { celesti: 250, items: [{ itemId: 'elixir', amount: 3 }] }, distance: '0 km', color: '#FF6B7E' },
  { id: 'singularity', depth: 5, goal: { kind: 'demons', target: 1 }, reward: { celesti: 400 }, distance: '∞', color: '#FF2E4D' },
];
export type VoidProgress = { opened: number; cosmetics: number; essenceEarned: number; demons: number };
export const voidGoalProgress = (goal: VoidGoal, progress: VoidProgress) => {
  const value = goal.kind === 'opened' ? progress.opened : goal.kind === 'cosmetics' ? progress.cosmetics : goal.kind === 'essence' ? progress.essenceEarned : progress.demons;
  return { value: Math.min(value, goal.target), target: goal.target };
};

import { Card, Rarity, catalog } from '../data/catalog';
import { CreatureType, cardById } from './creatures';
import { ItemId, ItemReward } from './items';

export type ArenaId = 'nebula' | 'wildwood' | 'ember' | 'aurora';
export type Warden = {
  id: string; name: string; title: string; type: CreatureType | 'Mixed'; sigil: string; sigilName: string; color: string; accent: string; arena: ArenaId;
  quote: string; defeatQuote: string; team: { cardId: string; level: number }[]; reward: number; items: ItemReward[];
  aiSkill: number; enemyItems: Partial<Record<ItemId, number>>; recommended: number;
};

// The Starfall Circuit: eight Wardens, each one a clear step up in level and tactics.
export const wardens: Warden[] = [
  {
    id: 'pip', name: 'Pip', title: 'Ember Scout', type: 'Flame', sigil: '✹', sigilName: 'Ember Sigil', color: '#FF8069', accent: '#AD3C4B', arena: 'ember',
    quote: 'My flames are small, but they never go out! Show me your spark!', defeatQuote: 'Your squad burns brighter than mine. The Ember Sigil is yours!',
    team: [{ cardId: 'dawn-common-9', level: 4 }, { cardId: 'moss', level: 6 }], reward: 40, items: [{ itemId: 'tonic', amount: 2 }], aiSkill: 1, enemyItems: {}, recommended: 6,
  },
  {
    id: 'mira', name: 'Mira', title: 'Glade Keeper', type: 'Nature', sigil: '❋', sigilName: 'Bloom Sigil', color: '#8FD28A', accent: '#3E7A4E', arena: 'wildwood',
    quote: 'The glade rewards patience. Let us see if your squad has roots.', defeatQuote: 'A strong bond grows like a great tree. Take the Bloom Sigil.',
    team: [{ cardId: 'dawn-common-7', level: 8 }, { cardId: 'dawn-common-11', level: 9 }, { cardId: 'dawn-rare-4', level: 11 }], reward: 55, items: [{ itemId: 'dew', amount: 2 }, { itemId: 'tonic', amount: 2 }], aiSkill: 2, enemyItems: {}, recommended: 10,
  },
  {
    id: 'maris', name: 'Captain Maris', title: 'Tide Captain', type: 'Tide', sigil: '≈', sigilName: 'Wave Sigil', color: '#69CDEE', accent: '#1F6C8A', arena: 'nebula',
    quote: 'Hoist the stars! No squad crosses my current without a fight!', defeatQuote: 'You rode the wave like a true captain. The Wave Sigil is earned.',
    team: [{ cardId: 'plum', level: 12 }, { cardId: 'celestial-common-5', level: 13 }, { cardId: 'twilight-rare-5', level: 15 }], reward: 70, items: [{ itemId: 'elixir', amount: 1 }, { itemId: 'tonic', amount: 3 }], aiSkill: 2, enemyItems: {}, recommended: 14,
  },
  {
    id: 'quartz', name: 'Sage Quartz', title: 'Crystal Sage', type: 'Crystal', sigil: '◆', sigilName: 'Prism Sigil', color: '#B8A0FF', accent: '#5B45A8', arena: 'aurora',
    quote: 'Every facet hides a weakness. I have studied all of yours.', defeatQuote: 'Clarity through struggle… The Prism Sigil reflects your growth.',
    team: [{ cardId: 'twilight-common-10', level: 16 }, { cardId: 'ice', level: 17 }, { cardId: 'celestial-rare-8', level: 18 }, { cardId: 'twilight-rare-8', level: 20 }], reward: 90, items: [{ itemId: 'revive', amount: 1 }, { itemId: 'candy', amount: 1 }], aiSkill: 3, enemyItems: { tonic: 1 }, recommended: 18,
  },
  {
    id: 'noctis', name: 'Noctis', title: 'Moon Warden', type: 'Lunar', sigil: '☾', sigilName: 'Crescent Sigil', color: '#D6A5FF', accent: '#6B3FA0', arena: 'aurora',
    quote: 'Under my moon, even the brightest squads fall quiet.', defeatQuote: 'The night bows to you. Carry the Crescent Sigil with care.',
    team: [{ cardId: 'moth', level: 20 }, { cardId: 'twilight-common-5', level: 21 }, { cardId: 'dawn-rare-7', level: 22 }, { cardId: 'nebula', level: 24 }], reward: 110, items: [{ itemId: 'elixir', amount: 2 }, { itemId: 'candy', amount: 1 }], aiSkill: 3, enemyItems: { tonic: 1 }, recommended: 25,
  },
  {
    id: 'astra', name: 'Astra', title: 'Star Captain', type: 'Stellar', sigil: '✦', sigilName: 'Comet Sigil', color: '#FFE37D', accent: '#B8862A', arena: 'nebula',
    quote: 'I chart the fastest routes between the stars. Try to keep up!', defeatQuote: 'Faster than a comet! The Comet Sigil is yours, navigator.',
    team: [{ cardId: 'planet', level: 25 }, { cardId: 'moon', level: 26 }, { cardId: 'dawn-rare-8', level: 27 }, { cardId: 'ram', level: 28 }, { cardId: 'cosmo', level: 29 }], reward: 140, items: [{ itemId: 'revive', amount: 2 }, { itemId: 'candy', amount: 1 }], aiSkill: 3, enemyItems: { elixir: 1 }, recommended: 30,
  },
  {
    id: 'eclipse', name: 'Sol & Luna', title: 'Twin Eclipse', type: 'Mixed', sigil: '◐', sigilName: 'Eclipse Sigil', color: '#FF9C6B', accent: '#7A3FA0', arena: 'ember',
    quote: 'Sun and moon, together as one. Can your squad face both at once?', defeatQuote: 'Light and shadow both acknowledge you. Take the Eclipse Sigil.',
    team: [{ cardId: 'spark', level: 29 }, { cardId: 'twilight-rare-4', level: 30 }, { cardId: 'twilight-very-rare-4', level: 31 }, { cardId: 'pixie', level: 32 }, { cardId: 'phoenix', level: 33 }], reward: 180, items: [{ itemId: 'elixir', amount: 2 }, { itemId: 'revive', amount: 2 }, { itemId: 'candy', amount: 2 }], aiSkill: 3, enemyItems: {}, recommended: 36,
  },
  {
    id: 'seraphine', name: 'Seraphine', title: 'Starfall Champion', type: 'Mixed', sigil: '☼', sigilName: 'Seraph Crown', color: '#FFF1C9', accent: '#E3B838', arena: 'aurora',
    quote: 'Every star you opened led you here. Show me the sky you have built.', defeatQuote: 'A new champion rises over Starfall. The Seraph Crown shines for you.',
    team: [{ cardId: 'meteor', level: 35 }, { cardId: 'celestial-very-rare-3', level: 36 }, { cardId: 'galaxy', level: 37 }, { cardId: 'stardrake', level: 38 }, { cardId: 'seraph', level: 40 }], reward: 300, items: [{ itemId: 'candy', amount: 3 }, { itemId: 'revive', amount: 3 }], aiSkill: 4, enemyItems: { elixir: 1 }, recommended: 44,
  },
];

export const wardenById = (id: string | null | undefined) => wardens.find((warden) => warden.id === id) ?? null;
export const wardenTeam = (warden: Warden) => warden.team.map((entry) => ({ card: cardById.get(entry.cardId) ?? catalog[0], level: entry.level }));
export const wardenAce = (warden: Warden) => cardById.get(warden.team[warden.team.length - 1].cardId) ?? catalog[0];
export const rematchReward = (warden: Warden) => Math.max(10, Math.floor(warden.reward * 0.25));

export const createWildEncounter = (teamLevels: number[], rng: () => number = Math.random): { card: Card; level: number } => {
  const top = [...teamLevels].sort((a, b) => b - a).slice(0, 3);
  const average = top.length ? Math.round(top.reduce((sum, level) => sum + level, 0) / top.length) : 5;
  const early = average < 8;
  // Early encounters stay gentle so a brand-new partner can win its first battles.
  const level = Math.max(2, Math.min(50, average - (early ? 2 : 2) + Math.floor(rng() * (early ? 2 : 3))));
  const roll = rng() * 100;
  const rarity: Rarity = early ? (roll < 90 ? 'Common' : 'Rare') : roll < 62 ? 'Common' : roll < 90 ? 'Rare' : roll < 98.5 ? 'Very Rare' : 'Epic';
  const pool = catalog.filter((card) => card.rarity === rarity);
  return { card: pool[Math.floor(rng() * pool.length)] ?? catalog[0], level };
};
export const wildCelestiReward = (level: number) => 3 + Math.floor(level / 6);

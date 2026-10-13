import { Card, Rarity, catalog } from '../data/catalog';

export type CreatureType = 'Flame' | 'Nature' | 'Tide' | 'Crystal' | 'Lunar' | 'Stellar';
export type MoveType = CreatureType | 'Neutral';
export type StatKey = 'attack' | 'defense' | 'speed';
export type StatusId = 'burn' | 'poison' | 'sleep' | 'freeze' | 'dazzle';
export type CreatureStats = { hp: number; attack: number; defense: number; speed: number };
export type CreatureProgress = { level: number; xp: number };

export const creatureTypes: CreatureType[] = ['Flame', 'Nature', 'Tide', 'Crystal', 'Lunar', 'Stellar'];
export const cardById = new Map<string, Card>(catalog.map((card) => [card.id, card]));

export const typeTheme: Record<MoveType, { icon: string; color: string; soft: string; deep: string; label: string; particles: string[] }> = {
  Flame: { icon: '✹', color: '#FF8069', soft: '#542D3C', deep: '#3A1C28', label: 'FLAME', particles: ['✹', '•', '✦'] },
  Nature: { icon: '❋', color: '#8FD28A', soft: '#294B43', deep: '#1B332D', label: 'NATURE', particles: ['❋', '✿', '•'] },
  Tide: { icon: '≈', color: '#69CDEE', soft: '#24495B', deep: '#17313F', label: 'TIDE', particles: ['◌', '•', '≈'] },
  Crystal: { icon: '◆', color: '#B8A0FF', soft: '#42365F', deep: '#2C2442', label: 'CRYSTAL', particles: ['◆', '◇', '✧'] },
  Lunar: { icon: '☾', color: '#D6A5FF', soft: '#49355F', deep: '#2F2240', label: 'LUNAR', particles: ['☾', '✧', '•'] },
  Stellar: { icon: '✦', color: '#FFE37D', soft: '#5A4B2A', deep: '#3B311B', label: 'STELLAR', particles: ['✦', '✧', '•'] },
  Neutral: { icon: '●', color: '#C6B8DE', soft: '#3B3159', deep: '#282040', label: 'NEUTRAL', particles: ['•', '✧', '•'] },
};

// Every type is strong against two types and resisted by two types.
// Flame › Nature › Tide › Flame is the classic starter triangle.
export const typeChart: Record<CreatureType, { strong: CreatureType[]; weak: CreatureType[] }> = {
  Flame: { strong: ['Nature', 'Crystal'], weak: ['Tide', 'Flame'] },
  Nature: { strong: ['Tide', 'Lunar'], weak: ['Flame', 'Nature'] },
  Tide: { strong: ['Flame', 'Stellar'], weak: ['Nature', 'Tide'] },
  Crystal: { strong: ['Tide', 'Nature'], weak: ['Stellar', 'Crystal'] },
  Lunar: { strong: ['Stellar', 'Flame'], weak: ['Crystal', 'Lunar'] },
  Stellar: { strong: ['Crystal', 'Lunar'], weak: ['Tide', 'Stellar'] },
};
export const effectiveness = (attack: MoveType, defend: CreatureType) => {
  if (attack === 'Neutral') return 1;
  if (typeChart[attack].strong.includes(defend)) return 2;
  if (typeChart[attack].weak.includes(defend)) return 0.5;
  return 1;
};

export const statusInfo: Record<StatusId, { label: string; tag: string; color: string; icon: string; applied: string; immune: CreatureType }> = {
  burn: { label: 'Burn', tag: 'BRN', color: '#FF8069', icon: '✹', applied: 'was burned!', immune: 'Flame' },
  poison: { label: 'Poison', tag: 'PSN', color: '#C08BF5', icon: '❋', applied: 'was poisoned!', immune: 'Nature' },
  sleep: { label: 'Sleep', tag: 'SLP', color: '#9FB3D9', icon: '☾', applied: 'fell asleep!', immune: 'Lunar' },
  freeze: { label: 'Frozen', tag: 'FRZ', color: '#8FE4FF', icon: '◆', applied: 'was frozen solid!', immune: 'Crystal' },
  dazzle: { label: 'Dazzled', tag: 'DZL', color: '#FFE37D', icon: '✦', applied: 'is dazzled! It may be unable to move!', immune: 'Stellar' },
};
export const statLabels: Record<StatKey, string> = { attack: 'Attack', defense: 'Defense', speed: 'Speed' };

export type MoveEffect =
  | { kind: 'status'; status: StatusId; chance: number }
  | { kind: 'stat'; target: 'self' | 'foe'; stat: StatKey; stages: number; chance: number }
  | { kind: 'drain'; ratio: number }
  | { kind: 'recoil'; ratio: number }
  | { kind: 'heal'; ratio: number };
export type Move = {
  id: string; name: string; type: MoveType; category: 'strike' | 'status'; power: number; accuracy: number; pp: number;
  priority?: number; highCrit?: boolean; effects?: MoveEffect[]; description: string; signature?: boolean;
};
type MoveTemplate = Omit<Move, 'id' | 'type'>;

const strike = (name: string, power: number, accuracy: number, pp: number, description: string, extra: Partial<MoveTemplate> = {}): MoveTemplate => ({ name, power, accuracy, pp, description, category: 'strike', ...extra });
const support = (name: string, accuracy: number, pp: number, description: string, effects: MoveEffect[]): MoveTemplate => ({ name, power: 0, accuracy, pp, description, category: 'status', effects });
const statusChance = (status: StatusId, chance: number): MoveEffect => ({ kind: 'status', status, chance });
const statChange = (target: 'self' | 'foe', stat: StatKey, stages: number, chance = 100): MoveEffect => ({ kind: 'stat', target, stat, stages, chance });

// Slots 0,1,2,4,5,6 of each learnset. Slot 3 is the creature's signature move.
const typeMovePools: Record<CreatureType, MoveTemplate[]> = {
  Flame: [
    strike('Ember Arc', 40, 100, 25, 'A quick arc of embers. 10% chance to burn.', { effects: [statusChance('burn', 10)] }),
    support('Kindle', 100, 20, 'Stokes its inner fire. Raises Attack.', [statChange('self', 'attack', 1)]),
    strike('Cinder Spin', 60, 100, 20, 'A spinning dash wrapped in cinders. 20% chance to burn.', { effects: [statusChance('burn', 20)] }),
    support('Fire Dance', 100, 15, 'A mesmerizing dance. Raises Attack and Speed.', [statChange('self', 'attack', 1), statChange('self', 'speed', 1)]),
    strike('Blazing Crest', 90, 100, 12, 'A crest of white-hot flame. 10% chance to burn.', { effects: [statusChance('burn', 10)] }),
    strike('Supernova Flare', 120, 85, 5, 'An all-out solar blast. The user takes 25% recoil.', { effects: [{ kind: 'recoil', ratio: 0.25 }] }),
  ],
  Nature: [
    strike('Vine Flick', 40, 100, 25, 'A snapping lash of living vines.'),
    support('Petal Guard', 100, 20, 'Wraps itself in petals. Raises Defense.', [statChange('self', 'defense', 1)]),
    strike('Spore Burst', 55, 95, 20, 'A cloud of stinging spores. 30% chance to poison.', { effects: [statusChance('poison', 30)] }),
    support('Soothing Bloom', 100, 10, 'A healing blossom opens. Restores half of max HP.', [{ kind: 'heal', ratio: 0.5 }]),
    strike('Wild Bloom', 90, 100, 12, 'The whole meadow erupts at once.'),
    strike('World Tree Crash', 120, 85, 5, 'A colossal root strike. Lowers the user\'s Defense.', { effects: [statChange('self', 'defense', -1)] }),
  ],
  Tide: [
    strike('Ripple Dash', 40, 100, 30, 'Rushes in on a ripple. Always strikes first.', { priority: 1 }),
    support('Soak', 100, 20, 'Drenches the foe. Lowers its Attack.', [statChange('foe', 'attack', -1)]),
    strike('Tidal Spin', 60, 100, 20, 'A whirling current. 20% chance to lower Speed.', { effects: [statChange('foe', 'speed', -1, 20)] }),
    support('Undertow Guard', 100, 15, 'Surrounds itself with a heavy current. Sharply raises Defense.', [statChange('self', 'defense', 2)]),
    strike('Moonwave', 90, 100, 12, 'A moonlit wave. 20% chance to lower Attack.', { effects: [statChange('foe', 'attack', -1, 20)] }),
    strike('Abyssal Tsunami', 120, 85, 5, 'A crushing tidal wall. Lowers the user\'s Speed.', { effects: [statChange('self', 'speed', -1)] }),
  ],
  Crystal: [
    strike('Shard Flick', 40, 100, 25, 'Flicks a sharp shard. High critical-hit ratio.', { highCrit: true }),
    support('Polish', 100, 20, 'Polishes its facets. Sharply raises Speed.', [statChange('self', 'speed', 2)]),
    strike('Frost Facet', 55, 95, 20, 'A freezing prism beam. 15% chance to freeze.', { effects: [statusChance('freeze', 15)] }),
    support('Refract', 90, 20, 'Blinding refracted light. Sharply lowers Defense.', [statChange('foe', 'defense', -2)]),
    strike('Facet Burst', 90, 95, 12, 'Explodes into razor facets. High critical-hit ratio.', { highCrit: true }),
    strike('Diamond Storm', 110, 85, 5, 'A storm of diamond dust. 20% chance to freeze.', { effects: [statusChance('freeze', 20)] }),
  ],
  Lunar: [
    strike('Moon Pulse', 40, 100, 25, 'A pulse of pale moonlight.'),
    support('Lullaby', 65, 15, 'A soft moon song that puts the foe to sleep.', [statusChance('sleep', 100)]),
    strike('Night Veil', 60, 100, 20, 'Strikes from a veil of night. 20% chance to lower Attack.', { effects: [statChange('foe', 'attack', -1, 20)] }),
    support('Eclipse Rite', 100, 15, 'A silent rite. Raises Attack and Defense.', [statChange('self', 'attack', 1), statChange('self', 'defense', 1)]),
    strike('Eclipse Strike', 90, 100, 12, 'Strikes from the shadow of the moon. 10% chance to cause sleep.', { effects: [statusChance('sleep', 10)] }),
    strike('Void Crescent', 120, 85, 5, 'A crescent carved from the void. The user takes 25% recoil.', { effects: [{ kind: 'recoil', ratio: 0.25 }] }),
  ],
  Stellar: [
    strike('Star Ripple', 40, 100, 25, 'A ripple of gentle starlight.'),
    support('Dazzle Flash', 80, 15, 'A brilliant flash that dazzles the foe.', [statusChance('dazzle', 100)]),
    strike('Comet Step', 45, 100, 25, 'A comet-fast step. Always strikes first.', { priority: 1 }),
    support('Starlight Wish', 100, 10, 'Makes a wish on a star. Restores half of max HP.', [{ kind: 'heal', ratio: 0.5 }]),
    strike('Nebula Burst', 90, 100, 12, 'A burst of nebula dust. 10% chance to dazzle.', { effects: [statusChance('dazzle', 10)] }),
    strike('Constellation Nova', 125, 85, 5, 'Draws power from every star. Lowers the user\'s Attack.', { effects: [statChange('self', 'attack', -1)] }),
  ],
};
const learnLevels = [1, 1, 7, 12, 18, 26, 36];
const signatureVerbs: Record<CreatureType, string[]> = {
  Flame: ['Crest', 'Flare', 'Inferno'], Nature: ['Thorn', 'Grove', 'Bloom'], Tide: ['Current', 'Surge', 'Undertow'],
  Crystal: ['Shard', 'Prism', 'Geode'], Lunar: ['Moon', 'Veil', 'Eclipse'], Stellar: ['Comet', 'Nova', 'Starfall'],
};
const signatureEffects: Record<CreatureType, Partial<MoveTemplate>> = {
  Flame: { effects: [statusChance('burn', 30)], description: 'Its signature blaze. 30% chance to burn.' },
  Nature: { effects: [{ kind: 'drain', ratio: 0.5 }], description: 'Its signature strike. Restores HP equal to half the damage dealt.' },
  Tide: { effects: [statChange('foe', 'speed', -1, 40)], description: 'Its signature current. 40% chance to lower Speed.' },
  Crystal: { highCrit: true, accuracy: 95, description: 'Its signature facet. High critical-hit ratio.' },
  Lunar: { effects: [statChange('foe', 'defense', -1, 40)], description: 'Its signature eclipse. 40% chance to lower Defense.' },
  Stellar: { effects: [statusChance('dazzle', 20)], description: 'Its signature starfall. 20% chance to dazzle.' },
};
export const struggleMove: Move = { id: 'struggle', name: 'Desperate Tackle', type: 'Neutral', category: 'strike', power: 50, accuracy: 100, pp: 1, description: 'Used when no energy is left. The user takes 25% recoil.', effects: [{ kind: 'recoil', ratio: 0.25 }] };

export const hashSeed = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const typeOverrides: Record<string, CreatureType> = {
  moss: 'Flame', leaf: 'Flame', acorn: 'Tide', bloom: 'Crystal', 'dawn-common-5': 'Flame', 'dawn-common-6': 'Crystal', 'dawn-common-7': 'Nature', 'dawn-common-8': 'Stellar',
  'dawn-common-9': 'Flame', 'dawn-common-10': 'Nature', 'dawn-common-11': 'Nature', 'dawn-common-12': 'Lunar',
  spark: 'Flame', moon: 'Stellar', fox: 'Stellar', 'dawn-rare-4': 'Nature', 'dawn-rare-5': 'Crystal', 'dawn-rare-6': 'Crystal', 'dawn-rare-7': 'Lunar', 'dawn-rare-8': 'Stellar', 'dawn-rare-9': 'Nature',
  koi: 'Tide', ram: 'Stellar', 'dawn-very-rare-3': 'Lunar', 'dawn-very-rare-4': 'Nature', pixie: 'Lunar', coral: 'Tide', 'dawn-epic-3': 'Flame', dragon: 'Flame', 'dawn-legendary-2': 'Nature', dawnangel: 'Stellar',
  moth: 'Lunar', plum: 'Tide', toad: 'Nature', berry: 'Tide', 'twilight-common-5': 'Lunar', 'twilight-common-6': 'Tide', 'twilight-common-7': 'Lunar', 'twilight-common-8': 'Stellar',
  'twilight-common-9': 'Nature', 'twilight-common-10': 'Crystal', 'twilight-common-11': 'Crystal', 'twilight-common-12': 'Flame',
  bolt: 'Crystal', crystal: 'Nature', raven: 'Flame', 'twilight-rare-4': 'Lunar', 'twilight-rare-5': 'Tide', 'twilight-rare-6': 'Lunar', 'twilight-rare-7': 'Tide', 'twilight-rare-8': 'Crystal', 'twilight-rare-9': 'Stellar',
  lotus: 'Nature', orb: 'Lunar', 'twilight-very-rare-3': 'Nature', 'twilight-very-rare-4': 'Flame', witch: 'Stellar', eclipse: 'Tide', 'twilight-epic-3': 'Lunar', phoenix: 'Flame', 'twilight-legendary-2': 'Crystal', nightangel: 'Lunar',
  nova: 'Tide', ice: 'Crystal', planet: 'Stellar', rainbow: 'Stellar', 'celestial-common-5': 'Tide', 'celestial-common-6': 'Tide', 'celestial-common-7': 'Nature', 'celestial-common-8': 'Crystal',
  'celestial-common-9': 'Stellar', 'celestial-common-10': 'Lunar', 'celestial-common-11': 'Flame', 'celestial-common-12': 'Tide',
  meteor: 'Flame', aurora: 'Nature', prism: 'Nature', 'celestial-rare-4': 'Stellar', 'celestial-rare-5': 'Lunar', 'celestial-rare-6': 'Crystal', 'celestial-rare-7': 'Stellar', 'celestial-rare-8': 'Crystal', 'celestial-rare-9': 'Tide',
  nebula: 'Lunar', cosmo: 'Stellar', 'celestial-very-rare-3': 'Tide', 'celestial-very-rare-4': 'Lunar', galaxy: 'Stellar', lunar: 'Tide', 'celestial-epic-3': 'Crystal', stardrake: 'Stellar', 'celestial-legendary-2': 'Tide', seraph: 'Stellar',
  'demon-vorhex': 'Lunar', 'demon-azkarel': 'Flame', 'demon-nyxira': 'Crystal',
};

export const typeForCard = (card: Card): CreatureType => {
  const override = typeOverrides[card.id];
  if (override) return override;
  const value = `${card.id} ${card.name}`.toLowerCase();
  if (/(ember|cinder|blaze|sun|solar|phoenix|fire|flare)/.test(value)) return 'Flame';
  if (/(moss|leaf|bloom|petal|verdant|berry|acorn|thorn|flower|garden)/.test(value)) return 'Nature';
  if (/(koi|tide|otter|whale|fin|shell|crab|eel|water|pool|manta|coral)/.test(value)) return 'Tide';
  if (/(crystal|prism|gem|glass|moonstone|quill|ice|frost|orb)/.test(value)) return 'Crystal';
  if (card.boosterIds[0] === 'twilight') return 'Lunar';
  return 'Stellar';
};

const rarityBaseTotal: Record<Rarity, number> = { Common: 290, Rare: 330, 'Very Rare': 370, Epic: 410, Legendary: 455, Angelic: 500, Demonic: 505 };
export const rarityStartLevel: Record<Rarity, number> = { Common: 5, Rare: 7, 'Very Rare': 9, Epic: 12, Legendary: 15, Angelic: 18, Demonic: 18 };
const rarityXpYield: Record<Rarity, number> = { Common: 70, Rare: 92, 'Very Rare': 120, Epic: 150, Legendary: 190, Angelic: 240, Demonic: 245 };
const typeWeights: Record<CreatureType, CreatureStats> = {
  Flame: { hp: 0.23, attack: 0.31, defense: 0.21, speed: 0.25 },
  Nature: { hp: 0.3, attack: 0.24, defense: 0.27, speed: 0.19 },
  Tide: { hp: 0.28, attack: 0.25, defense: 0.25, speed: 0.22 },
  Crystal: { hp: 0.24, attack: 0.25, defense: 0.32, speed: 0.19 },
  Lunar: { hp: 0.25, attack: 0.27, defense: 0.21, speed: 0.27 },
  Stellar: { hp: 0.23, attack: 0.28, defense: 0.19, speed: 0.3 },
};
export const archetypeLabel: Record<CreatureType, string> = { Flame: 'Striker', Nature: 'Sturdy', Tide: 'Balanced', Crystal: 'Guardian', Lunar: 'Trickster', Stellar: 'Swift' };

export const baseStatsFor = (card: Card): CreatureStats => {
  const seed = hashSeed(card.id);
  const total = rarityBaseTotal[card.rarity];
  const weights = typeWeights[typeForCard(card)];
  const vary = (shift: number) => ((seed >>> shift) % 9) - 4;
  return {
    hp: Math.round(total * weights.hp) + vary(0),
    attack: Math.round(total * weights.attack) + vary(5),
    defense: Math.round(total * weights.defense) + vary(10),
    speed: Math.round(total * weights.speed) + vary(15),
  };
};
export const statsAtLevel = (card: Card, level: number): CreatureStats => {
  const base = baseStatsFor(card);
  const scale = (value: number) => Math.floor((2 * value * level) / 100) + 5;
  return { hp: Math.floor((2 * base.hp * level) / 100) + level + 10, attack: scale(base.attack), defense: scale(base.defense), speed: scale(base.speed) };
};

export const maxLevel = 50;
export const totalXpForLevel = (level: number) => Math.floor(0.8 * level ** 3);
export const xpToNext = (level: number) => (level >= maxLevel ? 0 : totalXpForLevel(level + 1) - totalXpForLevel(level));
export const xpYield = (rarity: Rarity, level: number, warden: boolean) => Math.max(1, Math.floor(((rarityXpYield[rarity] * level) / 7) * (warden ? 1.5 : 1)));

const learnsetCache = new Map<string, { level: number; move: Move }[]>();
export const learnsetFor = (card: Card) => {
  const cached = learnsetCache.get(card.id);
  if (cached) return cached;
  const type = typeForCard(card);
  const pool = typeMovePools[type];
  const seed = hashSeed(card.id);
  const firstName = card.name.split(' ')[0];
  const signature: Move = {
    id: `sig-${card.id}`, name: `${signatureVerbs[type][seed % 3]} ${firstName}`, type, category: 'strike', power: 75, accuracy: 100, pp: 12, signature: true,
    description: '', ...signatureEffects[type],
  } as Move;
  const templates = [pool[0], pool[1], pool[2], null, pool[3], pool[4], pool[5]];
  const learnset = templates.map((template, index) => ({
    level: learnLevels[index],
    move: template ? { ...template, id: `${type}-${index}`, type } as Move : signature,
  }));
  learnsetCache.set(card.id, learnset);
  return learnset;
};
export const movesAtLevel = (card: Card, level: number) => learnsetFor(card).filter((entry) => entry.level <= level).map((entry) => entry.move).slice(-4);

export const applyXp = (card: Card, progress: CreatureProgress, amount: number) => {
  let { level, xp } = progress;
  const startLevel = level;
  xp += Math.max(0, Math.floor(amount));
  while (level < maxLevel && xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level += 1;
  }
  if (level >= maxLevel) xp = 0;
  const learned = learnsetFor(card).filter((entry) => entry.level > startLevel && entry.level <= level).map((entry) => entry.move);
  return { progress: { level, xp }, levelsGained: level - startLevel, learned };
};

export const defaultProgress = (card: Card): CreatureProgress => ({ level: rarityStartLevel[card.rarity], xp: 0 });

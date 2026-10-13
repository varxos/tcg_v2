import { inventoryKey, catalog } from '../data/catalog';
import { constellationProgress, constellations, totalStarsLit } from './constellations';
import { PlayerStats, StatId } from './save';
import { voidCosmeticKey, voidVariants } from './void';
import { wardens } from './wardens';

export type CosmeticKind = 'title' | 'banner' | 'frame';
export type UnlockRule =
  | { kind: 'default' }
  | { kind: 'event' }
  | { kind: 'constellation'; constellationId: string }
  | { kind: 'allGolden' }
  | { kind: 'warden'; wardenId: string }
  | { kind: 'wardenCount'; count: number }
  | { kind: 'chapter'; chapterId: string; number: number }
  | { kind: 'starsLit'; count: number }
  | { kind: 'stat'; stat: StatId; target: number }
  | { kind: 'discovered'; count: number }
  | { kind: 'void'; key: string }
  | { kind: 'voidStage'; stageId: string }
  | { kind: 'demons'; count: number };
// Cosmetic names are proper names and are never translated.
export type Cosmetic = { id: string; kind: CosmeticKind; name: string; color: string; special?: 'beta' | 'golden' | 'void' | 'demon'; rule: UnlockRule };
export type CosmeticContext = {
  claimedConstellationIds: string[]; inventory: Record<string, number>; defeatedWardenIds: string[];
  claimedQuestIds: string[]; stats: PlayerStats; developerMode: boolean;
  voidCosmeticIds: string[]; claimedVoidStageIds: string[]; demonsOwned: number;
};

const grey = '#BDB5C8';
export const titles: Cosmetic[] = [
  { id: 'stargazer', kind: 'title', name: 'Stargazer', color: grey, rule: { kind: 'default' } },
  { id: 'beta-player', kind: 'title', name: 'BETA PLAYER', color: '#FF5F6D', special: 'beta', rule: { kind: 'event' } },
  { id: 'first-light', kind: 'title', name: 'First Light', color: grey, rule: { kind: 'constellation', constellationId: 'first-light' } },
  { id: 'wild-tracker', kind: 'title', name: 'Wild Tracker', color: grey, rule: { kind: 'stat', stat: 'wildWins', target: 25 } },
  { id: 'sky-cartographer', kind: 'title', name: 'Sky Cartographer', color: grey, rule: { kind: 'starsLit', count: 12 } },
  { id: 'astral-guardian', kind: 'title', name: 'Astral Guardian', color: grey, rule: { kind: 'constellation', constellationId: 'astral-guardians' } },
  { id: 'warden-breaker', kind: 'title', name: 'Warden Breaker', color: grey, rule: { kind: 'wardenCount', count: 4 } },
  { id: 'starfall-champion', kind: 'title', name: 'Starfall Champion', color: grey, rule: { kind: 'chapter', chapterId: 'ch9', number: 9 } },
  { id: 'void-walker', kind: 'title', name: 'Void Walker', color: '#C9A6FF', special: 'void', rule: { kind: 'voidStage', stageId: 'singularity' } },
  { id: 'demon-lord', kind: 'title', name: 'DEMON LORD', color: '#FF4D6D', special: 'demon', rule: { kind: 'demons', count: 3 } },
  { id: 'golden-celestin', kind: 'title', name: 'GOLDEN CELESTIN', color: '#76DFFF', special: 'golden', rule: { kind: 'allGolden' } },
];
const voidBanner = (id: 'gargantua' | 'crimson' | 'violet' | 'azure', name: string): Cosmetic => ({ id: `void-${id}`, kind: 'banner', name, color: voidVariants[id].body, rule: { kind: 'void', key: voidCosmeticKey('banner', `void-${id}`) } });
const voidFrame = (id: 'gargantua' | 'crimson' | 'violet' | 'azure', name: string): Cosmetic => ({ id: `void-${id}`, kind: 'frame', name, color: voidVariants[id].body, rule: { kind: 'void', key: voidCosmeticKey('frame', `void-${id}`) } });
export const banners: Cosmetic[] = [
  { id: 'night', kind: 'banner', name: 'Night Voyage', color: '#8064A8', rule: { kind: 'default' } },
  { id: 'starchart', kind: 'banner', name: 'Star Chart', color: '#73DDEC', rule: { kind: 'starsLit', count: 1 } },
  { id: 'ember', kind: 'banner', name: 'Ember Circuit', color: '#FF8069', rule: { kind: 'warden', wardenId: 'pip' } },
  { id: 'wildwood', kind: 'banner', name: 'Wildwood Glade', color: '#8FD28A', rule: { kind: 'stat', stat: 'wildWins', target: 10 } },
  { id: 'dawn', kind: 'banner', name: 'First Light', color: '#FFAB76', rule: { kind: 'constellation', constellationId: 'first-light' } },
  { id: 'aurora', kind: 'banner', name: 'Aurora Veil', color: '#D79CF7', rule: { kind: 'wardenCount', count: 4 } },
  { id: 'seraph', kind: 'banner', name: 'Seraph Summit', color: '#FFF1C9', rule: { kind: 'warden', wardenId: 'seraphine' } },
  { id: 'golden', kind: 'banner', name: 'Golden Zenith', color: '#FFE072', rule: { kind: 'allGolden' } },
  voidBanner('gargantua', 'Gargantua Horizon'),
  voidBanner('crimson', 'Crimson Singularity'),
  voidBanner('violet', 'Violet Quasar'),
  voidBanner('azure', 'Azure Abyss'),
];
export const frames: Cosmetic[] = [
  { id: 'basic', kind: 'frame', name: 'Basic', color: '#B6A4D5', rule: { kind: 'default' } },
  { id: 'wave', kind: 'frame', name: 'Wave Ring', color: '#69CDEE', rule: { kind: 'warden', wardenId: 'maris' } },
  { id: 'astral', kind: 'frame', name: 'Astral Halo', color: '#BBA0FF', rule: { kind: 'constellation', constellationId: 'astral-guardians' } },
  { id: 'sigil', kind: 'frame', name: 'Sigil Ring', color: '#8FE4FF', rule: { kind: 'wardenCount', count: 8 } },
  { id: 'crown', kind: 'frame', name: 'Golden Crown', color: '#FFD54A', rule: { kind: 'allGolden' } },
  voidFrame('gargantua', 'Event Horizon'),
  voidFrame('crimson', 'Crimson Maw'),
  voidFrame('violet', 'Violet Pulsar'),
  voidFrame('azure', 'Azure Rift'),
];
export const allCosmetics = [...titles, ...banners, ...frames];
export const cosmeticById = (kind: CosmeticKind, id: string) => allCosmetics.find((cosmetic) => cosmetic.kind === kind && cosmetic.id === id) ?? null;

const goldenConstellations = constellations.filter((constellation) => constellation.groups[0]?.golden);
const discovered = (inventory: Record<string, number>) => catalog.filter((card) => (inventory[inventoryKey(card)] ?? 0) > 0 || (inventory[inventoryKey(card, true)] ?? 0) > 0).length;

export const ruleProgress = (rule: UnlockRule, ctx: CosmeticContext): { value: number; target: number } => {
  switch (rule.kind) {
    case 'default':
    case 'event':
      return { value: 1, target: 1 };
    case 'constellation': {
      const constellation = constellations.find((entry) => entry.id === rule.constellationId);
      const target = constellation?.groups.length ?? 1;
      if (ctx.claimedConstellationIds.includes(rule.constellationId)) return { value: target, target };
      return { value: constellation ? Math.min(target - 1, constellationProgress(constellation, ctx.inventory)) : 0, target };
    }
    case 'allGolden':
      return { value: goldenConstellations.filter((constellation) => constellationProgress(constellation, ctx.inventory) === constellation.groups.length).length, target: goldenConstellations.length };
    case 'warden':
      return { value: ctx.defeatedWardenIds.includes(rule.wardenId) ? 1 : 0, target: 1 };
    case 'wardenCount':
      return { value: Math.min(rule.count, ctx.defeatedWardenIds.length), target: rule.count };
    case 'chapter':
      return { value: ctx.claimedQuestIds.includes(`${rule.chapterId}-bonus`) ? 1 : 0, target: 1 };
    case 'starsLit':
      return { value: Math.min(rule.count, totalStarsLit(ctx.inventory)), target: rule.count };
    case 'stat':
      return { value: Math.min(rule.target, ctx.stats[rule.stat]), target: rule.target };
    case 'discovered':
      return { value: Math.min(rule.count, discovered(ctx.inventory)), target: rule.count };
    case 'void':
      return { value: ctx.voidCosmeticIds.includes(rule.key) ? 1 : 0, target: 1 };
    case 'voidStage':
      return { value: ctx.claimedVoidStageIds.includes(rule.stageId) ? 1 : 0, target: 1 };
    case 'demons':
      return { value: Math.min(rule.count, ctx.demonsOwned), target: rule.count };
  }
};

export const isUnlocked = (cosmetic: Cosmetic, ctx: CosmeticContext) => {
  if (ctx.developerMode || cosmetic.rule.kind === 'default' || cosmetic.rule.kind === 'event') return true;
  const { value, target } = ruleProgress(cosmetic.rule, ctx);
  return value >= target;
};

export const ruleSubject = (rule: UnlockRule) => {
  if (rule.kind === 'constellation') return constellations.find((entry) => entry.id === rule.constellationId)?.name ?? rule.constellationId;
  if (rule.kind === 'warden') return wardens.find((entry) => entry.id === rule.wardenId)?.name ?? rule.wardenId;
  return '';
};

// Cosmetics granted by a given constellation (directly, or as part of the golden set).
export const cosmeticsForConstellation = (constellationId: string) => {
  const golden = goldenConstellations.some((constellation) => constellation.id === constellationId);
  return allCosmetics.filter((cosmetic) => (cosmetic.rule.kind === 'constellation' && cosmetic.rule.constellationId === constellationId) || (golden && cosmetic.rule.kind === 'allGolden'));
};
export const cosmeticsForWarden = (wardenId: string, wardenIndex: number) => allCosmetics.filter((cosmetic) => (cosmetic.rule.kind === 'warden' && cosmetic.rule.wardenId === wardenId) || (cosmetic.rule.kind === 'wardenCount' && cosmetic.rule.count === wardenIndex + 1));
export const cosmeticsForStat = (stat: StatId) => allCosmetics.filter((cosmetic) => cosmetic.rule.kind === 'stat' && cosmetic.rule.stat === stat);
export const voidCosmetics = allCosmetics.filter((cosmetic) => cosmetic.rule.kind === 'void');

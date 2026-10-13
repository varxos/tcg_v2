import AsyncStorage from '@react-native-async-storage/async-storage';
import { BoosterId, Rarity, defaultOdds, supernovaGoal } from '../data/catalog';
import { Language, detectLanguage } from '../i18n/languages';
import { CreatureProgress } from './creatures';
import { Bag, emptyBag } from './items';

export type PlayerStats = {
  starsOpened: number; battlesWon: number; wildWins: number; wardenWins: number; superEffective: number; crits: number;
  knockouts: number; itemsUsed: number; movesUsed: number; levelUps: number; goldenFound: number; decksSaved: number;
};
export type StatId = keyof PlayerStats;
export type DailyState = { dateKey: string; counters: PlayerStats; claimedIds: string[]; bonusClaimed: boolean };
export type PlayerDeck = { id: string; name: string; cardIds: string[] };
export type BattleSpeed = 'normal' | 'fast';
export type AppSettings = {
  language: Language; sfx: boolean; sfxVolume: number; music: boolean; musicVolume: number;
  haptics: boolean; battleSpeed: BattleSpeed; quickOpen: boolean;
};
// Developer-only drop rate override; golden is a percentage.
export type DevOdds = { enabled: boolean; odds: Record<Rarity, number>; golden: number };
export type SaveData = {
  version: 2;
  celesti: number; inventory: Record<string, number>;
  dawnOpened: number; totalOpened: number; openedByStar: Partial<Record<BoosterId, number>>; supernovaCharge: number;
  claimedConstellationIds: string[]; claimedQuestIds: string[];
  playerName: string; selectedTitleId: string; selectedBannerId: string; selectedFrameId: string; developerMode: boolean;
  lastDailyCelestiClaimed: number | null; ownedArenaThemeIds: string[]; selectedArenaThemeId: string;
  playerDecks: PlayerDeck[]; battleTeamIds: string[]; selectedBattleDeckId: string | null;
  creatureProgress: Record<string, CreatureProgress>; bag: Bag; defeatedWardenIds: string[];
  stats: PlayerStats; daily: DailyState; starterId: string | null;
  settings: AppSettings; avatarCardId: string | null; seenCosmeticIds: string[]; devOdds: DevOdds;
  // Void Quasar progress: openings, pity counter, essence wallet and lifetime total, quasar cosmetics and dive stages.
  voidOpened: number; voidPity: number; demonEssence: number; essenceEarned: number; voidCosmeticIds: string[]; claimedVoidStageIds: string[];
};

export const saveKey = 'booster-burst-v2/save';
export const emptyStats = (): PlayerStats => ({
  starsOpened: 0, battlesWon: 0, wildWins: 0, wardenWins: 0, superEffective: 0, crits: 0,
  knockouts: 0, itemsUsed: 0, movesUsed: 0, levelUps: 0, goldenFound: 0, decksSaved: 0,
});
export const defaultSettings = (): AppSettings => ({
  language: detectLanguage(), sfx: true, sfxVolume: 0.8, music: true, musicVolume: 0.45, haptics: true, battleSpeed: 'normal', quickOpen: false,
});
export const defaultDevOdds = (): DevOdds => ({ enabled: false, odds: { ...defaultOdds }, golden: 1 });
export const todayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const freshDaily = (): DailyState => ({ dateKey: todayKey(), counters: emptyStats(), claimedIds: [], bonusClaimed: false });
export const currentDaily = (daily: DailyState) => (daily.dateKey === todayKey() ? daily : freshDaily());
export const addStats = (stats: PlayerStats, delta: Partial<PlayerStats>): PlayerStats => {
  const next = { ...stats };
  (Object.keys(delta) as StatId[]).forEach((key) => { next[key] = (next[key] ?? 0) + (delta[key] ?? 0); });
  return next;
};

export const initialDecks = (): PlayerDeck[] => [
  { id: 'deck-1', name: 'DECK 1', cardIds: [] },
  { id: 'deck-2', name: 'DECK 2', cardIds: [] },
  { id: 'deck-3', name: 'DECK 3', cardIds: [] },
];

export const createDefaultSave = (): SaveData => ({
  version: 2, celesti: 30, inventory: {}, dawnOpened: 0, totalOpened: 0, openedByStar: {}, supernovaCharge: 0,
  claimedConstellationIds: [], claimedQuestIds: [], playerName: 'Celesti Collector', selectedTitleId: 'beta-player', selectedBannerId: 'night', selectedFrameId: 'basic',
  developerMode: false, lastDailyCelestiClaimed: null, ownedArenaThemeIds: ['nebula'], selectedArenaThemeId: 'nebula',
  playerDecks: initialDecks(), battleTeamIds: [], selectedBattleDeckId: null, creatureProgress: {}, bag: emptyBag(), defeatedWardenIds: [],
  stats: emptyStats(), daily: freshDaily(), starterId: null, settings: defaultSettings(), avatarCardId: null, seenCosmeticIds: [], devOdds: defaultDevOdds(),
  voidOpened: 0, voidPity: 0, demonEssence: 0, essenceEarned: 0, voidCosmeticIds: [], claimedVoidStageIds: [],
});

// Older saves tracked a one-time "Crack the Sparkle" reward; unclaimed Dawn progress becomes Supernova charge.
type LegacySave = Partial<SaveData> & { sparkleClaimed?: boolean };
const legacySupernovaCharge = (partial: LegacySave) => (partial.sparkleClaimed ? 0 : Math.min(supernovaGoal, partial.dawnOpened ?? 0));

const mergeSave = (partial: LegacySave): SaveData => {
  const base = createDefaultSave();
  const { sparkleClaimed: _legacy, ...rest } = partial;
  return {
    ...base, ...rest, version: 2,
    stats: { ...base.stats, ...(partial.stats ?? {}) },
    bag: { ...base.bag, ...(partial.bag ?? {}) },
    daily: currentDaily(partial.daily ? { ...base.daily, ...partial.daily, counters: { ...emptyStats(), ...(partial.daily.counters ?? {}) } } : base.daily),
    playerDecks: partial.playerDecks?.length ? partial.playerDecks : base.playerDecks,
    settings: { ...base.settings, ...(partial.settings ?? {}) },
    seenCosmeticIds: partial.seenCosmeticIds ?? base.seenCosmeticIds,
    supernovaCharge: typeof partial.supernovaCharge === 'number' ? partial.supernovaCharge : legacySupernovaCharge(partial),
    devOdds: { ...base.devOdds, ...(partial.devOdds ?? {}), odds: { ...base.devOdds.odds, ...(partial.devOdds?.odds ?? {}) } },
  };
};

export const loadSave = async (): Promise<SaveData | null> => {
  try {
    const raw = await AsyncStorage.getItem(saveKey);
    return raw ? mergeSave(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};
export const writeSave = async (data: SaveData) => {
  try {
    await AsyncStorage.setItem(saveKey, JSON.stringify(data));
  } catch {
    // Saving is best effort in this local pre-release build.
  }
};
export const clearSave = async () => {
  try {
    await AsyncStorage.removeItem(saveKey);
  } catch {
    // Ignore storage errors.
  }
};

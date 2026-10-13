import { BoosterId, Card, Rarity, catalog, inventoryKey } from '../data/catalog';
import { hashSeed } from './creatures';
import { ItemReward } from './items';
import { DailyState, PlayerStats, StatId } from './save';

export type QuestGoal =
  | { kind: 'stat'; stat: StatId; target: number }
  | { kind: 'starter' }
  | { kind: 'discovered'; target: number }
  | { kind: 'rarity'; rarity: Rarity; target: number }
  | { kind: 'starOpened'; star: BoosterId; target: number }
  | { kind: 'teamSize'; target: number }
  | { kind: 'maxLevel'; target: number }
  | { kind: 'squadLevel'; level: number; count: number }
  | { kind: 'types'; target: number }
  | { kind: 'warden'; wardenId: string }
  | { kind: 'constellationStars'; target: number }
  | { kind: 'constellationClaimed'; target: number };
export type QuestAction = 'stars' | 'battle' | 'constellations' | 'squad' | 'cards';
export type QuestReward = { celesti: number; items?: ItemReward[]; titleId?: string };
export type Quest = { id: string; title: string; copy: string; icon: string; goal: QuestGoal; reward: QuestReward; action?: QuestAction };
export type Chapter = { id: string; number: number; title: string; copy: string; color: string; quests: Quest[]; bonus: QuestReward };
export type QuestContext = {
  stats: PlayerStats; inventory: Record<string, number>; openedByStar: Partial<Record<BoosterId, number>>; starterChosen: boolean;
  squadLevels: number[]; ownedLevels: number[]; ownedTypes: number; defeatedWardenIds: string[]; constellationStarsLit: number; constellationsClaimed: number;
};

const rarityRank: Record<Rarity, number> = { Common: 0, Rare: 1, 'Very Rare': 2, Epic: 3, Legendary: 4, Angelic: 5, Demonic: 5 };
const owned = (inventory: Record<string, number>, card: Card) => (inventory[inventoryKey(card)] ?? 0) > 0 || (inventory[inventoryKey(card, true)] ?? 0) > 0;
export const discoveredCount = (inventory: Record<string, number>) => catalog.filter((card) => owned(inventory, card)).length;

export const goalProgress = (goal: QuestGoal, ctx: QuestContext): { value: number; target: number } => {
  switch (goal.kind) {
    case 'stat': return { value: ctx.stats[goal.stat], target: goal.target };
    case 'starter': return { value: ctx.starterChosen ? 1 : 0, target: 1 };
    case 'discovered': return { value: discoveredCount(ctx.inventory), target: goal.target };
    case 'rarity': return { value: catalog.filter((card) => rarityRank[card.rarity] >= rarityRank[goal.rarity] && owned(ctx.inventory, card)).length, target: goal.target };
    case 'starOpened': return { value: ctx.openedByStar[goal.star] ?? 0, target: goal.target };
    case 'teamSize': return { value: ctx.squadLevels.length, target: goal.target };
    case 'maxLevel': return { value: ctx.ownedLevels.length ? Math.max(...ctx.ownedLevels) : 0, target: goal.target };
    case 'squadLevel': return { value: ctx.squadLevels.filter((level) => level >= goal.level).length, target: goal.count };
    case 'types': return { value: ctx.ownedTypes, target: goal.target };
    case 'warden': return { value: ctx.defeatedWardenIds.includes(goal.wardenId) ? 1 : 0, target: 1 };
    case 'constellationStars': return { value: ctx.constellationStarsLit, target: goal.target };
    case 'constellationClaimed': return { value: ctx.constellationsClaimed, target: goal.target };
  }
};
export const questReady = (quest: Quest, ctx: QuestContext) => {
  const { value, target } = goalProgress(quest.goal, ctx);
  return value >= target;
};

const quest = (id: string, title: string, copy: string, icon: string, goal: QuestGoal, celesti: number, action?: QuestAction, items?: ItemReward[]): Quest => ({ id, title, copy, icon, goal, action, reward: { celesti, items } });

export const storyChapters: Chapter[] = [
  {
    id: 'ch1', number: 1, title: 'A Spark in the Sky', color: '#FFBB68', copy: 'Meet your partner and learn how stars and battles work.',
    bonus: { celesti: 30, items: [{ itemId: 'tonic', amount: 3 }] },
    quests: [
      quest('ch1-starter', 'Choose a Partner', 'Pick the creature that will start the journey with you.', '✦', { kind: 'starter' }, 10, 'squad'),
      quest('ch1-open', 'First Star', 'Open your first star in the Stars tab.', '✧', { kind: 'stat', stat: 'starsOpened', target: 1 }, 15, 'stars'),
      quest('ch1-wild', 'Wild Skies', 'Win a Wild Skies battle.', '⚔', { kind: 'stat', stat: 'wildWins', target: 1 }, 15, 'battle', [{ itemId: 'tonic', amount: 2 }]),
      quest('ch1-squad', 'Two Is a Team', 'Build a squad of at least 2 creatures.', '▦', { kind: 'teamSize', target: 2 }, 10, 'squad'),
    ],
  },
  {
    id: 'ch2', number: 2, title: 'The Ember Scout', color: '#FF8069', copy: 'Grow your squad and earn your first Sigil from Warden Pip.',
    bonus: { celesti: 40, items: [{ itemId: 'dew', amount: 2 }] },
    quests: [
      quest('ch2-discover', 'Little Collection', 'Discover 5 different creatures.', '▦', { kind: 'discovered', target: 5 }, 20, 'stars'),
      quest('ch2-level', 'Growing Stronger', 'Raise any creature to level 8.', '↑', { kind: 'maxLevel', target: 8 }, 20, 'battle'),
      quest('ch2-deck', 'Battle Plan', 'Save a squad into one of your decks.', '☰', { kind: 'stat', stat: 'decksSaved', target: 1 }, 10, 'squad'),
      quest('ch2-pip', 'Ember Sigil', 'Defeat Pip, the Ember Scout.', '✹', { kind: 'warden', wardenId: 'pip' }, 25, 'battle'),
    ],
  },
  {
    id: 'ch3', number: 3, title: 'Rare Currents', color: '#8FD28A', copy: 'Hunt for rarer creatures and challenge the Glade Keeper.',
    bonus: { celesti: 50, items: [{ itemId: 'candy', amount: 1 }] },
    quests: [
      quest('ch3-rare', 'Rare Sighting', 'Discover a Rare creature or better.', '✧', { kind: 'rarity', rarity: 'Rare', target: 1 }, 25, 'stars'),
      quest('ch3-open', 'Star Walker', 'Open 10 stars in total.', '☄', { kind: 'stat', stat: 'starsOpened', target: 10 }, 25, 'stars'),
      quest('ch3-item', 'Field Medic', 'Use an item during a battle.', '✚', { kind: 'stat', stat: 'itemsUsed', target: 1 }, 15, 'battle'),
      quest('ch3-mira', 'Bloom Sigil', 'Defeat Mira, the Glade Keeper.', '❋', { kind: 'warden', wardenId: 'mira' }, 30, 'battle'),
    ],
  },
  {
    id: 'ch4', number: 4, title: 'Tides of Twilight', color: '#69CDEE', copy: 'Master type matchups before facing Captain Maris.',
    bonus: { celesti: 60, items: [{ itemId: 'elixir', amount: 2 }] },
    quests: [
      quest('ch4-twilight', 'Twilight Tides', 'Open 5 Twilight Stars.', '☾', { kind: 'starOpened', star: 'twilight', target: 5 }, 25, 'stars'),
      quest('ch4-types', 'Balanced Squad', 'Own creatures of 4 different types.', '◆', { kind: 'types', target: 4 }, 25, 'cards'),
      quest('ch4-super', 'Type Tactician', 'Land 10 super-effective hits.', '✹', { kind: 'stat', stat: 'superEffective', target: 10 }, 25, 'battle'),
      quest('ch4-maris', 'Wave Sigil', 'Defeat Captain Maris.', '≈', { kind: 'warden', wardenId: 'maris' }, 35, 'battle'),
    ],
  },
  {
    id: 'ch5', number: 5, title: 'Crystal Resolve', color: '#B8A0FF', copy: 'Light the sky and outsmart the Crystal Sage.',
    bonus: { celesti: 70, items: [{ itemId: 'revive', amount: 2 }] },
    quests: [
      quest('ch5-veryrare', 'Glimmer of Legend', 'Discover a Very Rare creature or better.', '✧', { kind: 'rarity', rarity: 'Very Rare', target: 1 }, 35, 'stars'),
      quest('ch5-trio', 'Seasoned Trio', 'Have 3 squad members at level 15 or higher.', '↑', { kind: 'squadLevel', level: 15, count: 3 }, 30, 'battle'),
      quest('ch5-star', 'First Constellation Star', 'Light any constellation star.', '✦', { kind: 'constellationStars', target: 1 }, 30, 'constellations'),
      quest('ch5-quartz', 'Prism Sigil', 'Defeat Sage Quartz.', '◆', { kind: 'warden', wardenId: 'quartz' }, 40, 'battle'),
    ],
  },
  {
    id: 'ch6', number: 6, title: 'Moonlit Trials', color: '#D6A5FF', copy: 'Prove your consistency under Noctis\'s moon.',
    bonus: { celesti: 80, items: [{ itemId: 'candy', amount: 2 }] },
    quests: [
      quest('ch6-discover', 'Growing Atlas', 'Discover 25 different creatures.', '▦', { kind: 'discovered', target: 25 }, 40, 'stars'),
      quest('ch6-wins', 'Arena Regular', 'Win 15 battles.', '⚔', { kind: 'stat', stat: 'battlesWon', target: 15 }, 35, 'battle'),
      quest('ch6-level', 'Moonlit Veteran', 'Raise any creature to level 22.', '↑', { kind: 'maxLevel', target: 22 }, 35, 'battle'),
      quest('ch6-noctis', 'Crescent Sigil', 'Defeat Noctis, the Moon Warden.', '☾', { kind: 'warden', wardenId: 'noctis' }, 45, 'battle'),
    ],
  },
  {
    id: 'ch7', number: 7, title: 'Astral Ascent', color: '#FFE37D', copy: 'A full squad, epic finds and the fastest captain in the sky.',
    bonus: { celesti: 100, items: [{ itemId: 'elixir', amount: 3 }] },
    quests: [
      quest('ch7-epic', 'Epic Discovery', 'Discover an Epic creature or better.', '✺', { kind: 'rarity', rarity: 'Epic', target: 1 }, 50, 'stars'),
      quest('ch7-squad', 'Astral Squad', 'Have 5 squad members at level 25 or higher.', '▦', { kind: 'squadLevel', level: 25, count: 5 }, 45, 'battle'),
      quest('ch7-open', 'Star Voyager', 'Open 40 stars in total.', '☄', { kind: 'stat', stat: 'starsOpened', target: 40 }, 40, 'stars'),
      quest('ch7-astra', 'Comet Sigil', 'Defeat Astra, the Star Captain.', '✦', { kind: 'warden', wardenId: 'astra' }, 55, 'battle'),
    ],
  },
  {
    id: 'ch8', number: 8, title: 'Twin Eclipse', color: '#FF9C6B', copy: 'Sun and moon stand between you and the summit.',
    bonus: { celesti: 120, items: [{ itemId: 'revive', amount: 3 }, { itemId: 'candy', amount: 2 }] },
    quests: [
      quest('ch8-ko', 'Hundred Knockouts', 'Knock out 100 creatures.', '✹', { kind: 'stat', stat: 'knockouts', target: 100 }, 50, 'battle'),
      quest('ch8-constellation', 'Sky Architect', 'Claim a constellation reward.', '✧', { kind: 'constellationClaimed', target: 1 }, 50, 'constellations'),
      quest('ch8-level', 'Eclipse Ready', 'Raise any creature to level 32.', '↑', { kind: 'maxLevel', target: 32 }, 50, 'battle'),
      quest('ch8-eclipse', 'Eclipse Sigil', 'Defeat Sol & Luna, the Twin Eclipse.', '◐', { kind: 'warden', wardenId: 'eclipse' }, 65, 'battle'),
    ],
  },
  {
    id: 'ch9', number: 9, title: 'Seraph Summit', color: '#FFF1C9', copy: 'The Starfall Champion awaits at the top of the sky.',
    bonus: { celesti: 200, titleId: 'starfall-champion' },
    quests: [
      quest('ch9-legend', 'Living Legend', 'Discover a Legendary creature or better.', '♛', { kind: 'rarity', rarity: 'Legendary', target: 1 }, 80, 'stars'),
      quest('ch9-squad', 'Summit Squad', 'Have 5 squad members at level 38 or higher.', '▦', { kind: 'squadLevel', level: 38, count: 5 }, 70, 'battle'),
      quest('ch9-champion', 'Seraph Crown', 'Defeat Seraphine, the Starfall Champion.', '☼', { kind: 'warden', wardenId: 'seraphine' }, 100, 'battle'),
    ],
  },
];
export const chapterBonusId = (chapter: Chapter) => `${chapter.id}-bonus`;
export const chapterDone = (chapter: Chapter, claimed: string[]) => claimed.includes(chapterBonusId(chapter));
export const activeChapterIndex = (claimed: string[]) => {
  const index = storyChapters.findIndex((chapter) => !chapterDone(chapter, claimed));
  return index === -1 ? storyChapters.length - 1 : index;
};

export type DailyQuest = { id: string; title: string; copy: string; icon: string; stat: StatId; target: number; reward: QuestReward; action: QuestAction };
export const dailyPool: DailyQuest[] = [
  { id: 'd-open', title: 'Stargazer', copy: 'Open 3 stars.', icon: '✦', stat: 'starsOpened', target: 3, reward: { celesti: 12 }, action: 'stars' },
  { id: 'd-win', title: 'Arena Spirit', copy: 'Win 2 battles.', icon: '⚔', stat: 'battlesWon', target: 2, reward: { celesti: 15 }, action: 'battle' },
  { id: 'd-wild', title: 'Wild Tracker', copy: 'Win 3 Wild Skies battles.', icon: '❋', stat: 'wildWins', target: 3, reward: { celesti: 15, items: [{ itemId: 'tonic', amount: 1 }] }, action: 'battle' },
  { id: 'd-super', title: 'Type Advantage', copy: 'Land 4 super-effective hits.', icon: '✹', stat: 'superEffective', target: 4, reward: { celesti: 12 }, action: 'battle' },
  { id: 'd-ko', title: 'Knockout Round', copy: 'Knock out 6 creatures.', icon: '✧', stat: 'knockouts', target: 6, reward: { celesti: 15 }, action: 'battle' },
  { id: 'd-item', title: 'Supply Run', copy: 'Use an item in battle.', icon: '✚', stat: 'itemsUsed', target: 1, reward: { celesti: 8, items: [{ itemId: 'tonic', amount: 2 }] }, action: 'battle' },
  { id: 'd-crit', title: 'Critical Eye', copy: 'Land 2 critical hits.', icon: '◆', stat: 'crits', target: 2, reward: { celesti: 12 }, action: 'battle' },
  { id: 'd-level', title: 'Level Up', copy: 'Level up any creature once.', icon: '↑', stat: 'levelUps', target: 1, reward: { celesti: 12 }, action: 'battle' },
  { id: 'd-moves', title: 'Move Practice', copy: 'Use 15 moves in battle.', icon: '☄', stat: 'movesUsed', target: 15, reward: { celesti: 10, items: [{ itemId: 'dew', amount: 1 }] }, action: 'battle' },
];
export const dailyBonus: QuestReward = { celesti: 25, items: [{ itemId: 'elixir', amount: 1 }] };
export const dailyQuestsFor = (dateKey: string) => {
  const ranked = dailyPool.map((entry) => ({ entry, score: hashSeed(`${dateKey}:${entry.id}`) })).sort((a, b) => a.score - b.score);
  const picks: DailyQuest[] = [ranked[0].entry];
  // Always offer one star-opening or collection quest and two battle quests.
  const opener = ranked.find(({ entry }) => entry.action === 'stars');
  if (opener && !picks.includes(opener.entry)) picks[0] = opener.entry;
  ranked.forEach(({ entry }) => { if (picks.length < 3 && entry.action === 'battle' && !picks.includes(entry)) picks.push(entry); });
  return picks;
};

export type MilestoneMetric = { kind: 'stat'; stat: StatId } | { kind: 'discovered' } | { kind: 'maxLevel' } | { kind: 'wardens' };
export type MilestoneTrack = { id: string; title: string; icon: string; color: string; metric: MilestoneMetric; tiers: { target: number; reward: QuestReward }[] };
const tiers = (targets: number[], rewards: number[], items: (ItemReward | undefined)[] = []) => targets.map((target, index) => ({ target, reward: { celesti: rewards[index], items: items[index] ? [items[index]!] : undefined } }));
export const milestoneTracks: MilestoneTrack[] = [
  { id: 'ms-open', title: 'Star Opener', icon: '✦', color: '#FFBB68', metric: { kind: 'stat', stat: 'starsOpened' }, tiers: tiers([10, 30, 75, 150, 300], [20, 40, 70, 110, 180], [undefined, { itemId: 'tonic', amount: 3 }, undefined, { itemId: 'candy', amount: 1 }, { itemId: 'candy', amount: 2 }]) },
  { id: 'ms-collect', title: 'Collector', icon: '▦', color: '#8ED0A7', metric: { kind: 'discovered' }, tiers: tiers([10, 25, 45, 70, 93], [25, 50, 90, 140, 250]) },
  { id: 'ms-wins', title: 'Battle Victor', icon: '⚔', color: '#8FE4FF', metric: { kind: 'stat', stat: 'battlesWon' }, tiers: tiers([5, 20, 50, 100, 200], [20, 40, 70, 110, 170], [{ itemId: 'tonic', amount: 3 }, { itemId: 'elixir', amount: 2 }, { itemId: 'revive', amount: 2 }, { itemId: 'candy', amount: 1 }, { itemId: 'candy', amount: 2 }]) },
  { id: 'ms-super', title: 'Type Master', icon: '✹', color: '#FF8069', metric: { kind: 'stat', stat: 'superEffective' }, tiers: tiers([10, 50, 150, 400], [15, 35, 70, 120]) },
  { id: 'ms-level', title: 'Trainer Spirit', icon: '↑', color: '#D79CF7', metric: { kind: 'maxLevel' }, tiers: tiers([10, 20, 30, 40, 50], [20, 40, 70, 110, 200], [undefined, { itemId: 'candy', amount: 1 }, undefined, { itemId: 'candy', amount: 2 }, undefined]) },
  { id: 'ms-wardens', title: 'Sigil Hunter', icon: '◐', color: '#FFE072', metric: { kind: 'wardens' }, tiers: tiers([1, 4, 8], [30, 80, 200]) },
  { id: 'ms-golden', title: 'Golden Hunter', icon: '✧', color: '#FFD54A', metric: { kind: 'stat', stat: 'goldenFound' }, tiers: tiers([1, 3, 6], [50, 120, 250]) },
];
export const milestoneValue = (track: MilestoneTrack, ctx: QuestContext) => {
  if (track.metric.kind === 'stat') return ctx.stats[track.metric.stat];
  if (track.metric.kind === 'discovered') return discoveredCount(ctx.inventory);
  if (track.metric.kind === 'wardens') return ctx.defeatedWardenIds.length;
  return ctx.ownedLevels.length ? Math.max(...ctx.ownedLevels) : 0;
};
export const milestoneTierId = (track: MilestoneTrack, tier: number) => `${track.id}-${tier}`;

// Number of rewards waiting to be claimed across story, daily and milestone quests.
export const claimableCount = (ctx: QuestContext, claimedIds: string[], daily: DailyState) => {
  const chapter = storyChapters[activeChapterIndex(claimedIds)];
  let count = chapter.quests.filter((entry) => !claimedIds.includes(entry.id) && questReady(entry, ctx)).length;
  if (chapter.quests.every((entry) => claimedIds.includes(entry.id)) && !claimedIds.includes(chapterBonusId(chapter))) count += 1;
  const todays = dailyQuestsFor(daily.dateKey);
  count += todays.filter((entry) => !daily.claimedIds.includes(entry.id) && daily.counters[entry.stat] >= entry.target).length;
  if (todays.every((entry) => daily.claimedIds.includes(entry.id)) && !daily.bonusClaimed) count += 1;
  count += milestoneTracks.filter((track) => {
    const tier = track.tiers.findIndex((_, index) => !claimedIds.includes(milestoneTierId(track, index)));
    return tier !== -1 && milestoneValue(track, ctx) >= track.tiers[tier].target;
  }).length;
  return count;
};

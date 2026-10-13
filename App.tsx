import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, Image, InteractionManager, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SoundId, configureAudio, playMusic, playSound, preloadSounds, stopSound } from './src/audio/sound';
import {
  Booster, BoosterId, Card, DropResult, OpeningLayout, Rarity, betaEventActive, boosterById, catalog, createVisualTape, demonCards,
  dailyCelestiIntervalMs, drawResult, goldenEligible, inventoryKey, openableStars, rarityTheme, supernovaGoal,
} from './src/data/catalog';
import { BattleState, createBattle } from './src/game/battleEngine';
import { Constellation, constellationProgress, constellations, totalStarsLit } from './src/game/constellations';
import { Cosmetic, CosmeticContext, allCosmetics, isUnlocked, titles } from './src/game/cosmetics';
import { CreatureProgress, CreatureType, applyXp, cardById, defaultProgress, maxLevel, rarityStartLevel, typeForCard, typeTheme, xpToNext } from './src/game/creatures';
import { Bag, ItemId, itemOrder, items } from './src/game/items';
import { DailyQuest, QuestAction, QuestContext, QuestReward, activeChapterIndex, claimableCount, dailyBonus, dailyQuestsFor, goalProgress, storyChapters } from './src/game/quests';
import { AppSettings, DevOdds, PlayerDeck, PlayerStats, SaveData, addStats, clearSave, createDefaultSave, currentDaily, defaultDevOdds, defaultSettings, emptyStats, freshDaily, initialDecks, loadSave, writeSave } from './src/game/save';
import {
  VoidReward, VoidStage, essenceChance, essenceGoal, essencePerDrop, essencePity, rollVoidOpening, voidCosmeticChance, voidCosmeticKey, voidCosmeticPool,
  voidGoalProgress, voidGoldenRate, voidItemChance, voidOdds, voidQuasar, voidStages,
} from './src/game/void';
import { ArenaId, Warden, createWildEncounter, rematchReward, wardenById, wardenTeam, wardens, wildCelestiReward } from './src/game/wardens';
import { I18nProvider, makeTranslator, tk, useI18n } from './src/i18n';
import { styles, v2Styles } from './src/ui/appStyles';
import { BattleHub, SquadMember } from './src/ui/battle/BattleHub';
import { BattleRewardPreview, BattleScene, BattleSession } from './src/ui/battle/BattleScene';
import { SquadBuilder } from './src/ui/battle/SquadBuilder';
import { MiniCard } from './src/ui/cards';
import { CollectionScreen } from './src/ui/collection/CollectionScreen';
import { Countdown } from './src/ui/common';
import { ConstellationDetail, ConstellationsScreen } from './src/ui/constellations/ConstellationsScreen';
import { haptic, setHapticsEnabled } from './src/ui/feedback';
import { AdventureCard, EventStarCard, StarShowcase, WardenCard } from './src/ui/home/HubCards';
import { CosmeticUnlockModal } from './src/ui/profile/CosmeticUnlockModal';
import { PlayerAvatar } from './src/ui/profile/PlayerAvatar';
import { ProfileModal } from './src/ui/profile/ProfileModal';
import { SettingsModal } from './src/ui/profile/SettingsModal';
import { QuestsScreen } from './src/ui/quests/QuestsScreen';
import { StarArt } from './src/ui/stars/StarArt';
import { OpenQuantity, StarsScreen } from './src/ui/stars/StarsScreen';
import { SupernovaSequence } from './src/ui/stars/SupernovaSequence';
import { DemonAltar } from './src/ui/void/DemonAltar';
import { HorizonDive, HorizonEntryCard } from './src/ui/void/HorizonDive';
import { VoidOpening } from './src/ui/void/VoidOpening';
import { StarsPageSwitch, VoidPage, VoidPeek } from './src/ui/void/VoidPage';
import { StarterPicker } from './src/ui/StarterPicker';

type AppTab = 'home' | 'shop' | 'stars' | 'quests' | 'constellations' | 'battle';
type ArenaTheme = { id: ArenaId; name: string; cost: number; color: string; border: string; icon: string };
type RevealNote = { kind: 'new' | 'duplicate' | 'maxed'; type: CreatureType; level: number };
const battleSwordsIcon = require('./assets/icons/battle-swords.png');
const playerId = '#4831';
const appVersion = '0.4.0';
const arenaThemes: ArenaTheme[] = [
  { id: 'nebula', name: 'Nebula Field', cost: 0, color: '#173B54', border: '#4F9DBF', icon: '✦' },
  { id: 'wildwood', name: 'Wildwood Ring', cost: 35, color: '#29483F', border: '#8FD28A', icon: '✿' },
  { id: 'ember', name: 'Ember Court', cost: 50, color: '#553040', border: '#FF9072', icon: '✹' },
  { id: 'aurora', name: 'Aurora Veil', cost: 80, color: '#302553', border: '#73DDEC', icon: '✧' },
];
const celestiBurstParticles = [
  { icon: '✦', x: -155, y: -255, color: '#FFE072', size: 20, delay: 0.03 }, { icon: '✧', x: -92, y: -292, color: '#8FE4FF', size: 15, delay: 0.09 },
  { icon: '•', x: -35, y: -315, color: '#FFF5BD', size: 22, delay: 0.15 }, { icon: '✦', x: 42, y: -298, color: '#F7D2FF', size: 17, delay: 0.05 },
  { icon: '✧', x: 112, y: -244, color: '#FFE072', size: 21, delay: 0.12 }, { icon: '✦', x: 166, y: -165, color: '#8FE4FF', size: 16, delay: 0.19 },
  { icon: '•', x: -174, y: -126, color: '#CDB8FF', size: 19, delay: 0.16 }, { icon: '✧', x: -164, y: -46, color: '#FFE072', size: 18, delay: 0.07 },
  { icon: '✦', x: -178, y: 57, color: '#FFF5BD', size: 15, delay: 0.23 }, { icon: '•', x: -138, y: 146, color: '#8FE4FF', size: 21, delay: 0.11 },
  { icon: '✧', x: -83, y: 220, color: '#FFE072', size: 19, delay: 0.21 }, { icon: '✦', x: -18, y: 274, color: '#F7D2FF', size: 17, delay: 0.08 },
  { icon: '•', x: 61, y: 260, color: '#FFF5BD', size: 20, delay: 0.18 }, { icon: '✧', x: 122, y: 208, color: '#8FE4FF', size: 17, delay: 0.04 },
  { icon: '✦', x: 169, y: 132, color: '#FFE072', size: 21, delay: 0.14 }, { icon: '•', x: 177, y: 38, color: '#F7D2FF', size: 18, delay: 0.24 },
  { icon: '✧', x: 158, y: -55, color: '#FFF5BD', size: 16, delay: 0.1 }, { icon: '✦', x: 95, y: -138, color: '#8FE4FF', size: 19, delay: 0.2 },
];
const cosmeticKey = (cosmetic: Cosmetic) => `${cosmetic.kind}:${cosmetic.id}`;
const revealSound = (rarity: Rarity): SoundId => (rarity === 'Common' ? 'revealCommon' : rarity === 'Rare' || rarity === 'Very Rare' ? 'revealRare' : rarity === 'Epic' ? 'revealEpic' : 'revealLegendary');
const rarityOrder: Rarity[] = ['Common', 'Rare', 'Very Rare', 'Epic', 'Legendary', 'Angelic'];
// Card pitch in the roulette tape: 82px card + 10px gap, after 12px of padding.
const tapeCardWidth = 82;
const tapePitch = 92;
const tapePadding = 12;

function CelestiRewardCelebration({ gain, rewardScale, burst, onDismiss, embedded = false }: { gain: number; rewardScale: Animated.Value; burst: Animated.Value; onDismiss: () => void; embedded?: boolean }) {
  const { t } = useI18n();
  return <Pressable style={[styles.celestiRewardBackdrop, embedded && styles.celestiRewardEmbeddedBackdrop]} onPress={onDismiss}>
    <View pointerEvents="none" style={styles.celestiBurstField}><View style={styles.celestiBurstOrigin}>{celestiBurstParticles.map((particle, index) => {
      const start = particle.delay;
      const translateX = burst.interpolate({ inputRange: [0, start, 1], outputRange: [0, 0, particle.x] });
      const translateY = burst.interpolate({ inputRange: [0, start, 1], outputRange: [0, 0, particle.y] });
      const opacity = burst.interpolate({ inputRange: [0, start, Math.min(start + 0.12, 0.9), 0.82, 1], outputRange: [0, 0, 1, 1, 0.3] });
      const scale = burst.interpolate({ inputRange: [0, start, Math.min(start + 0.16, 0.9), 1], outputRange: [0.1, 0.1, 1, 0.72] });
      return <Animated.View key={index} style={[styles.celestiBurstParticle, { opacity, transform: [{ translateX }, { translateY }, { scale }, { rotate: `${index % 2 === 0 ? 28 : -28}deg` }] }]}><Text style={[styles.celestiBurstParticleText, { color: particle.color, fontSize: particle.size }]}>{particle.icon}</Text></Animated.View>;
    })}</View></View>
    <Animated.View style={[styles.celestiRewardCard, { transform: [{ scale: rewardScale }] }]}>
      <Text style={styles.celestiRewardKicker}>{t('reward.kicker')}</Text>
      <Text style={styles.celestiRewardAmount}>+{gain}</Text>
    </Animated.View>
  </Pressable>;
}

function BattleEmblem({ compact = false, active = false, color }: { compact?: boolean; active?: boolean; color?: string }) {
  return <Image source={battleSwordsIcon} resizeMode="contain" style={[styles.battleEmblem, compact && styles.battleEmblemCompact, { tintColor: color ?? (active ? '#FFE072' : '#C6B8DE') }]} />;
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const t = useMemo(() => makeTranslator(settings.language), [settings.language]);
  const [celesti, setCelesti] = useState(30);
  const [opening, setOpening] = useState(false);
  const [winner, setWinner] = useState<DropResult | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [visibleTab, setVisibleTab] = useState<AppTab>('home');
  const [outgoingTab, setOutgoingTab] = useState<AppTab | null>(null);
  const [tabSlideDirection, setTabSlideDirection] = useState<1 | -1>(1);
  const [selectedBoosterId, setSelectedBoosterId] = useState<BoosterId>('dawn');
  const [openQuantity, setOpenQuantity] = useState<OpenQuantity>(1);
  const [dawnOpened, setDawnOpened] = useState(0);
  const [totalOpened, setTotalOpened] = useState(0);
  const [claimedQuestIds, setClaimedQuestIds] = useState<string[]>([]);
  const [claimedConstellationIds, setClaimedConstellationIds] = useState<string[]>([]);
  const [selectedConstellationId, setSelectedConstellationId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playerName, setPlayerName] = useState('Celesti Collector');
  const [developerMode, setDeveloperMode] = useState(false);
  const [devOdds, setDevOdds] = useState<DevOdds>(defaultDevOdds);
  const [selectedTitleId, setSelectedTitleId] = useState('beta-player');
  const [selectedBannerId, setSelectedBannerId] = useState('night');
  const [selectedFrameId, setSelectedFrameId] = useState('basic');
  const [avatarCardId, setAvatarCardId] = useState<string | null>(null);
  const [seenCosmeticIds, setSeenCosmeticIds] = useState<string[]>([]);
  const [unlockQueue, setUnlockQueue] = useState<Cosmetic[]>([]);
  const [supernovaCharge, setSupernovaCharge] = useState(0);
  const [supernovaActive, setSupernovaActive] = useState(false);
  const [revealSupernova, setRevealSupernova] = useState(false);
  const [batchResults, setBatchResults] = useState<DropResult[] | null>(null);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [battleTeamIds, setBattleTeamIds] = useState<string[]>([]);
  const [playerDecks, setPlayerDecks] = useState<PlayerDeck[]>(initialDecks);
  const [selectedBattleDeckId, setSelectedBattleDeckId] = useState<string | null>(null);
  const [creatureProgress, setCreatureProgress] = useState<Record<string, CreatureProgress>>({});
  const [bag, setBag] = useState<Bag>(() => createDefaultSave().bag);
  const [defeatedWardenIds, setDefeatedWardenIds] = useState<string[]>([]);
  const [stats, setStats] = useState<PlayerStats>(emptyStats);
  const [daily, setDaily] = useState(freshDaily);
  const [starterId, setStarterId] = useState<string | null>(null);
  const [openedByStar, setOpenedByStar] = useState<Partial<Record<BoosterId, number>>>({});
  const [hydrated, setHydrated] = useState(false);
  const [squadOpen, setSquadOpen] = useState(false);
  const [battleSession, setBattleSession] = useState<BattleSession | null>(null);
  const [battleWardenId, setBattleWardenId] = useState<string | null>(null);
  const [battleArena, setBattleArena] = useState<ArenaId>('nebula');
  const [revealNote, setRevealNote] = useState<RevealNote | null>(null);
  const [lastDailyCelestiClaimed, setLastDailyCelestiClaimed] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(Date.now());
  const [shopView, setShopView] = useState<'shop' | 'supplies' | 'market'>('shop');
  const [ownedArenaThemeIds, setOwnedArenaThemeIds] = useState<string[]>(['nebula']);
  const [selectedArenaThemeId, setSelectedArenaThemeId] = useState('nebula');
  const [celestiRewardGain, setCelestiRewardGain] = useState<number | null>(null);
  const [voidOpened, setVoidOpened] = useState(0);
  const [voidPity, setVoidPity] = useState(0);
  const [demonEssence, setDemonEssence] = useState(0);
  const [essenceEarned, setEssenceEarned] = useState(0);
  const [voidCosmeticIds, setVoidCosmeticIds] = useState<string[]>([]);
  const [claimedVoidStageIds, setClaimedVoidStageIds] = useState<string[]>([]);
  const [voidRewards, setVoidRewards] = useState<VoidReward[] | null>(null);
  const [voidNewIds, setVoidNewIds] = useState<string[]>([]);
  const [voidInfoOpen, setVoidInfoOpen] = useState(false);
  const [altarOpen, setAltarOpen] = useState(false);
  const [horizonOpen, setHorizonOpen] = useState(false);
  const [starsPage, setStarsPage] = useState<0 | 1>(0);
  const [starsPagerHeight, setStarsPagerHeight] = useState(0);
  const starsPagerRef = useRef<ScrollView | null>(null);
  const starsPagerX = useRef(new Animated.Value(0)).current;
  // Width of the roulette window: screen minus backdrop padding (40), modal padding (36) and borders (6).
  const [rouletteWidth, setRouletteWidth] = useState(() => Dimensions.get('window').width - 82);
  const battleKey = useRef(1);
  const wildDropRef = useRef<ItemId | null>(null);
  const spin = useRef(new Animated.Value(0)).current;
  const tabSlide = useRef(new Animated.Value(0)).current;
  const tabTransitioning = useRef(false);
  const goldenShimmer = useRef(new Animated.Value(0)).current;
  const spinAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const activeOpening = useRef<{ drawn: DropResult; booster: Booster } | null>(null);
  const revealScale = useRef(new Animated.Value(0.65)).current;
  const celestiRewardScale = useRef(new Animated.Value(0.45)).current;
  const celestiBurst = useRef(new Animated.Value(0)).current;
  const [layout, setLayout] = useState<OpeningLayout>(() => createVisualTape(catalog[0]));

  const selectedBooster = openableStars.find((booster) => booster.id === selectedBoosterId) ?? boosterById('dawn');
  const supernovaBooster = boosterById('sparkle');
  const customOddsActive = developerMode && devOdds.enabled;
  const infoOdds = customOddsActive ? devOdds.odds : selectedBooster.odds;
  const infoGoldenRate = customOddsActive ? devOdds.golden / 100 : selectedBooster.goldenRate;
  const selectedConstellation = constellations.find((constellation) => constellation.id === selectedConstellationId) ?? null;
  const dailyCelestiReady = lastDailyCelestiClaimed === null || clockNow - lastDailyCelestiClaimed >= dailyCelestiIntervalMs;
  const cooldownLabel = (lastClaimed: number | null, interval: number) => {
    const left = Math.max(0, interval - (clockNow - (lastClaimed ?? clockNow)));
    return `${Math.floor(left / 3600000)}h ${Math.ceil((left % 3600000) / 60000).toString().padStart(2, '0')}m`;
  };
  const celebrateCelesti = (amount: number) => {
    setCelestiRewardGain(amount);
    playSound('reward');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      celestiRewardScale.setValue(0.45);
      celestiBurst.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.spring(celestiRewardScale, { toValue: 1.16, friction: 4, tension: 150, useNativeDriver: false }),
          Animated.spring(celestiRewardScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: false }),
        ]),
        Animated.timing(celestiBurst, { toValue: 1, duration: 1050, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start();
    }));
    haptic('success');
  };
  const claimDailyCelesti = () => {
    if (!dailyCelestiReady) {
      playSound('error');
      return;
    }
    setLastDailyCelestiClaimed(Date.now());
    setCelesti((current) => current + 15);
    celebrateCelesti(15);
  };
  const selectOrBuyArenaTheme = (theme: ArenaTheme) => {
    if (ownedArenaThemeIds.includes(theme.id)) {
      setSelectedArenaThemeId(theme.id);
      playSound('toggle');
      haptic('light');
      return;
    }
    if (celesti < theme.cost) {
      playSound('error');
      return;
    }
    setCelesti((current) => current - theme.cost);
    setOwnedArenaThemeIds((current) => [...current, theme.id]);
    setSelectedArenaThemeId(theme.id);
    playSound('purchase');
    haptic('success');
  };
  const developerUnlockEverything = () => {
    const nextInventory: Record<string, number> = {};
    catalog.forEach((card) => { nextInventory[inventoryKey(card)] = 1; if (goldenEligible.includes(card.rarity)) nextInventory[inventoryKey(card, true)] = 1; });
    setInventory(nextInventory);
    setClaimedConstellationIds([]);
    setCreatureProgress((current) => {
      const next = { ...current };
      catalog.forEach((card) => { next[card.id] = next[card.id] ?? defaultProgress(card); });
      return next;
    });
    setStarterId((current) => current ?? 'moss');
    setBag((current) => ({ tonic: current.tonic + 10, elixir: current.elixir + 5, dew: current.dew + 5, revive: current.revive + 5, candy: current.candy + 10 }));
    setOwnedArenaThemeIds(arenaThemes.map((theme) => theme.id));
    setCelesti(9999);
    setSupernovaCharge(supernovaGoal);
    setDemonEssence((value) => value + essenceGoal);
    setEssenceEarned((value) => Math.max(value, essencePerDrop));
    setVoidCosmeticIds(voidCosmeticPool.map((entry) => voidCosmeticKey(entry.kind, entry.id)));
    setSelectedTitleId('golden-celestin');
    haptic('success');
  };

  const ownedCards = useMemo(() => catalog.filter((card) => (inventory[inventoryKey(card)] ?? 0) > 0 || (inventory[inventoryKey(card, true)] ?? 0) > 0), [inventory]);
  const ownedIdSet = useMemo(() => new Set(ownedCards.map((card) => card.id)), [ownedCards]);
  const goldenIds = useMemo(() => new Set(catalog.filter((card) => (inventory[inventoryKey(card, true)] ?? 0) > 0).map((card) => card.id)), [inventory]);
  const progressFor = (card: Card): CreatureProgress => creatureProgress[card.id] ?? defaultProgress(card);
  const ownedMembers: SquadMember[] = ownedCards.map((card) => ({ card, progress: progressFor(card), golden: goldenIds.has(card.id) }));
  const battleTeamCards = battleTeamIds.map((id) => cardById.get(id)).filter((card): card is Card => Boolean(card) && ownedIdSet.has(card!.id)).slice(0, 5);
  const squadMembers: SquadMember[] = battleTeamCards.map((card) => ({ card, progress: progressFor(card), golden: goldenIds.has(card.id) }));
  const bestLevel = ownedMembers.reduce((best, member) => Math.max(best, member.progress.level), 0);
  const activeDaily = currentDaily(daily);
  const avatarCard = [avatarCardId, starterId].map((id) => (id && ownedIdSet.has(id) ? cardById.get(id) : undefined)).find(Boolean) ?? ownedCards[0] ?? null;
  const questCtx = useMemo<QuestContext>(() => ({
    stats, inventory, openedByStar, starterChosen: Boolean(starterId),
    squadLevels: battleTeamCards.map((card) => (creatureProgress[card.id] ?? defaultProgress(card)).level),
    ownedLevels: ownedCards.map((card) => (creatureProgress[card.id] ?? defaultProgress(card)).level),
    ownedTypes: new Set(ownedCards.map((card) => typeForCard(card))).size,
    defeatedWardenIds, constellationStarsLit: totalStarsLit(inventory), constellationsClaimed: claimedConstellationIds.length,
  }), [stats, inventory, openedByStar, starterId, battleTeamIds, creatureProgress, defeatedWardenIds, claimedConstellationIds, ownedCards]);
  const ownedDemonIds = useMemo(() => demonCards.filter((card) => (inventory[inventoryKey(card)] ?? 0) > 0).map((card) => card.id), [inventory]);
  const cosmeticCtx = useMemo<CosmeticContext>(() => ({
    claimedConstellationIds, inventory, defeatedWardenIds, claimedQuestIds, stats, developerMode, voidCosmeticIds, claimedVoidStageIds, demonsOwned: ownedDemonIds.length,
  }), [claimedConstellationIds, inventory, defeatedWardenIds, claimedQuestIds, stats, developerMode, voidCosmeticIds, claimedVoidStageIds, ownedDemonIds]);
  const voidProgress = { opened: voidOpened, cosmetics: voidCosmeticIds.length, essenceEarned, demons: ownedDemonIds.length };
  const questBadge = claimableCount(questCtx, claimedQuestIds, activeDaily);

  const recordStats = (delta: Partial<PlayerStats>) => {
    setStats((current) => addStats(current, delta));
    setDaily((current) => {
      const base = currentDaily(current);
      return { ...base, counters: addStats(base.counters, delta) };
    });
  };
  const grantReward = (reward: QuestReward) => {
    if (reward.items?.length) {
      setBag((current) => {
        const next = { ...current };
        reward.items!.forEach((entry) => { next[entry.itemId] = (next[entry.itemId] ?? 0) + entry.amount; });
        return next;
      });
    }
    if (reward.celesti > 0) {
      setCelesti((current) => current + reward.celesti);
      celebrateCelesti(reward.celesti);
    } else {
      playSound('reward');
      haptic('success');
    }
  };
  const claimQuest = (id: string, reward: QuestReward) => {
    if (claimedQuestIds.includes(id)) return;
    setClaimedQuestIds((current) => (current.includes(id) ? current : [...current, id]));
    grantReward(reward);
  };
  const claimDaily = (quest: DailyQuest) => {
    const current = currentDaily(daily);
    if (current.claimedIds.includes(quest.id) || current.counters[quest.stat] < quest.target) return;
    setDaily({ ...current, claimedIds: [...current.claimedIds, quest.id] });
    grantReward(quest.reward);
  };
  const claimDailyBonus = () => {
    const current = currentDaily(daily);
    if (current.bonusClaimed || !dailyQuestsFor(current.dateKey).every((quest) => current.claimedIds.includes(quest.id))) return;
    setDaily({ ...current, bonusClaimed: true });
    grantReward(dailyBonus);
  };
  const questNavigate = (action: QuestAction) => {
    if (action === 'cards') setCollectionOpen(true);
    else if (action === 'squad') { navigateTo('battle'); setSquadOpen(true); }
    else navigateTo(action);
  };

  const applySave = (save: SaveData) => {
    setCelesti(save.celesti); setInventory(save.inventory); setDawnOpened(save.dawnOpened); setTotalOpened(save.totalOpened); setOpenedByStar(save.openedByStar);
    setSupernovaCharge(save.supernovaCharge); setClaimedConstellationIds(save.claimedConstellationIds); setClaimedQuestIds(save.claimedQuestIds);
    setPlayerName(save.playerName); setSelectedTitleId(save.selectedTitleId); setSelectedBannerId(save.selectedBannerId); setSelectedFrameId(save.selectedFrameId);
    setDeveloperMode(save.developerMode); setLastDailyCelestiClaimed(save.lastDailyCelestiClaimed); setOwnedArenaThemeIds(save.ownedArenaThemeIds); setSelectedArenaThemeId(save.selectedArenaThemeId);
    setPlayerDecks(save.playerDecks); setBattleTeamIds(save.battleTeamIds); setSelectedBattleDeckId(save.selectedBattleDeckId); setCreatureProgress(save.creatureProgress);
    setBag(save.bag); setDefeatedWardenIds(save.defeatedWardenIds); setStats(save.stats); setDaily(save.daily); setStarterId(save.starterId);
    setSettings(save.settings); setAvatarCardId(save.avatarCardId); setSeenCosmeticIds(save.seenCosmeticIds); setDevOdds(save.devOdds); setUnlockQueue([]);
    setVoidOpened(save.voidOpened); setVoidPity(save.voidPity); setDemonEssence(save.demonEssence); setEssenceEarned(save.essenceEarned);
    setVoidCosmeticIds(save.voidCosmeticIds); setClaimedVoidStageIds(save.claimedVoidStageIds);
  };
  const saveSnapshot: SaveData = {
    version: 2, celesti, inventory, dawnOpened, totalOpened, openedByStar, supernovaCharge, claimedConstellationIds, claimedQuestIds, playerName, selectedTitleId, selectedBannerId, selectedFrameId,
    developerMode, lastDailyCelestiClaimed, ownedArenaThemeIds, selectedArenaThemeId, playerDecks, battleTeamIds, selectedBattleDeckId, creatureProgress, bag, defeatedWardenIds, stats, daily, starterId,
    settings, avatarCardId, seenCosmeticIds, devOdds,
    voidOpened, voidPity, demonEssence, essenceEarned, voidCosmeticIds, claimedVoidStageIds,
  };
  const saveJson = JSON.stringify(saveSnapshot);
  useEffect(() => {
    let cancelled = false;
    void loadSave().then((save) => {
      if (cancelled) return;
      if (save) applySave(save);
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => { void writeSave(saveSnapshot); }, 450);
    return () => clearTimeout(timer);
  }, [hydrated, saveJson]);
  const resetSave = () => {
    const confirmReset = () => {
      void clearSave();
      applySave(createDefaultSave());
      setSettingsOpen(false);
      setProfileOpen(false);
    };
    Alert.alert(t('settings.resetTitle'), t('settings.resetCopy'), [{ text: t('settings.cancel'), style: 'cancel' }, { text: t('settings.reset'), style: 'destructive', onPress: confirmReset }]);
  };
  const updateSettings = (patch: Partial<AppSettings>) => setSettings((current) => ({ ...current, ...patch }));

  // Audio, haptics and music follow the saved settings.
  useEffect(() => {
    configureAudio(settings);
    setHapticsEnabled(settings.haptics);
  }, [settings.sfx, settings.sfxVolume, settings.music, settings.musicVolume, settings.haptics]);
  useEffect(() => {
    if (hydrated && !battleSession) playMusic('hub');
  }, [hydrated, battleSession]);
  useEffect(() => { preloadSounds(['tap', 'back', 'toggle', 'tab', 'reward', 'purchase', 'error']); }, []);

  // Newly unlocked cosmetics are announced once, then remembered.
  useEffect(() => {
    if (!hydrated) return;
    const fresh = allCosmetics.filter((cosmetic) => cosmetic.rule.kind !== 'default' && cosmetic.rule.kind !== 'event' && !seenCosmeticIds.includes(cosmeticKey(cosmetic)) && isUnlocked(cosmetic, cosmeticCtx));
    if (fresh.length === 0) return;
    setSeenCosmeticIds((current) => [...current, ...fresh.map(cosmeticKey)]);
    if (!developerMode) setUnlockQueue((current) => [...current, ...fresh]);
  }, [hydrated, cosmeticCtx]);
  const currentUnlock = unlockQueue[0] ?? null;
  const showUnlock = Boolean(currentUnlock) && Boolean(starterId) && !battleSession && celestiRewardGain === null && !winner && !opening && !supernovaActive && !voidRewards && !altarOpen && !horizonOpen && !batchResults && !selectedConstellation && !profileOpen && !settingsOpen && !squadOpen && !collectionOpen;
  useEffect(() => {
    if (showUnlock) {
      playSound('unlock');
      haptic('success');
    }
  }, [showUnlock, currentUnlock?.id, currentUnlock?.kind]);
  const dismissUnlock = (equip: boolean) => {
    if (currentUnlock && equip) {
      if (currentUnlock.kind === 'title') setSelectedTitleId(currentUnlock.id);
      if (currentUnlock.kind === 'banner') setSelectedBannerId(currentUnlock.id);
      if (currentUnlock.kind === 'frame') setSelectedFrameId(currentUnlock.id);
    }
    setUnlockQueue((current) => current.slice(1));
  };

  const claimConstellation = (constellation: Constellation) => {
    if (claimedConstellationIds.includes(constellation.id) || constellationProgress(constellation, inventory) !== constellation.groups.length) return;
    setClaimedConstellationIds((current) => [...current, constellation.id]);
    setCelesti((current) => current + constellation.reward);
    celebrateCelesti(constellation.reward);
  };
  const primaryDeck = playerDecks.find((deck) => deck.id === selectedBattleDeckId) ?? null;
  const primaryDeckCards = primaryDeck ? primaryDeck.cardIds.map((id) => cardById.get(id)).filter((card): card is Card => Boolean(card)) : battleTeamCards;
  const loadPlayerDeck = (deck: PlayerDeck) => {
    setSelectedBattleDeckId(deck.id);
    setBattleTeamIds(deck.cardIds.filter((id) => ownedIdSet.has(id)).slice(0, 5));
    playSound('toggle');
    haptic('light');
  };
  const savePlayerDeck = (deckId: string) => {
    if (battleTeamCards.length === 0) return;
    setPlayerDecks((current) => current.map((deck) => (deck.id === deckId ? { ...deck, cardIds: battleTeamCards.map((card) => card.id) } : deck)));
    setSelectedBattleDeckId(deckId);
    recordStats({ decksSaved: 1 });
    playSound('purchase');
    haptic('success');
  };
  const toggleBattleCard = (cardId: string) => {
    const included = battleTeamIds.includes(cardId);
    setBattleTeamIds((current) => {
      const valid = current.filter((id) => ownedIdSet.has(id));
      return valid.includes(cardId) ? valid.filter((id) => id !== cardId) : valid.length < 5 ? [...valid, cardId] : valid;
    });
    playSound(included ? 'back' : 'toggle');
    haptic('light');
  };
  const chooseStarter = (cardId: string) => {
    const card = cardById.get(cardId);
    if (!card) return;
    setStarterId(cardId);
    setAvatarCardId((current) => current ?? cardId);
    setInventory((current) => ({ ...current, [inventoryKey(card)]: Math.max(1, current[inventoryKey(card)] ?? 0) }));
    setCreatureProgress((current) => ({ ...current, [cardId]: current[cardId] ?? defaultProgress(card) }));
    setBattleTeamIds((current) => (current.includes(cardId) ? current : [cardId, ...current].slice(0, 5)));
    setBag((current) => ({ ...current, tonic: current.tonic + 3, dew: current.dew + 1 }));
    haptic('success');
  };
  const feedCandy = (cardId: string) => {
    const card = cardById.get(cardId);
    if (!card || bag.candy <= 0) return;
    const progress = progressFor(card);
    if (progress.level >= maxLevel) return;
    setBag((current) => ({ ...current, candy: Math.max(0, current.candy - 1) }));
    setCreatureProgress((current) => ({ ...current, [cardId]: { level: progress.level + 1, xp: 0 } }));
    recordStats({ levelUps: 1 });
    haptic('success');
  };
  const teamSetup = () => squadMembers.map((member) => ({ card: member.card, level: member.progress.level, xp: member.progress.xp }));
  const startWild = () => {
    if (squadMembers.length === 0 || battleSession) return;
    const wild = createWildEncounter(squadMembers.map((member) => member.progress.level));
    wildDropRef.current = Math.random() < 0.3 ? (Math.random() < 0.7 ? 'tonic' : 'dew') : null;
    const { state, events } = createBattle({ kind: 'wild', opponentName: wild.card.name, aiSkill: 1, player: teamSetup(), enemy: [wild], bag });
    setBattleWardenId(null);
    setBattleArena((arenaThemes.some((theme) => theme.id === selectedArenaThemeId) ? selectedArenaThemeId : 'nebula') as ArenaId);
    setBattleSession({ key: battleKey.current++, state, events });
  };
  const startWarden = (warden: Warden) => {
    if (squadMembers.length === 0 || battleSession) return;
    const { state, events } = createBattle({ kind: 'warden', wardenId: warden.id, opponentName: warden.name, aiSkill: warden.aiSkill, player: teamSetup(), enemy: wardenTeam(warden), bag, enemyItems: warden.enemyItems });
    setBattleWardenId(warden.id);
    setBattleArena(warden.arena);
    setBattleSession({ key: battleKey.current++, state, events });
  };
  const describeRewards = (state: BattleState): BattleRewardPreview => {
    if (state.phase !== 'victory') return { celesti: 0, items: [], sigil: null };
    if (state.kind === 'warden') {
      const warden = wardenById(state.wardenId);
      if (!warden) return { celesti: 0, items: [], sigil: null };
      const firstClear = !defeatedWardenIds.includes(warden.id);
      return { celesti: firstClear ? warden.reward : rematchReward(warden), items: firstClear ? warden.items : [], sigil: firstClear ? { icon: warden.sigil, name: warden.sigilName, color: warden.color } : null };
    }
    return { celesti: wildCelestiReward(state.enemy[0]?.level ?? 1), items: wildDropRef.current ? [{ itemId: wildDropRef.current, amount: 1 }] : [], sigil: null };
  };
  const finishBattle = (state: BattleState) => {
    const rewards = describeRewards(state);
    const won = state.phase === 'victory';
    setCreatureProgress((current) => {
      const next = { ...current };
      state.player.forEach((creature) => { next[creature.cardId] = { level: creature.level, xp: creature.xp }; });
      return next;
    });
    setBag(() => {
      const next = { ...state.bag };
      rewards.items.forEach((entry) => { next[entry.itemId] = (next[entry.itemId] ?? 0) + entry.amount; });
      return next;
    });
    recordStats({
      battlesWon: won ? 1 : 0, wildWins: won && state.kind === 'wild' ? 1 : 0, wardenWins: won && state.kind === 'warden' ? 1 : 0,
      superEffective: state.counters.superEffective, crits: state.counters.crits, knockouts: state.counters.knockouts,
      itemsUsed: state.counters.itemsUsed, movesUsed: state.counters.movesUsed, levelUps: state.counters.levelUps,
    });
    if (won && state.kind === 'warden' && state.wardenId) setDefeatedWardenIds((current) => (current.includes(state.wardenId!) ? current : [...current, state.wardenId!]));
    setBattleSession(null);
    wildDropRef.current = null;
    if (rewards.celesti > 0) {
      setCelesti((current) => current + rewards.celesti);
      setTimeout(() => celebrateCelesti(rewards.celesti), 550);
    }
  };
  const buyItem = (itemId: ItemId, amount: number) => {
    const cost = items[itemId].price * amount;
    if (celesti < cost) {
      playSound('error');
      return;
    }
    setCelesti((current) => current - cost);
    setBag((current) => ({ ...current, [itemId]: (current[itemId] ?? 0) + amount }));
    playSound('purchase');
    haptic('success');
  };

  useEffect(() => {
    let active = true;
    let currentAnimation: Animated.CompositeAnimation | null = null;
    const playGoldenSweep = () => {
      goldenShimmer.setValue(0);
      currentAnimation = Animated.sequence([Animated.timing(goldenShimmer, { toValue: 1, duration: 1850, easing: Easing.linear, useNativeDriver: false }), Animated.delay(260)]);
      currentAnimation.start(({ finished }) => { if (active && finished) playGoldenSweep(); });
    };
    playGoldenSweep();
    return () => { active = false; currentAnimation?.stop(); };
  }, [goldenShimmer]);
  useEffect(() => {
    const timer = setInterval(() => setClockNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const iconUri = typeof Image.resolveAssetSource === 'function' ? Image.resolveAssetSource(battleSwordsIcon)?.uri : null;
    if (iconUri) void Image.prefetch(iconUri).catch(() => false);
  }, []);

  const grantCreatures = (results: DropResult[]) => {
    setInventory((current) => {
      const next = { ...current };
      results.forEach((result) => {
        const key = inventoryKey(result.card, result.golden);
        next[key] = (next[key] ?? 0) + 1;
      });
      return next;
    });
    // Duplicates resonate with the creature and grant a quarter level of XP, up to level 30.
    setCreatureProgress((current) => {
      const next = { ...current };
      results.forEach((result) => {
        const existing = next[result.card.id];
        if (!existing) {
          next[result.card.id] = defaultProgress(result.card);
          return;
        }
        if (existing.level >= 30) return;
        const gained = applyXp(result.card, existing, Math.max(1, Math.floor(xpToNext(existing.level) * 0.25))).progress;
        next[result.card.id] = gained.level > 30 ? { level: 30, xp: 0 } : gained;
      });
      return next;
    });
  };
  const awardResults = (results: DropResult[], booster: Booster) => {
    grantCreatures(results);
    if (booster.id === 'dawn') setDawnOpened((value) => value + results.length);
    setTotalOpened((value) => value + results.length);
    setOpenedByStar((current) => ({ ...current, [booster.id]: (current[booster.id] ?? 0) + results.length }));
    recordStats({ starsOpened: results.length, goldenFound: results.filter((result) => result.golden).length });
    // Every regular or event star charges the Supernova; triggering it spends a full gauge.
    if (booster.id === 'sparkle') setSupernovaCharge((value) => Math.max(0, value - supernovaGoal));
    else setSupernovaCharge((value) => Math.min(supernovaGoal, value + results.length));
  };
  const settleSingleOpening = (drawn: DropResult, booster: Booster) => {
    if (!activeOpening.current) return;
    activeOpening.current = null;
    stopSound('roulette');
    const known = creatureProgress[drawn.card.id];
    const type = typeForCard(drawn.card);
    setRevealNote(known ? { kind: known.level >= 30 ? 'maxed' : 'duplicate', type, level: known.level } : { kind: 'new', type, level: rarityStartLevel[drawn.card.rarity] });
    setOpening(false);
    awardResults([drawn], booster);
    playSound(revealSound(drawn.card.rarity));
    if (drawn.golden) playSound('revealGolden');
    haptic('success');
    revealScale.setValue(0.65);
    Animated.spring(revealScale, { toValue: 1, friction: 6, tension: 110, useNativeDriver: true }).start();
  };
  const skipOpening = () => {
    const pending = activeOpening.current;
    if (!pending) return;
    spinAnimation.current?.stop();
    spin.setValue(1);
    settleSingleOpening(pending.drawn, pending.booster);
  };
  const openBooster = (booster: Booster = selectedBooster) => {
    const supernova = booster.id === 'sparkle';
    const amount = supernova ? 1 : openQuantity;
    const celestiCost = booster.cost * amount;
    // Developer rate overrides apply to every purchasable star, never to the Supernova guarantee.
    const odds = customOddsActive && !supernova ? devOdds.odds : booster.odds;
    const oddsTotal = (Object.keys(odds) as Rarity[]).reduce((total, rarity) => total + odds[rarity], 0);
    if (opening || supernovaActive || celesti < celestiCost || (supernova && supernovaCharge < supernovaGoal) || oddsTotal <= 0) {
      if (!opening && !supernovaActive) playSound('error');
      return;
    }
    if (!supernova) setSelectedBoosterId(booster.id);
    if (celestiCost > 0) setCelesti((current) => current - celestiCost);
    const goldenRate = customOddsActive && !supernova ? devOdds.golden / 100 : booster.goldenRate;
    const results = Array.from({ length: amount }, () => drawResult({ ...booster, odds }, goldenRate));
    if (amount > 1) {
      awardResults(results, booster);
      setBatchResults(results);
      const best = results.reduce((top, result) => (rarityOrder.indexOf(result.card.rarity) > rarityOrder.indexOf(top.card.rarity) ? result : top));
      playSound(revealSound(best.card.rarity));
      if (results.some((result) => result.golden)) playSound('revealGolden');
      haptic('success');
      return;
    }
    const drawn = results[0];
    activeOpening.current = { drawn, booster };
    setRevealSupernova(supernova);
    if (supernova) {
      setSupernovaActive(true);
      return;
    }
    setWinner(drawn);
    if (settings.quickOpen) {
      settleSingleOpening(drawn, booster);
      return;
    }
    spin.setValue(0);
    setLayout(createVisualTape(drawn.card));
    setOpening(true);
    playSound('starCharge', 0.7);
    playSound('roulette');
    haptic('medium');
    const rouletteAnimation = Animated.timing(spin, { toValue: 1, duration: 5900, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    spinAnimation.current = rouletteAnimation;
    rouletteAnimation.start(({ finished }) => { if (finished) settleSingleOpening(drawn, booster); });
  };
  const finishSupernova = () => {
    setSupernovaActive(false);
    const pending = activeOpening.current;
    if (!pending) return;
    setTimeout(() => {
      setWinner(pending.drawn);
      settleSingleOpening(pending.drawn, pending.booster);
    }, 220);
  };
  const dismissResult = () => { playSound('back'); setWinner(null); setRevealSupernova(false); };

  // The Void Quasar: rewards are rolled and granted up front; the opening modal only presents them.
  const openVoid = () => {
    if (opening || supernovaActive || voidRewards) return;
    if (celesti < voidQuasar.cost) {
      playSound('error');
      return;
    }
    const { rewards, essence } = rollVoidOpening({ pity: voidPity, ownedCosmeticKeys: voidCosmeticIds, demonsLeft: demonCards.length - ownedDemonIds.length });
    const creatures = rewards.flatMap((reward) => (reward.kind === 'creature' ? [{ card: reward.card, golden: reward.golden }] : []));
    setVoidNewIds(creatures.filter((result) => !ownedIdSet.has(result.card.id)).map((result) => result.card.id));
    const jackpot = rewards.reduce((sum, reward) => sum + (reward.kind === 'celesti' ? reward.amount : 0), 0);
    setCelesti((current) => current - voidQuasar.cost + jackpot);
    if (creatures.length) grantCreatures(creatures);
    setBag((current) => {
      const next = { ...current };
      rewards.forEach((reward) => { if (reward.kind === 'item') next[reward.itemId] = (next[reward.itemId] ?? 0) + reward.amount; });
      return next;
    });
    const cosmeticKeys = rewards.flatMap((reward) => (reward.kind === 'cosmetic' ? [voidCosmeticKey(reward.cosmeticKind, reward.cosmeticId)] : []));
    if (cosmeticKeys.length) setVoidCosmeticIds((current) => [...current, ...cosmeticKeys.filter((key) => !current.includes(key))]);
    const essenceGain = rewards.reduce((sum, reward) => sum + (reward.kind === 'essence' ? reward.amount : 0), 0);
    if (essenceGain > 0) {
      setDemonEssence((value) => value + essenceGain);
      setEssenceEarned((value) => value + essenceGain);
    }
    setVoidPity((value) => (essence ? 0 : value + 1));
    setVoidOpened((value) => value + 1);
    setTotalOpened((value) => value + 1);
    recordStats({ starsOpened: 1, goldenFound: creatures.filter((result) => result.golden).length });
    setVoidRewards(rewards);
  };
  const summonDemon = (cardId: string) => {
    const card = cardById.get(cardId);
    if (!card || demonEssence < essenceGoal || ownedDemonIds.includes(cardId)) return;
    setDemonEssence((value) => value - essenceGoal);
    setInventory((current) => ({ ...current, [inventoryKey(card)]: Math.max(1, current[inventoryKey(card)] ?? 0) }));
    setCreatureProgress((current) => ({ ...current, [cardId]: current[cardId] ?? defaultProgress(card) }));
  };
  const claimVoidStage = (stage: VoidStage) => {
    const firstOpen = voidStages.findIndex((entry) => !claimedVoidStageIds.includes(entry.id));
    const { value, target } = voidGoalProgress(stage.goal, voidProgress);
    if (voidStages[firstOpen]?.id !== stage.id || value < target) {
      playSound('error');
      return;
    }
    setClaimedVoidStageIds((current) => [...current, stage.id]);
    grantReward(stage.reward);
  };
  const goStarsPage = (page: 0 | 1) => {
    setStarsPage(page);
    starsPagerRef.current?.scrollTo({ x: page * Dimensions.get('window').width, animated: true });
  };

  const screenWidth = Dimensions.get('window').width;
  const navigateTo = (nextTab: AppTab) => {
    if (nextTab === activeTab || tabTransitioning.current) return;
    const tabOrder: Record<AppTab, number> = { home: 0, stars: 1, quests: 2, constellations: 3, battle: 4, shop: 5 };
    const direction: 1 | -1 = tabOrder[nextTab] >= tabOrder[activeTab] ? 1 : -1;
    playSound('tab');
    tabTransitioning.current = true;
    setTabSlideDirection(direction);
    setOutgoingTab(visibleTab);
    setVisibleTab(nextTab);
    setActiveTab(nextTab);
    tabSlide.setValue(0);
    requestAnimationFrame(() => {
      Animated.timing(tabSlide, { toValue: 1, duration: 330, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
        if (!finished) { setOutgoingTab(null); tabSlide.setValue(0); tabTransitioning.current = false; return; }
        setOutgoingTab(null);
        requestAnimationFrame(() => { tabSlide.setValue(0); tabTransitioning.current = false; });
      });
    });
  };
  // The pointer sits in the middle of the roulette window; the tape stops at a random spot on the winning card.
  const winningCenter = tapePadding + layout.winnerIndex * tapePitch + tapeCardWidth / 2 + layout.landing * tapeCardWidth;
  const finalOffset = Math.max(0, winningCenter - rouletteWidth / 2);
  const translateX = spin.interpolate({ inputRange: [0, 1], outputRange: [0, -finalOffset] });
  const outgoingTabX = tabSlide.interpolate({ inputRange: [0, 1], outputRange: [0, -tabSlideDirection * screenWidth] });
  const incomingTabX = tabSlide.interpolate({ inputRange: [0, 1], outputRange: [tabSlideDirection * screenWidth, 0] });
  const typeLabel = (type: CreatureType) => `${typeTheme[type].icon} ${t(tk(`type.${type}`))}`;
  const openStar = (id: BoosterId) => {
    setSelectedBoosterId(id);
    setStarsPage(0);
    starsPagerRef.current?.scrollTo({ x: 0, animated: false });
    navigateTo('stars');
  };

  const renderHeader = (title: string) => (
    <View style={styles.header}>
      <View style={v2Styles.flex}><Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>{title}</Text></View>
      <View style={styles.headerActions}>
        <View style={styles.gemPill}><Text style={styles.gemText}>✦ {celesti}</Text></View>
        <Pressable onPress={() => { playSound('tap'); setProfileOpen(true); }} hitSlop={6}><PlayerAvatar card={avatarCard} size={40} frameId={selectedFrameId} /></Pressable>
      </View>
    </View>
  );
  const renderSupplies = () => <>
    {itemOrder.map((id) => {
      const item = items[id];
      return (
        <View key={id} style={v2Styles.supplyRow}>
          <View style={[v2Styles.supplyIcon, { borderColor: item.color }]}>
            <Text style={[v2Styles.supplyIconText, { color: item.color }]}>{item.icon}</Text>
            {(bag[id] ?? 0) > 0 && <View style={localStyles.ownedBadge}><Text style={localStyles.ownedBadgeText}>{bag[id]}</Text></View>}
          </View>
          <View style={v2Styles.flex}><Text style={v2Styles.supplyName}>{item.name}</Text><Text style={v2Styles.supplyCopy}>{t(tk(`item.${id}.copy`))}</Text></View>
          <View style={v2Styles.supplyButtons}>
            <Pressable onPress={() => buyItem(id, 1)} style={[v2Styles.supplyBuy, celesti < item.price && styles.openButtonPressed]}><Text style={v2Styles.supplyBuyText}>×1 · ✦ {item.price}</Text></Pressable>
            <Pressable onPress={() => buyItem(id, 5)} style={[v2Styles.supplyBuy, v2Styles.supplyBuyBulk, celesti < item.price * 5 && styles.openButtonPressed]}><Text style={v2Styles.supplyBuyText}>×5 · ✦ {item.price * 5}</Text></Pressable>
          </View>
        </View>
      );
    })}
  </>;
  const renderJourneyCards = () => {
    const chapter = storyChapters[activeChapterIndex(claimedQuestIds)];
    const nextWarden = wardens.find((warden) => !defeatedWardenIds.includes(warden.id)) ?? null;
    return <>
      <AdventureCard chapter={chapter} doneCount={chapter.quests.filter((quest) => claimedQuestIds.includes(quest.id)).length} readyCount={questBadge} onPress={() => navigateTo('quests')} />
      <WardenCard warden={nextWarden} defeatedIds={defeatedWardenIds} onPress={() => navigateTo('battle')} />
    </>;
  };

  const renderTab = (tab: AppTab) => (
    tab === 'home' ? (
      <ScrollView contentContainerStyle={styles.hubScreen} showsVerticalScrollIndicator={false}>
        {renderHeader(t('hub.title'))}
        <StarShowcase onPick={openStar} />
        <Pressable onPress={claimDailyCelesti} style={[styles.rewardCard, styles.dailyCelestiReward, dailyCelestiReady && styles.rewardCardReady]}>
          <Text style={styles.rewardIcon}>✧</Text>
          <View style={styles.rewardCopy}><Text style={styles.rewardTitle}>{t('hub.dailyCelesti')}</Text></View>
          {dailyCelestiReady
            ? <Text style={styles.rewardAction}>{t('common.claim')}</Text>
            : <Countdown target={(lastDailyCelestiClaimed ?? 0) + dailyCelestiIntervalMs} onDone={() => setClockNow(Date.now())} style={localStyles.dailyTimer} />}
        </Pressable>
        {renderJourneyCards()}
        {betaEventActive && <EventStarCard star={boosterById('crimson')} onOpen={() => openStar('crimson')} />}
        <View style={styles.hubQuickGrid}>
          <Pressable onPress={() => navigateTo('stars')} style={styles.hubQuickCard}><Text style={styles.hubQuickIcon}>✦</Text><Text style={styles.hubQuickTitle}>{t('hub.openStars')}</Text></Pressable>
          <Pressable onPress={() => navigateTo('battle')} style={styles.hubQuickCard}><BattleEmblem color="#8FE4FF" /><Text style={styles.hubQuickTitle}>{t('hub.battle')}</Text></Pressable>
          <Pressable onPress={() => navigateTo('shop')} style={styles.hubQuickCard}><Text style={styles.hubQuickIcon}>✦</Text><Text style={styles.hubQuickTitle}>{t('hub.shop')}</Text></Pressable>
          <Pressable onPress={() => navigateTo('constellations')} style={styles.hubQuickCard}><Text style={styles.hubQuickIcon}>✧</Text><Text style={styles.hubQuickTitle}>{t('hub.constellations')}</Text></Pressable>
        </View>
      </ScrollView>
    ) : tab === 'shop' ? (
      <ScrollView contentContainerStyle={styles.shopScreen} showsVerticalScrollIndicator={false}>
        {renderHeader(t('shop.title'))}
        <View style={styles.shopTabs}>
          {(['shop', 'supplies', 'market'] as const).map((view) => <Pressable key={view} onPress={() => { playSound('toggle'); setShopView(view); }} style={[styles.shopTab, shopView === view && styles.shopTabActive]}><Text style={styles.shopTabText} numberOfLines={1}>{view === 'shop' ? t('shop.tabArenas') : view === 'supplies' ? t('shop.tabSupplies') : t('shop.tabMarket')}</Text></Pressable>)}
        </View>
        {shopView === 'supplies' ? renderSupplies() : shopView === 'shop' ? <>
          <View style={styles.shopGrid}>{arenaThemes.map((theme) => {
            const owned = ownedArenaThemeIds.includes(theme.id);
            const selected = selectedArenaThemeId === theme.id;
            return <Pressable key={theme.id} onPress={() => selectOrBuyArenaTheme(theme)} style={({ pressed }) => [styles.shopPack, selected && styles.shopPackSelected, { borderColor: theme.border, backgroundColor: theme.color }, ((!owned && celesti < theme.cost) || pressed) && styles.openButtonPressed]}><Text style={[styles.shopPackStar, { color: theme.border, textShadowColor: theme.border }]}>{theme.icon}</Text><Text style={styles.shopPackName}>{theme.name}</Text><View style={styles.shopPrice}><Text style={styles.shopPriceText}>{selected ? t('shop.equipped') : owned ? t('shop.equip') : `✦ ${theme.cost}`}</Text></View></Pressable>;
          })}</View>
        </> : <View style={styles.marketPanel}><Text style={styles.marketIcon}>⇄</Text><Text style={styles.marketTitle}>{t('shop.marketTitle')}</Text><Text style={styles.marketPreviewValue}>{t('shop.soon')}</Text></View>}
      </ScrollView>
    ) : tab === 'constellations' ? (
      <ConstellationsScreen header={renderHeader(t('constellations.title'))} inventory={inventory} claimedIds={claimedConstellationIds} cosmeticCtx={cosmeticCtx} onOpen={(constellation) => setSelectedConstellationId(constellation.id)} horizonCard={<HorizonEntryCard claimed={claimedVoidStageIds.length} total={voidStages.length} onPress={() => setHorizonOpen(true)} />} />
    ) : tab === 'quests' ? (
      <QuestsScreen header={renderHeader(t('quests.title'))} ctx={questCtx} claimedIds={claimedQuestIds} daily={activeDaily} clockNow={clockNow} titleLabel={(id) => titles.find((title) => title.id === id)?.name ?? id} onClaim={claimQuest} onClaimDaily={claimDaily} onClaimDailyBonus={claimDailyBonus} onNavigate={questNavigate} />
    ) : tab === 'battle' ? (
      <BattleHub header={renderHeader(t('battleHub.title'))} squad={squadMembers} defeatedWardenIds={defeatedWardenIds} bag={bag} ownedCount={ownedCards.length} wildWins={stats.wildWins} onWild={startWild} onWarden={startWarden} onEditSquad={() => setSquadOpen(true)} onOpenShop={() => { setShopView('supplies'); navigateTo('shop'); }} />
    ) : (
      // Stars and the black hole live side by side: swipe horizontally (or use the switch) to move between them.
      <View style={localStyles.starsPager} onLayout={(event) => setStarsPagerHeight(event.nativeEvent.layout.height)}>
        <ScrollView
          ref={starsPagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          contentOffset={{ x: starsPage * screenWidth, y: 0 }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: starsPagerX } } }], { useNativeDriver: false })}
          onMomentumScrollEnd={(event) => setStarsPage(event.nativeEvent.contentOffset.x > screenWidth / 2 ? 1 : 0)}
        >
          <View style={{ width: screenWidth, height: starsPagerHeight || undefined }}>
            <StarsScreen
              header={renderHeader('BOOSTER BURST')}
              pageSwitch={<StarsPageSwitch page={0} onChange={goStarsPage} />}
              selectedId={selectedBooster.id}
              onSelect={setSelectedBoosterId}
              celesti={celesti}
              opening={opening || supernovaActive}
              quantity={openQuantity}
              onQuantity={setOpenQuantity}
              onOpen={() => openBooster()}
              onInfo={() => { playSound('tap'); setInfoOpen(true); }}
              supernovaCharge={supernovaCharge}
              onSupernova={() => openBooster(supernovaBooster)}
              customOdds={customOddsActive}
            />
          </View>
          {/* Each page gets the pager's height so its own vertical scroll works inside the horizontal pager. */}
          <View style={{ width: screenWidth, height: starsPagerHeight || undefined }}>
            <VoidPage
              header={renderHeader('VOID QUASAR')}
              pageSwitch={<StarsPageSwitch page={1} onChange={goStarsPage} />}
              celesti={celesti}
              busy={Boolean(voidRewards)}
              essence={demonEssence}
              pity={voidPity}
              ownedDemonIds={ownedDemonIds}
              ownedCosmeticKeys={voidCosmeticIds}
              claimedStageCount={claimedVoidStageIds.length}
              onOpen={openVoid}
              onInfo={() => { playSound('tap'); setVoidInfoOpen(true); }}
              onAltar={() => setAltarOpen(true)}
              onHorizon={() => setHorizonOpen(true)}
            />
          </View>
        </ScrollView>
        {starsPage === 0 && (
          <Animated.View pointerEvents="box-none" style={[localStyles.peekLayer, { opacity: starsPagerX.interpolate({ inputRange: [0, screenWidth * 0.25], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
            <VoidPeek onPress={() => goStarsPage(1)} />
          </Animated.View>
        )}
      </View>
    )
  );

  const navItems: { tab: AppTab | 'cards'; icon: string; label: string }[] = [
    { tab: 'home', icon: '⌂', label: t('nav.hub') },
    { tab: 'stars', icon: '✦', label: t('nav.stars') },
    { tab: 'quests', icon: '⌁', label: t('nav.quests') },
    { tab: 'constellations', icon: '✧', label: t('nav.constellations') },
    { tab: 'battle', icon: '', label: t('nav.battle') },
    { tab: 'cards', icon: '▦', label: t('nav.cards') },
  ];

  return (
    <I18nProvider language={settings.language}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <Image source={battleSwordsIcon} style={styles.battleIconPreload} />
        <View style={styles.tabStage}>
          {outgoingTab && <Animated.View style={[styles.tabPage, { transform: [{ translateX: outgoingTabX }] }]}>{renderTab(outgoingTab)}</Animated.View>}
          <Animated.View style={[styles.tabPage, styles.incomingTabPage, outgoingTab && { transform: [{ translateX: incomingTabX }] }]}>{renderTab(visibleTab)}</Animated.View>
        </View>
        <View style={styles.bottomNav}>
          {navItems.map((item) => {
            const active = item.tab === activeTab;
            const onPress = () => {
              if (item.tab === 'cards') { playSound('tap'); setCollectionOpen(true); return; }
              navigateTo(item.tab);
            };
            return (
              <Pressable key={item.tab} onPress={onPress} style={[styles.navItem, active && styles.navItemActive]}>
                <View style={styles.navIconSlot}>{item.tab === 'battle' ? <BattleEmblem compact active={active} /> : <Text style={styles.navIcon}>{item.icon}</Text>}</View>
                <Text style={styles.navLabel} numberOfLines={1}>{item.label}</Text>
                {item.tab === 'quests' && questBadge > 0 && <View style={v2Styles.navBadge}><Text style={v2Styles.navBadgeText}>{questBadge}</Text></View>}
              </Pressable>
            );
          })}
        </View>

        <Modal visible={opening} transparent animationType="fade" onRequestClose={skipOpening}>
          <View style={styles.rouletteBackdrop}>
            <View style={[styles.rouletteModal, { borderColor: selectedBooster.color }]}>
              <View style={localStyles.rouletteStar}><StarArt variant={selectedBooster.id} size={72} float={false} /></View>
              <Text style={[styles.rouletteTitle, localStyles.rouletteTitle]}>{selectedBooster.name.toUpperCase()}</Text>
              <View style={styles.rouletteShell} onLayout={(event) => setRouletteWidth(event.nativeEvent.layout.width - 2)}>
                <Animated.View style={[styles.tape, { transform: [{ translateX }] }]}>
                  {layout.cards.map((card, index) => <MiniCard key={`${card.id}-${index}`} card={card} />)}
                </Animated.View>
                <View pointerEvents="none" style={localStyles.roulettePointer}>
                  <Text style={styles.pointerText}>▼</Text>
                  <View style={[localStyles.roulettePointerLine, { backgroundColor: selectedBooster.color }]} />
                </View>
                <Pressable onPress={skipOpening} style={styles.skipButton}><Text style={styles.skipButtonText}>{t('opening.skip')}</Text></Pressable>
              </View>
            </View>
          </View>
        </Modal>
        <Modal visible={infoOpen} transparent animationType="fade" onRequestClose={() => setInfoOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}><Text style={styles.modalTitle}>{selectedBooster.name.toUpperCase()}</Text><Pressable onPress={() => { playSound('back'); setInfoOpen(false); }} hitSlop={12}><Text style={styles.closeButton}>×</Text></Pressable></View>
              {selectedBooster.event && <Text style={[styles.modalCopy, localStyles.eventInfo]}>{t('event.copy')} {t('event.onlyBeta')}.</Text>}
              <Text style={styles.modalCopy}>{t('opening.ratesCopy')}</Text>
              {(Object.entries(infoOdds) as [Rarity, number][]).filter(([, chance]) => chance > 0).map(([rarity, chance]) => (
                <View key={rarity} style={styles.modalOddRow}><View style={[styles.dot, { backgroundColor: rarityTheme[rarity].accent }]} /><Text style={styles.modalOddName}>{t(tk(`rarity.${rarity}`))}</Text><Text style={styles.modalOddRate}>{chance}%</Text></View>
              ))}
              <View style={styles.goldenInfo}>
                <Text style={styles.goldenInfoTitle}>{t('opening.goldenOutline')}</Text>
                <Text style={styles.goldenInfoCopy}>{t('opening.goldenCopy', { epic: (infoOdds.Epic * infoGoldenRate).toFixed(2), legendary: (infoOdds.Legendary * infoGoldenRate).toFixed(3), angelic: (infoOdds.Angelic * infoGoldenRate).toFixed(4) })}</Text>
                {selectedBooster.event && !customOddsActive && <Text style={styles.goldenInfoCopy}>{t('opening.eventGolden', { rate: Math.round(selectedBooster.goldenRate * 100) })}</Text>}
              </View>
              <Pressable onPress={() => { playSound('back'); setInfoOpen(false); }} style={styles.modalDone}><Text style={styles.modalDoneText}>{t('opening.gotIt')}</Text></Pressable>
            </View>
          </View>
        </Modal>

        <ProfileModal
          visible={profileOpen && !settingsOpen}
          onClose={() => setProfileOpen(false)}
          onOpenSettings={() => setSettingsOpen(true)}
          playerName={playerName}
          onRename={setPlayerName}
          playerId={playerId}
          avatarCard={avatarCard}
          ownedCards={ownedCards}
          onSelectAvatar={setAvatarCardId}
          titleId={selectedTitleId}
          bannerId={selectedBannerId}
          frameId={selectedFrameId}
          onSelectTitle={setSelectedTitleId}
          onSelectBanner={setSelectedBannerId}
          onSelectFrame={setSelectedFrameId}
          cosmeticCtx={cosmeticCtx}
          discovered={ownedCards.length}
          totalCreatures={catalog.length}
          opened={totalOpened}
          sigils={defeatedWardenIds.length}
          totalSigils={wardens.length}
          wins={stats.battlesWon}
          bestLevel={bestLevel}
          deckCards={primaryDeckCards}
          deckSaved={Boolean(primaryDeck)}
          goldenIds={goldenIds}
        />
        <SettingsModal
          visible={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onChange={updateSettings}
          playerId={playerId}
          version={appVersion}
          developerMode={developerMode}
          onToggleDeveloper={() => setDeveloperMode((value) => !value)}
          onUnlockAll={developerUnlockEverything}
          onResetSave={resetSave}
          devOdds={devOdds}
          onDevOddsChange={setDevOdds}
        />
        <ConstellationDetail
          constellation={selectedConstellation}
          inventory={inventory}
          claimed={Boolean(selectedConstellation && claimedConstellationIds.includes(selectedConstellation.id))}
          cosmeticCtx={cosmeticCtx}
          onClaim={claimConstellation}
          onClose={() => setSelectedConstellationId(null)}
          overlay={celestiRewardGain !== null ? <CelestiRewardCelebration embedded gain={celestiRewardGain} rewardScale={celestiRewardScale} burst={celestiBurst} onDismiss={() => setCelestiRewardGain(null)} /> : null}
        />
        <SquadBuilder visible={squadOpen} onClose={() => setSquadOpen(false)} owned={ownedMembers} teamIds={battleTeamCards.map((card) => card.id)} onToggle={toggleBattleCard} decks={playerDecks} selectedDeckId={selectedBattleDeckId} onLoadDeck={loadPlayerDeck} onSaveDeck={savePlayerDeck} candy={bag.candy} onUseCandy={feedCandy} />
        <BattleScene session={battleSession} arena={battleArena} warden={wardenById(battleWardenId)} goldenIds={goldenIds} defaultFast={settings.battleSpeed === 'fast'} describeRewards={describeRewards} onFinish={finishBattle} />
        <StarterPicker visible={hydrated && !starterId && !battleSession} onChoose={chooseStarter} />
        <Modal visible={celestiRewardGain !== null && !selectedConstellation && !horizonOpen} transparent animationType="fade" onRequestClose={() => setCelestiRewardGain(null)}>
          {celestiRewardGain !== null && <CelestiRewardCelebration gain={celestiRewardGain} rewardScale={celestiRewardScale} burst={celestiBurst} onDismiss={() => setCelestiRewardGain(null)} />}
        </Modal>
        <CosmeticUnlockModal cosmetic={showUnlock ? currentUnlock : null} avatarCard={avatarCard} onEquip={() => dismissUnlock(true)} onLater={() => { playSound('back'); dismissUnlock(false); }} />
        <SupernovaSequence visible={supernovaActive} onDone={finishSupernova} />
        <VoidOpening rewards={voidRewards} newCardIds={voidNewIds} essenceTotal={demonEssence} avatarCard={avatarCard} onClose={() => { setVoidRewards(null); setVoidNewIds([]); }} />
        <DemonAltar visible={altarOpen} essence={demonEssence} ownedIds={ownedDemonIds} onSummon={summonDemon} onClose={() => setAltarOpen(false)} />
        <HorizonDive
          visible={horizonOpen}
          progress={voidProgress}
          claimedIds={claimedVoidStageIds}
          onClaim={claimVoidStage}
          onClose={() => setHorizonOpen(false)}
          overlay={celestiRewardGain !== null ? <CelestiRewardCelebration embedded gain={celestiRewardGain} rewardScale={celestiRewardScale} burst={celestiBurst} onDismiss={() => setCelestiRewardGain(null)} /> : null}
        />
        <Modal visible={voidInfoOpen} transparent animationType="fade" onRequestClose={() => setVoidInfoOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}><Text style={styles.modalTitle}>{voidQuasar.name.toUpperCase()}</Text><Pressable onPress={() => { playSound('back'); setVoidInfoOpen(false); }} hitSlop={12}><Text style={styles.closeButton}>×</Text></Pressable></View>
              <ScrollView style={localStyles.infoScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalCopy}>{t('void.infoCopy')}</Text>
                <Text style={localStyles.infoSection}>{t('void.infoSlots')}</Text>
                {([[t('void.infoCreature'), 100 - voidItemChance - voidCosmeticChance], [t('void.infoItem'), voidItemChance], [t('void.infoCosmetic'), voidCosmeticChance]] as [string, number][]).map(([label, chance]) => (
                  <View key={label} style={styles.modalOddRow}><Text style={styles.modalOddName}>{label}</Text><Text style={styles.modalOddRate}>{chance}%</Text></View>
                ))}
                <Text style={localStyles.infoSection}>{t('void.infoRarities')}</Text>
                {(Object.entries(voidOdds) as [Rarity, number][]).filter(([, chance]) => chance > 0).map(([rarity, chance]) => (
                  <View key={rarity} style={styles.modalOddRow}><View style={[styles.dot, { backgroundColor: rarityTheme[rarity].accent }]} /><Text style={styles.modalOddName}>{t(tk(`rarity.${rarity}`))}</Text><Text style={styles.modalOddRate}>{chance}%</Text></View>
                ))}
                <View style={styles.goldenInfo}><Text style={styles.goldenInfoTitle}>{t('opening.goldenOutline')}</Text><Text style={styles.goldenInfoCopy}>{t('void.infoGolden', { chance: voidGoldenRate * 100 })}</Text></View>
                <View style={[styles.goldenInfo, localStyles.essenceInfo]}><Text style={[styles.goldenInfoTitle, localStyles.essenceInfoTitle]}>{t('void.essenceKicker')}</Text><Text style={[styles.goldenInfoCopy, localStyles.essenceInfoCopy]}>{t('void.infoEssence', { chance: (essenceChance * 100).toFixed(2), pity: essencePity })}</Text></View>
              </ScrollView>
              <Pressable onPress={() => { playSound('back'); setVoidInfoOpen(false); }} style={styles.modalDone}><Text style={styles.modalDoneText}>{t('opening.gotIt')}</Text></Pressable>
            </View>
          </View>
        </Modal>
        <Modal visible={Boolean(winner) && !opening} transparent animationType="fade" onRequestClose={dismissResult}>
          <Pressable style={styles.revealBackdrop} onPress={dismissResult}>
            {winner && <Animated.View style={[styles.revealCard, revealSupernova && localStyles.revealCardSupernova, { transform: [{ scale: revealScale }] }]}>
              <View style={styles.sparkles}><Text>✦</Text><Text>✦</Text><Text>✦</Text></View>
              <Text style={[styles.revealKicker, winner.golden && styles.goldenResultLabel, revealSupernova && localStyles.revealKickerSupernova]}>{revealSupernova ? t('supernova.burst') : winner.golden ? t('opening.goldenFind') : t('opening.newCard')}</Text>
              <MiniCard card={winner.card} large golden={winner.golden} shimmer={goldenShimmer} />
              <Text style={styles.revealName}>{winner.card.name}</Text>
              <Text style={[styles.revealRarity, { color: winner.golden ? '#FFD54A' : rarityTheme[winner.card.rarity].color }]}>{t(tk(`rarity.${winner.card.rarity}`)).toUpperCase()}{winner.golden ? ` · ${t('opening.golden')}` : ''}</Text>
            </Animated.View>}
          </Pressable>
        </Modal>
        <Modal visible={Boolean(batchResults)} transparent animationType="fade" onRequestClose={() => setBatchResults(null)}>
          <View style={styles.batchBackdrop}>
            <View style={styles.batchSheet}>
              <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>{t('opening.yourFinds')}</Text></View><Pressable onPress={() => { playSound('back'); setBatchResults(null); }} hitSlop={12}><Text style={styles.closeButton}>×</Text></Pressable></View>
              <ScrollView contentContainerStyle={styles.batchGrid} showsVerticalScrollIndicator={false}>{batchResults?.map((result, index) => <View key={`${result.card.id}-${index}`} style={styles.batchCardWrap}><MiniCard card={result.card} golden={result.golden} shimmer={goldenShimmer} />{result.golden && <Text style={styles.batchGolden}>{t('opening.golden')}</Text>}</View>)}</ScrollView>
              <Pressable onPress={() => { playSound('purchase'); setBatchResults(null); }} style={styles.modalDone}><Text style={styles.modalDoneText}>{t('opening.collectAll')}</Text></Pressable>
            </View>
          </View>
        </Modal>
        <CollectionScreen
          visible={collectionOpen}
          onClose={() => setCollectionOpen(false)}
          inventory={inventory}
          shimmer={goldenShimmer}
          levelFor={(card) => progressFor(card).level}
          bag={bag}
          defeatedWardenIds={defeatedWardenIds}
          ownedArenas={arenaThemes.filter((theme) => ownedArenaThemeIds.includes(theme.id))}
          essence={demonEssence}
          voidCosmeticCount={voidCosmeticIds.length}
        />
      </SafeAreaView>
    </I18nProvider>
  );
}

const localStyles = StyleSheet.create({
  starsPager: { flex: 1 },
  peekLayer: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 50 },
  infoScroll: { maxHeight: 430 },
  dailyTimer: { color: '#FFE9A0', fontSize: 15, fontWeight: '900', letterSpacing: 1, fontVariant: ['tabular-nums'] },
  ownedBadge: { position: 'absolute', right: -6, top: -6, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: '#F26B63', borderWidth: 1.5, borderColor: '#FFF4D7', alignItems: 'center', justifyContent: 'center' },
  ownedBadgeText: { color: '#FFFDF1', fontSize: 9, fontWeight: '900' },
  rouletteTitle: { marginTop: 2, marginBottom: 12 },
  eventInfo: { color: '#FFC3CB', marginBottom: 0 },
  infoSection: { color: '#FFB066', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 12 },
  essenceInfo: { backgroundColor: '#3A0614', borderColor: '#FF4D6D' },
  essenceInfoTitle: { color: '#FF8A9A' },
  essenceInfoCopy: { color: '#FFD0D8' },
  rouletteStar: { alignSelf: 'center', marginTop: -6, marginBottom: 2 },
  roulettePointer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', zIndex: 2 },
  roulettePointerLine: { width: 2, flex: 1, marginTop: -8, marginBottom: 8, borderRadius: 1, opacity: 0.55 },
  revealCardSupernova: { borderColor: '#FFD76A', shadowColor: '#FFD76A', shadowOpacity: 0.6, shadowRadius: 24 },
  revealKickerSupernova: { color: '#FFD76A', fontSize: 18, textShadowColor: '#FFB347', textShadowRadius: 12 },
});

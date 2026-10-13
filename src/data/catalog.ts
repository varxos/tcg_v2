// Demonic sits at the same tier as Angelic; demons can only be awakened with Demon Essence.
export type Rarity = 'Common' | 'Rare' | 'Very Rare' | 'Epic' | 'Legendary' | 'Angelic' | 'Demonic';
export type BoosterId = 'dawn' | 'twilight' | 'celestial' | 'sparkle' | 'crimson';
export type Card = { id: string; name: string; rarity: Rarity; icon: string; boosterIds: BoosterId[] };
export type Booster = { id: BoosterId; name: string; subtitle: string; icon: string; color: string; accent: string; odds: Record<Rarity, number>; cost: number; goldenRate: number; event?: boolean };
export type DropResult = { card: Card; golden: boolean };

export const rarityTheme: Record<Rarity, { color: string; accent: string }> = {
  Common: { color: '#8ED0A7', accent: '#408064' },
  Rare: { color: '#8D9BFF', accent: '#4D46D9' },
  'Very Rare': { color: '#F39DC8', accent: '#A9387B' },
  Epic: { color: '#D79CF7', accent: '#873BB5' },
  Legendary: { color: '#FFC75F', accent: '#DF6B27' },
  Angelic: { color: '#FFF1C9', accent: '#E3B838' },
  Demonic: { color: '#FF4D6D', accent: '#5C0A24' },
};

export const goldenEligible: Rarity[] = ['Epic', 'Legendary', 'Angelic'];
export const goldenChance = 0.01;
export const baseBoosterCost = 10;
export const dailyCelestiIntervalMs = 24 * 60 * 60 * 1000;

export const noAngelic = 0;
export const defaultOdds: Record<Rarity, number> = { Common: 59.93, Rare: 25, 'Very Rare': 10, Epic: 4, Legendary: 1, Angelic: 0.07, Demonic: 0 };
// Every star opened adds one Supernova charge; a full gauge grants a guaranteed Epic or Legendary creature.
export const supernovaGoal = 30;
// The Crimson Star is a limited event that only exists during the beta.
export const betaEventActive = true;

export const boosters: Booster[] = [
  { id: 'dawn', name: 'Dawn Star', subtitle: 'Easy & bright', icon: '✦', color: '#FFBB68', accent: '#E77A3D', cost: baseBoosterCost, goldenRate: goldenChance, odds: { ...defaultOdds } },
  { id: 'twilight', name: 'Twilight Star', subtitle: 'Rare currents', icon: '✦', color: '#A48AF4', accent: '#6349B8', cost: baseBoosterCost, goldenRate: goldenChance, odds: { ...defaultOdds } },
  { id: 'celestial', name: 'Celestial Star', subtitle: 'Mythic skies', icon: '✦', color: '#73DDEC', accent: '#287BA8', cost: baseBoosterCost, goldenRate: goldenChance, odds: { ...defaultOdds } },
  { id: 'crimson', name: 'Crimson Star', subtitle: 'Beta event', icon: '✦', color: '#FF5B6E', accent: '#A51E3C', cost: 15, goldenRate: goldenChance * 2, event: true, odds: { Common: 44, Rare: 30, 'Very Rare': 15, Epic: 8, Legendary: 2.6, Angelic: 0.4, Demonic: 0 } },
  { id: 'sparkle', name: 'Supernova', subtitle: 'Guaranteed Epic+', icon: '✺', color: '#FFE9A8', accent: '#E08A2A', cost: 0, goldenRate: goldenChance, odds: { Common: 0, Rare: 0, 'Very Rare': 0, Epic: 74, Legendary: 26, Angelic: noAngelic, Demonic: 0 } },
];
export const boosterById = (id: BoosterId) => boosters.find((booster) => booster.id === id) ?? boosters[0];
export const openableStars = boosters.filter((booster) => booster.id !== 'sparkle' && (!booster.event || betaEventActive));

export const makeCards = (boosterId: BoosterId, rarity: Rarity, entries: [string, string, string][]): Card[] => entries.map(([id, name, icon]) => ({ id, name, icon, rarity, boosterIds: [boosterId] }));
export const starterCards: Card[] = [
  ...makeCards('dawn', 'Common', [['moss', 'Emberling', '🍄'], ['leaf', 'Cinderhorn', '🌿'], ['acorn', 'Mistruffle', '🌰'], ['bloom', 'Glimmerpaw', '🌼']]),
  ...makeCards('dawn', 'Rare', [['spark', 'Sunwing Sentinel', '⚡'], ['moon', 'Goldwing Vale', '🌙'], ['fox', 'Auroracrest Drake', '💠']]),
  ...makeCards('dawn', 'Very Rare', [['koi', 'Radiant Koi', '🐟'], ['ram', 'Nimbus Ram', '🐏']]),
  ...makeCards('dawn', 'Epic', [['pixie', 'Dusk Pixie', '🧚'], ['coral', 'Coral Crown', '🪸']]),
  ...makeCards('dawn', 'Legendary', [['dragon', 'Sunflare Drake', '🐲']]),
  ...makeCards('dawn', 'Angelic', [['dawnangel', 'Aurora Seraph', '🪽']]),
  ...makeCards('twilight', 'Common', [['moth', 'Mooncloak', '🦋'], ['plum', 'Starfin', '🍑'], ['toad', 'Capkin', '🐸'], ['berry', 'Tadcap', '🫐']]),
  ...makeCards('twilight', 'Rare', [['bolt', 'Prismhorn Warden', '💎'], ['crystal', 'Verdant Crown Drake', '👑'], ['raven', 'Cindercrest Drake', '🔥']]),
  ...makeCards('twilight', 'Very Rare', [['lotus', 'Lotus Lynx', '🐆'], ['orb', 'Orb Weaver', '🕷️']]),
  ...makeCards('twilight', 'Epic', [['witch', 'Starlit Witch', '🧙'], ['eclipse', 'Eclipse Eel', '🐍']]),
  ...makeCards('twilight', 'Legendary', [['phoenix', 'Violet Phoenix', '🔥']]),
  ...makeCards('twilight', 'Angelic', [['nightangel', 'Moonveil Seraph', '🌙']]),
  ...makeCards('celestial', 'Common', [['nova', 'Cometide', '🌟'], ['ice', 'Halo Wisp', '🧊'], ['planet', 'Starpal', '🪐'], ['rainbow', 'Bloopstar', '🌈']]),
  ...makeCards('celestial', 'Rare', [['meteor', 'Solarcrest Drake', '☄️'], ['aurora', 'Asterwing Familiar', '🌠'], ['prism', 'Petalcomet Sprite', '🌸']]),
  ...makeCards('celestial', 'Very Rare', [['nebula', 'Nebula Neko', '🐱'], ['cosmo', 'Cosmo Koala', '🐨']]),
  ...makeCards('celestial', 'Epic', [['galaxy', 'Galaxy Griffin', '🦅'], ['lunar', 'Lunar Leviathan', '🐙']]),
  ...makeCards('celestial', 'Legendary', [['stardrake', 'Stardust Drake', '🐉']]),
  ...makeCards('celestial', 'Angelic', [['seraph', 'Seraph Lumen', '👼']]),
];

// Demons belong to no star: they are chosen at the Demon Altar once enough Demon Essence is gathered.
export const demonCards: Card[] = [
  { id: 'demon-vorhex', name: 'Vorhex', rarity: 'Demonic', icon: '🐉', boosterIds: [] },
  { id: 'demon-azkarel', name: 'Azkarel', rarity: 'Demonic', icon: '😈', boosterIds: [] },
  { id: 'demon-nyxira', name: 'Nyxira', rarity: 'Demonic', icon: '🦇', boosterIds: [] },
];

export const cardsPerRarity: Record<Rarity, number> = {
  // V2 uses every creature that already has curated art, name and lore.
  Common: 12, Rare: 9, 'Very Rare': 4, Epic: 3, Legendary: 2, Angelic: 1, Demonic: 0,
};
export const generatedNames: Record<Rarity, string[]> = {
  Common: ['Mossling', 'Pebble Pup', 'Daisy Dot', 'Berry Bop', 'Puddle Pal', 'Acorn Ace', 'Bumble Bud', 'Clover Cub'],
  Rare: ['Thunder Tails', 'Prism Prowler', 'Meteor Mite', 'Frost Fang', 'Orbit Otter', 'Gleam Golem', 'Solar Squirrel', 'Aurora Antler'],
  'Very Rare': ['Velvet Viper', 'Starlight Stag', 'Mirage Manta', 'Cloud Crown', 'Crystal Coyote', 'Rainbow Raptor', 'Moonlit Mantis', 'Cosmic Cub'],
  Epic: ['Astral Archer', 'Twinkle Tiger', 'Nebula Nymph', 'Sapphire Siren', 'Dream Drake', 'Aurora Alchemist', 'Midnight Monarch', 'Prism Phoenix'],
  Legendary: ['Royal Starwyrm', 'Celestial Chimera', 'Crown of Comets'],
  Angelic: ['Seraph'],
  Demonic: [],
};
export const generatedIcons: Record<Rarity, string[]> = {
  Common: ['🍀', '🐞', '🫐', '🌷', '🐌', '🦔'], Rare: ['⚡', '💎', '☄️', '❄️', '🌠', '🔮'], 'Very Rare': ['🐉', '🪞', '🦋', '🌙', '🧿', '🦌'], Epic: ['🧚', '🦁', '🧜', '🦚', '🪄', '🌌'], Legendary: ['🐲', '🦅', '🌋'], Angelic: ['👼'], Demonic: [],
};
export const starCollections: BoosterId[] = ['dawn', 'twilight', 'celestial'];
export const generatedPrefixes: Record<BoosterId, string> = { dawn: 'Dawn', twilight: 'Twilight', celestial: 'Celestial', sparkle: 'Sparkle', crimson: 'Crimson' };
export const curatedCardNames: Record<string, string> = {
  'dawn-common-5': 'Blazetail', 'dawn-common-6': 'Breezetail', 'dawn-common-7': 'Thistleclaw', 'dawn-common-8': 'Puffhorn', 'dawn-common-9': 'Coppersprite', 'dawn-common-10': 'Bloomskip', 'dawn-common-11': 'Petalprance', 'dawn-common-12': 'Duskleaf',
  'twilight-common-5': 'Lunashroom', 'twilight-common-6': 'Dewcap', 'twilight-common-7': 'Moondrift', 'twilight-common-8': 'Starbud',
  'twilight-common-9': 'Spriglet', 'twilight-common-10': 'Gemcap', 'twilight-common-11': 'Prismwing', 'twilight-common-12': 'Glowcap',
  'dawn-rare-4': 'Verdantwing Drake', 'dawn-rare-5': 'Glasswing Drake', 'dawn-rare-6': 'Duskplate Guardian', 'dawn-rare-7': 'Moonhorn Ibex', 'dawn-rare-8': 'Starmane Bison', 'dawn-rare-9': 'Starburrow Mole',
  'dawn-very-rare-3': 'Astral Moonhorn',
  'twilight-rare-4': 'Mooncrest Drake', 'twilight-rare-5': 'Tidecrest Drake', 'twilight-rare-6': 'Shadebloom Drake', 'twilight-rare-7': 'Runeshell Wanderer', 'twilight-rare-8': 'Crystalquill Hedgehog', 'twilight-rare-9': 'Starlight Raccoon',
  'twilight-very-rare-3': 'Verdantquill Hedgehog',
  'twilight-very-rare-4': 'Embertrail Raccoon',
  'celestial-rare-4': 'Starglade Familiar', 'celestial-rare-5': 'Moonstone Shellback', 'celestial-rare-6': 'Starhermit Crab', 'celestial-rare-7': 'Astrahoof Courier', 'celestial-rare-8': 'Frostclaw Badger', 'celestial-rare-9': 'Starpool Otter',
  'celestial-very-rare-3': 'Aurora Current Otter',
  'celestial-very-rare-4': 'Coral Moon Shellback',
  'celestial-common-5': 'Wishwhale', 'celestial-common-6': 'Cradletide', 'celestial-common-7': 'Asterbud',
  'celestial-common-8': 'Stellfin', 'celestial-common-9': 'Glowtail', 'celestial-common-10': 'Mistray', 'celestial-common-11': 'Asterflare', 'celestial-common-12': 'Crestide',
  'dawn-very-rare-4': 'Starlight Stag', 'dawn-epic-3': 'Ember Alchemist', 'dawn-legendary-2': 'Verdant Chimera',
  'twilight-epic-3': 'Midnight Monarch', 'twilight-legendary-2': 'Prism Starwyrm',
  'celestial-epic-3': 'Sapphire Siren', 'celestial-legendary-2': 'Royal Tidewyrm',
};
export const makeExtraCards = (boosterId: BoosterId, rarity: Rarity, start: number, amount: number): Card[] => Array.from({ length: amount }, (_, index) => {
  const names = generatedNames[rarity];
  const icons = generatedIcons[rarity];
  const displayIndex = start + index + 1;
  const id = `${boosterId}-${rarity.replace(' ', '-').toLowerCase()}-${displayIndex}`;
  return { id, name: curatedCardNames[id] ?? `${generatedPrefixes[boosterId]} ${names[(start + index) % names.length]}`, icon: icons[(start + index) % icons.length], rarity, boosterIds: [boosterId] };
});
export const catalog: Card[] = [
  ...starterCards,
  ...starCollections.flatMap((boosterId) => (Object.keys(cardsPerRarity) as Rarity[]).flatMap((rarity) => {
    const existing = starterCards.filter((card) => card.rarity === rarity && card.boosterIds.includes(boosterId)).length;
    return makeExtraCards(boosterId, rarity, existing, cardsPerRarity[rarity] - existing);
  })),
  ...demonCards,
];

export const cardDescriptions: Record<string, string> = {
  spark: 'A steadfast Dawn sentinel whose ember-bright wings guide lost travelers toward the first light.',
  moon: 'A bright-winged Dawn companion whose golden feathers gather the last warmth of every sunrise.',
  fox: 'A Dawn drake whose blue crest stores the pale light that lingers just after sunrise.',
  'dawn-rare-4': 'A fresh-winged Dawn drake whose leaves unfurl whenever the first warm breeze arrives.',
  'dawn-rare-5': 'A lively Dawn drake that carries a polished star-crystal through the first glow of day.',
  'dawn-rare-6': 'A calm plated guardian whose warm crystal tether has guided travelers through dim dawn mist.',
  'dawn-rare-7': 'A highland ibex whose moonstone horns trace the softest paths through the early sky.',
  'dawn-rare-8': 'A broad-shouldered bison whose pale mane gathers the first scattered sparks of sunrise.',
  'dawn-rare-9': 'A cheerful burrower whose crystal claws uncover tiny pieces of the sky beneath the dawn soil.',
  'dawn-very-rare-3': 'An ascended Moonhorn Ibex whose crystal-tipped horns gather a quiet path of constellations across the high dawn sky.',
  bolt: 'A poised Twilight warden whose crystal crown catches the last colors of a fading star.',
  crystal: 'A moonlit drake whose living leaf crown stirs when forgotten paths begin to bloom again.',
  meteor: 'A celestial drake whose ember crest lights a warm passage through the quiet upper sky.',
  raven: 'A swift Twilight drake whose ember-tipped wings flicker brighter beneath a clouded moon.',
  'twilight-rare-4': 'A moon-bound drake whose lantern tail blooms whenever a silver crescent rises.',
  'twilight-rare-5': 'A quiet Twilight drake whose sea-glass wings carry a tiny fragment of a distant moon.',
  'twilight-rare-6': 'A shadowed Twilight drake whose luminous leaf frill brightens at the edge of the night.',
  'twilight-rare-7': 'A patient shellback with moonlit runes etched into every piece of its ancient armor.',
  'twilight-rare-8': 'A gentle night hedgehog whose crystal quills collect the smallest fallen stars.',
  'twilight-rare-9': 'A swift masked scout whose striped tail follows the brightest paths through the starfield.',
  'twilight-very-rare-3': 'An ascended Crystalquill Hedgehog whose emerald-and-gold quills store the last warm sparks of the forest twilight.',
  'twilight-very-rare-4': 'A bright-eyed Twilight raccoon whose ember-colored trail marks the hidden routes between falling stars.',
  aurora: 'A quiet celestial familiar whose green crystal plume keeps the gentlest wishes safely aloft.',
  prism: 'A small celestial sprite that follows the trail of every flower-shaped comet through the stars.',
  'celestial-rare-4': 'A soft celestial familiar whose pink wings gather the sparkle of every nearby star.',
  'celestial-rare-5': 'A floating moonstone shellback whose orbiting moon keeps its constellation runes awake.',
  'celestial-rare-6': 'A crystal-clawed hermit whose starlit shell keeps one sleeping constellation safe.',
  'celestial-rare-7': 'A crystal-backed courier whose sure-footed path crosses the quietest reaches of the night sky.',
  'celestial-rare-8': 'A steadfast badger whose frost crystals glint whenever a new moon rises over the skyfield.',
  'celestial-rare-9': 'A watchful otter that traces fallen constellations across its quiet pool of arcane water.',
  'celestial-very-rare-3': 'An ascended Starpool Otter whose warm aurora shimmer turns a quiet pool into a trail of pink and violet starlight.',
  'celestial-very-rare-4': 'An ascended Moonstone Shellback whose coral plates hold a small crescent of warm light beneath the evening sky.',
  moss: 'A curious little dawn creature with ember-tipped ears, always chasing the first spark of morning.',
  leaf: 'A gentle horned sprite whose tiny wings shimmer whenever the morning air grows warm.',
  acorn: 'Its feather-soft ruff catches the first breeze of the day and carries it across the water.',
  bloom: 'A bright gem-tailed explorer that always waves hello before setting off on a new trail.',
  'dawn-common-5': 'A quick-witted winged fox whose warm tail-light is never far from its next adventure.',
  'dawn-common-6': 'A sunny little runner whose crystal crest catches every breeze before it reaches the clouds.',
  'dawn-common-7': 'A soft-footed woodland friend with gentle horns and a habit of collecting every glimmer it finds.',
  'dawn-common-8': 'A bouncy cloud-hopper who never misses the chance to greet a new ray of sunlight.',
  'dawn-common-9': 'This warm-winged little drake loves bright mornings and follows every sparkle it sees.',
  'dawn-common-10': 'A cheerful petal-tailed friend that races each soft breeze over the early meadow.',
  'dawn-common-11': 'This little garden runner keeps its favorite blossom close through every bright day.',
  'dawn-common-12': 'A nimble leaf-eared explorer whose colorful tail always points toward the next discovery.',
  moth: 'A round moonlit wanderer whose small wing-fins glow softly beneath the quietest stars.',
  plum: 'A stargazing little swimmer whose golden tail brightens every midnight ripple.',
  toad: 'A quiet cap-covered companion that shelters its soft glow beneath a starry brim.',
  berry: 'A tiny night traveler in a frog hood, carrying a little pink moon-spore on its back.',
  'twilight-common-5': 'A shy forest guardian whose violet mushroom cap reflects the softest moonlight.',
  'twilight-common-6': 'A bright-eyed dew dweller, happiest when the first stars glimmer across its cap.',
  'twilight-common-7': 'A gentle moonwing that drifts above the clearing whenever the night feels still.',
  'twilight-common-8': 'A curious four-eyed friend that follows the smallest falling star it can find.',
  'twilight-common-9': 'A small leafy night scout who watches moonlit clearings from its quiet perch.',
  'twilight-common-10': 'A patient little guardian whose bright forehead gem holds a single wish for the night.',
  'twilight-common-11': 'A nimble crystal-crested flyer that turns every moonbeam into a new path.',
  'twilight-common-12': 'A cozy lantern-cap friend whose golden glow makes the darkest trail feel gentle.',
  nova: 'A bright little celestial swimmer who rides comets with its tiny lanternfish friend.',
  ice: 'A soft halo-winged wisp that drifts from planet to planet on a quiet golden glow.',
  planet: 'A gentle star-marked explorer who never travels alone, especially beneath a field of glowing stars.',
  rainbow: 'A round little star-whale who keeps a pocketful of constellations in its glowing tail.',
  'celestial-common-5': 'A wish-carrying sky whale whose luminous tail points toward the nearest friendly star.',
  'celestial-common-6': 'A gentle oceanic traveler who keeps its tiny golden crab companion safe between the stars.',
  'celestial-common-7': 'A shy little aster spirit whose leafy antennae bloom wherever a new planet is found.',
  'celestial-common-8': 'A star-speckled little fin swimmer who follows every glowing crystal through the night sky.',
  'celestial-common-9': 'A round cosmic drifter whose bright tail leaves a quiet streak of gold behind it.',
  'celestial-common-10': 'A tiny mist ray that carries a heart-shaped cloud from one sleeping planet to the next.',
  'celestial-common-11': 'A warm little star spirit whose friendly lantern-bud never stops glowing.',
  'celestial-common-12': 'A calm celestial whale who keeps whole tiny worlds safe in the curve of its tail.',
};

export const activeCandidates = (booster: Booster, rarity: Rarity) => {
  // The Supernova and the Crimson event star draw from the creatures of every star.
  const pool = booster.id === 'sparkle' || booster.id === 'crimson'
    ? catalog.filter((card) => card.rarity === rarity && (booster.id === 'crimson' || card.rarity !== 'Angelic'))
    : catalog.filter((card) => card.rarity === rarity && card.boosterIds.includes(booster.id));
  return pool;
};

export const weightedDraw = (booster: Booster): Card => {
  const totalWeight = (Object.keys(booster.odds) as Rarity[]).reduce((total, rarity) => total + Math.max(0, booster.odds[rarity]), 0);
  if (totalWeight <= 0) return catalog[0];
  const roll = Math.random() * totalWeight;
  let cursor = 0;
  for (const rarity of Object.keys(booster.odds) as Rarity[]) {
    cursor += booster.odds[rarity];
    if (roll <= cursor) {
      const candidates = activeCandidates(booster, rarity);
      if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }
  return catalog[0];
};

export const drawResult = (booster: Booster, goldenRate = goldenChance): DropResult => {
  const card = weightedDraw(booster);
  return { card, golden: goldenEligible.includes(card.rarity) && Math.random() < goldenRate };
};

// landing is where the pointer stops on the winning card, as a fraction of the card width from its center.
export type OpeningLayout = { cards: Card[]; winnerIndex: number; landing: number };

export const chooseVisualCard = (allowed: Rarity[], winner: Card): Card => {
  // A card already won is never repeated in the visual tape.
  const candidates = catalog.filter((card) => allowed.includes(card.rarity) && card.id !== winner.id);
  return candidates[Math.floor(Math.random() * candidates.length)] ?? catalog[0];
};

export const createVisualTape = (winner: Card): OpeningLayout => {
  const winnerIndex = 18 + Math.floor(Math.random() * 5);
  const cards = Array.from({ length: 30 }, (_, index) => {
    const distance = Math.abs(index - winnerIndex);
    // The immediate final stretch stays mostly modest. Rare/epic decoys occur
    // farther away, preserving excitement without manufacturing a tight near-miss.
    if (distance <= 3) return chooseVisualCard(['Common', 'Common', 'Rare'], winner);
    if (distance <= 7) return chooseVisualCard(['Common', 'Common', 'Rare', 'Rare', 'Very Rare'], winner);
    return chooseVisualCard(['Common', 'Common', 'Common', 'Rare', 'Rare', 'Rare', 'Very Rare', 'Very Rare', 'Epic'], winner);
  });
  cards[winnerIndex] = winner;
  return { cards, winnerIndex, landing: (Math.random() * 2 - 1) * 0.38 };
};

export const collectionOrder: Rarity[] = ['Common', 'Rare', 'Very Rare', 'Epic', 'Legendary', 'Angelic', 'Demonic'];
export const collectionLabels: Record<Rarity, string> = {
  Common: 'COMMUN', Rare: 'RARE', 'Very Rare': 'TRÈS RARE', Epic: 'ÉPIQUE', Legendary: 'LÉGENDAIRE', Angelic: 'ANGÉLIQUE', Demonic: 'DÉMONIAQUE',
};
export const inventoryKey = (card: Card, golden = false) => `${card.id}:${golden ? 'golden' : 'standard'}`;

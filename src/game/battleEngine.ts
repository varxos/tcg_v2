import { Card, Rarity } from '../data/catalog';
import type { TranslationKey } from '../i18n/en';
import {
  CreatureStats, CreatureType, Move, StatKey, StatusId, applyXp, cardById, effectiveness, maxLevel, movesAtLevel,
  statsAtLevel, statusInfo, struggleMove, typeForCard, xpYield,
} from './creatures';
import { Bag, ItemId, canUseItem, itemHeal, items } from './items';

export type Side = 'player' | 'enemy';
export type BattleCreature = {
  uid: string; cardId: string; name: string; rarity: Rarity; type: CreatureType; level: number; xp: number;
  maxHp: number; hp: number; stats: CreatureStats; stages: Record<StatKey, number>;
  moves: { move: Move; pp: number }[]; status: StatusId | null; statusTurns: number; participated: boolean;
};
export type BattleCounters = { superEffective: number; crits: number; knockouts: number; itemsUsed: number; movesUsed: number; levelUps: number };
export type BattlePhase = 'choose' | 'forceSwitch' | 'victory' | 'defeat' | 'fled';
export type BattleState = {
  kind: 'wild' | 'warden'; wardenId: string | null; opponentName: string; turn: number; aiSkill: number;
  player: BattleCreature[]; enemy: BattleCreature[]; playerActive: number; enemyActive: number;
  bag: Bag; enemyItems: Partial<Record<ItemId, number>>; phase: BattlePhase; counters: BattleCounters;
};
export type MessageRef = { side: Side; name: string };
// Messages carry a translation key plus structured references; the UI turns them into localized text.
export type MessageBody = { kind: 'message'; key: TranslationKey; params?: Record<string, string | number>; actor?: MessageRef; target?: MessageRef; stat?: StatKey };
type EventBody =
  | MessageBody
  | { kind: 'attack'; side: Side; move: Move }
  | { kind: 'hit'; side: Side; damage: number; effect: number; crit: boolean; recoil?: boolean }
  | { kind: 'miss'; side: Side }
  | { kind: 'heal'; side: Side; amount: number }
  | { kind: 'status'; side: Side; status: StatusId | null }
  | { kind: 'stat'; side: Side; stat: StatKey; stages: number }
  | { kind: 'faint'; side: Side }
  | { kind: 'switchOut'; side: Side }
  | { kind: 'switchIn'; side: Side }
  | { kind: 'levelUp'; uid: string; level: number }
  | { kind: 'item'; side: Side; itemId: ItemId };
export type BattleEvent = EventBody & { state: BattleState };
export type PlayerAction = { kind: 'move'; index: number } | { kind: 'switch'; index: number } | { kind: 'item'; itemId: ItemId; target: number } | { kind: 'run' };
export type BattleSetup = {
  kind: 'wild' | 'warden'; wardenId?: string | null; opponentName: string; aiSkill: number;
  player: { card: Card; level: number; xp: number }[]; enemy: { card: Card; level: number }[];
  bag: Bag; enemyItems?: Partial<Record<ItemId, number>>;
};
type Context = {
  s: BattleState; rng: () => number; announced: Set<string>;
  emit: (body: EventBody) => void;
  say: (key: TranslationKey, extra?: Omit<MessageBody, 'kind' | 'key'>) => void;
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const other = (side: Side): Side => (side === 'player' ? 'enemy' : 'player');
export const activeOf = (s: BattleState, side: Side) => (side === 'player' ? s.player[s.playerActive] : s.enemy[s.enemyActive]);
export const stageMultiplier = (stage: number) => (stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage));
const speedOf = (creature: BattleCreature) => creature.stats.speed * stageMultiplier(creature.stages.speed) * (creature.status === 'dazzle' ? 0.5 : 1);
const freshStages = (): Record<StatKey, number> => ({ attack: 0, defense: 0, speed: 0 });
const ref = (side: Side, creature: BattleCreature): MessageRef => ({ side, name: creature.name });

export const createBattleCreature = (card: Card, level: number, xp: number, side: Side, index: number): BattleCreature => {
  const stats = statsAtLevel(card, level);
  return {
    uid: `${side}-${index}-${card.id}`, cardId: card.id, name: card.name, rarity: card.rarity, type: typeForCard(card), level, xp,
    maxHp: stats.hp, hp: stats.hp, stats, stages: freshStages(), moves: movesAtLevel(card, level).map((move) => ({ move, pp: move.pp })),
    status: null, statusTurns: 0, participated: false,
  };
};

const makeContext = (s: BattleState, events: BattleEvent[], rng: () => number): Context => {
  const emit = (body: EventBody) => { events.push({ ...body, state: clone(s) } as BattleEvent); };
  return { s, rng, announced: new Set<string>(), emit, say: (key, extra = {}) => emit({ kind: 'message', key, ...extra }) };
};

export const createBattle = (setup: BattleSetup) => {
  const s: BattleState = {
    kind: setup.kind, wardenId: setup.wardenId ?? null, opponentName: setup.opponentName, turn: 1, aiSkill: setup.aiSkill,
    player: setup.player.map((entry, index) => createBattleCreature(entry.card, entry.level, entry.xp, 'player', index)),
    enemy: setup.enemy.map((entry, index) => createBattleCreature(entry.card, entry.level, 0, 'enemy', index)),
    playerActive: 0, enemyActive: 0, bag: clone(setup.bag), enemyItems: clone(setup.enemyItems ?? {}), phase: 'choose',
    counters: { superEffective: 0, crits: 0, knockouts: 0, itemsUsed: 0, movesUsed: 0, levelUps: 0 },
  };
  s.player[0].participated = true;
  const events: BattleEvent[] = [];
  const { emit, say } = makeContext(s, events, Math.random);
  if (s.kind === 'wild') {
    emit({ kind: 'switchIn', side: 'enemy' });
    say('battle.wildAppeared', { params: { name: s.enemy[0].name } });
  } else {
    say('battle.wantsToBattle', { params: { opponent: s.opponentName } });
    emit({ kind: 'switchIn', side: 'enemy' });
    say('battle.sentOut', { params: { opponent: s.opponentName, name: s.enemy[0].name } });
  }
  emit({ kind: 'switchIn', side: 'player' });
  say('battle.go', { params: { name: s.player[0].name } });
  return { state: s, events };
};

export const estimateDamage = (attacker: BattleCreature, defender: BattleCreature, move: Move) => {
  if (move.category !== 'strike') return 0;
  const attack = attacker.stats.attack * stageMultiplier(attacker.stages.attack) * (attacker.status === 'burn' ? 0.75 : 1);
  const defense = Math.max(1, defender.stats.defense * stageMultiplier(defender.stages.defense));
  const base = Math.floor(Math.floor(((Math.floor((2 * attacker.level) / 5) + 2) * move.power * attack) / defense) / 50) + 2;
  return Math.max(1, Math.floor(base * (move.type === attacker.type ? 1.5 : 1) * effectiveness(move.type, defender.type) * 0.925));
};

const applyStatus = (ctx: Context, side: Side, status: StatusId, announceFailure: boolean) => {
  const { s, emit, say, rng } = ctx;
  const creature = activeOf(s, side);
  if (creature.hp <= 0) return;
  if (creature.status) {
    if (announceFailure) say('battle.failed');
    return;
  }
  if (statusInfo[status].immune === creature.type) {
    if (announceFailure) say('battle.noEffect', { target: ref(side, creature) });
    return;
  }
  creature.status = status;
  creature.statusTurns = status === 'sleep' ? 2 + Math.floor(rng() * 3) : 0;
  emit({ kind: 'status', side, status });
  say(`status.${status}.applied` as TranslationKey, { target: ref(side, creature) });
};

const applyStat = (ctx: Context, side: Side, stat: StatKey, stages: number, announceFailure: boolean) => {
  const { s, emit, say } = ctx;
  const creature = activeOf(s, side);
  if (creature.hp <= 0) return;
  const current = creature.stages[stat];
  const next = Math.max(-6, Math.min(6, current + stages));
  if (next === current) {
    if (announceFailure) say(stages > 0 ? 'battle.statMax' : 'battle.statMin', { target: ref(side, creature), stat });
    return;
  }
  creature.stages[stat] = next;
  emit({ kind: 'stat', side, stat, stages });
  const key: TranslationKey = Math.abs(stages) >= 2 ? (stages > 0 ? 'battle.statRoseSharply' : 'battle.statFellHarshly') : stages > 0 ? 'battle.statRose' : 'battle.statFell';
  say(key, { target: ref(side, creature), stat });
};

const gainXp = (ctx: Context, index: number, amount: number, announce: boolean) => {
  const { s, emit, say } = ctx;
  const creature = s.player[index];
  const card = cardById.get(creature.cardId);
  if (!card || creature.level >= maxLevel || amount <= 0) return;
  const result = applyXp(card, { level: creature.level, xp: creature.xp }, amount);
  creature.xp = result.progress.xp;
  if (announce) say('battle.gainedXp', { params: { name: creature.name, amount } });
  if (result.levelsGained <= 0) return;
  const stats = statsAtLevel(card, result.progress.level);
  const hpGain = stats.hp - creature.maxHp;
  creature.level = result.progress.level;
  creature.stats = stats;
  creature.maxHp = stats.hp;
  if (creature.hp > 0) creature.hp = Math.min(stats.hp, creature.hp + hpGain);
  creature.moves = movesAtLevel(card, creature.level).map((move) => ({ move, pp: creature.moves.find((slot) => slot.move.id === move.id)?.pp ?? move.pp }));
  s.counters.levelUps += result.levelsGained;
  emit({ kind: 'levelUp', uid: creature.uid, level: creature.level });
  say('battle.grewLevel', { params: { name: creature.name, level: creature.level } });
  result.learned.forEach((move) => say('battle.learned', { params: { name: creature.name, move: move.name } }));
};

const awardXp = (ctx: Context, fainted: BattleCreature) => {
  const { s, say } = ctx;
  const base = xpYield(fainted.rarity, fainted.level, s.kind === 'warden');
  let shared = false;
  s.player.forEach((creature, index) => {
    if (creature.hp <= 0 || creature.level >= maxLevel) return;
    if (creature.participated) gainXp(ctx, index, base, true);
    else {
      shared = true;
      gainXp(ctx, index, Math.floor(base / 2), false);
    }
  });
  if (shared) say('battle.sharedXp');
  s.player.forEach((creature) => { creature.participated = false; });
  const current = activeOf(s, 'player');
  if (current.hp > 0) current.participated = true;
};

const checkFaints = (ctx: Context) => {
  const { s, emit, say, announced } = ctx;
  let fainted = false;
  (['enemy', 'player'] as Side[]).forEach((side) => {
    const creature = activeOf(s, side);
    if (creature.hp > 0 || announced.has(creature.uid)) return;
    announced.add(creature.uid);
    fainted = true;
    creature.status = null;
    creature.stages = freshStages();
    emit({ kind: 'faint', side });
    say('battle.fainted', { actor: ref(side, creature) });
    if (side === 'enemy') {
      s.counters.knockouts += 1;
      awardXp(ctx, creature);
    }
  });
  return fainted;
};

const executeMove = (ctx: Context, side: Side, index: number) => {
  const { s, emit, say, rng } = ctx;
  const attacker = activeOf(s, side);
  const targetSide = other(side);
  const target = activeOf(s, targetSide);
  const actor = ref(side, attacker);

  if (attacker.status === 'sleep') {
    attacker.statusTurns -= 1;
    if (attacker.statusTurns > 0) {
      emit({ kind: 'status', side, status: 'sleep' });
      say('battle.fastAsleep', { actor });
      return;
    }
    attacker.status = null;
    emit({ kind: 'status', side, status: null });
    say('battle.wokeUp', { actor });
  }
  if (attacker.status === 'freeze') {
    if (rng() < 0.25) {
      attacker.status = null;
      emit({ kind: 'status', side, status: null });
      say('battle.thawed', { actor });
    } else {
      emit({ kind: 'status', side, status: 'freeze' });
      say('battle.frozenSolid', { actor });
      return;
    }
  }
  if (attacker.status === 'dazzle' && rng() < 0.25) {
    emit({ kind: 'status', side, status: 'dazzle' });
    say('battle.dazzledStuck', { actor });
    return;
  }

  let move: Move;
  const slot = attacker.moves[index];
  if (slot && slot.pp > 0) {
    slot.pp -= 1;
    move = slot.move;
  } else {
    const fallback = attacker.moves.find((entry) => entry.pp > 0);
    if (fallback) {
      fallback.pp -= 1;
      move = fallback.move;
    } else {
      move = struggleMove;
      say('battle.noEnergy', { actor });
    }
  }
  if (side === 'player') s.counters.movesUsed += 1;
  say('battle.used', { actor, params: { move: move.name } });
  emit({ kind: 'attack', side, move });

  const effects = move.effects ?? [];
  const selfOnly = move.category === 'status' && effects.every((effect) => effect.kind === 'heal' || (effect.kind === 'stat' && effect.target === 'self'));
  if (!selfOnly && rng() > move.accuracy / 100) {
    emit({ kind: 'miss', side: targetSide });
    say('battle.missed', { actor });
    return;
  }

  if (move.category === 'strike') {
    const effect = effectiveness(move.type, target.type);
    const crit = rng() < (move.highCrit ? 0.125 : 0.0625);
    const attackStage = crit ? Math.max(0, attacker.stages.attack) : attacker.stages.attack;
    const defenseStage = crit ? Math.min(0, target.stages.defense) : target.stages.defense;
    const attack = attacker.stats.attack * stageMultiplier(attackStage) * (attacker.status === 'burn' ? 0.75 : 1);
    const defense = Math.max(1, target.stats.defense * stageMultiplier(defenseStage));
    const base = Math.floor(Math.floor(((Math.floor((2 * attacker.level) / 5) + 2) * move.power * attack) / defense) / 50) + 2;
    const stab = move.type === attacker.type ? 1.5 : 1;
    const damage = Math.max(1, Math.floor(base * stab * effect * (crit ? 1.5 : 1) * (0.85 + rng() * 0.15)));
    const dealt = Math.min(target.hp, damage);
    target.hp -= dealt;
    emit({ kind: 'hit', side: targetSide, damage: dealt, effect, crit });
    if (crit) {
      if (side === 'player') s.counters.crits += 1;
      say('battle.crit');
    }
    if (effect > 1) {
      if (side === 'player') s.counters.superEffective += 1;
      say('battle.superEffective');
    } else if (effect < 1) say('battle.notVeryEffective');

    effects.forEach((entry) => {
      if (entry.kind === 'drain' && dealt > 0 && attacker.hp > 0) {
        const heal = Math.min(attacker.maxHp - attacker.hp, Math.max(1, Math.floor(dealt * entry.ratio)));
        if (heal > 0) {
          attacker.hp += heal;
          emit({ kind: 'heal', side, amount: heal });
          say('battle.drained', { target: ref(targetSide, target) });
        }
      }
      if (entry.kind === 'recoil' && dealt > 0 && attacker.hp > 0) {
        const recoil = Math.min(attacker.hp, Math.max(1, Math.floor(dealt * entry.ratio)));
        attacker.hp -= recoil;
        emit({ kind: 'hit', side, damage: recoil, effect: 1, crit: false, recoil: true });
        say('battle.recoil', { actor });
      }
      if (entry.kind === 'status' && target.hp > 0 && rng() * 100 < entry.chance) applyStatus(ctx, targetSide, entry.status, false);
      if (entry.kind === 'stat' && rng() * 100 < entry.chance) applyStat(ctx, entry.target === 'self' ? side : targetSide, entry.stat, entry.stages, false);
    });
    return;
  }

  effects.forEach((entry) => {
    if (entry.kind === 'status') applyStatus(ctx, targetSide, entry.status, true);
    if (entry.kind === 'stat') applyStat(ctx, entry.target === 'self' ? side : targetSide, entry.stat, entry.stages, true);
    if (entry.kind === 'heal') {
      const amount = Math.min(attacker.maxHp - attacker.hp, Math.floor(attacker.maxHp * entry.ratio));
      if (amount <= 0) say('battle.alreadyFull', { actor });
      else {
        attacker.hp += amount;
        emit({ kind: 'heal', side, amount });
        say('battle.regainedHealth', { actor });
      }
    }
  });
};

const performSwitch = (ctx: Context, index: number) => {
  const { s, emit, say } = ctx;
  const outgoing = activeOf(s, 'player');
  const incoming = s.player[index];
  if (!incoming || incoming.hp <= 0 || index === s.playerActive) return;
  say('battle.comeBack', { params: { name: outgoing.name } });
  emit({ kind: 'switchOut', side: 'player' });
  outgoing.stages = freshStages();
  s.playerActive = index;
  incoming.participated = true;
  emit({ kind: 'switchIn', side: 'player' });
  say('battle.go', { params: { name: incoming.name } });
};

const useItem = (ctx: Context, side: Side, itemId: ItemId, targetIndex: number) => {
  const { s, emit, say } = ctx;
  const team = side === 'player' ? s.player : s.enemy;
  const stock = side === 'player' ? s.bag : s.enemyItems;
  const target = team[targetIndex];
  if (!target || (stock[itemId] ?? 0) <= 0 || !canUseItem(itemId, target)) {
    say('battle.nothingHappened');
    return;
  }
  stock[itemId] = (stock[itemId] ?? 0) - 1;
  if (side === 'player') s.counters.itemsUsed += 1;
  const isActive = targetIndex === (side === 'player' ? s.playerActive : s.enemyActive);
  emit({ kind: 'item', side, itemId });
  if (side === 'player') say('battle.youUsedItem', { params: { item: items[itemId].name, name: target.name } });
  else say('battle.foeUsedItem', { params: { opponent: s.opponentName, item: items[itemId].name } });
  const heal = itemHeal[itemId];
  if (heal) {
    const amount = Math.min(target.maxHp - target.hp, heal);
    target.hp += amount;
    if (isActive) emit({ kind: 'heal', side, amount });
    say('battle.regainedHp', { target: ref(side, target), params: { amount } });
  } else if (itemId === 'dew' && target.status) {
    target.status = null;
    target.statusTurns = 0;
    if (isActive) emit({ kind: 'status', side, status: null });
    say('battle.cured', { target: ref(side, target) });
  } else if (itemId === 'revive') {
    target.hp = Math.max(1, Math.floor(target.maxHp / 2));
    ctx.announced.delete(target.uid);
    say('battle.revived', { params: { name: target.name } });
  }
};

const scoreMove = (self: BattleCreature, foe: BattleCreature, move: Move) => {
  if (move.category === 'strike') {
    let score = (estimateDamage(self, foe, move) * move.accuracy) / 100;
    if (score >= foe.hp) score *= 2.5;
    if ((move.effects ?? []).some((effect) => effect.kind === 'recoil') && self.hp < self.maxHp * 0.3) score *= 0.6;
    return Math.max(1, score);
  }
  let score = 0;
  (move.effects ?? []).forEach((effect) => {
    if (effect.kind === 'heal') score += self.hp < self.maxHp * 0.45 ? self.maxHp * 0.5 : 0.5;
    if (effect.kind === 'status') score += !foe.status && statusInfo[effect.status].immune !== foe.type ? ((foe.maxHp * 0.3) * move.accuracy) / 100 : 0;
    if (effect.kind === 'stat') {
      const holder = effect.target === 'self' ? self : foe;
      const stage = holder.stages[effect.stat];
      const useful = effect.stages > 0 ? stage < 2 : stage > -2;
      score += useful && self.hp > self.maxHp * 0.5 ? foe.maxHp * 0.18 : 0;
    }
  });
  return Math.max(0.5, score);
};

const chooseEnemyAction = (s: BattleState, rng: () => number): { kind: 'move'; index: number } | { kind: 'item'; itemId: ItemId } => {
  const self = activeOf(s, 'enemy');
  const foe = activeOf(s, 'player');
  if (s.kind === 'warden' && s.aiSkill >= 3 && self.hp < self.maxHp * 0.3) {
    const healing = (['elixir', 'tonic'] as ItemId[]).find((id) => (s.enemyItems[id] ?? 0) > 0);
    if (healing && rng() < 0.75) return { kind: 'item', itemId: healing };
  }
  const usable = self.moves.map((slot, index) => ({ slot, index })).filter(({ slot }) => slot.pp > 0);
  if (usable.length === 0) return { kind: 'move', index: 0 };
  const scored = usable.map(({ slot, index }) => ({ index, score: scoreMove(self, foe, slot.move) }));
  const randomness = s.aiSkill <= 1 ? 1 : s.aiSkill === 2 ? 0.3 : 0.1;
  if (s.aiSkill <= 1 || rng() < randomness) {
    const total = scored.reduce((sum, entry) => sum + entry.score, 0);
    let roll = rng() * total;
    for (const entry of scored) {
      roll -= entry.score;
      if (roll <= 0) return { kind: 'move', index: entry.index };
    }
    return { kind: 'move', index: scored[scored.length - 1].index };
  }
  return { kind: 'move', index: scored.reduce((best, entry) => (entry.score > best.score ? entry : best)).index };
};

const chooseEnemyReplacement = (s: BattleState) => {
  const alive = s.enemy.map((creature, index) => ({ creature, index })).filter(({ creature }) => creature.hp > 0);
  if (alive.length === 0) return -1;
  if (s.aiSkill < 3) return alive[0].index;
  const foe = activeOf(s, 'player');
  const score = (creature: BattleCreature) => effectiveness(creature.type, foe.type) - effectiveness(foe.type, creature.type) * 0.5 + creature.level * 0.01;
  return alive.reduce((best, entry) => (score(entry.creature) > score(best.creature) ? entry : best)).index;
};

const resolveReplacements = (ctx: Context) => {
  const { s, emit, say } = ctx;
  if (activeOf(s, 'enemy').hp <= 0) {
    const next = chooseEnemyReplacement(s);
    if (next === -1) {
      s.phase = 'victory';
      if (s.kind === 'warden') say('battle.defeatedWarden', { params: { opponent: s.opponentName } });
      else say('battle.wonEncounter');
      return;
    }
    s.enemyActive = next;
    const current = activeOf(s, 'player');
    if (current.hp > 0) current.participated = true;
    emit({ kind: 'switchIn', side: 'enemy' });
    say('battle.sentOut', { params: { opponent: s.opponentName, name: s.enemy[next].name } });
  }
  if (activeOf(s, 'player').hp <= 0) {
    if (s.player.some((creature) => creature.hp > 0)) s.phase = 'forceSwitch';
    else {
      s.phase = 'defeat';
      say('battle.noCreaturesLeft');
    }
  }
};

const endOfTurn = (ctx: Context) => {
  const { s, emit, say } = ctx;
  const order: Side[] = speedOf(activeOf(s, 'player')) >= speedOf(activeOf(s, 'enemy')) ? ['player', 'enemy'] : ['enemy', 'player'];
  order.forEach((side) => {
    const creature = activeOf(s, side);
    if (creature.hp <= 0 || (creature.status !== 'burn' && creature.status !== 'poison')) return;
    const damage = Math.min(creature.hp, Math.max(1, Math.floor(creature.maxHp / (creature.status === 'burn' ? 16 : 10))));
    creature.hp -= damage;
    emit({ kind: 'hit', side, damage, effect: 1, crit: false, recoil: true });
    say(creature.status === 'burn' ? 'battle.hurtBurn' : 'battle.hurtPoison', { actor: ref(side, creature) });
  });
  checkFaints(ctx);
};

export const resolveTurn = (input: BattleState, action: PlayerAction, rng: () => number = Math.random) => {
  const s = clone(input);
  const events: BattleEvent[] = [];
  const ctx = makeContext(s, events, rng);
  if (s.phase !== 'choose') return { state: s, events };

  if (action.kind === 'run') {
    if (s.kind === 'warden') {
      ctx.say('battle.noRunning');
      return { state: s, events };
    }
    const escape = speedOf(activeOf(s, 'player')) >= speedOf(activeOf(s, 'enemy')) ? 1 : 0.55;
    if (rng() < escape) {
      s.phase = 'fled';
      ctx.say('battle.gotAway');
      return { state: s, events };
    }
    ctx.say('battle.couldntEscape');
  }

  const enemyAction = chooseEnemyAction(s, rng);
  if (action.kind === 'switch') performSwitch(ctx, action.index);
  if (action.kind === 'item') useItem(ctx, 'player', action.itemId, action.target);
  if (enemyAction.kind === 'item') useItem(ctx, 'enemy', enemyAction.itemId, s.enemyActive);

  const queue: { side: Side; index: number }[] = [];
  if (action.kind === 'move') queue.push({ side: 'player', index: action.index });
  if (enemyAction.kind === 'move') queue.push({ side: 'enemy', index: enemyAction.index });
  if (queue.length === 2) {
    const player = activeOf(s, 'player');
    const enemy = activeOf(s, 'enemy');
    const playerPriority = player.moves[queue[0].index]?.move.priority ?? 0;
    const enemyPriority = enemy.moves[queue[1].index]?.move.priority ?? 0;
    const playerFirst = playerPriority !== enemyPriority
      ? playerPriority > enemyPriority
      : speedOf(player) !== speedOf(enemy) ? speedOf(player) > speedOf(enemy) : rng() < 0.5;
    if (!playerFirst) queue.reverse();
  }
  let faintedDuringMoves = false;
  for (const entry of queue) {
    if (activeOf(s, entry.side).hp <= 0 || activeOf(s, other(entry.side)).hp <= 0) continue;
    executeMove(ctx, entry.side, entry.index);
    if (checkFaints(ctx)) {
      faintedDuringMoves = true;
      break;
    }
  }
  if (!faintedDuringMoves) endOfTurn(ctx);
  resolveReplacements(ctx);
  s.turn += 1;
  return { state: s, events };
};

export const forceSwitch = (input: BattleState, index: number) => {
  const s = clone(input);
  const events: BattleEvent[] = [];
  const { emit, say } = makeContext(s, events, Math.random);
  const incoming = s.player[index];
  if (s.phase !== 'forceSwitch' || !incoming || incoming.hp <= 0) return { state: s, events };
  s.playerActive = index;
  incoming.participated = true;
  s.phase = 'choose';
  emit({ kind: 'switchIn', side: 'player' });
  say('battle.go', { params: { name: incoming.name } });
  return { state: s, events };
};

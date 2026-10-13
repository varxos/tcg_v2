import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SoundId, attackSound, playMusic, playSound, preloadSounds } from '../../audio/sound';
import { Card, catalog } from '../../data/catalog';
import { BattleEvent, BattleState, PlayerAction, Side, activeOf, forceSwitch, resolveTurn } from '../../game/battleEngine';
import { Move, cardById, effectiveness, statusInfo, typeForCard, typeTheme, xpToNext } from '../../game/creatures';
import { ItemId, ItemReward, canUseItem, itemOrder, items } from '../../game/items';
import { ArenaId, Warden, wardenAce } from '../../game/wardens';
import { formatBattleMessage, tk, useI18n } from '../../i18n';
import { moveDescKey } from '../../i18n/gameKeys';
import { haptic } from '../feedback';
import { AnimatedBar, CreatureAvatar, GameButton, RewardChips, StatusChip, TypeChart, TypeChip, palette } from '../common';
import { CreatureSprite } from '../creatures/CreatureSprite';
import { BattleBackdrop } from './BattleBackdrop';

const swordsIcon = require('../../../assets/icons/battle-swords.png');

type Mode = 'intro' | 'busy' | 'menu' | 'fight' | 'squad' | 'bag' | 'bagTarget' | 'forceSwitch' | 'end';
type SideAnims = { presence: Animated.Value; faint: Animated.Value; lunge: Animated.Value; shake: Animated.Value; flash: Animated.Value; aura: Animated.Value };
type Point = { x: number; y: number };
type Popup = { id: number; x: number; y: number; text: string; color: string; size: number; value: Animated.Value };
type Burst = { id: number; x: number; y: number; glyphs: string[]; color: string; rise: boolean; value: Animated.Value };
type Projectile = { id: number; from: Point; to: Point; glyph: string; color: string; value: Animated.Value };
export type BattleSession = { key: number; state: BattleState; events: BattleEvent[] };
export type BattleRewardPreview = { celesti: number; items: ItemReward[]; sigil: { icon: string; name: string; color: string } | null };

const battleSounds: SoundId[] = ['battleIntro', 'wardenVs', 'attackFlame', 'attackNature', 'attackTide', 'attackCrystal', 'attackLunar', 'attackStellar', 'attackNeutral', 'hit', 'hitSuper', 'hitWeak', 'crit', 'miss', 'faint', 'heal', 'statUp', 'statDown', 'status', 'switchIn', 'levelUp', 'victory', 'defeat', 'run'];
const makeSide = (): SideAnims => ({ presence: new Animated.Value(0), faint: new Animated.Value(0), lunge: new Animated.Value(0), shake: new Animated.Value(0), flash: new Animated.Value(0), aura: new Animated.Value(0) });
const run = (animation: Animated.CompositeAnimation) => new Promise<void>((resolve) => animation.start(() => resolve()));
const timing = (value: Animated.Value, toValue: number, duration: number, easing = Easing.out(Easing.cubic)) => Animated.timing(value, { toValue, duration, easing, useNativeDriver: true });
const otherSide = (side: Side): Side => (side === 'player' ? 'enemy' : 'player');
const statusColors: Record<string, string> = { burn: '#FF8069', poison: '#C08BF5', sleep: '#9FB3D9', freeze: '#8FE4FF', dazzle: '#FFE37D' };

const MessageBox = memo(function MessageBox({ id, text, instant, fast, onPress, prompt }: { id: number; text: string; instant: boolean; fast: boolean; onPress: () => void; prompt: boolean }) {
  const [shown, setShown] = useState(instant ? text.length : 0);
  const blink = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (instant) {
      setShown(text.length);
      return;
    }
    setShown(0);
    let count = 0;
    const timer = setInterval(() => {
      count += fast ? 2 : 1;
      setShown(Math.min(count, text.length));
      if (count >= text.length) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [id]);
  useEffect(() => { if (instant) setShown(text.length); }, [instant, text.length]);
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([timing(blink, 1, 420, Easing.inOut(Easing.quad)), timing(blink, 0, 420, Easing.inOut(Easing.quad))]));
    loop.start();
    return () => loop.stop();
  }, [blink]);
  const done = shown >= text.length;
  return (
    <Pressable onPress={onPress} style={styles.messageBox}>
      <Text style={styles.messageText}>{text.slice(0, shown)}</Text>
      {done && !prompt && text.length > 0 && <Animated.Text style={[styles.messageArrow, { opacity: blink }]}>▼</Animated.Text>}
    </Pressable>
  );
});

function InfoBox({ creature, side, team, style, kind }: { creature: BattleState['player'][number]; side: Side; team: BattleState['player']; style: object; kind: BattleState['kind'] }) {
  const { t } = useI18n();
  const ratio = creature.hp / creature.maxHp;
  const next = xpToNext(creature.level);
  return (
    <View style={[styles.infoBox, side === 'player' && styles.infoBoxPlayer, style]}>
      <View style={styles.infoTop}>
        <Text style={styles.infoName} numberOfLines={1}>{creature.name}</Text>
        <Text style={styles.infoLevel}>{t('common.level', { level: creature.level })}</Text>
      </View>
      <View style={styles.infoChips}>
        <TypeChip type={creature.type} compact />
        {creature.status && <StatusChip status={creature.status} />}
        <View style={styles.flex} />
        {(side === 'player' || kind === 'warden') && team.length > 1 && <View style={styles.teamOrbs}>{team.map((member) => <View key={member.uid} style={[styles.teamOrb, { backgroundColor: member.hp > 0 ? (side === 'player' ? palette.gold : '#FF8C7A') : '#443A58' }]} />)}</View>}
      </View>
      <View style={styles.hpRow}>
        <Text style={styles.hpLabel}>{t('battleUi.hp')}</Text>
        <View style={styles.flex}><AnimatedBar hp ratio={ratio} height={7} resetKey={creature.uid} /></View>
      </View>
      {side === 'player' && <>
        <Text style={styles.hpNumbers}>{creature.hp} / {creature.maxHp}</Text>
        <View style={styles.xpRow}><Text style={styles.xpLabel}>{t('battleUi.xp')}</Text><View style={styles.flex}><AnimatedBar ratio={next ? creature.xp / next : 1} color={palette.cyan} height={4} resetKey={`${creature.uid}-${creature.level}`} /></View></View>
      </>}
    </View>
  );
}

function BattleSprite({ card, size, center, side, anims, ring, auraColor }: { card: Card; size: number; center: Point; side: Side; anims: SideAnims; ring: string; auraColor: string }) {
  const direction = side === 'player' ? 1 : -1;
  const translateX = Animated.add(anims.lunge.interpolate({ inputRange: [0, 1], outputRange: [0, 38 * direction] }), anims.shake);
  // Idle life (breathing, hovering) lives in the layered sprite; here only the attack and the faint move it.
  const translateY = Animated.add(anims.lunge.interpolate({ inputRange: [0, 1], outputRange: [0, -24 * direction] }), anims.faint.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.42] }));
  const opacity = Animated.multiply(anims.presence.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }), anims.faint.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }));
  const scale = anims.presence.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] });
  const theme = typeTheme[typeForCard(card)];
  // The whole creature leans back on the wind-up and into the foe on the strike (the player's foe is up-right,
  // the enemy's is down-left). Breathing, head sway and wing beats are animated inside the layered sprite.
  const toward = side === 'player' ? 1 : -1;
  const lean = anims.lunge.interpolate({ inputRange: [-1, 0, 1], outputRange: [`${-6 * toward}deg`, '0deg', `${9 * toward}deg`] });
  const drawn = size * (side === 'player' ? 1.34 : 1.26);
  const ground = size * 0.95 - drawn * (560 / 600);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: center.x - size / 2, top: center.y - size / 2, width: size, height: size, opacity, transform: [{ translateX }, { translateY }, { scale }] }}>
      <View style={[styles.spriteGlow, { width: size * 1.18, height: size * 1.18, borderRadius: size, left: -size * 0.09, top: -size * 0.09, backgroundColor: theme.color }]} />
      <View style={[styles.spriteShadow, { width: size * 0.72, height: size * 0.15, borderRadius: size, left: size * 0.14, top: size * 0.86 }]} />
      <Animated.View style={{ position: 'absolute', left: (size - drawn) / 2, top: ground, width: drawn, height: drawn, transform: [{ rotate: lean }] }}>
        <CreatureSprite card={card} size={drawn} view={side === 'player' ? 'back' : 'front'} animated pose={{ lunge: anims.lunge, flash: anims.flash }} lean={toward} />
      </Animated.View>
      <Animated.View style={[styles.spriteAura, { borderRadius: size, borderColor: auraColor, opacity: anims.aura.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.95, 0] }), transform: [{ scale: anims.aura.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.5] }) }] }]} />
    </Animated.View>
  );
}

function BattleStage({ session, arena, warden, goldenIds, defaultFast, describeRewards, onFinish }: { session: BattleSession; arena: ArenaId; warden: Warden | null; goldenIds: Set<string>; defaultFast: boolean; describeRewards: (state: BattleState) => BattleRewardPreview; onFinish: (state: BattleState) => void }) {
  const { t } = useI18n();
  const screen = Dimensions.get('window');
  const fieldHeight = Math.round(Math.max(290, Math.min(screen.width * 0.98, screen.height * 0.5)));
  const [view, setView] = useState<BattleState>(session.state);
  const [mode, setMode] = useState<Mode>('intro');
  const [message, setMessage] = useState({ id: 0, text: '', instant: true, prompt: false });
  const [pendingItem, setPendingItem] = useState<ItemId | null>(null);
  const [inspectMove, setInspectMove] = useState<Move | null>(null);
  const [chartOpen, setChartOpen] = useState(false);
  const [fast, setFast] = useState(defaultFast);
  const [fieldWidth, setFieldWidth] = useState(0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [projectile, setProjectile] = useState<Projectile | null>(null);
  const [auraColors, setAuraColors] = useState<Record<Side, string>>({ player: palette.gold, enemy: palette.gold });
  const engineRef = useRef(session.state);
  const fastRef = useRef(defaultFast);
  const busyRef = useRef(false);
  const alive = useRef(true);
  const started = useRef(false);
  const skipRef = useRef<(() => void) | null>(null);
  const counter = useRef(1);
  const anims = useRef({ player: makeSide(), enemy: makeSide() }).current;
  const fieldShake = useRef(new Animated.Value(0)).current;
  const introCurtain = useRef(new Animated.Value(1)).current;
  const vs = useRef(new Animated.Value(0)).current;
  const endReveal = useRef(new Animated.Value(0)).current;
  const startLevels = useRef(new Map(session.state.player.map((creature) => [creature.uid, creature.level]))).current;

  const layout = useMemo(() => {
    const width = fieldWidth;
    const enemySize = Math.round(Math.min(width * 0.33, fieldHeight * 0.36));
    const playerSize = Math.round(Math.min(width * 0.41, fieldHeight * 0.44));
    return { width, height: fieldHeight, enemySize, playerSize, enemy: { x: width * 0.72, y: fieldHeight * 0.37 }, player: { x: width * 0.26, y: fieldHeight * 0.68 } };
  }, [fieldWidth, fieldHeight]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useEffect(() => {
    preloadSounds(battleSounds);
    playMusic('battle');
    return () => { alive.current = false; };
  }, []);
  useEffect(() => { fastRef.current = fast; }, [fast]);

  const commit = (state: BattleState) => { if (alive.current) setView(state); };
  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms * (fastRef.current ? 0.5 : 1)));
  const waitOrTap = (ms: number) => new Promise<void>((resolve) => {
    const done = () => { clearTimeout(timer); if (skipRef.current === done) skipRef.current = null; resolve(); };
    const timer = setTimeout(done, ms);
    skipRef.current = done;
  });
  const say = (text: string) => new Promise<void>((resolve) => {
    const id = counter.current++;
    const speed = fastRef.current ? 0.5 : 1;
    let stage: 'typing' | 'holding' = 'typing';
    let timer: ReturnType<typeof setTimeout>;
    const finish = () => { clearTimeout(timer); if (skipRef.current === skip) skipRef.current = null; resolve(); };
    const skip = () => {
      clearTimeout(timer);
      if (stage === 'typing') {
        stage = 'holding';
        setMessage((current) => (current.id === id ? { ...current, instant: true } : current));
        timer = setTimeout(finish, 900 * speed);
      } else finish();
    };
    skipRef.current = skip;
    setMessage({ id, text, instant: false, prompt: false });
    timer = setTimeout(() => { stage = 'holding'; timer = setTimeout(finish, 760 * speed); }, text.length * 16 * speed + 60);
  });

  const addPopup = (side: Side, text: string, color: string, size = 20) => {
    const current = layoutRef.current;
    const center = side === 'player' ? current.player : current.enemy;
    const spriteSize = side === 'player' ? current.playerSize : current.enemySize;
    const popup: Popup = { id: counter.current++, x: center.x, y: center.y - spriteSize * 0.45, text, color, size, value: new Animated.Value(0) };
    setPopups((list) => [...list, popup]);
    Animated.timing(popup.value, { toValue: 1, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => setPopups((list) => list.filter((entry) => entry.id !== popup.id)));
  };
  const addBurst = (side: Side, glyphs: string[], color: string, rise: boolean) => {
    const current = layoutRef.current;
    const center = side === 'player' ? current.player : current.enemy;
    const burst: Burst = { id: counter.current++, x: center.x, y: center.y, glyphs, color, rise, value: new Animated.Value(0) };
    setBursts((list) => [...list, burst]);
    Animated.timing(burst.value, { toValue: 1, duration: 760, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => setBursts((list) => list.filter((entry) => entry.id !== burst.id)));
  };
  const fireProjectile = (side: Side, glyph: string, color: string, duration: number) => new Promise<void>((resolve) => {
    const current = layoutRef.current;
    const shot: Projectile = { id: counter.current++, from: side === 'player' ? current.player : current.enemy, to: side === 'player' ? current.enemy : current.player, glyph, color, value: new Animated.Value(0) };
    setProjectile(shot);
    Animated.timing(shot.value, { toValue: 1, duration: duration * (fastRef.current ? 0.6 : 1), easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      setProjectile((active) => (active?.id === shot.id ? null : active));
      resolve();
    });
  });
  const runAura = async (side: Side, color: string = palette.gold) => {
    setAuraColors((current) => ({ ...current, [side]: color }));
    anims[side].aura.setValue(0);
    await run(timing(anims[side].aura, 1, 560, Easing.out(Easing.quad)));
    anims[side].aura.setValue(0);
  };

  const animateAttack = async (side: Side, move: Move) => {
    const theme = typeTheme[move.type];
    const sideAnims = anims[side];
    haptic('select');
    if (move.category === 'status') {
      const towardFoe = (move.effects ?? []).some((effect) => effect.kind === 'status' || (effect.kind === 'stat' && effect.target === 'foe'));
      playSound(attackSound(move.type), 0.75);
      await run(Animated.sequence([timing(sideAnims.lunge, -0.3, 130), timing(sideAnims.lunge, 0.45, 150), timing(sideAnims.lunge, 0, 190)]));
      if (towardFoe) await fireProjectile(side, theme.icon, theme.color, 460);
      else await runAura(side, theme.color);
      return;
    }
    // Wind-up (lean back, wings raised), then the strike.
    await run(Animated.sequence([timing(sideAnims.lunge, -0.55, 190, Easing.out(Easing.quad)), timing(sideAnims.lunge, 1, 150, Easing.in(Easing.quad))]));
    playSound(attackSound(move.type));
    const flight = fireProjectile(side, theme.particles[0], theme.color, 320);
    void run(timing(sideAnims.lunge, 0, 260));
    await flight;
    addBurst(otherSide(side), theme.particles, theme.color, false);
  };

  const handleEvent = async (event: BattleEvent) => {
    switch (event.kind) {
      case 'message':
        commit(event.state);
        await say(formatBattleMessage(t, event.state.kind, event));
        return;
      case 'attack':
        await animateAttack(event.side, event.move);
        commit(event.state);
        return;
      case 'hit': {
        commit(event.state);
        const sideAnims = anims[event.side];
        const intensity = event.crit ? 13 : event.recoil ? 5 : 9;
        addPopup(event.side, `-${event.damage}`, event.effect > 1 ? '#FFB36B' : event.effect < 1 ? '#B9B2C8' : '#FFFFFF', event.crit || event.effect > 1 ? 27 : 20);
        if (event.recoil) playSound('hitWeak', 0.6);
        else if (event.crit) playSound('crit');
        else if (event.effect > 1) playSound('hitSuper');
        else if (event.effect < 1) playSound('hitWeak');
        else playSound('hit');
        if (event.crit) {
          void run(Animated.sequence([10, -10, 7, -7, 0].map((value) => timing(fieldShake, value, 45, Easing.linear))));
          haptic('heavy');
        } else haptic(event.recoil ? 'light' : 'medium');
        await Promise.all([
          run(Animated.parallel([
            Animated.sequence([-intensity, intensity, -intensity * 0.6, intensity * 0.6, 0].map((value) => timing(sideAnims.shake, value, 55, Easing.linear))),
            Animated.sequence([timing(sideAnims.flash, event.recoil ? 0.45 : 0.85, 70), timing(sideAnims.flash, 0, 220)]),
          ])),
          wait(540),
        ]);
        return;
      }
      case 'miss':
        playSound('miss');
        addPopup(event.side, 'MISS', '#C6B8DE', 18);
        await wait(420);
        return;
      case 'heal':
        commit(event.state);
        playSound('heal');
        addPopup(event.side, `+${event.amount}`, '#8EF0B6', 20);
        addBurst(event.side, ['✚', '✦', '•'], '#8EF0B6', true);
        await wait(640);
        return;
      case 'status':
        commit(event.state);
        if (event.status) {
          const info = statusInfo[event.status];
          playSound('status');
          addPopup(event.side, t(tk(`status.${event.status}.tag`)), statusColors[event.status], 18);
          addBurst(event.side, [info.icon, '•', info.icon], statusColors[event.status], false);
          await wait(460);
        }
        return;
      case 'stat':
        commit(event.state);
        playSound(event.stages > 0 ? 'statUp' : 'statDown');
        addPopup(event.side, `${t(tk(`stat.${event.stat}`)).toUpperCase()} ${event.stages > 0 ? '▲' : '▼'}`, event.stages > 0 ? '#FFB38F' : '#8FB8FF', 16);
        await runAura(event.side, event.stages > 0 ? '#FFB38F' : '#8FB8FF');
        return;
      case 'faint':
        commit(event.state);
        playSound('faint');
        haptic('warning');
        await run(timing(anims[event.side].faint, 1, 580, Easing.in(Easing.quad)));
        return;
      case 'switchOut':
        playSound('tab');
        await run(timing(anims[event.side].presence, 0, 300, Easing.in(Easing.quad)));
        commit(event.state);
        return;
      case 'switchIn': {
        const sideAnims = anims[event.side];
        sideAnims.faint.setValue(0);
        sideAnims.lunge.setValue(0);
        sideAnims.presence.setValue(0);
        commit(event.state);
        playSound('switchIn');
        addBurst(event.side, ['✦', '✧', '•'], event.side === 'player' ? palette.gold : '#FFFFFF', false);
        await run(Animated.spring(sideAnims.presence, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }));
        return;
      }
      case 'levelUp':
        commit(event.state);
        playSound('levelUp');
        if (activeOf(event.state, 'player').uid === event.uid) {
          addPopup('player', 'LEVEL UP!', palette.gold, 20);
          addBurst('player', ['✦', '✧', '✦'], palette.gold, true);
        }
        haptic('success');
        await wait(620);
        return;
      case 'item':
        commit(event.state);
        playSound('toggle');
        addBurst(event.side, [items[event.itemId].icon, '✦', '•'], items[event.itemId].color, true);
        await wait(460);
        return;
    }
  };
  const playEvents = async (events: BattleEvent[]) => {
    for (const event of events) {
      if (!alive.current) return;
      await handleEvent(event);
    }
  };
  const finishStep = (state: BattleState) => {
    if (!alive.current) return;
    commit(state);
    if (state.phase === 'choose') {
      setMessage({ id: counter.current++, text: t('battle.whatWillDo', { name: activeOf(state, 'player').name }), instant: false, prompt: true });
      setMode('menu');
    } else if (state.phase === 'forceSwitch') {
      setMessage({ id: counter.current++, text: t('battle.chooseSendOut'), instant: false, prompt: true });
      setMode('forceSwitch');
    } else {
      setMode('end');
      endReveal.setValue(0);
      Animated.spring(endReveal, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }).start();
      playMusic(null);
      playSound(state.phase === 'victory' ? 'victory' : state.phase === 'defeat' ? 'defeat' : 'run');
      haptic(state.phase === 'victory' ? 'success' : state.phase === 'defeat' ? 'error' : 'warning');
    }
  };

  useEffect(() => {
    if (fieldWidth <= 0 || started.current) return;
    started.current = true;
    void (async () => {
      playSound(warden ? 'wardenVs' : 'battleIntro');
      await run(timing(introCurtain, 0, 760, Easing.inOut(Easing.quad)));
      if (warden) {
        await run(Animated.spring(vs, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }));
        await waitOrTap(2600);
        await run(timing(vs, 2, 320, Easing.in(Easing.quad)));
      }
      if (!alive.current) return;
      setMode('busy');
      await playEvents(session.events);
      finishStep(engineRef.current);
    })();
  }, [fieldWidth]);

  const act = async (action: PlayerAction) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setMode('busy');
    setPendingItem(null);
    haptic('light');
    const result = resolveTurn(engineRef.current, action);
    engineRef.current = result.state;
    await playEvents(result.events);
    busyRef.current = false;
    finishStep(result.state);
  };
  const chooseForced = async (index: number) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setMode('busy');
    const result = forceSwitch(engineRef.current, index);
    engineRef.current = result.state;
    await playEvents(result.events);
    busyRef.current = false;
    finishStep(result.state);
  };
  const goTo = (next: Mode, sound: SoundId = 'tap') => { playSound(sound); setMode(next); };

  const player = activeOf(view, 'player');
  const enemy = activeOf(view, 'enemy');
  const playerCard = cardById.get(player.cardId) ?? catalog[0];
  const enemyCard = cardById.get(enemy.cardId) ?? catalog[0];
  const victory = view.phase === 'victory';
  const defeat = view.phase === 'defeat';
  const rewards = mode === 'end' && victory ? describeRewards(engineRef.current) : null;
  const opponentLabel = warden ? `${warden.name.toUpperCase()} · ${t(tk(`warden.${warden.id}.title`)).toUpperCase()}` : 'WILD SKIES';

  const renderTeamRows = (onPick: (index: number) => void, filter: (creature: BattleState['player'][number], index: number) => boolean, forced = false) => (
    <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
      {view.player.map((creature, index) => {
        const card = cardById.get(creature.cardId) ?? catalog[0];
        const enabled = filter(creature, index);
        const isActive = index === view.playerActive;
        return (
          <Pressable key={creature.uid} disabled={!enabled} onPress={() => onPick(index)} style={({ pressed }) => [styles.teamRow, isActive && styles.teamRowActive, !enabled && styles.teamRowDisabled, pressed && styles.pressed]}>
            <CreatureAvatar card={card} size={40} dim={creature.hp <= 0} ring={goldenIds.has(card.id) ? '#FFD54A' : undefined} />
            <View style={styles.flex}>
              <View style={styles.infoTop}><Text style={styles.teamName} numberOfLines={1}>{creature.name}</Text><Text style={styles.teamLevel}>{t('common.level', { level: creature.level })}</Text></View>
              <View style={styles.teamBarRow}><View style={styles.flex}><AnimatedBar hp ratio={creature.hp / creature.maxHp} height={6} resetKey={creature.uid} /></View><Text style={styles.teamHp}>{creature.hp}/{creature.maxHp}</Text></View>
            </View>
            <View style={styles.teamTags}>
              {creature.status && <StatusChip status={creature.status} />}
              {isActive && !forced && <Text style={styles.teamTag}>{t('battleUi.inBattle')}</Text>}
              {creature.hp <= 0 && <Text style={[styles.teamTag, { color: '#F3A1A6' }]}>{t('battleUi.fainted')}</Text>}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const renderPanel = () => {
    if (mode === 'fight') {
      return <>
        <View style={styles.panelHeader}><View style={styles.flex} /><Pressable onPress={() => goTo('menu', 'back')} hitSlop={10}><Text style={styles.panelBack}>{t('common.back')}</Text></Pressable></View>
        <View style={styles.moveGrid}>
          {player.moves.map((slot, index) => {
            const theme = typeTheme[slot.move.type];
            const effect = slot.move.category === 'strike' ? effectiveness(slot.move.type, enemy.type) : 1;
            return (
              <Pressable key={slot.move.id} disabled={slot.pp <= 0 && player.moves.some((entry) => entry.pp > 0)} onPress={() => void act({ kind: 'move', index })} onLongPress={() => { playSound('tap'); setInspectMove(slot.move); }} delayLongPress={260} style={({ pressed }) => [styles.moveButton, { backgroundColor: theme.soft, borderColor: theme.color }, slot.pp <= 0 && styles.teamRowDisabled, pressed && styles.pressed]}>
                <View style={styles.moveTop}><Text style={[styles.moveIcon, { color: theme.color }]}>{theme.icon}</Text><Text style={styles.moveName} numberOfLines={1}>{slot.move.name}</Text></View>
                <View style={styles.moveMeta}><Text style={[styles.moveType, { color: theme.color }]}>{slot.move.category === 'status' ? t('battleUi.status') : t('battleUi.power', { power: slot.move.power })}</Text><Text style={[styles.movePp, slot.pp <= Math.ceil(slot.move.pp / 4) && { color: '#FFB36B' }]}>{t('battleUi.pp', { pp: slot.pp, max: slot.move.pp })}</Text></View>
                {effect !== 1 && <Text style={[styles.moveEffect, { color: effect > 1 ? '#9EF0B8' : '#F3A1A6' }]}>{effect > 1 ? t('battleUi.superEffective') : t('battleUi.notVeryEffective')}</Text>}
              </Pressable>
            );
          })}
        </View>
      </>;
    }
    if (mode === 'squad' || mode === 'forceSwitch') {
      const forced = mode === 'forceSwitch';
      return <>
        <View style={styles.panelHeader}><Text style={styles.panelTitle}>{forced ? t('battleUi.sendOut') : t('battleUi.switchCreature')}</Text><View style={styles.flex} />{!forced && <Pressable onPress={() => goTo('menu', 'back')} hitSlop={10}><Text style={styles.panelBack}>{t('common.back')}</Text></Pressable>}</View>
        {renderTeamRows((index) => (forced ? void chooseForced(index) : void act({ kind: 'switch', index })), (creature, index) => creature.hp > 0 && index !== view.playerActive, forced)}
      </>;
    }
    if (mode === 'bag') {
      const usable = itemOrder.filter((id) => items[id].battle);
      return <>
        <View style={styles.panelHeader}><Text style={styles.panelTitle}>{t('battleUi.bag')}</Text><View style={styles.flex} /><Pressable onPress={() => goTo('menu', 'back')} hitSlop={10}><Text style={styles.panelBack}>{t('common.back')}</Text></Pressable></View>
        <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {usable.map((id) => {
            const count = view.bag[id] ?? 0;
            const anyTarget = view.player.some((creature) => canUseItem(id, creature));
            return (
              <Pressable key={id} disabled={count <= 0 || !anyTarget} onPress={() => { playSound('tap'); setPendingItem(id); setMode('bagTarget'); }} style={({ pressed }) => [styles.bagRow, (count <= 0 || !anyTarget) && styles.teamRowDisabled, pressed && styles.pressed]}>
                <Text style={[styles.bagIcon, { color: items[id].color }]}>{items[id].icon}</Text>
                <View style={styles.flex}><Text style={styles.teamName}>{items[id].name}</Text><Text style={styles.bagCopy}>{t(tk(`item.${id}.copy`))}</Text></View>
                <Text style={styles.bagCount}>×{count}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </>;
    }
    if (mode === 'bagTarget' && pendingItem) {
      return <>
        <View style={styles.panelHeader}><Text style={styles.panelTitle}>{t('battleUi.useOn', { item: items[pendingItem].name.toUpperCase() })}</Text><View style={styles.flex} /><Pressable onPress={() => goTo('bag', 'back')} hitSlop={10}><Text style={styles.panelBack}>{t('common.back')}</Text></Pressable></View>
        {renderTeamRows((index) => void act({ kind: 'item', itemId: pendingItem, target: index }), (creature) => canUseItem(pendingItem, creature), true)}
      </>;
    }
    const menu = mode === 'menu';
    return <>
      <MessageBox id={message.id} text={message.text} instant={message.instant} fast={fast} prompt={message.prompt} onPress={() => skipRef.current?.()} />
      <View style={[styles.actionGrid, !menu && styles.actionGridHidden]} pointerEvents={menu ? 'auto' : 'none'}>
        <Pressable onPress={() => goTo('fight')} style={({ pressed }) => [styles.actionButton, { backgroundColor: palette.coral, borderBottomColor: palette.coralDeep }, pressed && styles.pressed]}><Image source={swordsIcon} style={styles.actionImage} resizeMode="contain" /><Text style={styles.actionText}>{t('battleUi.fight')}</Text></Pressable>
        <Pressable onPress={() => goTo('squad')} style={({ pressed }) => [styles.actionButton, { backgroundColor: palette.blue, borderBottomColor: palette.blueDeep }, pressed && styles.pressed]}><Text style={styles.actionIcon}>▦</Text><Text style={styles.actionText}>{t('battleUi.squad')}</Text></Pressable>
        <Pressable onPress={() => goTo('bag')} style={({ pressed }) => [styles.actionButton, { backgroundColor: '#B98518', borderBottomColor: '#7A560E' }, pressed && styles.pressed]}><Text style={styles.actionIcon}>✚</Text><Text style={styles.actionText}>{t('battleUi.bag')}</Text></Pressable>
        <Pressable onPress={() => { playSound('tap'); void act({ kind: 'run' }); }} style={({ pressed }) => [styles.actionButton, { backgroundColor: palette.purple, borderBottomColor: palette.purpleDeep }, pressed && styles.pressed]}><Text style={styles.actionIcon}>»</Text><Text style={styles.actionText}>{t('battleUi.run')}</Text></Pressable>
      </View>
    </>;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <Text style={[styles.topSigil, { color: warden?.color ?? '#8FD28A' }]}>{warden?.sigil ?? '❋'}</Text>
          <View style={styles.flex}><Text style={styles.topTitle} numberOfLines={1}>{opponentLabel}</Text></View>
        </View>
        <Pressable onPress={() => { playSound('toggle'); setFast((value) => !value); }} style={[styles.topButton, fast && styles.topButtonOn]} hitSlop={6}><Text style={styles.topButtonText}>{fast ? '▶▶ 2×' : '▶ 1×'}</Text></Pressable>
        <Pressable onPress={() => { playSound('tap'); setChartOpen(true); }} style={styles.topButton} hitSlop={6}><Text style={styles.topButtonText}>{t('battleUi.types')}</Text></Pressable>
      </View>
      <Animated.View style={[styles.field, { height: fieldHeight, transform: [{ translateX: fieldShake }] }]} onLayout={(event) => setFieldWidth(event.nativeEvent.layout.width)}>
        {layout.width > 0 && <>
          <BattleBackdrop width={layout.width} height={layout.height} arena={arena} enemy={layout.enemy} enemySize={layout.enemySize} player={layout.player} playerSize={layout.playerSize} />
          <BattleSprite card={enemyCard} size={layout.enemySize} center={layout.enemy} side="enemy" anims={anims.enemy} ring={typeTheme[enemy.type].color} auraColor={auraColors.enemy} />
          <BattleSprite card={playerCard} size={layout.playerSize} center={layout.player} side="player" anims={anims.player} ring={goldenIds.has(playerCard.id) ? '#FFD54A' : typeTheme[player.type].color} auraColor={auraColors.player} />
          {projectile && <ProjectileView projectile={projectile} />}
          {bursts.map((burst) => <BurstView key={burst.id} burst={burst} />)}
          {popups.map((popup) => (
            <Animated.Text key={popup.id} pointerEvents="none" style={[styles.popup, { left: popup.x - 80, top: popup.y - popup.size, color: popup.color, fontSize: popup.size, opacity: popup.value.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: popup.value.interpolate({ inputRange: [0, 1], outputRange: [8, -34] }) }, { scale: popup.value.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.6, 1.15, 1] }) }] }]}>{popup.text}</Animated.Text>
          ))}
          <InfoBox creature={enemy} side="enemy" team={view.enemy} kind={view.kind} style={{ top: 10, left: 10, width: layout.width * 0.54 }} />
          <InfoBox creature={player} side="player" team={view.player} kind={view.kind} style={{ bottom: 10, right: 10, width: layout.width * 0.5 }} />
        </>}
        <Animated.View pointerEvents="none" style={[styles.curtain, { opacity: introCurtain }]}>
          <Animated.Text style={[styles.curtainStar, { transform: [{ scale: introCurtain.interpolate({ inputRange: [0, 1], outputRange: [3.4, 1] }) }] }]}>✦</Animated.Text>
        </Animated.View>
      </Animated.View>
      <View style={styles.panel}>{renderPanel()}</View>

      {mode === 'intro' && warden && (
        <Pressable style={styles.vsBackdrop} onPress={() => skipRef.current?.()}>
          <Animated.View style={[styles.vsCard, { borderColor: warden.color, opacity: vs.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }), transform: [{ translateX: vs.interpolate({ inputRange: [0, 1, 2], outputRange: [-screen.width, 0, screen.width] }) }] }]}>
            <CreatureAvatar card={wardenAce(warden)} size={104} ring={warden.color} />
            <Text style={styles.vsName}>{warden.name}</Text>
            <Text style={[styles.vsTitle, { color: warden.color }]}>{t(tk(`warden.${warden.id}.title`)).toUpperCase()}</Text>
            <Text style={styles.vsBig}>VS</Text>
          </Animated.View>
        </Pressable>
      )}

      {mode === 'end' && (
        <View style={styles.endBackdrop}>
          <Animated.View style={[styles.endCard, { opacity: endReveal, transform: [{ scale: endReveal.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
            <ScrollView contentContainerStyle={styles.endContent} showsVerticalScrollIndicator={false}>
              <Text style={[styles.endIcon, defeat && { color: '#B9A9D4', textShadowColor: '#6D598F' }]}>{victory ? '✦' : defeat ? '☾' : '»'}</Text>
              <Text style={styles.endTitle}>{victory ? t('battleUi.victory') : defeat ? t('battleUi.defeat') : t('battleUi.escaped')}</Text>
              {rewards && <>
                <View style={styles.endRewards}><RewardChips celesti={rewards.celesti} items={rewards.items} /></View>
                {rewards.sigil && <View style={[styles.sigilBadge, { borderColor: rewards.sigil.color }]}><Text style={[styles.sigilIcon, { color: rewards.sigil.color }]}>{rewards.sigil.icon}</Text><Text style={styles.sigilText}>{t('battleUi.sigilEarned', { sigil: rewards.sigil.name.toUpperCase() })}</Text></View>}
              </>}
              {view.player.map((creature) => {
                const card = cardById.get(creature.cardId) ?? catalog[0];
                const startLevel = startLevels.get(creature.uid) ?? creature.level;
                const next = xpToNext(creature.level);
                return (
                  <View key={creature.uid} style={styles.endRow}>
                    <CreatureAvatar card={card} size={36} ring={goldenIds.has(card.id) ? '#FFD54A' : undefined} />
                    <View style={styles.flex}>
                      <View style={styles.infoTop}><Text style={styles.teamName} numberOfLines={1}>{creature.name}</Text><Text style={[styles.teamLevel, startLevel !== creature.level && { color: palette.gold }]}>{startLevel !== creature.level ? `${t('common.level', { level: startLevel })} → ${creature.level} ▲` : t('common.level', { level: creature.level })}</Text></View>
                      <View style={styles.endXp}><AnimatedBar ratio={next ? creature.xp / next : 1} color={palette.cyan} height={5} /></View>
                    </View>
                  </View>
                );
              })}
              <GameButton label={t('battleUi.continue')} color={palette.blue} deep={palette.blueDeep} onPress={() => onFinish(engineRef.current)} style={styles.endButton} />
            </ScrollView>
          </Animated.View>
        </View>
      )}

      {inspectMove && (
        <Pressable style={styles.inspectBackdrop} onPress={() => { playSound('back'); setInspectMove(null); }}>
          <View style={[styles.inspectCard, { borderColor: typeTheme[inspectMove.type].color }]}>
            <View style={styles.infoTop}><Text style={styles.inspectName}>{inspectMove.name}</Text><TypeChip type={inspectMove.type} /></View>
            <View style={styles.inspectStats}>
              <View style={styles.inspectStat}><Text style={styles.inspectValue}>{inspectMove.category === 'status' ? '—' : inspectMove.power}</Text><Text style={styles.inspectLabel}>{t('battleUi.powerLabel')}</Text></View>
              <View style={styles.inspectStat}><Text style={styles.inspectValue}>{inspectMove.accuracy}%</Text><Text style={styles.inspectLabel}>{t('battleUi.accuracy')}</Text></View>
              <View style={styles.inspectStat}><Text style={styles.inspectValue}>{inspectMove.pp}</Text><Text style={styles.inspectLabel}>{t('battleUi.ppLabel')}</Text></View>
              <View style={styles.inspectStat}><Text style={styles.inspectValue}>{inspectMove.priority ? `+${inspectMove.priority}` : '0'}</Text><Text style={styles.inspectLabel}>{t('battleUi.priority')}</Text></View>
            </View>
            <Text style={styles.inspectCopy}>{t(moveDescKey(inspectMove))}{inspectMove.type === player.type && inspectMove.category === 'strike' ? ` ${t('battleUi.stab')}` : ''}</Text>
          </View>
        </Pressable>
      )}
      {chartOpen && <TypeChart onClose={() => setChartOpen(false)} />}
    </SafeAreaView>
  );
}

function ProjectileView({ projectile }: { projectile: Projectile }) {
  const dx = projectile.to.x - projectile.from.x;
  const dy = projectile.to.y - projectile.from.y;
  return <>
    {[2, 1, 0].map((trail) => {
      const lag = trail * 0.12;
      const progress = projectile.value.interpolate({ inputRange: [0, lag, 1], outputRange: [0, 0, 1 - lag], extrapolate: 'clamp' });
      return (
        <Animated.Text key={trail} pointerEvents="none" style={[styles.projectile, { left: projectile.from.x - 22, top: projectile.from.y - 22, color: projectile.color, textShadowColor: projectile.color, fontSize: 34 - trail * 8, opacity: projectile.value.interpolate({ inputRange: [0, 0.08, 0.92, 1], outputRange: [0, 1 - trail * 0.3, 1 - trail * 0.3, 0] }), transform: [
          { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
          { translateY: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, dy / 2 - 34, dy] }) },
          { rotate: projectile.value.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '320deg'] }) },
        ] }]}>{projectile.glyph}</Animated.Text>
      );
    })}
  </>;
}

function BurstView({ burst }: { burst: Burst }) {
  return <>
    {Array.from({ length: 10 }, (_, index) => {
      const angle = (index / 10) * Math.PI * 2 + index * 0.3;
      const distance = 44 + ((index * 17) % 30);
      const dx = burst.rise ? Math.cos(angle) * 26 : Math.cos(angle) * distance;
      const dy = burst.rise ? -50 - ((index * 13) % 40) : Math.sin(angle) * distance;
      return (
        <Animated.Text key={index} pointerEvents="none" style={[styles.burst, { left: burst.x - 12, top: burst.y - 12, color: burst.color, textShadowColor: burst.color, fontSize: 13 + ((index * 5) % 9), opacity: burst.value.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 1, 0.9, 0] }), transform: [
          { translateX: burst.value.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
          { translateY: burst.value.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
          { scale: burst.value.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1.15, 0.55] }) },
        ] }]}>{burst.glyphs[index % burst.glyphs.length]}</Animated.Text>
      );
    })}
  </>;
}

export function BattleScene({ session, arena, warden, goldenIds, defaultFast, describeRewards, onFinish }: { session: BattleSession | null; arena: ArenaId; warden: Warden | null; goldenIds: Set<string>; defaultFast: boolean; describeRewards: (state: BattleState) => BattleRewardPreview; onFinish: (state: BattleState) => void }) {
  return (
    <Modal visible={Boolean(session)} animationType="fade" onRequestClose={() => undefined}>
      {session && <BattleStage key={session.key} session={session} arena={arena} warden={warden} goldenIds={goldenIds} defaultFast={defaultFast} describeRewards={describeRewards} onFinish={onFinish} />}
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0B20' },
  flex: { flex: 1 },
  pressed: { opacity: 0.65 },
  topBar: { height: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 7, backgroundColor: '#17112D', borderBottomWidth: 1, borderBottomColor: '#3A2D57' },
  topLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  topSigil: { fontSize: 24, fontWeight: '900', width: 28, textAlign: 'center' },
  topTitle: { color: palette.text, fontSize: 12, fontWeight: '900', letterSpacing: 0.5, marginTop: 1 },
  topButton: { backgroundColor: '#2A2146', borderRadius: 10, borderWidth: 1, borderColor: '#5C4C7E', paddingHorizontal: 9, paddingVertical: 6 },
  topButtonOn: { backgroundColor: '#5A4378', borderColor: palette.gold },
  topButtonText: { color: '#EDE3FA', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  field: { width: '100%', overflow: 'hidden', backgroundColor: '#081530' },
  spriteGlow: { position: 'absolute', opacity: 0.09 },
  spriteShadow: { position: 'absolute', backgroundColor: '#000000', opacity: 0.3 },
  spriteAura: { position: 'absolute', top: -6, right: -6, bottom: -6, left: -6, borderWidth: 3 },
  infoBox: { position: 'absolute', backgroundColor: 'rgba(23,17,45,.9)', borderRadius: 14, borderWidth: 1, borderColor: '#6D598F', paddingHorizontal: 9, paddingVertical: 7 },
  infoBoxPlayer: { borderColor: '#8FA4D8' },
  infoTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  infoName: { color: palette.text, fontSize: 12, fontWeight: '900', flex: 1 },
  infoLevel: { color: palette.gold, fontSize: 10, fontWeight: '900' },
  infoChips: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  teamOrbs: { flexDirection: 'row', gap: 3 },
  teamOrb: { width: 6, height: 6, borderRadius: 3 },
  hpRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  hpLabel: { color: '#FFD27A', fontSize: 7, fontWeight: '900', backgroundColor: '#3A2A1A', borderRadius: 4, paddingHorizontal: 3, overflow: 'hidden' },
  hpNumbers: { color: '#E6F8FF', fontSize: 9, fontWeight: '900', textAlign: 'right', marginTop: 3 },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  xpLabel: { color: palette.cyan, fontSize: 6.5, fontWeight: '900' },
  popup: { position: 'absolute', width: 160, textAlign: 'center', fontWeight: '900', textShadowColor: '#0B0818', textShadowRadius: 6, letterSpacing: 0.5 },
  projectile: { position: 'absolute', width: 44, height: 44, textAlign: 'center', lineHeight: 44, fontWeight: '900', textShadowRadius: 14 },
  burst: { position: 'absolute', width: 24, height: 24, textAlign: 'center', lineHeight: 24, fontWeight: '900', textShadowRadius: 8 },
  curtain: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#0B0818', alignItems: 'center', justifyContent: 'center' },
  curtainStar: { color: palette.gold, fontSize: 64, textShadowColor: '#FFF2A7', textShadowRadius: 20 },
  panel: { flex: 1, backgroundColor: palette.panelDark, borderTopWidth: 2, borderTopColor: '#4C3B70', padding: 12, gap: 10 },
  messageBox: { minHeight: 70, backgroundColor: '#241A43', borderRadius: 16, borderWidth: 2, borderColor: '#8064A8', paddingHorizontal: 15, paddingVertical: 12, justifyContent: 'center' },
  messageText: { color: palette.text, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  messageArrow: { position: 'absolute', right: 12, bottom: 6, color: palette.gold, fontSize: 11 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionGridHidden: { opacity: 0.25 },
  actionButton: { width: '48.6%', minHeight: 58, borderRadius: 15, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  actionIcon: { color: '#FFFDF1', fontSize: 20, fontWeight: '900' },
  actionImage: { width: 20, height: 20, tintColor: '#FFFDF1' },
  actionText: { color: '#FFFDF1', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelTitle: { color: palette.text, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  panelBack: { color: palette.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  moveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moveButton: { width: '48.6%', minHeight: 66, borderRadius: 13, borderWidth: 1.5, paddingHorizontal: 9, paddingVertical: 8, justifyContent: 'center' },
  moveTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  moveIcon: { fontSize: 15, fontWeight: '900', width: 17, textAlign: 'center' },
  moveName: { flex: 1, color: palette.text, fontSize: 11.5, fontWeight: '900' },
  moveMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  moveType: { fontSize: 8, fontWeight: '900', letterSpacing: 0.4 },
  movePp: { color: '#E6F8FF', fontSize: 8, fontWeight: '900' },
  moveEffect: { fontSize: 6.5, fontWeight: '900', letterSpacing: 0.5, marginTop: 3 },
  listScroll: { flex: 1 },
  listContent: { gap: 7, paddingBottom: 6 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#2A2146', borderRadius: 13, borderWidth: 1, borderColor: '#54457A', padding: 7 },
  teamRowActive: { borderColor: palette.cyan },
  teamRowDisabled: { opacity: 0.45 },
  teamName: { color: palette.text, fontSize: 11, fontWeight: '900', flex: 1 },
  teamLevel: { color: palette.gold, fontSize: 9, fontWeight: '900' },
  teamBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  teamHp: { color: '#CFEAF5', fontSize: 8, fontWeight: '900', minWidth: 42, textAlign: 'right' },
  teamTags: { alignItems: 'flex-end', gap: 3 },
  teamTag: { color: palette.cyan, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.5 },
  bagRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#2A2146', borderRadius: 13, borderWidth: 1, borderColor: '#54457A', padding: 10 },
  bagIcon: { fontSize: 22, width: 28, textAlign: 'center', fontWeight: '900' },
  bagCopy: { color: '#BFB2D7', fontSize: 8.5, marginTop: 2 },
  bagCount: { color: palette.gold, fontSize: 13, fontWeight: '900' },
  vsBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(8,5,22,.72)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  vsCard: { width: '100%', maxWidth: 340, alignItems: 'center', backgroundColor: palette.panel, borderRadius: 28, borderWidth: 2, paddingVertical: 26, paddingHorizontal: 22 },
  vsName: { color: palette.text, fontSize: 26, fontWeight: '900', marginTop: 12 },
  vsTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.3, marginTop: 3 },
  vsBig: { color: palette.gold, fontSize: 40, fontWeight: '900', marginTop: 10, textShadowColor: '#F2AE39', textShadowRadius: 14 },
  endBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(8,5,22,.8)', justifyContent: 'center', padding: 18 },
  endCard: { maxHeight: '92%', backgroundColor: palette.panel, borderRadius: 28, borderWidth: 2, borderColor: '#746094' },
  endContent: { padding: 22, alignItems: 'stretch' },
  endIcon: { color: palette.gold, fontSize: 64, textAlign: 'center', textShadowColor: '#FFF2A7', textShadowRadius: 16 },
  endTitle: { color: palette.text, fontSize: 26, fontWeight: '900', textAlign: 'center', letterSpacing: 1, marginTop: 4 },
  endRewards: { marginTop: 16, marginBottom: 8 },
  sigilBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 13, padding: 10, marginTop: 9, backgroundColor: '#2A2146' },
  sigilIcon: { fontSize: 24, fontWeight: '900' },
  sigilText: { color: palette.text, fontSize: 11, fontWeight: '900', letterSpacing: 0.8, flex: 1 },
  endRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  endXp: { marginTop: 5 },
  endButton: { marginTop: 16 },
  inspectBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(8,5,22,.75)', justifyContent: 'flex-end', padding: 14 },
  inspectCard: { backgroundColor: palette.panel, borderRadius: 22, borderWidth: 2, padding: 18 },
  inspectName: { color: palette.text, fontSize: 19, fontWeight: '900', flex: 1 },
  inspectStats: { flexDirection: 'row', backgroundColor: '#241A43', borderRadius: 12, paddingVertical: 10, marginTop: 12 },
  inspectStat: { flex: 1, alignItems: 'center' },
  inspectValue: { color: palette.gold, fontSize: 15, fontWeight: '900' },
  inspectLabel: { color: palette.faint, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.6, marginTop: 2 },
  inspectCopy: { color: '#D6CBE5', fontSize: 12, lineHeight: 18, marginTop: 12 },
});

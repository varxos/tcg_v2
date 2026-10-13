import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { SoundId, playSound } from '../../audio/sound';
import { Card, rarityTheme } from '../../data/catalog';
import { cosmeticById } from '../../game/cosmetics';
import { hashSeed } from '../../game/creatures';
import { items } from '../../game/items';
import { VoidReward, essenceGoal, voidQuasar } from '../../game/void';
import { tk, useI18n } from '../../i18n';
import { MiniCard } from '../cards';
import { GameButton, palette } from '../common';
import { haptic } from '../feedback';
import { PlayerAvatar } from '../profile/PlayerAvatar';
import { ProfileBanner } from '../profile/ProfileBanner';
import { seeded } from '../stars/StarSky';
import { BlackHole } from './BlackHole';
import { EssenceIcon } from './EssenceIcon';

const TAPS = 4;
type Phase = 'charge' | 'collapse' | 'reveal' | 'summary';

// `anchor` is the height of the visual the glow sits behind (card, circle, icon). The halo is centred
// on that visual rather than on the whole block (which also holds the name and description), and the
// offset uses margins so it can never override the left/top of the base style.
function Glow({ color, size, anchor }: { color: string; size: number; anchor: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View pointerEvents="none" style={[s.glow, { width: size, height: size, marginLeft: -size / 2, marginTop: anchor / 2 - size / 2 }]}>
      <Svg width={size} height={size}>
        <Defs><RadialGradient id={`${uid}g`} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={color} stopOpacity={0.55} /><Stop offset="1" stopColor={color} stopOpacity={0} /></RadialGradient></Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${uid}g)`} />
      </Svg>
    </View>
  );
}

function RewardDisplay({ reward, compact = false, isNew = false, essenceTotal, avatarCard, shimmer }: { reward: VoidReward; compact?: boolean; isNew?: boolean; essenceTotal: number; avatarCard: Card | null; shimmer: Animated.Value }) {
  const { t } = useI18n();
  switch (reward.kind) {
    case 'creature': {
      const color = reward.golden ? '#FFD54A' : rarityTheme[reward.card.rarity].color;
      return (
        <View style={s.reward}>
          {!compact && <Glow color={color} size={340} anchor={204} />}
          <MiniCard card={reward.card} large={!compact} golden={reward.golden} shimmer={shimmer} />
          <Text style={[s.rewardName, compact && s.rewardNameCompact]} numberOfLines={1}>{reward.card.name}</Text>
          <Text style={[s.rewardSub, compact && s.rewardSubCompact, { color }]} numberOfLines={1}>{t(tk(`rarity.${reward.card.rarity}`)).toUpperCase()}{reward.golden ? ` · ${t('opening.golden')}` : ''}</Text>
          {!compact && isNew && <Text style={s.newTag}>{t('opening.newCard')}</Text>}
        </View>
      );
    }
    case 'item': {
      const item = items[reward.itemId];
      const circle = compact ? 64 : 132;
      return (
        <View style={s.reward}>
          {!compact && <Glow color={item.color} size={300} anchor={circle} />}
          <View style={[s.itemCircle, { width: circle, height: circle, borderRadius: circle / 2, borderColor: item.color, backgroundColor: `${item.color}22` }]}>
            <Text style={[s.itemIcon, { color: item.color, fontSize: circle * 0.46 }]}>{item.icon}</Text>
          </View>
          <Text style={[s.rewardName, compact && s.rewardNameCompact]} numberOfLines={1}>{item.name}</Text>
          <Text style={[s.rewardSub, compact && s.rewardSubCompact, { color: item.color }]}>×{reward.amount}</Text>
          {!compact && <Text style={s.rewardCopy}>{t(tk(`item.${reward.itemId}.copy`))}</Text>}
        </View>
      );
    }
    case 'cosmetic': {
      const cosmetic = cosmeticById(reward.cosmeticKind, reward.cosmeticId);
      const color = cosmetic?.color ?? palette.gold;
      return (
        <View style={s.reward}>
          {!compact && <Glow color={color} size={340} anchor={reward.cosmeticKind === 'banner' ? 116 : 110} />}
          {reward.cosmeticKind === 'banner'
            ? <View style={[s.bannerPreview, compact ? s.bannerCompact : s.bannerLarge, { borderColor: color }]}><ProfileBanner id={reward.cosmeticId} radius={compact ? 10 : 16} shade={false} /></View>
            : <View style={compact ? s.framePreviewCompact : s.framePreview}><PlayerAvatar card={avatarCard} size={compact ? 50 : 110} frameId={reward.cosmeticId} /></View>}
          <Text style={[s.rewardName, compact && s.rewardNameCompact]} numberOfLines={1}>{cosmetic?.name ?? reward.cosmeticId}</Text>
          <Text style={[s.rewardSub, compact && s.rewardSubCompact, { color }]} numberOfLines={1}>{t(tk(`cosmetic.${reward.cosmeticKind}`))}</Text>
        </View>
      );
    }
    case 'essence':
      return (
        <View style={s.reward}>
          {!compact && <Glow color="#FF2E4D" size={380} anchor={170} />}
          <EssenceIcon size={compact ? 70 : 170} />
          <Text style={[s.rewardName, compact && s.rewardNameCompact, s.essenceName]} numberOfLines={1}>+{reward.amount}</Text>
          <Text style={[s.rewardSub, compact && s.rewardSubCompact, { color: '#FF8A9A' }]} numberOfLines={2}>{t('void.essenceKicker')}</Text>
          {!compact && <Text style={s.rewardCopy}>{essenceTotal}/{essenceGoal}</Text>}
        </View>
      );
    case 'celesti':
      return (
        <View style={s.reward}>
          {!compact && <Glow color="#FFE072" size={320} anchor={120} />}
          <Text style={[s.celesti, compact && s.celestiCompact]}>✦</Text>
          <Text style={[s.rewardName, compact && s.rewardNameCompact]}>+{reward.amount}</Text>
          <Text style={[s.rewardSub, compact && s.rewardSubCompact, { color: palette.gold }]}>CELESTI</Text>
        </View>
      );
  }
}

const soundFor = (reward: VoidReward): SoundId => {
  if (reward.kind === 'essence') return 'demonEssence';
  if (reward.kind === 'cosmetic') return 'unlock';
  if (reward.kind === 'celesti') return 'reward';
  if (reward.kind === 'creature') {
    if (reward.card.rarity === 'Legendary' || reward.card.rarity === 'Angelic') return 'revealLegendary';
    if (reward.card.rarity === 'Epic') return 'revealEpic';
  }
  return 'voidReveal';
};

// Brawl Stars style opening: tap the quasar until it collapses, then reveal each reward as it escapes the horizon.
export function VoidOpening({ rewards, newCardIds, essenceTotal, avatarCard, onClose }: { rewards: VoidReward[] | null; newCardIds: string[]; essenceTotal: number; avatarCard: Card | null; onClose: () => void }) {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const [phase, setPhase] = useState<Phase>('charge');
  const [taps, setTaps] = useState(0);
  const [index, setIndex] = useState(0);
  const squash = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const collapse = useRef(new Animated.Value(0)).current;
  const cardIn = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const visible = Boolean(rewards);
  const stars = useMemo(() => {
    const random = seeded(hashSeed('void-opening'));
    return Array.from({ length: 120 }, () => ({ x: random(), y: random(), r: 0.4 + random() * 1.4, o: 0.15 + random() * 0.7 }));
  }, []);

  useEffect(() => {
    if (!visible) return;
    setPhase('charge');
    setTaps(0);
    setIndex(0);
    collapse.setValue(0);
    squash.setValue(1);
    playSound('starCharge', 0.55);
  }, [visible, collapse, squash]);
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const sweep = Animated.loop(Animated.sequence([Animated.timing(shimmer, { toValue: 1, duration: 1850, easing: Easing.linear, useNativeDriver: false }), Animated.delay(260)]));
    loop.start();
    sweep.start();
    return () => { loop.stop(); sweep.stop(); };
  }, [visible, pulse, shimmer]);

  const beginReveal = (nextIndex: number) => {
    const reward = rewards?.[nextIndex];
    if (!reward) {
      setPhase('summary');
      playSound('purchase');
      return;
    }
    setIndex(nextIndex);
    setPhase('reveal');
    cardIn.setValue(0);
    Animated.spring(cardIn, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start();
    playSound(soundFor(reward));
    if (reward.kind === 'creature' && reward.golden) playSound('revealGolden');
    haptic(reward.kind === 'essence' ? 'heavy' : 'success');
  };

  const tap = () => {
    const next = taps + 1;
    setTaps(next);
    haptic(next >= TAPS ? 'heavy' : next >= 2 ? 'medium' : 'light');
    squash.setValue(0.76);
    Animated.spring(squash, { toValue: 1, friction: 3, tension: 170, useNativeDriver: true }).start();
    const amplitude = 5 + next * 3;
    Animated.sequence([-amplitude, amplitude, -amplitude * 0.6, amplitude * 0.35, 0].map((toValue) => Animated.timing(shake, { toValue, duration: 45, useNativeDriver: true }))).start();
    ring.setValue(0);
    Animated.timing(ring, { toValue: 1, duration: 540, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    if (next < TAPS) {
      playSound('voidTap');
      return;
    }
    playSound('voidCollapse');
    setPhase('collapse');
    collapse.setValue(0);
    Animated.timing(collapse, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => { if (finished) beginReveal(0); });
  };
  const onPress = () => {
    if (phase === 'charge') tap();
    else if (phase === 'reveal') { playSound('tap'); beginReveal(index + 1); }
  };

  const holeSize = Math.min(width * 1.05, 440);
  const collapseScale = collapse.interpolate({ inputRange: [0, 0.5, 0.58, 1], outputRange: [1, 0.16, 0.04, 0.04] });
  const holeOpacity = collapse.interpolate({ inputRange: [0, 0.56, 0.6], outputRange: [1, 1, 0] });
  const flash = collapse.interpolate({ inputRange: [0, 0.52, 0.6, 0.86], outputRange: [0, 0, 1, 0] });
  const current = rewards?.[index];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (phase === 'summary') onClose(); }}>
      <Pressable style={s.root} onPress={onPress}>
        <LinearGradient colors={['#000000', '#08030C', '#000000']} style={s.fill} />
        <Svg width={width} height={height} style={s.abs} pointerEvents="none">
          {stars.map((star, starIndex) => <Circle key={starIndex} cx={star.x * width} cy={star.y * height} r={star.r} fill="#FFFFFF" opacity={star.o} />)}
        </Svg>

        {(phase === 'charge' || phase === 'collapse') && <>
          <Text style={s.kicker}>{voidQuasar.name.toUpperCase()}</Text>
          <View style={s.center} pointerEvents="none">
            <Animated.View style={[s.tapRing, { width: holeSize * 0.5, height: holeSize * 0.5, borderRadius: holeSize * 0.25, opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.45, 2] }) }] }]} />
            <Animated.View style={{ opacity: holeOpacity, transform: [{ translateX: shake }, { scale: collapseScale }] }}>
              <Animated.View style={{ transform: [
                { scaleX: squash.interpolate({ inputRange: [0.7, 1, 1.3], outputRange: [1.22, 1, 0.88] }) },
                { scaleY: squash.interpolate({ inputRange: [0.7, 1, 1.3], outputRange: [0.8, 1, 1.15] }) },
                { scale: 1 + taps * 0.07 },
              ] }}>
                <BlackHole size={holeSize} speed={phase === 'collapse' ? 9 : 1 + taps * 1.3} intensity={0.85 + taps * 0.13} tilt={-9} />
              </Animated.View>
            </Animated.View>
            {phase === 'collapse' && [0, 1, 2].map((ringIndex) => {
              const start = 0.58 + ringIndex * 0.06;
              return <Animated.View key={ringIndex} style={[s.shock, { borderColor: ringIndex === 1 ? '#FF9A3D' : '#FFF1D6', opacity: collapse.interpolate({ inputRange: [start, start + 0.04, 1], outputRange: [0, 0.9, 0], extrapolate: 'clamp' }), transform: [{ scale: collapse.interpolate({ inputRange: [start, 1], outputRange: [0.2, 5 + ringIndex], extrapolate: 'clamp' }) }] }]} />;
            })}
          </View>
          {phase === 'charge' && (
            <View style={s.chargeFooter} pointerEvents="none">
              <View style={s.pips}>{Array.from({ length: TAPS }, (_, pip) => <View key={pip} style={[s.pip, pip < taps && s.pipOn]} />)}</View>
            </View>
          )}
        </>}

        {phase === 'reveal' && current && (
          <View style={s.revealLayer} pointerEvents="box-none">
            <View style={s.revealHole} pointerEvents="none"><BlackHole size={170} speed={2.2} particles={false} intensity={0.8} /></View>
            <Text style={s.counter}>{index + 1} / {rewards?.length}</Text>
            <View style={s.revealCenter} pointerEvents="none">
              <Animated.View style={{ alignItems: 'center', opacity: cardIn.interpolate({ inputRange: [0, 0.25], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ translateY: cardIn.interpolate({ inputRange: [0, 1], outputRange: [-190, 0] }) }, { scale: cardIn.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) }] }}>
                <RewardDisplay reward={current} isNew={current.kind === 'creature' && newCardIds.includes(current.card.id)} essenceTotal={essenceTotal} avatarCard={avatarCard} shimmer={shimmer} />
              </Animated.View>
            </View>
            <Pressable onPress={() => { playSound('tap'); setPhase('summary'); }} style={s.skip} hitSlop={10}><Text style={s.skipText}>{t('void.revealAll')}</Text></Pressable>
          </View>
        )}

        {phase === 'summary' && rewards && (
          <View style={s.summary}>
            <Text style={s.summaryKicker}>{voidQuasar.name.toUpperCase()}</Text>
            <Text style={s.summaryTitle}>{t('void.summaryTitle')}</Text>
            <View style={s.summaryRow}>
              {rewards.map((reward, rewardIndex) => (
                <View key={rewardIndex} style={[s.tile, reward.kind === 'essence' && s.tileEssence]}>
                  <RewardDisplay reward={reward} compact essenceTotal={essenceTotal} avatarCard={avatarCard} shimmer={shimmer} />
                </View>
              ))}
            </View>
            <GameButton label={t('void.collect')} color="#FF9A3D" deep="#9A3A0E" textColor="#1A0A04" onPress={onClose} sound="purchase" style={s.collect} />
          </View>
        )}

        <Animated.View pointerEvents="none" style={[s.flash, { opacity: flash }]} />
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  abs: { position: 'absolute', left: 0, top: 0 },
  kicker: { position: 'absolute', top: 70, alignSelf: 'center', color: '#FFD9B0', fontSize: 12, fontWeight: '900', letterSpacing: 3, textShadowColor: '#FF9A3D', textShadowRadius: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tapRing: { position: 'absolute', borderWidth: 3, borderColor: '#FFE3C2' },
  shock: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 3 },
  chargeFooter: { position: 'absolute', bottom: 70, left: 0, right: 0, alignItems: 'center', gap: 10 },
  pips: { flexDirection: 'row', gap: 10 },
  pip: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#7A5A4A', backgroundColor: 'transparent' },
  pipOn: { backgroundColor: '#FFB066', borderColor: '#FFE3C2', shadowColor: '#FF9A3D', shadowOpacity: 0.9, shadowRadius: 8 },
  tapText: { color: '#FFF1E0', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  rewardsCount: { color: '#C79A7A', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  revealLayer: { flex: 1 },
  revealHole: { position: 'absolute', top: 40, alignSelf: 'center' },
  counter: { position: 'absolute', top: 58, right: 24, color: '#FFD9B0', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  revealCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  nextHint: { position: 'absolute', bottom: 64, alignSelf: 'center', color: '#B9A9C8', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  skip: { position: 'absolute', top: 58, left: 22, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#5A4A6A' },
  skipText: { color: '#D8CDEB', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  // Anchored to the top-centre of the reward block; Glow shifts it onto the visual with margins.
  glow: { position: 'absolute', left: '50%', top: 0, alignItems: 'center', justifyContent: 'center' },
  reward: { alignItems: 'center', justifyContent: 'center' },
  rewardName: { color: palette.text, fontSize: 24, fontWeight: '900', marginTop: 16, textAlign: 'center' },
  rewardNameCompact: { fontSize: 11, marginTop: 6 },
  rewardSub: { fontSize: 12, fontWeight: '900', letterSpacing: 1.3, marginTop: 4, textAlign: 'center' },
  rewardSubCompact: { fontSize: 7.5, letterSpacing: 0.5, marginTop: 2 },
  rewardCopy: { color: '#CFC3E4', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 8, maxWidth: 280 },
  newTag: { marginTop: 8, color: '#AEEBFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  itemCircle: { borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  itemIcon: { fontWeight: '900' },
  bannerPreview: { borderRadius: 16, borderWidth: 2, overflow: 'hidden' },
  bannerLarge: { width: 300, height: 170 },
  bannerCompact: { width: 96, height: 60, borderRadius: 10 },
  framePreview: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  framePreviewCompact: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  essenceName: { color: '#FFE3E8', textShadowColor: '#FF2E4D', textShadowRadius: 14 },
  celesti: { color: '#FFE072', fontSize: 120, fontWeight: '900', textShadowColor: '#FFB347', textShadowRadius: 20 },
  celestiCompact: { fontSize: 48 },
  summary: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, gap: 12 },
  summaryKicker: { color: '#FFB066', fontSize: 11, fontWeight: '900', letterSpacing: 2.2, textAlign: 'center' },
  summaryTitle: { color: palette.text, fontSize: 26, fontWeight: '900', textAlign: 'center' },
  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  tile: { flex: 1, minHeight: 190, borderRadius: 18, borderWidth: 1, borderColor: '#3E3050', backgroundColor: 'rgba(20,12,30,.85)', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 4 },
  tileEssence: { borderColor: '#FF4D6D', backgroundColor: 'rgba(60,6,20,.85)' },
  collect: { marginTop: 18 },
  flash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFF6E6' },
});

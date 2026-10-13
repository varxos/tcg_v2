import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import { playSound } from '../../audio/sound';
import { hashSeed } from '../../game/creatures';
import { VoidProgress, VoidStage, voidGoalProgress, voidStages } from '../../game/void';
import { tk, useI18n } from '../../i18n';
import { AnimatedBar, GameButton, RewardChips, palette } from '../common';
import { seeded } from '../stars/StarSky';
import { BlackHole } from './BlackHole';

const STEP = 330;
const INTRO = 300;
type StageStatus = 'claimed' | 'ready' | 'active' | 'locked';

export function HorizonEntryCard({ claimed, total, onPress }: { claimed: number; total: number; onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable onPress={() => { playSound('tap'); onPress(); }} style={({ pressed }) => [e.card, pressed && e.pressed]}>
      <LinearGradient colors={['#1E0C06', '#0A0612', '#160818']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={e.fill} />
      <View style={e.hole} pointerEvents="none"><BlackHole size={112} particles={false} tilt={-12} /></View>
      <View style={e.body}>
        <Text style={e.title}>{t('horizon.title')}</Text>
        <View style={e.pips}>
          {voidStages.map((stage, index) => <View key={stage.id} style={[e.pip, index < claimed && { backgroundColor: stage.color, borderColor: stage.color }]} />)}
          <Text style={e.depth}>{claimed}/{total}</Text>
        </View>
      </View>
      <Text style={e.chevron}>›</Text>
    </Pressable>
  );
}

function StageNode({ stage, index, width, status, progress, onClaim }: { stage: VoidStage; index: number; width: number; status: StageStatus; progress: VoidProgress; onClaim: (stage: VoidStage) => void }) {
  const { t } = useI18n();
  const { value, target } = voidGoalProgress(stage.goal, progress);
  const locked = status === 'locked';
  const rx = (width / 2) * (0.94 - index * 0.11);
  const ry = 30 - index * 3.5;
  return (
    <View style={[n.node, { height: STEP }]}>
      <Svg width={width} height={90} style={n.orbit}>
        {!locked && <Ellipse cx={width / 2} cy={45} rx={rx} ry={ry} stroke={stage.color} strokeOpacity={0.18} strokeWidth={9} fill="none" />}
        <Ellipse cx={width / 2} cy={45} rx={rx} ry={ry} stroke={locked ? '#3A3350' : stage.color} strokeOpacity={locked ? 0.55 : 0.95} strokeWidth={status === 'claimed' ? 2.6 : 1.5} strokeDasharray={locked ? '4 8' : undefined} fill="none" />
        <Circle cx={width / 2 - rx} cy={45} r={5} fill={locked ? '#3A3350' : stage.color} />
        <Circle cx={width / 2 + rx} cy={45} r={3} fill={locked ? '#3A3350' : stage.color} opacity={0.8} />
      </Svg>
      <View style={[n.card, { borderColor: locked ? '#2E2840' : `${stage.color}AA` }, status === 'ready' && { backgroundColor: 'rgba(40,16,10,.92)' }]}>
        <View style={n.top}>
          <View style={[n.depthBadge, { borderColor: locked ? '#3A3350' : stage.color }]}><Text style={[n.depthText, { color: locked ? '#6F6590' : stage.color }]}>−{stage.depth}</Text></View>
          <View style={n.flex}>
            <Text style={[n.name, locked && n.nameLocked]}>{t(tk(`horizon.stage.${stage.id}.name`))}</Text>
          </View>
          {status === 'claimed' && <Text style={n.claimed}>✓</Text>}
          {locked && <Text style={n.lockedText}>🔒</Text>}
        </View>
        {!locked && <>
          <View style={n.goalRow}>
            <Text style={n.goal}>{t(tk(`horizon.goal.${stage.goal.kind}`), { target: stage.goal.target })}</Text>
            <Text style={[n.goalCount, { color: stage.color }]}>{value}/{target}</Text>
          </View>
          <AnimatedBar ratio={value / target} color={stage.color} height={6} track="#150F22" />
        </>}
        <View style={n.rewards}>
          <RewardChips celesti={stage.reward.celesti} items={stage.reward.items} extras={stage.id === 'singularity' ? [{ label: `${t('cosmetic.title')} · Void Walker`, color: '#C9A6FF' }] : []} />
        </View>
        {status === 'ready' && <GameButton label={t('horizon.claim')} color={stage.color} deep="#4A0A18" textColor="#1A0610" sound={null} onPress={() => onClaim(stage)} style={n.claim} />}
      </View>
    </View>
  );
}

// A descent instead of a star map: each claimed depth pulls the camera closer to the event horizon.
export function HorizonDive({ visible, progress, claimedIds, onClaim, onClose, overlay }: { visible: boolean; progress: VoidProgress; claimedIds: string[]; onClaim: (stage: VoidStage) => void; onClose: () => void; overlay?: ReactNode }) {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView | null>(null);
  const arrow = useRef(new Animated.Value(0)).current;
  const claimedCount = voidStages.filter((stage) => claimedIds.includes(stage.id)).length;
  const firstOpen = voidStages.findIndex((stage) => !claimedIds.includes(stage.id));
  useEffect(() => {
    if (!visible) return;
    const target = Math.max(0, (firstOpen === -1 ? voidStages.length - 1 : firstOpen) * STEP + INTRO - height * 0.25);
    const timer = setTimeout(() => scrollRef.current?.scrollTo({ y: firstOpen <= 0 ? 0 : target, animated: true }), 500);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(arrow, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(arrow, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => { clearTimeout(timer); loop.stop(); };
  }, [visible]);
  const stars = useMemo(() => {
    const random = seeded(hashSeed('horizon-dive'));
    return Array.from({ length: 180 }, () => ({ x: random(), y: random(), r: 0.4 + random() * 1.4, o: 0.15 + random() * 0.7 }));
  }, []);
  const contentHeight = INTRO + voidStages.length * STEP + height * 0.75;
  const maxScroll = Math.max(1, contentHeight - height);
  const holeSize = width * 1.35;
  const holeScale = scrollY.interpolate({ inputRange: [0, maxScroll], outputRange: [0.42, 1.2], extrapolate: 'clamp' });
  const holeShift = scrollY.interpolate({ inputRange: [0, maxScroll], outputRange: [height * 0.18, -height * 0.08], extrapolate: 'clamp' });
  const starsShift = scrollY.interpolate({ inputRange: [0, maxScroll], outputRange: [0, -height * 1.2], extrapolate: 'clamp' });
  const darken = scrollY.interpolate({ inputRange: [0, maxScroll], outputRange: [0, 0.35], extrapolate: 'clamp' });
  const statusOf = (stage: VoidStage, index: number): StageStatus => {
    if (claimedIds.includes(stage.id)) return 'claimed';
    if (index !== firstOpen) return 'locked';
    const { value, target } = voidGoalProgress(stage.goal, progress);
    return value >= target ? 'ready' : 'active';
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={d.root}>
        <LinearGradient colors={['#05040E', '#0B0612', '#170A06']} style={d.fill} />
        <Animated.View pointerEvents="none" style={[d.abs, { transform: [{ translateY: starsShift }] }]}>
          <Svg width={width} height={height * 3}>
            {stars.map((star, index) => <Circle key={index} cx={star.x * width} cy={star.y * height * 3} r={star.r} fill="#FFFFFF" opacity={star.o} />)}
          </Svg>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[d.abs, { left: (width - holeSize) / 2, top: height * 0.62 - holeSize / 2, transform: [{ translateY: holeShift }, { scale: holeScale }] }]}>
          <BlackHole size={holeSize} speed={0.8} tilt={-8} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[d.fill, d.darken, { opacity: darken }]} />

        <Animated.ScrollView
          ref={scrollRef as never}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 96, paddingBottom: height * 0.75 }}
        >
          <View style={[d.intro, { height: INTRO - 96 }]}>
            <Text style={d.introTitle}>{t('horizon.title')}</Text>
            <Animated.Text style={[d.scroll, { transform: [{ translateY: arrow.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) }] }]}>↓</Animated.Text>
          </View>
          {voidStages.map((stage, index) => <StageNode key={stage.id} stage={stage} index={index} width={width} status={statusOf(stage, index)} progress={progress} onClaim={onClaim} />)}
        </Animated.ScrollView>

        <LinearGradient colors={['rgba(5,4,14,.96)', 'rgba(5,4,14,0)']} style={d.headerFade} pointerEvents="none" />
        <View style={d.header}>
          <Pressable onPress={() => { playSound('back'); onClose(); }} style={d.back}><Text style={d.backText}>‹</Text></Pressable>
          <View style={d.flex}>
            <Text style={d.headerTitle} numberOfLines={1}>{t('horizon.title')}</Text>
          </View>
          <View style={d.depthPill}><Text style={d.depthPillText}>{claimedCount}/{voidStages.length}</Text></View>
        </View>
        {overlay}
      </View>
    </Modal>
  );
}

const e = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, borderWidth: 1, borderColor: '#5A2A14', overflow: 'hidden', minHeight: 124, paddingRight: 12 },
  pressed: { opacity: 0.8 },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  hole: { width: 112, height: 112, marginLeft: -6 },
  body: { flex: 1, paddingVertical: 12, gap: 3 },
  kicker: { color: '#FFB066', fontSize: 8.5, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: palette.text, fontSize: 16, fontWeight: '900' },
  copy: { color: '#C9B8C0', fontSize: 9.5, lineHeight: 13 },
  pips: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  pip: { width: 12, height: 5, borderRadius: 3, borderWidth: 1, borderColor: '#4A3A55' },
  depth: { color: '#FFD9B0', fontSize: 8.5, fontWeight: '900', marginLeft: 4 },
  chevron: { color: '#FFD9B0', fontSize: 24 },
});

const n = StyleSheet.create({
  node: { alignItems: 'center' },
  flex: { flex: 1 },
  orbit: { marginBottom: -30 },
  card: { width: '88%', backgroundColor: 'rgba(10,6,20,.9)', borderRadius: 20, borderWidth: 1.5, padding: 14, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  depthBadge: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.4)' },
  depthText: { fontSize: 15, fontWeight: '900' },
  kicker: { fontSize: 8.5, fontWeight: '900', letterSpacing: 1 },
  name: { color: palette.text, fontSize: 16, fontWeight: '900', marginTop: 2 },
  nameLocked: { color: '#8F82A8' },
  claimed: { color: '#9EF0B8', fontSize: 18, fontWeight: '900' },
  lore: { color: '#C9BEDB', fontSize: 10.5, lineHeight: 15, fontStyle: 'italic' },
  loreLocked: { color: '#6F6590' },
  lockedText: { color: '#8F82A8', fontSize: 10, fontWeight: '800' },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  goal: { flex: 1, color: '#EDE3F8', fontSize: 11, fontWeight: '800' },
  goalCount: { fontSize: 11, fontWeight: '900' },
  rewards: { marginTop: 2 },
  claim: { marginTop: 4 },
  claimedText: { fontSize: 9, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
});

const d = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05040E' },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  abs: { position: 'absolute', left: 0, top: 0 },
  flex: { flex: 1 },
  darken: { backgroundColor: '#000000' },
  intro: { paddingHorizontal: 26, justifyContent: 'center', alignItems: 'center', gap: 8 },
  introKicker: { color: '#FFB066', fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  introTitle: { color: palette.text, fontSize: 28, fontWeight: '900', textAlign: 'center', textShadowColor: '#FF9A3D', textShadowRadius: 14 },
  introCopy: { color: '#D8CDEB', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  scroll: { color: '#FFD9B0', fontSize: 22, fontWeight: '900', marginTop: 8 },
  final: { color: '#FFD9B0', fontSize: 13, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center', paddingHorizontal: 30, marginTop: 30, textShadowColor: '#000', textShadowRadius: 8 },
  headerFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 130 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 44, paddingBottom: 10 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(40,24,50,.9)', alignItems: 'center', justifyContent: 'center' },
  backText: { color: palette.text, fontSize: 30, lineHeight: 32 },
  headerKicker: { color: '#FFB066', fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  headerTitle: { color: palette.text, fontSize: 17, fontWeight: '900' },
  depthPill: { backgroundColor: 'rgba(60,24,10,.9)', borderWidth: 1, borderColor: '#FFB066', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  depthPillText: { color: '#FFD9B0', fontSize: 9.5, fontWeight: '900' },
});

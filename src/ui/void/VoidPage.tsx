import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { playSound } from '../../audio/sound';
import { demonCards } from '../../data/catalog';
import { hashSeed } from '../../game/creatures';
import { essenceChance, essenceGoal, essencePerDrop, essencePity, voidCosmeticKey, voidCosmeticPool, voidQuasar, voidStages, voidVariantOrder, voidVariants } from '../../game/void';
import { useI18n } from '../../i18n';
import { AnimatedBar, CreatureAvatar, palette } from '../common';
import { seeded } from '../stars/StarSky';
import { BlackHole } from './BlackHole';
import { EssenceIcon } from './EssenceIcon';
import { HorizonEntryCard } from './HorizonDive';

const STAGE_HEIGHT = 500;

export function StarsPageSwitch({ page, onChange }: { page: 0 | 1; onChange: (page: 0 | 1) => void }) {
  const { t } = useI18n();
  return (
    <View style={s.switchWrap}>
      <View style={s.switch}>
        {([0, 1] as const).map((entry) => (
          <Pressable key={entry} onPress={() => { if (entry !== page) { playSound('tab'); onChange(entry); } }} style={[s.switchItem, page === entry && (entry === 0 ? s.switchStars : s.switchVoid)]}>
            <Text style={[s.switchText, page === entry && s.switchTextActive]}>{entry === 0 ? `✦ ${t('void.tabStars')}` : `◉ ${t('void.tabVoid')}`}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// The black hole peeking from the right edge of the stars page, inviting a swipe.
export function VoidPeek({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  const nudge = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(nudge, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(nudge, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.delay(700),
    ]));
    loop.start();
    return () => loop.stop();
  }, [nudge]);
  return (
    <Pressable onPress={onPress} style={s.peek} accessibilityLabel={t('void.tabVoid')}>
      <View style={s.peekHole} pointerEvents="none"><BlackHole size={150} tilt={-12} particles={false} /></View>
      <Animated.View pointerEvents="none" style={[s.peekLabel, { transform: [{ translateX: nudge.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }] }]}>
        <Text style={s.peekChevron}>‹‹</Text>
      </Animated.View>
    </Pressable>
  );
}

export function VoidPage({ header, pageSwitch, celesti, busy, essence, pity, ownedDemonIds, ownedCosmeticKeys, claimedStageCount, onOpen, onInfo, onAltar, onHorizon }: {
  header: ReactNode; pageSwitch: ReactNode; celesti: number; busy: boolean; essence: number; pity: number; ownedDemonIds: string[]; ownedCosmeticKeys: string[];
  claimedStageCount: number; onOpen: () => void; onInfo: () => void; onAltar: () => void; onHorizon: () => void;
}) {
  const { t } = useI18n();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [width, setWidth] = useState(Dimensions.get('window').width - 40);
  const stars = useMemo(() => {
    const random = seeded(hashSeed('void-page'));
    return Array.from({ length: 95 }, () => ({ x: random(), y: random(), r: 0.35 + random() * 1.3, o: 0.15 + random() * 0.75 }));
  }, []);
  const holeSize = Math.min(width * 1.02, 420);
  const affordable = !busy && celesti >= voidQuasar.cost;
  const demonsLeft = demonCards.filter((card) => !ownedDemonIds.includes(card.id)).length;
  const canSummon = essence >= essenceGoal && demonsLeft > 0;
  const cosmeticsOwned = voidCosmeticPool.filter((entry) => ownedCosmeticKeys.includes(voidCosmeticKey(entry.kind, entry.id))).length;
  return (
    <ScrollView contentContainerStyle={s.screen} showsVerticalScrollIndicator={false}>
      {header}
      {pageSwitch}
      <View style={s.stage} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <Svg width={width} height={STAGE_HEIGHT} style={s.abs}>
          <Defs>
            <RadialGradient id={`${uid}bg`} cx="50%" cy="38%" r="75%">
              <Stop offset="0" stopColor="#2E1608" />
              <Stop offset="0.45" stopColor="#0C0612" />
              <Stop offset="1" stopColor="#020104" />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={STAGE_HEIGHT} fill={`url(#${uid}bg)`} />
          {stars.map((star, index) => <Circle key={index} cx={star.x * width} cy={star.y * STAGE_HEIGHT} r={star.r} fill="#FFFFFF" opacity={star.o} />)}
        </Svg>
        <View style={s.stageTop}>
          <View style={s.flex} />
          <Pressable onPress={onInfo} hitSlop={10} style={s.info} accessibilityRole="button"><Text style={s.infoText}>i</Text></Pressable>
        </View>
        <Pressable onPress={onOpen} style={[s.hole, { left: (width - holeSize) / 2, width: holeSize, height: holeSize }]} accessibilityRole="button">
          <BlackHole size={holeSize} tilt={-9} />
        </Pressable>
        <View style={s.plate} pointerEvents="none">
          <Text style={s.name}>{voidQuasar.name.toUpperCase()}</Text>
        </View>
      </View>

      <Pressable onPress={onOpen} style={({ pressed }) => [s.openWrap, (!affordable || pressed) && s.pressed]}>
        <LinearGradient colors={['#FFB066', '#E0521E', '#7A1E0E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.openButton}>
          <Text style={s.openText}>{busy ? t('stars.opening') : `${t('stars.open')}  ·  ✦ ${voidQuasar.cost}`}</Text>
        </LinearGradient>
      </Pressable>

      <View style={s.essence}>
        <LinearGradient colors={['#3A0614', '#1A0610', '#0E0710']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fill} />
        <View style={s.essenceRow}>
          <EssenceIcon size={64} dim={essence === 0} />
          <View style={s.flex}>
            <Text style={s.essenceKicker}>{t('void.essenceKicker')}</Text>
            <Text style={s.essenceTitle}>{essence} / {essenceGoal}</Text>
          </View>
        </View>
        <AnimatedBar ratio={Math.min(1, essence / essenceGoal)} color="#FF2E4D" height={8} track="#240812" />
        <View style={s.demonRow}>
          {demonCards.map((card) => {
            const owned = ownedDemonIds.includes(card.id);
            return (
              <Pressable key={card.id} onPress={() => { playSound('tap'); onAltar(); }} style={s.demon}>
                <CreatureAvatar card={card} size={60} ring={owned ? '#FF4D6D' : '#5A2A3A'} dim={!owned} />
                <Text style={[s.demonName, owned && s.demonNameOwned]} numberOfLines={1}>{card.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={() => { playSound(canSummon ? 'unlock' : 'tap'); onAltar(); }} style={({ pressed }) => [s.altarButton, !canSummon && s.altarButtonLocked, pressed && s.pressed]}>
          <Text style={[s.altarText, !canSummon && s.altarTextLocked]}>{canSummon ? t('void.summon') : demonsLeft === 0 ? t('void.allAwakened') : t('void.viewAltar')}</Text>
        </Pressable>
      </View>

      <HorizonEntryCard claimed={claimedStageCount} total={voidStages.length} onPress={onHorizon} />

      <View style={s.cosmetics}>
        <View style={s.cardHead}><Text style={s.cardTitle}>{t('void.cosmeticsTitle')}</Text><Text style={s.cardCount}>{cosmeticsOwned}/{voidCosmeticPool.length}</Text></View>
        <View style={s.variantRow}>
          {voidVariantOrder.map((variant) => {
            const banner = ownedCosmeticKeys.includes(voidCosmeticKey('banner', `void-${variant}`));
            const frame = ownedCosmeticKeys.includes(voidCosmeticKey('frame', `void-${variant}`));
            const color = voidVariants[variant].body;
            return (
              <View key={variant} style={[s.variant, (banner || frame) && { borderColor: color }]}>
                <BlackHole size={66} variant={variant} animated={false} particles={false} intensity={banner || frame ? 1 : 0.35} />
                <View style={s.variantMarks}>
                  <Text style={[s.mark, banner && { color }]}>▰</Text>
                  <Text style={[s.mark, frame && { color }]}>◉</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { padding: 20, paddingBottom: 104, gap: 16 },
  flex: { flex: 1 },
  abs: { position: 'absolute', left: 0, top: 0 },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  pressed: { opacity: 0.6 },
  switchWrap: { alignItems: 'center', gap: 5, marginTop: -4 },
  switch: { flexDirection: 'row', backgroundColor: '#150F26', borderRadius: 16, borderWidth: 1, borderColor: '#3E3160', padding: 3 },
  switchItem: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 13 },
  switchStars: { backgroundColor: '#3B2F66' },
  switchVoid: { backgroundColor: '#5A2410' },
  switchText: { color: '#9F93B8', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  switchTextActive: { color: palette.text },
  switchHint: { color: '#7F739B', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  peek: { position: 'absolute', right: 0, top: '42%', width: 44, height: 150, overflow: 'hidden', borderTopLeftRadius: 75, borderBottomLeftRadius: 75, zIndex: 20 },
  peekHole: { position: 'absolute', left: 0, top: 0 },
  peekLabel: { position: 'absolute', left: 4, top: 58, width: 30, alignItems: 'center' },
  peekChevron: { color: '#FFE3C2', fontSize: 22, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 6 },
  stage: { height: STAGE_HEIGHT, borderRadius: 28, borderWidth: 1, borderColor: '#5A2A14', overflow: 'hidden', backgroundColor: '#020104' },
  stageTop: { position: 'absolute', top: 14, left: 16, right: 14, flexDirection: 'row', alignItems: 'flex-start', zIndex: 3 },
  kicker: { color: '#FFD9B0', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  tapHint: { color: '#C79A7A', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 3 },
  info: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#C79A7A', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,4,2,.6)' },
  infoText: { color: palette.text, fontSize: 14, fontWeight: '900', lineHeight: 17 },
  hole: { position: 'absolute', top: 26 },
  plate: { position: 'absolute', top: 376, left: 12, right: 12, alignItems: 'center' },
  name: { color: '#FFF6EA', fontSize: 25, fontWeight: '900', letterSpacing: 2.2, textShadowColor: '#FF9A3D', textShadowRadius: 16 },
  subtitle: { color: '#FFB77A', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginTop: 10 },
  chip: { borderWidth: 1, borderColor: '#7A5A4A', backgroundColor: 'rgba(12,6,4,.75)', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { color: '#F2E2D6', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.4 },
  chipGold: { borderColor: '#FFB066', backgroundColor: 'rgba(80,40,10,.75)' },
  chipGoldText: { color: '#FFE0B8' },
  chipRed: { borderColor: '#FF4D6D', backgroundColor: 'rgba(80,8,24,.75)' },
  chipRedText: { color: '#FFC2CC' },
  openWrap: { borderRadius: 18, paddingBottom: 4, backgroundColor: '#5A1608' },
  openButton: { borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  openText: { color: '#FFFDF1', fontSize: 14.5, fontWeight: '900', letterSpacing: 0.6, textShadowColor: 'rgba(40,10,0,.6)', textShadowRadius: 4 },
  disclosure: { color: '#9F90BE', fontSize: 10, textAlign: 'center', marginTop: -8 },
  essence: { borderRadius: 24, borderWidth: 1, borderColor: '#7A1E36', padding: 14, overflow: 'hidden', gap: 10 },
  essenceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  essenceKicker: { color: '#FF8A9A', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  essenceTitle: { color: '#FFE3E8', fontSize: 22, fontWeight: '900', marginTop: 2 },
  essenceCopy: { color: '#D8B8C2', fontSize: 10, lineHeight: 14, marginTop: 3 },
  pity: { color: '#C79AA6', fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  demonRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 2 },
  demon: { alignItems: 'center', width: '31%' },
  demonName: { color: '#9F8290', fontSize: 11, fontWeight: '900', marginTop: 5 },
  demonNameOwned: { color: '#FFE3E8' },
  demonState: { color: '#7F6270', fontSize: 8, fontWeight: '900', marginTop: 2 },
  demonStateOwned: { color: '#FF8A9A' },
  altarButton: { backgroundColor: '#E0223F', borderRadius: 14, borderBottomWidth: 4, borderBottomColor: '#7A0F22', paddingVertical: 13, alignItems: 'center' },
  altarButtonLocked: { backgroundColor: '#2E1420', borderBottomColor: '#1A0A12' },
  altarText: { color: '#FFF1F3', fontSize: 12.5, fontWeight: '900', letterSpacing: 0.8 },
  altarTextLocked: { color: '#C79AA6', fontSize: 11 },
  cosmetics: { backgroundColor: '#140E1E', borderRadius: 22, borderWidth: 1, borderColor: '#3E2E4A', padding: 14, gap: 8 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: palette.text, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  cardCount: { color: '#FFB066', fontSize: 11, fontWeight: '900' },
  cardCopy: { color: '#B9AFCB', fontSize: 10, lineHeight: 14 },
  variantRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  variant: { width: '23%', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#2E2440', backgroundColor: '#07040C', paddingVertical: 6 },
  variantMarks: { flexDirection: 'row', gap: 8, marginTop: 2 },
  mark: { color: '#3E3450', fontSize: 11, fontWeight: '900' },
  legend: { color: '#7F739B', fontSize: 8.5, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5 },
});

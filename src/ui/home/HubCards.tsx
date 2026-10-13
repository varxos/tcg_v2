import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { playSound } from '../../audio/sound';
import { Booster, BoosterId } from '../../data/catalog';
import { starLabels } from '../../game/constellations';
import { hashSeed } from '../../game/creatures';
import { Chapter, Quest } from '../../game/quests';
import { Warden, wardenAce, wardens } from '../../game/wardens';
import { tk, useI18n } from '../../i18n';
import { AnimatedBar, CreatureAvatar, RewardChips, TypeChip, palette } from '../common';
import { StarArt } from '../stars/StarArt';
import { StarSky, seeded } from '../stars/StarSky';

const SHOWCASE_HEIGHT = 272;
const showcase: { id: BoosterId; x: number; y: number; size: number; phase: number }[] = [
  { id: 'dawn', x: 0.2, y: 142, size: 112, phase: 0 },
  { id: 'twilight', x: 0.5, y: 112, size: 136, phase: 600 },
  { id: 'celestial', x: 0.8, y: 146, size: 112, phase: 1200 },
];

export function StarShowcase({ onPick }: { onPick: (id: BoosterId) => void }) {
  const { t } = useI18n();
  const [width, setWidth] = useState(Dimensions.get('window').width - 40);
  const points = showcase.map((entry) => ({ ...entry, cx: entry.x * width }));
  const lines = points.slice(1).map((point, index) => ({ x1: points[index].cx, y1: points[index].y, x2: point.cx, y2: point.y }));
  return (
    <View style={s.showcase} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <StarSky width={width} height={SHOWCASE_HEIGHT} colorA="#A48AF4" colorB="#FFBB68" seed="hub-showcase" lines={lines} density={60} twinkles={5} />
      {points.map((point) => (
        <Pressable key={point.id} onPress={() => { playSound('tap'); onPick(point.id); }} style={[s.showcaseStar, { left: point.cx - point.size / 2, top: point.y - point.size / 2, width: point.size, zIndex: point.id === 'twilight' ? 3 : 2 }]}>
          <StarArt variant={point.id} size={point.size} phase={point.phase} />
          <Text style={s.showcaseName}>{starLabels[point.id]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const eventStars = (() => {
  const random = seeded(hashSeed('crimson-event'));
  return Array.from({ length: 34 }, () => ({ x: random() * 460, y: random() * 240, r: 0.4 + random() * 1.2, o: 0.2 + random() * 0.6 }));
})();

// The beta event lives where the old test star was, but reads as a real limited-time event.
export function EventStarCard({ star, onOpen }: { star: Booster; onOpen: () => void }) {
  const { t } = useI18n();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const sweep = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const sweepLoop = Animated.loop(Animated.sequence([Animated.timing(sweep, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }), Animated.delay(1800)]));
    const blinkLoop = Animated.loop(Animated.sequence([Animated.timing(blink, { toValue: 1, duration: 650, useNativeDriver: true }), Animated.timing(blink, { toValue: 0, duration: 650, useNativeDriver: true })]));
    sweepLoop.start();
    blinkLoop.start();
    return () => { sweepLoop.stop(); blinkLoop.stop(); };
  }, [sweep, blink]);
  const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-200, 520] });
  const dotOpacity = blink.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] });
  return (
    <Pressable onPress={() => { playSound('tap'); onOpen(); }} style={({ pressed }) => [s.event, pressed && s.pressed]}>
      <LinearGradient colors={['#2A0716', '#661233', '#2B0A2E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fill} />
      <Svg width={460} height={240} style={s.abs}>
        <Defs>
          <RadialGradient id={`${uid}glow`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FF3D58" stopOpacity={0.6} />
            <Stop offset="1" stopColor="#FF3D58" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={66} cy={112} r={140} fill={`url(#${uid}glow)`} />
        {eventStars.map((entry, index) => <Circle key={index} cx={entry.x} cy={entry.y} r={entry.r} fill="#FFE3E0" opacity={entry.o} />)}
        <Path d="M 150 0 L 205 0 L 85 240 L 30 240 Z" fill="#FFD27A" opacity={0.05} />
        <Path d="M 250 0 L 275 0 L 155 240 L 130 240 Z" fill="#FFD27A" opacity={0.04} />
      </Svg>
      <Animated.View pointerEvents="none" style={[s.sweep, { transform: [{ translateX: sweepX }, { rotate: '18deg' }] }]}>
        <LinearGradient colors={['rgba(255,214,190,0)', 'rgba(255,214,190,0.2)', 'rgba(255,214,190,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.flexFill} />
      </Animated.View>
      <View style={s.eventArt} pointerEvents="none"><StarArt variant="crimson" size={160} phase={300} /></View>
      <View style={s.eventCopy}>
        <View style={s.eventPills}>
          <View style={s.livePill}><Animated.View style={[s.liveDot, { opacity: dotOpacity }]} /><Text style={s.liveText}>{t('event.live')}</Text></View>
          <View style={s.betaPill}><Text style={s.betaText}>{t('event.beta')}</Text></View>
        </View>
        <Text style={s.eventTitle}>{star.name.toUpperCase()}</Text>
        <View style={s.eventFooter}>
          <View style={s.eventCta}><Text style={s.eventCtaText}>{t('event.open')}</Text></View>
        </View>
      </View>
    </Pressable>
  );
}

function ProgressRing({ size, color, ratio, children }: { size: number; color: string; ratio: number; children: ReactNode }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={s.abs}>
        <Circle cx={size / 2} cy={size / 2} r={radius - 5} fill={`${color}2A`} />
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#3A3052" strokeWidth={stroke} />
        {ratio > 0 && <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${circumference * Math.min(1, ratio)} ${circumference}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />}
      </Svg>
      {children}
    </View>
  );
}

// The adventure at a glance: the chapter, its title and how many of its quests are done. Details live in Quests.
export function AdventureCard({ chapter, doneCount, readyCount, onPress }: { chapter: Chapter; doneCount: number; readyCount: number; onPress: () => void }) {
  const { t } = useI18n();
  const total = chapter.quests.length;
  return (
    <Pressable onPress={() => { playSound('tap'); onPress(); }} style={({ pressed }) => [s.card, { borderColor: `${chapter.color}88` }, pressed && s.pressed]}>
      <LinearGradient colors={[`${chapter.color}38`, '#2A2146', '#1F1834']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fill} />
      <View style={s.cardTop}>
        <ProgressRing size={58} color={chapter.color} ratio={doneCount / total}><Text style={[s.ringNumber, { color: chapter.color }]}>{chapter.number}</Text></ProgressRing>
        <View style={s.flex}>
          <Text style={s.cardTitle} numberOfLines={2}>{t(tk(`chapter.${chapter.id}.title`))}</Text>
          <View style={s.progressRow}>
            <View style={s.flex}><AnimatedBar ratio={doneCount / total} color={chapter.color} height={6} track="#17122A" /></View>
            <Text style={[s.progressCount, { color: chapter.color }]}>{doneCount}/{total}</Text>
          </View>
        </View>
        {readyCount > 0 && <View style={s.badge}><Text style={s.badgeText}>{readyCount}</Text></View>}
      </View>
    </Pressable>
  );
}

// The next Warden: its creature, name and type, and the eight Sigils of the circuit.
export function WardenCard({ warden, defeatedIds, onPress }: { warden: Warden | null; defeatedIds: string[]; onPress: () => void }) {
  const { t } = useI18n();
  const color = warden?.color ?? palette.gold;
  return (
    <Pressable onPress={() => { playSound('tap'); onPress(); }} style={({ pressed }) => [s.card, { borderColor: `${color}88` }, pressed && s.pressed]}>
      <LinearGradient colors={[`${color}38`, '#231C3D', '#1C1631']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fill} />
      <View style={s.cardTop}>
        {warden ? (
          <View style={s.portrait}>
            <CreatureAvatar card={wardenAce(warden)} size={58} ring={warden.color} />
            <View style={[s.sigilBadge, { backgroundColor: warden.accent, borderColor: warden.color }]}><Text style={s.sigilBadgeText}>{warden.sigil}</Text></View>
          </View>
        ) : <ProgressRing size={58} color={palette.gold} ratio={1}><Text style={[s.ringNumber, { color: palette.gold }]}>♛</Text></ProgressRing>}
        <View style={s.flex}>
          <Text style={s.cardTitle} numberOfLines={1}>{warden ? warden.name : t('hub.championTitle')}</Text>
        </View>
        {warden && (warden.type === 'Mixed'
          ? <View style={[s.mixedChip, { borderColor: color }]}><Text style={[s.mixedText, { color }]}>{t('battleHub.mixed')}</Text></View>
          : <TypeChip type={warden.type} compact />)}
      </View>
      <View style={s.track}>
        <View style={s.trackLine} />
        {wardens.map((entry) => {
          const won = defeatedIds.includes(entry.id);
          const current = entry.id === warden?.id;
          return (
            <View key={entry.id} style={[s.trackNode, won && { backgroundColor: entry.accent, borderColor: entry.color }, current && { borderColor: entry.color, borderWidth: 2, transform: [{ scale: 1.18 }] }]}>
              <Text style={[s.trackSigil, { color: won ? '#FFF9E8' : current ? entry.color : '#554B6E' }]}>{entry.sigil}</Text>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
  abs: { position: 'absolute', top: 0, left: 0 },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  flexFill: { flex: 1 },
  showcase: { height: SHOWCASE_HEIGHT, borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: '#3E4C7A', backgroundColor: '#050B1F' },
  showcaseKicker: { position: 'absolute', top: 14, alignSelf: 'center', color: '#D9E4FF', fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  showcaseHint: { position: 'absolute', bottom: 12, alignSelf: 'center', color: '#8FA0C8', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  showcaseStar: { position: 'absolute', alignItems: 'center' },
  showcaseName: { color: '#EEF3FF', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: -12, textShadowColor: '#050B1F', textShadowRadius: 6 },
  event: { minHeight: 170, borderRadius: 24, borderWidth: 1.5, borderColor: '#FF6B7E', overflow: 'hidden', backgroundColor: '#3A0B1E', shadowColor: '#FF3D58', shadowOpacity: 0.45, shadowRadius: 16, elevation: 10 },
  sweep: { position: 'absolute', top: -70, left: 0, width: 90, height: 380 },
  eventArt: { position: 'absolute', left: -10, top: 5 },
  eventCopy: { marginLeft: 150, paddingTop: 22, paddingRight: 14, paddingBottom: 20, flex: 1, justifyContent: 'center' },
  eventPills: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(20,4,12,.6)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: '#FF6B7E' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF4D5E' },
  liveText: { color: '#FFD0D6', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.8 },
  betaPill: { backgroundColor: '#FFD27A', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  betaText: { color: '#4A1420', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.8 },
  eventTitle: { color: '#FFF3EE', fontSize: 21, fontWeight: '900', letterSpacing: 1.4, marginTop: 8, textShadowColor: '#FF3D58', textShadowRadius: 14 },
  eventText: { color: '#F4C9D0', fontSize: 9.5, lineHeight: 13.5, marginTop: 4 },
  eventChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  eventChip: { borderWidth: 1, borderColor: '#FF8A99', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2.5, backgroundColor: 'rgba(20,4,12,.45)' },
  eventChipGold: { borderColor: '#FFD27A', backgroundColor: 'rgba(80,50,10,.55)' },
  eventChipText: { color: '#FFD0D6', fontSize: 8, fontWeight: '900' },
  eventChipGoldText: { color: '#FFE99A' },
  eventFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  eventCta: { backgroundColor: '#FF4D62', borderRadius: 11, borderBottomWidth: 3, borderBottomColor: '#A51E3C', paddingHorizontal: 14, paddingVertical: 8 },
  eventCtaText: { color: '#FFF6F0', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  eventCost: { color: '#FFE072', fontSize: 11, fontWeight: '900' },
  eventFoot: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingVertical: 7, backgroundColor: 'rgba(20,4,12,.6)', borderTopWidth: 1, borderTopColor: 'rgba(255,107,126,.35)', alignItems: 'center' },
  eventFootText: { color: '#FFC3CB', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.7 },
  card: { borderRadius: 22, borderWidth: 1.5, overflow: 'hidden', padding: 14, gap: 11, backgroundColor: '#231C3D' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ringNumber: { fontSize: 21, fontWeight: '900' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  progressCount: { fontSize: 13, fontWeight: '900' },
  kicker: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  cardTitle: { color: palette.text, fontSize: 17, fontWeight: '900', marginTop: 3 },
  cardSub: { color: '#C3B7D8', fontSize: 9.5, fontWeight: '700', marginTop: 2 },
  badge: { alignSelf: 'flex-start', backgroundColor: palette.coral, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1.5, borderColor: '#FFF4D7' },
  badgeText: { color: '#FFFDF1', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.4 },
  box: { backgroundColor: 'rgba(12,8,26,.45)', borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', padding: 11 },
  boxLabel: { color: '#9F93B8', fontSize: 7.5, fontWeight: '900', letterSpacing: 1 },
  questRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 7 },
  questIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  questIconText: { fontSize: 16, fontWeight: '900' },
  questTitle: { color: palette.text, fontSize: 12.5, fontWeight: '900' },
  questCopy: { color: '#C9BEDB', fontSize: 9.5, lineHeight: 13, marginTop: 2 },
  questCount: { fontSize: 12, fontWeight: '900' },
  questBar: { marginTop: 9 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerHint: { color: '#A99DBA', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  cta: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  portrait: { width: 58, height: 58 },
  sigilBadge: { position: 'absolute', right: -5, bottom: -4, width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  sigilBadgeText: { color: '#FFF9E8', fontSize: 12, fontWeight: '900' },
  mixedChip: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1.5, alignSelf: 'flex-start' },
  mixedText: { fontSize: 7.5, fontWeight: '900', letterSpacing: 0.3 },
  stats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(12,8,26,.45)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', paddingVertical: 9 },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,.1)' },
  statLabel: { color: '#9F93B8', fontSize: 7, fontWeight: '900', letterSpacing: 0.7, textAlign: 'center' },
  statValue: { color: palette.text, fontSize: 13, fontWeight: '900', marginTop: 3 },
  track: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 },
  trackLine: { position: 'absolute', left: 14, right: 14, height: 2, backgroundColor: '#3A3052' },
  trackNode: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#4A4060', backgroundColor: '#1A1530', alignItems: 'center', justifyContent: 'center' },
  trackSigil: { fontSize: 13, fontWeight: '900' },
});

import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playSound } from '../../audio/sound';
import { BoosterId, openableStars, supernovaGoal } from '../../data/catalog';
import { starLabels } from '../../game/constellations';
import { tk, useI18n } from '../../i18n';
import { InfoButton, palette } from '../common';
import { StarArt } from './StarArt';
import { StarSky } from './StarSky';

export type OpenQuantity = 1 | 2 | 3 | 5 | 10;
const quantities: OpenQuantity[] = [1, 2, 3, 5, 10];
const STAGE_HEIGHT = 470;
const HERO_SIZE = 214;
const RAIL_TOP = 360;
const ORB = 58;

function SupernovaCard({ charge, onTrigger }: { charge: number; onTrigger: () => void }) {
  const { t } = useI18n();
  const shown = Math.min(charge, supernovaGoal);
  const ready = shown >= supernovaGoal;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!ready) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [ready, pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const [info, setInfo] = useState(false);
  return (
    <View style={[s.nova, ready && s.novaReady]}>
      <LinearGradient colors={ready ? ['#5A3A10', '#3A2150', '#1B1433'] : ['#2E2440', '#231B39', '#1B1433']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fill} />
      <View style={s.novaRow}>
        <StarArt variant="sparkle" size={96} charge={shown / supernovaGoal} speed={ready ? 3 : 1} phase={400} />
        <View style={s.flex}>
          <Text style={s.novaTitle}>{t('supernova.kicker')}</Text>
          <Text style={s.novaCharge}>{shown}/{supernovaGoal}</Text>
        </View>
        <InfoButton onPress={() => setInfo((value) => !value)} color="#FFD76A" />
      </View>
      {info && <Text style={s.novaCopy}>{t('supernova.copy', { goal: supernovaGoal })} {t(tk('rarity.Epic'))} 74% · {t(tk('rarity.Legendary'))} 26%.</Text>}
      <View style={s.gauge}>
        {Array.from({ length: supernovaGoal }, (_, index) => <View key={index} style={[s.cell, (index + 1) % 10 === 0 && s.cellMilestone, index < shown && s.cellOn, index === shown - 1 && s.cellHead]} />)}
      </View>
      {ready && (
        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable onPress={onTrigger} style={({ pressed }) => [s.novaButton, pressed && s.pressed]}>
            <Text style={s.novaButtonText}>✺ {t('supernova.trigger')}</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

export function StarsScreen({ header, pageSwitch, selectedId, onSelect, celesti, opening, quantity, onQuantity, onOpen, onInfo, supernovaCharge, onSupernova, customOdds }: {
  header: ReactNode; pageSwitch?: ReactNode; selectedId: BoosterId; onSelect: (id: BoosterId) => void; celesti: number; opening: boolean;
  quantity: OpenQuantity; onQuantity: (quantity: OpenQuantity) => void; onOpen: () => void; onInfo: () => void;
  supernovaCharge: number; onSupernova: () => void; customOdds: boolean;
}) {
  const { t } = useI18n();
  const [width, setWidth] = useState(Dimensions.get('window').width - 40);
  const star = openableStars.find((entry) => entry.id === selectedId) ?? openableStars[0];
  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    pop.setValue(0.72);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
  }, [star.id, pop]);
  const itemWidth = (width - 24) / openableStars.length;
  const railX = (index: number) => 12 + itemWidth * (index + 0.5);
  const railY = RAIL_TOP + 6 + ORB / 2;
  const lines = openableStars.slice(1).map((_, index) => ({ x1: railX(index) + ORB / 2 + 5, y1: railY, x2: railX(index + 1) - ORB / 2 - 5, y2: railY }));
  const cost = star.cost * quantity;
  const affordable = !opening && celesti >= cost;
  return (
    <ScrollView contentContainerStyle={s.screen} showsVerticalScrollIndicator={false}>
      {header}
      {pageSwitch}
      <View style={[s.stage, { borderColor: `${star.color}66` }]} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <StarSky width={width} height={STAGE_HEIGHT} colorA={star.color} colorB={star.accent} seed="stars-stage" lines={lines} pedestal={{ x: width / 2, y: 262, rx: 120 }} radius={28} density={90} twinkles={7} />
        <View style={s.stageTop}>
          <View style={s.flex} />
          <Pressable onPress={onInfo} hitSlop={10} style={s.info} accessibilityRole="button" accessibilityLabel={t('stars.oddsA11y')}><Text style={s.infoText}>i</Text></Pressable>
        </View>
        <Animated.View style={[s.hero, { left: (width - HERO_SIZE) / 2, transform: [{ scale: pop }] }]}>
          <StarArt variant={star.id} size={HERO_SIZE} />
        </Animated.View>
        <View style={s.plate} pointerEvents="none">
          <Text style={[s.name, { textShadowColor: star.color }]}>{star.name.toUpperCase()}</Text>
          {customOdds && <View style={s.chips}><View style={[s.chip, s.chipDev]}><Text style={[s.chipText, s.chipDevText]}>DEV</Text></View></View>}
        </View>
        {openableStars.map((entry, index) => {
          const active = entry.id === star.id;
          return (
            <Pressable key={entry.id} onPress={() => { if (!active) { playSound('toggle'); onSelect(entry.id); } }} style={[s.railItem, { left: railX(index) - itemWidth / 2, width: itemWidth }]}>
              <View style={[s.railOrb, active && { borderColor: entry.color, backgroundColor: `${entry.color}2E` }]}>
                <StarArt variant={entry.id} size={ORB - 4} animated={false} float={false} dim={!active} />
              </View>
              <Text numberOfLines={1} style={[s.railName, active && { color: entry.color }]}>{starLabels[entry.id]}</Text>
              {entry.event && <View style={s.railBadge}><Text style={s.railBadgeText}>BETA</Text></View>}
            </Pressable>
          );
        })}
      </View>

      <View style={s.quantityRow}>
        {quantities.map((entry) => (
          <Pressable key={entry} onPress={() => { playSound('tap'); onQuantity(entry); }} style={[s.quantity, quantity === entry && { backgroundColor: star.color, borderColor: '#FFF4D6' }]}>
            <Text style={[s.quantityText, quantity === entry && s.quantityTextActive]}>×{entry}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={onOpen} style={({ pressed }) => [s.openWrap, { backgroundColor: star.accent }, (!affordable || pressed) && s.pressed]}>
        <LinearGradient colors={[star.color, star.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.openButton}>
          <Text style={s.openText}>{opening ? t('stars.opening') : `${t('stars.open')}  ·  ✦ ${cost}`}</Text>
        </LinearGradient>
      </Pressable>
      <SupernovaCard charge={supernovaCharge} onTrigger={onSupernova} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { padding: 20, paddingBottom: 104, gap: 16 },
  flex: { flex: 1 },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  pressed: { opacity: 0.6 },
  stage: { height: STAGE_HEIGHT, borderRadius: 28, borderWidth: 1, overflow: 'hidden', backgroundColor: '#050B1F' },
  stageTop: { position: 'absolute', top: 14, left: 16, right: 14, flexDirection: 'row', alignItems: 'flex-start' },
  kicker: { color: '#D9E4FF', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  pick: { color: '#8FA0C8', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 3 },
  info: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#A9B8DD', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,14,36,.6)' },
  infoText: { color: '#FFF9E8', fontSize: 14, fontWeight: '900', lineHeight: 17 },
  hero: { position: 'absolute', top: 46, width: HERO_SIZE, height: HERO_SIZE },
  plate: { position: 'absolute', top: 268, left: 12, right: 12, alignItems: 'center' },
  name: { color: '#FFFDF3', fontSize: 23, fontWeight: '900', letterSpacing: 1.6, textShadowRadius: 14 },
  subtitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginTop: 9 },
  chip: { borderWidth: 1, borderColor: '#5F6F97', backgroundColor: 'rgba(6,12,32,.72)', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { color: '#E4ECFF', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.4 },
  chipGold: { borderColor: '#FFD54A', backgroundColor: 'rgba(80,58,10,.75)' },
  chipGoldText: { color: '#FFE99A' },
  chipDev: { borderColor: '#FF8A8A', backgroundColor: 'rgba(90,20,30,.8)' },
  chipDevText: { color: '#FFC9C9' },
  railItem: { position: 'absolute', top: RAIL_TOP, alignItems: 'center' },
  railOrb: { width: ORB + 4, height: ORB + 4, borderRadius: (ORB + 4) / 2, borderWidth: 1.5, borderColor: 'rgba(169,184,221,.28)', backgroundColor: 'rgba(8,14,36,.55)', alignItems: 'center', justifyContent: 'center' },
  railName: { color: '#8E9AB9', fontSize: 8, fontWeight: '900', letterSpacing: 0.8, marginTop: 5 },
  railCost: { color: '#6F7A99', fontSize: 7.5, fontWeight: '900', marginTop: 1 },
  railBadge: { position: 'absolute', top: -4, right: '14%', backgroundColor: '#E2364F', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1, borderWidth: 1, borderColor: '#FFD0D6' },
  railBadgeText: { color: '#FFF6F0', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.5 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  quantityLabel: { color: '#AFA2C7', fontWeight: '900', fontSize: 10, letterSpacing: 0.7, marginRight: 2 },
  quantity: { flex: 1, height: 30, borderRadius: 10, borderWidth: 1, borderColor: '#5A4A7B', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A2047' },
  quantityText: { color: '#CFC3E4', fontSize: 10, fontWeight: '900' },
  quantityTextActive: { color: '#2B1D3F' },
  openWrap: { borderRadius: 18, paddingBottom: 4 },
  openButton: { borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  openText: { color: '#FFFDF1', fontSize: 14.5, fontWeight: '900', letterSpacing: 0.5, textShadowColor: 'rgba(40,10,30,.55)', textShadowRadius: 4 },
  disclosure: { color: '#9F90BE', fontSize: 10, textAlign: 'center', marginTop: -8 },
  nova: { borderRadius: 24, borderWidth: 1, borderColor: '#6E5A8F', padding: 14, overflow: 'hidden', gap: 10 },
  novaReady: { borderColor: '#FFD76A', shadowColor: '#FFD76A', shadowOpacity: 0.5, shadowRadius: 14, elevation: 8 },
  novaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  novaKicker: { color: '#FFD76A', fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  novaTitle: { color: palette.text, fontSize: 17, fontWeight: '900', marginTop: 3 },
  novaCopy: { color: '#D6CBE5', fontSize: 11, lineHeight: 16 },
  gauge: { flexDirection: 'row', gap: 2, alignItems: 'flex-end' },
  cell: { flex: 1, height: 9, borderRadius: 2, backgroundColor: '#3A3052' },
  cellMilestone: { height: 13 },
  cellOn: { backgroundColor: '#FFC862' },
  cellHead: { backgroundColor: '#FFF4CF' },
  novaMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  novaCharge: { color: '#FFE9A8', fontSize: 15, fontWeight: '900', letterSpacing: 0.6, marginTop: 2 },
  novaOdds: { color: '#CDB8FF', fontSize: 9, fontWeight: '900' },
  novaButton: { backgroundColor: '#F2A93A', borderRadius: 14, borderBottomWidth: 4, borderBottomColor: '#A6661A', paddingVertical: 14, alignItems: 'center' },
  novaButtonLocked: { backgroundColor: '#3A3052', borderBottomColor: '#28203B' },
  novaButtonText: { color: '#2B1606', fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  novaButtonTextLocked: { color: '#A99DBA', fontSize: 11 },
  novaGuarantee: { color: '#9F90BE', fontSize: 8, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
});

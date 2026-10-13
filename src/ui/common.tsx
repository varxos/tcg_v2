import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { playSound, SoundId } from '../audio/sound';
import { Card, rarityTheme } from '../data/catalog';
import { MoveType, StatusId, creatureTypes, typeChart, typeTheme } from '../game/creatures';
import { ItemReward, items } from '../game/items';
import { tk, useI18n } from '../i18n';
import { CreatureArt } from './creatures/CreatureArt';
import { SpriteView } from './creatures/CreatureSprite';

export const palette = {
  bg: '#17112D', panel: '#302553', panelDeep: '#241A43', panelDark: '#1E1733', border: '#6D598F', borderSoft: '#4C3B70',
  text: '#FFF9E8', muted: '#C6B8DE', faint: '#8F82A8', gold: '#FFE072', goldDeep: '#C99219', coral: '#F26B63', coralDeep: '#AD3C4B',
  cyan: '#8FE4FF', blue: '#2285A8', blueDeep: '#145C7B', green: '#58D59A', purple: '#5A4378', purpleDeep: '#3B2C61',
};

export function CreatureAvatar({ card, size, ring, flip = false, dim = false, view = 'front', style }: { card: Card; size: number; ring?: string; flip?: boolean; dim?: boolean; view?: SpriteView; style?: StyleProp<ViewStyle> }) {
  const theme = rarityTheme[card.rarity];
  const flattened = StyleSheet.flatten(style) as ViewStyle | undefined;
  const border = typeof flattened?.borderWidth === 'number' ? flattened.borderWidth : Math.max(2, Math.round(size * 0.04));
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, borderWidth: border, borderColor: ring ?? theme.color, backgroundColor: theme.accent, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
      <CreatureArt card={card} size={size - border * 2} view={view} dim={dim} framing="head" style={flip ? { transform: [{ scaleX: -1 }] } : undefined} />
    </View>
  );
}

// A live HH:MM:SS countdown. It ticks on its own so the screen around it does not re-render every second.
const pad = (value: number) => value.toString().padStart(2, '0');
export function Countdown({ target, onDone, style }: { target: number; onDone?: () => void; style?: StyleProp<TextStyle> }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = Math.max(0, target - now);
  useEffect(() => { if (left === 0) onDone?.(); }, [left === 0]);
  return <Text style={style}>{`${pad(Math.floor(left / 3600000))}:${pad(Math.floor((left % 3600000) / 60000))}:${pad(Math.floor((left % 60000) / 1000))}`}</Text>;
}

// Small round (i) button that opens an explanation sheet.
export function InfoButton({ onPress, color = '#B8A8DB' }: { onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={() => { playSound('tap'); onPress(); }} hitSlop={10} style={[styles.infoButton, { borderColor: color }]}>
      <Text style={[styles.infoButtonText, { color }]}>i</Text>
    </Pressable>
  );
}

export function TypeChip({ type, compact = false }: { type: MoveType; compact?: boolean }) {
  const { t } = useI18n();
  const theme = typeTheme[type];
  return <View style={[styles.chip, compact && styles.chipCompact, { backgroundColor: theme.soft, borderColor: theme.color }]}><Text style={[styles.chipText, compact && styles.chipTextCompact, { color: theme.color }]}>{theme.icon} {t(tk(`type.${type}`))}</Text></View>;
}

export function StatusChip({ status }: { status: StatusId }) {
  const { t } = useI18n();
  const color = { burn: '#FF8069', poison: '#C08BF5', sleep: '#9FB3D9', freeze: '#8FE4FF', dazzle: '#FFE37D' }[status];
  return <View style={[styles.chip, styles.chipCompact, { backgroundColor: '#1B1430', borderColor: color }]}><Text style={[styles.chipText, styles.chipTextCompact, { color }]}>{t(tk(`status.${status}.tag`))}</Text></View>;
}

export const hpColor = (ratio: number) => (ratio > 0.5 ? '#58D59A' : ratio > 0.2 ? '#F6C85F' : '#F26B63');

export function AnimatedBar({ ratio, color, hp = false, height = 8, track = '#17162A', resetKey, duration = 480 }: { ratio: number; color?: string; hp?: boolean; height?: number; track?: string; resetKey?: string | number; duration?: number }) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  const value = useRef(new Animated.Value(clamped)).current;
  const lastKey = useRef(resetKey);
  useEffect(() => {
    if (lastKey.current !== resetKey) {
      lastKey.current = resetKey;
      value.stopAnimation();
      value.setValue(clamped);
      return;
    }
    const animation = Animated.timing(value, { toValue: clamped, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [clamped, resetKey, duration, value]);
  const width = value.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const backgroundColor = hp ? value.interpolate({ inputRange: [0, 0.2, 0.21, 0.5, 0.51, 1], outputRange: ['#F26B63', '#F26B63', '#F6C85F', '#F6C85F', '#58D59A', '#58D59A'] }) : color ?? palette.gold;
  return <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}><Animated.View style={{ width, height: '100%', borderRadius: height / 2, backgroundColor }} /></View>;
}

export function GameButton({ label, onPress, color = palette.coral, deep = palette.coralDeep, disabled = false, compact = false, style, textColor = '#FFFDF1', icon, sound = 'tap' }: { label: string; onPress: () => void; color?: string; deep?: string; disabled?: boolean; compact?: boolean; style?: StyleProp<ViewStyle>; textColor?: string; icon?: ReactNode; sound?: SoundId | null }) {
  return (
    <Pressable disabled={disabled} onPress={() => { if (sound) playSound(sound); onPress(); }} style={({ pressed }) => [styles.button, compact && styles.buttonCompact, { backgroundColor: color, borderBottomColor: deep }, (disabled || pressed) && styles.buttonPressed, style]}>
      {icon}
      <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function RewardChips({ celesti, items: rewardItems = [], extra, extras = [] }: { celesti: number; items?: ItemReward[]; extra?: string; extras?: { label: string; color: string }[] }) {
  const all = [...(extra ? [{ label: extra, color: '#76DFFF' }] : []), ...extras];
  return (
    <View style={styles.rewardRow}>
      {celesti > 0 && <View style={styles.rewardChip}><Text style={styles.rewardChipText}>✦ {celesti}</Text></View>}
      {rewardItems.map((reward) => <View key={reward.itemId} style={[styles.rewardChip, { borderColor: items[reward.itemId].color }]}><Text style={[styles.rewardChipText, { color: items[reward.itemId].color }]}>{items[reward.itemId].icon} ×{reward.amount}</Text></View>)}
      {all.map((entry) => <View key={entry.label} style={[styles.rewardChip, { borderColor: entry.color }]}><Text style={[styles.rewardChipText, { color: entry.color }]}>{entry.label}</Text></View>)}
    </View>
  );
}

export function TypeChart({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable style={styles.chartBackdrop} onPress={() => { playSound('back'); onClose(); }}>
      <View style={styles.chartSheet}>
        <Text style={styles.chartTitle}>{t('typeChart.title')}</Text>
        <Text style={styles.chartCopy}>{t('typeChart.copy')}</Text>
        {creatureTypes.map((type) => (
          <View key={type} style={styles.chartRow}>
            <View style={styles.chartType}><TypeChip type={type} compact /></View>
            <View style={styles.chartColumn}><Text style={styles.chartLabel}>{t('typeChart.strongVs')}</Text><Text style={styles.chartStrong}>{typeChart[type].strong.map((entry) => `${typeTheme[entry].icon} ${t(tk(`type.${entry}`))}`).join('  ')}</Text></View>
            <View style={styles.chartColumn}><Text style={styles.chartLabel}>{t('typeChart.resistedBy')}</Text><Text style={styles.chartWeak}>{typeChart[type].weak.map((entry) => `${typeTheme[entry].icon} ${t(tk(`type.${entry}`))}`).join('  ')}</Text></View>
          </View>
        ))}
        <Text style={styles.chartStatus}>{t('typeChart.status')}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  infoButton: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(12,8,26,.35)' },
  infoButtonText: { fontSize: 14, fontWeight: '900', lineHeight: 17 },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  chipCompact: { paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 6 },
  chipText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  chipTextCompact: { fontSize: 7.5, letterSpacing: 0.3 },
  button: { borderRadius: 16, borderBottomWidth: 4, paddingVertical: 15, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  buttonCompact: { borderRadius: 11, borderBottomWidth: 3, paddingVertical: 8, paddingHorizontal: 12 },
  buttonPressed: { opacity: 0.6 },
  buttonText: { fontSize: 14, fontWeight: '900', letterSpacing: 0.6, textAlign: 'center' },
  buttonTextCompact: { fontSize: 9, letterSpacing: 0.5 },
  rewardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  rewardChip: { borderWidth: 1, borderColor: '#8C7236', backgroundColor: '#2B2140', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  rewardChipText: { color: '#FFE072', fontSize: 9, fontWeight: '900' },
  chartBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(8,5,22,.82)', justifyContent: 'center', padding: 16, zIndex: 60, elevation: 60 },
  chartSheet: { backgroundColor: palette.panel, borderRadius: 24, borderWidth: 1, borderColor: palette.border, padding: 18 },
  chartTitle: { color: palette.text, fontSize: 22, fontWeight: '900', marginTop: 3 },
  chartCopy: { color: '#D5CBE5', fontSize: 10, lineHeight: 15, marginTop: 5, marginBottom: 8 },
  chartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#46385F', gap: 8 },
  chartType: { width: 84 },
  chartColumn: { flex: 1 },
  chartLabel: { color: palette.faint, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.6 },
  chartStrong: { color: '#9EF0B8', fontSize: 8, fontWeight: '900', marginTop: 2 },
  chartWeak: { color: '#F3A1A6', fontSize: 8, fontWeight: '900', marginTop: 2 },
  chartStatus: { color: '#CFC3E4', fontSize: 8.5, lineHeight: 13, marginTop: 10 },
});

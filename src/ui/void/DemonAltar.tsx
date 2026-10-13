import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { playSound } from '../../audio/sound';
import { Card, demonCards } from '../../data/catalog';
import { learnsetFor, rarityStartLevel, statsAtLevel, typeForCard } from '../../game/creatures';
import { essenceGoal } from '../../game/void';
import { tk, useI18n } from '../../i18n';
import { MiniCard } from '../cards';
import { TypeChip, palette } from '../common';
import { haptic } from '../feedback';
import { BlackHole } from './BlackHole';
import { EssenceIcon } from './EssenceIcon';

// The Demon Altar: spend a full essence gauge to awaken the demon of your choice.
export function DemonAltar({ visible, essence, ownedIds, onSummon, onClose }: { visible: boolean; essence: number; ownedIds: string[]; onSummon: (cardId: string) => void; onClose: () => void }) {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const [selectedId, setSelectedId] = useState(demonCards[0].id);
  const [ritual, setRitual] = useState<Card | null>(null);
  const ritualValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    setRitual(null);
    setSelectedId((demonCards.find((card) => !ownedIds.includes(card.id)) ?? demonCards[0]).id);
  }, [visible]);
  const selected = demonCards.find((card) => card.id === selectedId) ?? demonCards[0];
  const owned = ownedIds.includes(selected.id);
  const canSummon = !owned && essence >= essenceGoal;
  const stats = statsAtLevel(selected, rarityStartLevel.Demonic);
  const signature = learnsetFor(selected).find((entry) => entry.move.signature)?.move;
  const summon = () => {
    if (!canSummon) {
      playSound('error');
      return;
    }
    onSummon(selected.id);
    setRitual(selected);
    playSound('demonEssence');
    haptic('heavy');
    ritualValue.setValue(0);
    Animated.timing(ritualValue, { toValue: 1, duration: 2300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  const close = () => { playSound('back'); setRitual(null); onClose(); };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={close}>
      <View style={s.root}>
        <LinearGradient colors={['#1E030A', '#0A0206', '#000000']} style={s.fill} />
        <View style={[s.portal, { left: (width - width * 1.15) / 2 }]} pointerEvents="none">
          <BlackHole size={width * 1.15} variant="crimson" speed={0.55} tilt={-6} intensity={0.9} />
        </View>
        <SafeAreaView style={s.flex}>
          <View style={s.header}>
            <Pressable onPress={close} style={s.back}><Text style={s.backText}>‹</Text></Pressable>
            <View style={s.flex}>
              <Text style={s.title}>{t('altar.title')}</Text>
            </View>
            <View style={s.wallet}><EssenceIcon size={20} /><Text style={s.walletText}>{essence}/{essenceGoal}</Text></View>
          </View>
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            <View style={s.cards}>
              {demonCards.map((card) => {
                const isOwned = ownedIds.includes(card.id);
                const active = card.id === selectedId;
                return (
                  <Pressable key={card.id} onPress={() => { playSound('toggle'); setSelectedId(card.id); }} style={[s.cardWrap, active && s.cardActive]}>
                    <MiniCard card={card} />
                    {isOwned && <View style={s.ownedBadge}><Text style={s.ownedText}>✓</Text></View>}
                  </Pressable>
                );
              })}
            </View>
            <View style={s.detail}>
              <View style={s.detailMeta}>
                <Text style={[s.detailName, s.flex]}>{selected.name}</Text>
                <TypeChip type={typeForCard(selected)} />
              </View>
              <View style={s.statRow}>
                {(['hp', 'attack', 'defense', 'speed'] as const).map((key) => (
                  <View key={key} style={s.stat}><Text style={s.statLabel}>{t(tk(`stat.${key}`))}</Text><Text style={s.statValue}>{stats[key]}</Text></View>
                ))}
              </View>
              {signature && <View style={s.signature}><Text style={s.signatureLabel}>{t('altar.signature')}</Text><Text style={s.signatureName}>{signature.name}</Text></View>}
            </View>
            <Pressable onPress={summon} style={({ pressed }) => [s.summon, !canSummon && s.summonLocked, pressed && canSummon && s.pressed]}>
              <Text style={[s.summonText, !canSummon && s.summonTextLocked]}>
                {owned ? t('altar.alreadyAwakened') : canSummon ? t('altar.awaken', { name: selected.name.toUpperCase(), cost: essenceGoal }) : t('altar.needEssence', { count: essenceGoal - essence })}
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>

        {ritual && (
          <Pressable style={s.ritual} onPress={close}>
            <View style={[s.ritualHole, { left: (width - width * 1.3) / 2 }]} pointerEvents="none"><BlackHole size={width * 1.3} variant="crimson" speed={4} intensity={1.2} tilt={-6} /></View>
            <Animated.View pointerEvents="none" style={[s.flash, { opacity: ritualValue.interpolate({ inputRange: [0, 0.12, 0.45], outputRange: [0, 0.95, 0] }) }]} />
            <Animated.View style={{ alignItems: 'center', opacity: ritualValue.interpolate({ inputRange: [0.15, 0.3], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: ritualValue.interpolate({ inputRange: [0.15, 0.45, 0.65, 1], outputRange: [0.2, 1.25, 0.95, 1], extrapolate: 'clamp' }) }] }}>
              <MiniCard card={ritual} large />
            </Animated.View>
            <Animated.Text style={[s.ritualTitle, { opacity: ritualValue.interpolate({ inputRange: [0.45, 0.7], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>{t('altar.awakens', { name: ritual.name.toUpperCase() })}</Animated.Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  portal: { position: 'absolute', top: -60, opacity: 0.75 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(60,10,24,.8)', alignItems: 'center', justifyContent: 'center' },
  backText: { color: palette.text, fontSize: 30, lineHeight: 32 },
  kicker: { color: '#FF8A9A', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: '#FFF1F3', fontSize: 22, fontWeight: '900', letterSpacing: 1, textShadowColor: '#FF2E4D', textShadowRadius: 12 },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(40,6,16,.85)', borderWidth: 1, borderColor: '#7A1E36', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6 },
  walletText: { color: '#FFD0D8', fontSize: 11, fontWeight: '900' },
  content: { padding: 18, paddingTop: 150, paddingBottom: 50, gap: 14 },
  copy: { color: '#E8C8D0', fontSize: 11.5, lineHeight: 17, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 6 },
  cards: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  cardWrap: { borderRadius: 16, padding: 4, borderWidth: 2, borderColor: 'transparent' },
  cardActive: { borderColor: '#FF4D6D', backgroundColor: 'rgba(80,8,24,.55)', transform: [{ translateY: -4 }] },
  ownedBadge: { position: 'absolute', right: -4, top: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#E0223F', borderWidth: 2, borderColor: '#FFD0D8', alignItems: 'center', justifyContent: 'center' },
  ownedText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  detail: { backgroundColor: 'rgba(24,4,12,.88)', borderRadius: 20, borderWidth: 1, borderColor: '#7A1E36', padding: 16, gap: 8 },
  detailName: { color: '#FFF1F3', fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  detailMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rarity: { color: '#FF8A9A', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  lore: { color: '#D8B8C2', fontSize: 11, lineHeight: 16, fontStyle: 'italic' },
  statRow: { flexDirection: 'row', gap: 6 },
  stat: { flex: 1, alignItems: 'center', backgroundColor: '#1A0610', borderRadius: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#3E1020' },
  statLabel: { color: '#B98A98', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 },
  statValue: { color: '#FFE3E8', fontSize: 14, fontWeight: '900', marginTop: 2 },
  signature: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2A0614', borderRadius: 10, padding: 9 },
  signatureLabel: { color: '#B98A98', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  signatureName: { color: '#FFD0D8', fontSize: 12, fontWeight: '900' },
  summon: { backgroundColor: '#E0223F', borderRadius: 16, borderBottomWidth: 4, borderBottomColor: '#6A0A1E', paddingVertical: 16, alignItems: 'center' },
  summonLocked: { backgroundColor: '#2A0E18', borderBottomColor: '#160810' },
  summonText: { color: '#FFF1F3', fontSize: 13, fontWeight: '900', letterSpacing: 0.8, textAlign: 'center' },
  summonTextLocked: { color: '#B98A98', fontSize: 11 },
  warning: { color: '#9A7A86', fontSize: 9.5, textAlign: 'center' },
  ritual: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,.92)', alignItems: 'center', justifyContent: 'center' },
  ritualHole: { position: 'absolute', top: '18%' },
  flash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFD0D8' },
  ritualTitle: { color: '#FFF1F3', fontSize: 26, fontWeight: '900', letterSpacing: 1.5, marginTop: 26, textAlign: 'center', paddingHorizontal: 20, textShadowColor: '#FF2E4D', textShadowRadius: 18 },
  ritualHint: { position: 'absolute', bottom: 60, color: '#B98A98', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
});

import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '../../data/catalog';
import { Cosmetic } from '../../game/cosmetics';
import { useI18n } from '../../i18n';
import { GameButton, palette } from '../common';
import { cosmeticKindLabel } from './cosmeticText';
import { PlayerAvatar } from './PlayerAvatar';
import { ProfileBanner } from './ProfileBanner';
import { GoldenTitleText, TitleLabel, isShinyTitle } from './ProfileModal';

export function CosmeticUnlockModal({ cosmetic, avatarCard, onEquip, onLater }: { cosmetic: Cosmetic | null; avatarCard: Card | null; onEquip: () => void; onLater: () => void }) {
  const { t } = useI18n();
  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!cosmetic) return;
    reveal.setValue(0);
    Animated.spring(reveal, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
  }, [cosmetic?.kind, cosmetic?.id]);
  return (
    <Modal visible={Boolean(cosmetic)} transparent animationType="fade" onRequestClose={onLater}>
      <Pressable style={styles.backdrop} onPress={onLater}>
        {cosmetic && (
          <Animated.View style={[styles.card, { borderColor: cosmetic.color, opacity: reveal, transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}>
            <Text style={styles.sparkles}>✦  ✧  ✦</Text>
            <Text style={[styles.kicker, { color: cosmetic.color }]}>{t('cosmetic.unlockedKicker', { kind: cosmeticKindLabel(t, cosmetic) })}</Text>
            <View style={styles.preview}>
              {cosmetic.kind === 'banner' && <View style={styles.bannerPreview}><ProfileBanner id={cosmetic.id} radius={16} shade={false} /></View>}
              {cosmetic.kind === 'frame' && <PlayerAvatar card={avatarCard} size={96} frameId={cosmetic.id} />}
              {cosmetic.kind === 'title' && <View style={styles.titlePreview}>{isShinyTitle(cosmetic.special) ? <GoldenTitleText label={cosmetic.name} variant={cosmetic.special} /> : <TitleLabel cosmetic={cosmetic} />}</View>}
            </View>
            <Text style={styles.name}>{cosmetic.name}</Text>
            <GameButton label={t('cosmetic.equipNow')} color="#C99219" deep="#8A6212" onPress={onEquip} style={styles.button} />
            <Pressable onPress={onLater} style={styles.later}><Text style={styles.laterText}>{t('cosmetic.later')}</Text></Pressable>
          </Animated.View>
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8,5,22,.8)', justifyContent: 'center', padding: 26 },
  card: { backgroundColor: palette.panel, borderRadius: 28, borderWidth: 2, padding: 22, alignItems: 'center' },
  sparkles: { color: palette.gold, fontSize: 16, textShadowColor: '#FFF2A7', textShadowRadius: 10 },
  kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.3, marginTop: 8, textAlign: 'center' },
  preview: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', minHeight: 110, marginTop: 14 },
  bannerPreview: { alignSelf: 'stretch', height: 110, borderRadius: 16, overflow: 'hidden' },
  titlePreview: { backgroundColor: '#1E1733', borderRadius: 14, paddingHorizontal: 22, paddingVertical: 18, borderWidth: 1, borderColor: '#4C3B70' },
  name: { color: palette.text, fontSize: 22, fontWeight: '900', marginTop: 14, textAlign: 'center' },
  button: { alignSelf: 'stretch', marginTop: 16 },
  later: { padding: 10, marginTop: 2 },
  laterText: { color: palette.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});

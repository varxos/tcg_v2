import MaskedView from '@react-native-masked-view/masked-view';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { playSound } from '../../audio/sound';
import { Card, Rarity } from '../../data/catalog';
import { Cosmetic, CosmeticContext, banners, frames, isUnlocked, ruleProgress, titles } from '../../game/cosmetics';
import { useI18n } from '../../i18n';
import { AnimatedBar, CreatureAvatar, InfoButton, palette } from '../common';
import { haptic } from '../feedback';
import { unlockText } from './cosmeticText';
import { PlayerAvatar } from './PlayerAvatar';
import { ProfileBanner } from './ProfileBanner';

const rarityRank: Record<Rarity, number> = { Common: 0, Rare: 1, 'Very Rare': 2, Epic: 3, Legendary: 4, Angelic: 5, Demonic: 5 };
type PickerId = 'avatar' | 'title' | 'banner' | 'frame';

// Shining titles: a masked label with a light sweeping across it.
const shinePalettes = {
  golden: { base: '#42B9D6', colors: ['transparent', '#FFFEE4', '#FFFFFF', '#8DEBFF', 'transparent'] as const },
  demon: { base: '#B3162F', colors: ['transparent', '#FFD0D8', '#FFFFFF', '#FF6B7E', 'transparent'] as const },
};
export const isShinyTitle = (special?: string): special is 'golden' | 'demon' => special === 'golden' || special === 'demon';

export function GoldenTitleText({ label, width = 240, variant = 'golden' }: { label: string; width?: number; variant?: 'golden' | 'demon' }) {
  const palette = shinePalettes[variant];
  const shine = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(shine, { toValue: 1, duration: 1550, easing: Easing.linear, useNativeDriver: true }), Animated.delay(260)]));
    shine.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [shine]);
  const translateX = shine.interpolate({ inputRange: [0, 1], outputRange: [-width, width] });
  return (
    <MaskedView style={[styles.goldenMask, { width }]} maskElement={<Text style={styles.goldenMaskText}>✦ {label} ✦</Text>}>
      <View style={[styles.goldenBase, { backgroundColor: palette.base }]} />
      <Animated.View style={[styles.goldenRail, { width: width * 0.55, transform: [{ translateX }] }]}>
        <LinearGradient colors={[...palette.colors]} locations={[0, 0.28, 0.48, 0.68, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fill} />
      </Animated.View>
    </MaskedView>
  );
}

export function TitleLabel({ cosmetic, dim = false }: { cosmetic: Cosmetic; dim?: boolean }) {
  return <Text style={[styles.titleLabel, { color: dim ? '#777082' : cosmetic.color }, !dim && cosmetic.special === 'beta' && styles.titleBeta, !dim && cosmetic.special === 'golden' && styles.titleGolden, !dim && cosmetic.special === 'void' && styles.titleVoid]}>{cosmetic.name}</Text>;
}

// Corner badge: a check on the equipped cosmetic, a padlock on locked ones.
function StateBadge({ equipped, unlocked }: { equipped: boolean; unlocked: boolean }) {
  if (equipped) return <View style={[styles.badge, styles.badgeEquipped]}><Text style={styles.badgeText}>✓</Text></View>;
  if (!unlocked) return <View style={[styles.badge, styles.badgeLocked]}><Text style={styles.badgeLockText}>🔒</Text></View>;
  return null;
}

// How to unlock a cosmetic: only shown once the player taps a locked entry.
function UnlockHint({ cosmetic, ctx }: { cosmetic: Cosmetic; ctx: CosmeticContext }) {
  const { t } = useI18n();
  const { value, target } = ruleProgress(cosmetic.rule, ctx);
  return (
    <View style={styles.lockBlock}>
      <Text style={styles.lockText}>{unlockText(t, cosmetic)}</Text>
      {target > 1 && <View style={styles.lockProgress}><View style={styles.flex}><AnimatedBar ratio={value / target} color={cosmetic.color} height={4} track="#1B1630" /></View><Text style={styles.lockCount}>{value}/{target}</Text></View>}
    </View>
  );
}

// Collapsed row showing the equipped choice; tapping it unfolds every option.
function Picker({ label, name, preview, open, onToggle, children }: { label: string; name: string; preview: ReactNode; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <View style={[styles.picker, open && styles.pickerOpen]}>
      <Pressable onPress={onToggle} style={({ pressed }) => [styles.pickerHead, pressed && styles.pressed]}>
        <View style={styles.pickerPreview}>{preview}</View>
        <View style={styles.flex}>
          <Text style={styles.pickerLabel}>{label}</Text>
          <Text style={styles.pickerName} numberOfLines={1}>{name}</Text>
        </View>
        <Text style={[styles.pickerChevron, open && styles.pickerChevronOpen]}>›</Text>
      </Pressable>
      {open && <View style={styles.pickerBody}>{children}</View>}
    </View>
  );
}

export function ProfileModal({ visible, onClose, onOpenSettings, playerName, onRename, playerId, avatarCard, ownedCards, onSelectAvatar, titleId, bannerId, frameId, onSelectTitle, onSelectBanner, onSelectFrame, cosmeticCtx, discovered, totalCreatures, opened, sigils, totalSigils, wins, bestLevel, deckCards, deckSaved, goldenIds }: {
  visible: boolean; onClose: () => void; onOpenSettings: () => void; playerName: string; onRename: (name: string) => void; playerId: string;
  avatarCard: Card | null; ownedCards: Card[]; onSelectAvatar: (cardId: string) => void;
  titleId: string; bannerId: string; frameId: string; onSelectTitle: (id: string) => void; onSelectBanner: (id: string) => void; onSelectFrame: (id: string) => void;
  cosmeticCtx: CosmeticContext; discovered: number; totalCreatures: number; opened: number; sigils: number; totalSigils: number; wins: number; bestLevel: number;
  deckCards: Card[]; deckSaved: boolean; goldenIds: Set<string>;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(playerName);
  const [copied, setCopied] = useState(false);
  const [openPicker, setOpenPicker] = useState<PickerId | null>(null);
  const [hintId, setHintId] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const title = titles.find((entry) => entry.id === titleId && isUnlocked(entry, cosmeticCtx)) ?? titles[0];
  const banner = banners.find((entry) => entry.id === bannerId) ?? banners[0];
  const frame = frames.find((entry) => entry.id === frameId) ?? frames[0];
  const sortedOwned = [...ownedCards].sort((a, b) => rarityRank[b.rarity] - rarityRank[a.rarity]);
  const togglePicker = (id: PickerId) => {
    playSound(openPicker === id ? 'back' : 'tap');
    setHintId(null);
    setOpenPicker((current) => (current === id ? null : id));
  };
  const save = () => {
    const name = draft.trim().slice(0, 18);
    if (name) onRename(name);
    setEditing(false);
    playSound('toggle');
  };
  const copyId = async () => {
    await Clipboard.setStringAsync(playerId);
    setCopied(true);
    playSound('tap');
    haptic('light');
    setTimeout(() => setCopied(false), 1500);
  };
  const equip = (cosmetic: Cosmetic, action: (id: string) => void) => {
    if (!isUnlocked(cosmetic, cosmeticCtx)) {
      playSound('tap');
      setHintId((current) => (current === cosmetic.id ? null : cosmetic.id));
      return;
    }
    setHintId(null);
    playSound('toggle');
    haptic('light');
    action(cosmetic.id);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View><Text style={styles.title}>{t('profile.title')}</Text></View>
          <View style={styles.headerActions}>
            <Pressable onPress={() => { playSound('tap'); onOpenSettings(); }} style={styles.iconButton} accessibilityLabel={t('profile.settings')}><Text style={styles.iconButtonText}>⚙</Text></Pressable>
            <Pressable onPress={() => { playSound('back'); onClose(); }} style={styles.iconButton}><Text style={styles.closeText}>×</Text></Pressable>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <ProfileBanner id={bannerId} radius={24} />
            <PlayerAvatar card={avatarCard} size={100} frameId={frameId} />
            <View style={styles.nameRow}>
              {editing
                ? <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={save} autoFocus maxLength={18} selectTextOnFocus style={styles.nameInput} />
                : <Text style={styles.name} numberOfLines={1}>{playerName}</Text>}
              <Pressable onPress={editing ? save : () => { setDraft(playerName); setEditing(true); playSound('tap'); }} style={styles.editButton} hitSlop={8}><Text style={styles.editText}>{editing ? '✓' : '✎'}</Text></Pressable>
            </View>
            <Pressable onPress={() => void copyId()} hitSlop={8}><Text style={styles.playerId}>{copied ? t('profile.copied') : playerId}</Text></Pressable>
            <View style={styles.titleStage}>{isShinyTitle(title.special) ? <GoldenTitleText label={title.name} variant={title.special} /> : <TitleLabel cosmetic={title} />}</View>
            {statsOpen && <>
              <Text style={styles.meta}>{t('profile.discovered', { count: discovered, total: totalCreatures, opened })}</Text>
              <Text style={styles.meta}>{t('profile.record', { sigils, totalSigils, wins, level: bestLevel })}</Text>
            </>}
            <View style={styles.heroInfo}><InfoButton color="#E3DAF0" onPress={() => setStatsOpen((value) => !value)} /></View>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}><Text style={styles.panelTitle}>{t('profile.mainDeck')}</Text><Text style={styles.panelCount}>{deckCards.length}/5</Text></View>
            <View style={styles.deckSlots}>
              {Array.from({ length: 5 }, (_, index) => {
                const card = deckCards[index];
                return <View key={card?.id ?? `slot-${index}`} style={[styles.deckSlot, card && styles.deckSlotFilled]}>{card ? <CreatureAvatar card={card} size={36} ring={goldenIds.has(card.id) ? '#FFD54A' : undefined} /> : <Text style={styles.deckEmpty}>+</Text>}</View>;
              })}
            </View>
          </View>

          {sortedOwned.length > 0 && (
            <Picker label={t('profile.avatar')} name={avatarCard?.name ?? '—'} open={openPicker === 'avatar'} onToggle={() => togglePicker('avatar')}
              preview={avatarCard ? <CreatureAvatar card={avatarCard} size={40} ring={goldenIds.has(avatarCard.id) ? '#FFD54A' : undefined} /> : <PlayerAvatar card={null} size={40} />}>
              <View style={styles.avatarGrid}>
                {sortedOwned.map((card) => {
                  const selected = avatarCard?.id === card.id;
                  return (
                    <Pressable key={card.id} onPress={() => { playSound('toggle'); haptic('light'); onSelectAvatar(card.id); }} style={[styles.avatarChoice, selected && styles.avatarChoiceActive]}>
                      <CreatureAvatar card={card} size={50} ring={goldenIds.has(card.id) ? '#FFD54A' : undefined} />
                      {selected && <View style={styles.avatarCheck}><Text style={styles.avatarCheckText}>✓</Text></View>}
                    </Pressable>
                  );
                })}
              </View>
            </Picker>
          )}

          <Picker label={t('profile.titles')} name={title.name} open={openPicker === 'title'} onToggle={() => togglePicker('title')}
            preview={<Text style={[styles.pickerGlyph, { color: title.color }]}>❝</Text>}>
            {titles.map((entry) => {
              const unlocked = isUnlocked(entry, cosmeticCtx);
              const equipped = entry.id === title.id;
              return (
                <Pressable key={entry.id} onPress={() => equip(entry, onSelectTitle)} style={[styles.choice, equipped && styles.choiceActive, !unlocked && styles.choiceLocked]}>
                  <View style={styles.choiceTop}>
                    <View style={styles.flex}>{isShinyTitle(entry.special) && unlocked ? <GoldenTitleText label={entry.name} variant={entry.special} width={200} /> : <TitleLabel cosmetic={entry} dim={!unlocked} />}</View>
                    <StateBadge equipped={equipped} unlocked={unlocked} />
                  </View>
                  {hintId === entry.id && <UnlockHint cosmetic={entry} ctx={cosmeticCtx} />}
                </Pressable>
              );
            })}
          </Picker>

          <Picker label={t('profile.banners')} name={banner.name} open={openPicker === 'banner'} onToggle={() => togglePicker('banner')}
            preview={<View style={styles.pickerBanner}><ProfileBanner id={bannerId} radius={8} shade={false} /></View>}>
            <View style={styles.grid}>
              {banners.map((entry) => {
                const unlocked = isUnlocked(entry, cosmeticCtx);
                const equipped = entry.id === bannerId;
                return (
                  <Pressable key={entry.id} onPress={() => equip(entry, onSelectBanner)} style={[styles.bannerChoice, equipped && styles.choiceActive]}>
                    <View style={[styles.bannerPreview, !unlocked && styles.previewLocked]}><ProfileBanner id={entry.id} radius={10} shade={false} /></View>
                    <View style={styles.choiceTop}>
                      <Text style={[styles.bannerName, { color: unlocked ? palette.text : '#8F82A8' }]} numberOfLines={1}>{entry.name}</Text>
                      <StateBadge equipped={equipped} unlocked={unlocked} />
                    </View>
                    {hintId === entry.id && <UnlockHint cosmetic={entry} ctx={cosmeticCtx} />}
                  </Pressable>
                );
              })}
            </View>
          </Picker>

          <Picker label={t('profile.frames')} name={frame.name} open={openPicker === 'frame'} onToggle={() => togglePicker('frame')}
            preview={<PlayerAvatar card={avatarCard} size={40} frameId={frameId} />}>
            <View style={styles.grid}>
              {frames.map((entry) => {
                const unlocked = isUnlocked(entry, cosmeticCtx);
                const equipped = entry.id === frameId;
                return (
                  <Pressable key={entry.id} onPress={() => equip(entry, onSelectFrame)} style={[styles.frameChoice, equipped && styles.choiceActive, !unlocked && styles.choiceLocked]}>
                    <View style={!unlocked && styles.previewLocked}><PlayerAvatar card={avatarCard} size={50} frameId={entry.id} /></View>
                    <Text style={[styles.frameName, { color: unlocked ? entry.color : '#8F82A8' }]} numberOfLines={1}>{entry.name}</Text>
                    <View style={styles.frameBadge}><StateBadge equipped={equipped} unlocked={unlocked} /></View>
                    {hintId === entry.id && <UnlockHint cosmetic={entry} ctx={cosmeticCtx} />}
                  </Pressable>
                );
              })}
            </View>
          </Picker>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 15, borderBottomColor: '#413260', borderBottomWidth: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  title: { color: palette.text, fontSize: 24, fontWeight: '900', letterSpacing: 0.8 },
  iconButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.panel, alignItems: 'center', justifyContent: 'center' },
  iconButtonText: { color: '#E6DAF6', fontSize: 19 },
  closeText: { color: palette.text, fontSize: 28, lineHeight: 30 },
  content: { padding: 20, paddingBottom: 45, gap: 12 },
  hero: { alignItems: 'center', borderRadius: 24, borderWidth: 1, borderColor: '#7663A2', paddingVertical: 24, paddingHorizontal: 18, overflow: 'hidden' },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 8, maxWidth: '100%' },
  name: { color: palette.text, fontSize: 19, fontWeight: '900', textShadowColor: '#0B0818', textShadowRadius: 6, flexShrink: 1 },
  nameInput: { minWidth: 160, maxWidth: 220, color: palette.text, fontSize: 18, fontWeight: '900', paddingVertical: 0, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#AEEBFF' },
  editButton: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(79,61,109,.9)', borderWidth: 1, borderColor: '#9D87C1' },
  editText: { color: '#D7F6FF', fontSize: 14, fontWeight: '900' },
  playerId: { color: '#C9D6EE', fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginTop: 4, textShadowColor: '#0B0818', textShadowRadius: 4 },
  titleStage: { height: 26, marginTop: 6, alignItems: 'center', justifyContent: 'center' },
  titleLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1, textShadowColor: '#0B0818', textShadowRadius: 4 },
  titleBeta: { textShadowColor: '#FFB0B7', textShadowRadius: 8 },
  titleGolden: { textShadowColor: '#FFF4A8', textShadowRadius: 9 },
  titleVoid: { textShadowColor: '#FF2E4D', textShadowRadius: 10 },
  goldenMask: { height: 26, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  goldenMaskText: { color: '#000000', fontSize: 12.5, fontWeight: '900', letterSpacing: 1.1, textAlign: 'center' },
  goldenBase: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#42B9D6' },
  goldenRail: { position: 'absolute', top: 0, left: 0, height: 26 },
  meta: { color: '#E3DAF0', fontSize: 9.5, textAlign: 'center', marginTop: 6, textShadowColor: '#0B0818', textShadowRadius: 4 },
  panel: { backgroundColor: '#2B2544', borderColor: '#60517D', borderWidth: 1, borderRadius: 18, padding: 13 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { color: palette.text, fontSize: 13, fontWeight: '900', marginTop: 2 },
  panelCount: { color: palette.cyan, fontSize: 12, fontWeight: '900' },
  deckSlots: { flexDirection: 'row', gap: 5, marginTop: 11 },
  deckSlot: { flex: 1, minHeight: 62, borderRadius: 10, backgroundColor: '#211B34', borderColor: '#514667', borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 4 },
  deckSlotFilled: { backgroundColor: '#34495D', borderColor: '#79C6DE' },
  deckEmpty: { color: '#766A85', fontSize: 17 },
  avatarChoice: { padding: 3, borderRadius: 34, borderWidth: 2, borderColor: 'transparent' },
  avatarChoiceActive: { borderColor: palette.gold },
  avatarCheck: { position: 'absolute', right: 0, bottom: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: '#49A77A', borderWidth: 1.5, borderColor: '#D3F8BE', alignItems: 'center', justifyContent: 'center' },
  avatarCheckText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  choice: { backgroundColor: '#2A2441', borderRadius: 13, borderColor: '#5B4E70', borderWidth: 1, padding: 11 },
  choiceActive: { borderColor: palette.gold, borderWidth: 2, backgroundColor: '#3B3158' },
  choiceLocked: { backgroundColor: '#221D35' },
  lockBlock: { marginTop: 4 },
  lockText: { color: '#A99DBA', fontSize: 9, lineHeight: 13 },
  lockProgress: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  lockCount: { color: '#DCD2ED', fontSize: 8, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bannerChoice: { flexGrow: 1, flexBasis: '44%', backgroundColor: '#2A2441', borderRadius: 13, borderColor: '#5B4E70', borderWidth: 1, padding: 8 },
  bannerPreview: { height: 64, borderRadius: 10, overflow: 'hidden', backgroundColor: '#1B1630' },
  previewLocked: { opacity: 0.35 },
  pressed: { opacity: 0.75 },
  heroInfo: { position: 'absolute', top: 12, right: 12 },
  picker: { backgroundColor: '#2A2441', borderRadius: 16, borderColor: '#5B4E70', borderWidth: 1, overflow: 'hidden' },
  pickerOpen: { borderColor: '#8C78B4', backgroundColor: '#262038' },
  pickerHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, minHeight: 64 },
  pickerPreview: { width: 64, height: 44, alignItems: 'center', justifyContent: 'center' },
  pickerBanner: { width: 64, height: 40, borderRadius: 8, overflow: 'hidden', backgroundColor: '#1B1630' },
  pickerGlyph: { fontSize: 26, fontWeight: '900', textShadowColor: '#0B0818', textShadowRadius: 4 },
  pickerLabel: { color: '#AFA1C8', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  pickerName: { color: palette.text, fontSize: 13, fontWeight: '900', marginTop: 2 },
  pickerChevron: { color: '#CDBBE0', fontSize: 22, fontWeight: '900', width: 18, textAlign: 'center', transform: [{ rotate: '90deg' }] },
  pickerChevronOpen: { transform: [{ rotate: '-90deg' }] },
  pickerBody: { borderTopWidth: 1, borderTopColor: '#3F3458', padding: 10, gap: 7 },
  choiceTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeEquipped: { backgroundColor: '#49A77A', borderWidth: 1.5, borderColor: '#D3F8BE' },
  badgeLocked: { backgroundColor: '#1B1630' },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  badgeLockText: { fontSize: 9 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bannerName: { flex: 1, fontSize: 10.5, fontWeight: '900' },
  frameChoice: { flexGrow: 1, flexBasis: '30%', alignItems: 'center', backgroundColor: '#2A2441', borderRadius: 13, borderColor: '#5B4E70', borderWidth: 1, paddingTop: 16, paddingBottom: 9, paddingHorizontal: 6 },
  frameName: { fontSize: 10, fontWeight: '900', marginTop: 10, textAlign: 'center' },
  frameBadge: { position: 'absolute', top: 5, right: 5 },
});

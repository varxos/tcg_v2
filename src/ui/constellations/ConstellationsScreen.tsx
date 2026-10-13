import { ReactNode, useEffect, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { playSound } from '../../audio/sound';
import { rarityTheme } from '../../data/catalog';
import { CreatureArt } from '../creatures/CreatureArt';
import {
  Constellation, constellationProgress, constellations, groupCards, groupComplete, groupOwnedCount, ownsForGroup, starColors, starLabels, totalStars, totalStarsLit,
} from '../../game/constellations';
import { CosmeticContext, cosmeticsForConstellation, isUnlocked, ruleProgress } from '../../game/cosmetics';
import { tk, useI18n } from '../../i18n';
import { AnimatedBar, GameButton, InfoButton, palette } from '../common';
import { cosmeticKindLabel, unlockText } from '../profile/cosmeticText';
import { ConstellationSky } from './ConstellationSky';

const cardTotals = (constellation: Constellation, inventory: Record<string, number>) => constellation.groups.reduce((sum, group) => ({ owned: sum.owned + groupOwnedCount(group, inventory), total: sum.total + groupCards(group).length }), { owned: 0, total: 0 });

export function ConstellationsScreen({ header, inventory, claimedIds, cosmeticCtx, onOpen, horizonCard }: { header: ReactNode; inventory: Record<string, number>; claimedIds: string[]; cosmeticCtx: CosmeticContext; onOpen: (constellation: Constellation) => void; horizonCard?: ReactNode }) {
  const { t } = useI18n();
  const lit = totalStarsLit(inventory);
  const [info, setInfo] = useState(false);
  return (
    <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      {header}
      <View style={styles.summary}>
        <Text style={[styles.statValue, styles.flex]}>✦ {lit}/{totalStars}</Text>
        <InfoButton onPress={() => setInfo((value) => !value)} color="#FFE28D" />
      </View>
      {info && <Text style={styles.introCopy}>{t('constellations.copy')}</Text>}
      {horizonCard}
      {constellations.map((constellation) => {
        const progress = constellationProgress(constellation, inventory);
        const complete = progress === constellation.groups.length;
        const claimed = claimedIds.includes(constellation.id);
        const golden = Boolean(constellation.groups[0]?.golden);
        const totals = cardTotals(constellation, inventory);
        const cosmetics = cosmeticsForConstellation(constellation.id);
        return (
          <Pressable key={constellation.id} onPress={() => { playSound('tap'); onOpen(constellation); }} style={({ pressed }) => [styles.card, golden && styles.cardGolden, { borderColor: complete ? constellation.color : golden ? '#6E5626' : '#4B3F66' }, pressed && styles.pressed]}>
            <ConstellationSky constellation={constellation} inventory={inventory} width={92} height={104} mini />
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={[styles.cardIcon, { color: constellation.color }]}>{constellation.icon}</Text>
                <Text style={[styles.cardName, golden && { color: '#FFE9A1' }]} numberOfLines={1}>{constellation.name}</Text>
                {claimed ? <Text style={styles.stateClaimed}>✓</Text> : complete ? <View style={styles.stateReady}><Text style={styles.stateReadyText}>{t('common.claim')}</Text></View> : null}
              </View>
              <View style={styles.progressRow}><View style={styles.flex}><AnimatedBar ratio={totals.total ? totals.owned / totals.total : 0} color={constellation.color} height={6} /></View><Text style={styles.progressText}>{totals.owned}/{totals.total}</Text></View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ConstellationDetail({ constellation, inventory, claimed, cosmeticCtx, onClaim, onClose, overlay }: { constellation: Constellation | null; inventory: Record<string, number>; claimed: boolean; cosmeticCtx: CosmeticContext; onClaim: (constellation: Constellation) => void; onClose: () => void; overlay?: ReactNode }) {
  return (
    <Modal visible={Boolean(constellation)} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.detailScreen}>
        {constellation && <DetailBody key={constellation.id} constellation={constellation} inventory={inventory} claimed={claimed} cosmeticCtx={cosmeticCtx} onClaim={onClaim} onClose={onClose} />}
        {overlay}
      </SafeAreaView>
    </Modal>
  );
}

function DetailBody({ constellation, inventory, claimed, cosmeticCtx, onClaim, onClose }: { constellation: Constellation; inventory: Record<string, number>; claimed: boolean; cosmeticCtx: CosmeticContext; onClaim: (constellation: Constellation) => void; onClose: () => void }) {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const skyWidth = Math.min(width - 36, 520);
  const skyHeight = Math.round(skyWidth * 1.08);
  const firstIncomplete = constellation.groups.findIndex((group) => !groupComplete(group, inventory));
  const [selected, setSelected] = useState(firstIncomplete === -1 ? 0 : firstIncomplete);
  useEffect(() => { setSelected(firstIncomplete === -1 ? 0 : firstIncomplete); }, [constellation.id]);
  const progress = constellationProgress(constellation, inventory);
  const complete = progress === constellation.groups.length;
  const golden = Boolean(constellation.groups[0]?.golden);
  const group = constellation.groups[selected];
  const cards = groupCards(group);
  const owned = groupOwnedCount(group, inventory);
  const groupDone = owned === cards.length && cards.length > 0;
  const starColor = starColors[group.boosterId];
  const tileWidth = Math.floor((skyWidth - 28 - 3 * 8) / 4);
  const cosmetics = cosmeticsForConstellation(constellation.id);
  const remaining = constellation.groups.length - progress;

  return <>
    <View style={styles.detailHeader}>
      <Pressable onPress={() => { playSound('back'); onClose(); }} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
      <View style={styles.detailHeading}>
        <Text style={styles.detailTitle}>{constellation.name}</Text>
      </View>
      <Text style={[styles.detailProgress, { color: constellation.color }]}>{progress}/{constellation.groups.length}</Text>
    </View>
    <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
      <View style={styles.skyWrap}>
        <ConstellationSky constellation={constellation} inventory={inventory} width={skyWidth} height={skyHeight} selectedIndex={selected} onSelect={(index) => { playSound('tap'); setSelected(index); }} />
      </View>

      <View style={[styles.groupPanel, { borderColor: groupDone ? constellation.color : '#3E4E6E' }]}>
        <View style={styles.groupTop}>
          <Text style={[styles.groupStar, { color: groupDone ? constellation.color : starColor }]}>{groupDone ? '✦' : '✧'}</Text>
          <View style={styles.flex}>
            <Text style={[styles.groupName, { color: starColor }]}>{t('constellations.star', { star: starLabels[group.boosterId] })}</Text>
            <Text style={styles.groupRarity}>{golden ? `${t('constellations.golden')} ` : ''}{t(tk(`rarity.${group.rarity}`)).toUpperCase()}</Text>
          </View>
          <Text style={[styles.groupCount, { color: groupDone ? constellation.color : palette.text }]}>{owned}/{cards.length}</Text>
        </View>
        <View style={styles.groupBar}><AnimatedBar ratio={cards.length ? owned / cards.length : 0} color={groupDone ? constellation.color : starColor} height={6} /></View>
        <View style={styles.tiles}>
          {cards.map((card) => {
            const has = ownsForGroup(group, inventory, card);
            const secret = !has && (card.rarity === 'Legendary' || card.rarity === 'Angelic');
            return (
              <View key={card.id} style={[styles.tile, { width: tileWidth }, has && { borderColor: golden ? '#FFD54A' : rarityTheme[card.rarity].color }]}>
                <View style={[styles.tileArt, { height: tileWidth }]}>
                  {secret ? <Text style={styles.tileIcon}>?</Text> : <CreatureArt card={card} size={tileWidth} dim={!has} />}
                  {has && <View style={styles.tileCheck}><Text style={styles.tileCheckText}>✓</Text></View>}
                </View>
                <Text style={[styles.tileName, !has && styles.tileNameLocked]} numberOfLines={1}>{secret ? '???' : card.name}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.reward, complete && !claimed && { borderColor: palette.gold, backgroundColor: '#3E3220' }]}>
        <Text style={styles.rewardValue}>{t('constellations.celestiReward', { amount: constellation.reward })}</Text>
        {cosmetics.map((cosmetic) => {
          const unlocked = isUnlocked(cosmetic, cosmeticCtx);
          const { value, target } = ruleProgress(cosmetic.rule, cosmeticCtx);
          return (
            <View key={`${cosmetic.kind}-${cosmetic.id}`} style={[styles.cosmeticRow, { borderColor: unlocked ? '#4E7A64' : cosmetic.color }]}>
              <Text style={[styles.cosmeticIcon, { color: unlocked ? '#9EF0B8' : cosmetic.color }]}>{unlocked ? '✓' : cosmetic.kind === 'title' ? '✦' : cosmetic.kind === 'banner' ? '▰' : '◉'}</Text>
              <Text style={[styles.cosmeticName, styles.flex, { color: cosmetic.special === 'golden' ? '#76DFFF' : cosmetic.color }]}>{cosmetic.name}</Text>
              {!unlocked && cosmetic.rule.kind === 'allGolden' && <Text style={styles.cosmeticCount}>{value}/{target}</Text>}
            </View>
          );
        })}
        {claimed ? <Text style={styles.rewardClaimed}>✓</Text> : complete && <GameButton label={t('constellations.claimReward')} sound={null} color="#C99219" deep="#8A6212" onPress={() => onClaim(constellation)} style={styles.rewardButton} />}
      </View>
    </ScrollView>
  </>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
  screen: { padding: 20, paddingBottom: 104, gap: 12 },
  intro: { backgroundColor: '#392A5C', borderWidth: 1, borderColor: '#7760A0', borderRadius: 22, padding: 18 },
  summary: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2146', borderWidth: 1, borderColor: '#5E4B84', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  introKicker: { color: '#FFE28D', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  introTitle: { color: palette.text, fontSize: 24, fontWeight: '900', marginTop: 5 },
  introCopy: { color: '#D7CDE9', fontSize: 11, lineHeight: 16, marginTop: 6 },
  stats: { flexDirection: 'row', alignItems: 'center', marginTop: 15, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#5E4B84' },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 26, backgroundColor: '#5E4B84' },
  statValue: { color: '#FFF1A1', fontSize: 16, fontWeight: '900' },
  statLabel: { color: '#C7BADD', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.5, marginTop: 2, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#241F3E', borderRadius: 20, borderWidth: 1.5, padding: 10 },
  cardGolden: { backgroundColor: '#352A17' },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardIcon: { fontSize: 17, fontWeight: '900' },
  cardName: { flex: 1, color: palette.text, fontSize: 14, fontWeight: '900' },
  stateClaimed: { color: '#9EF0B8', fontSize: 14, fontWeight: '900' },
  stateReady: { backgroundColor: '#C99219', borderRadius: 7, paddingHorizontal: 6, paddingVertical: 2 },
  stateReadyText: { color: '#FFF9E8', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 },
  cardCopy: { color: '#C7BDD7', fontSize: 9.5, lineHeight: 13, marginTop: 3 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 },
  progressText: { color: '#E8DDF6', fontSize: 8.5, fontWeight: '900' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  cardMeta: { color: '#A99DBA', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 },
  cardReward: { color: palette.gold, fontSize: 9, fontWeight: '900' },
  cosmeticLine: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  cosmeticTag: { fontSize: 7, fontWeight: '900', letterSpacing: 0.4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1.5, overflow: 'hidden' },
  chevron: { color: '#C9BADD', fontSize: 24, marginLeft: -2 },
  detailScreen: { flex: 1, backgroundColor: '#0B1026' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderBottomColor: '#28345A', borderBottomWidth: 1 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#232B4E', alignItems: 'center', justifyContent: 'center' },
  backText: { color: palette.text, fontSize: 31, lineHeight: 33 },
  detailHeading: { flex: 1, marginLeft: 10 },
  detailKicker: { fontSize: 7.5, fontWeight: '900', letterSpacing: 0.9 },
  detailTitle: { color: palette.text, fontSize: 20, fontWeight: '900', marginTop: 2 },
  detailProgress: { fontSize: 15, fontWeight: '900' },
  detailContent: { padding: 18, paddingBottom: 44, alignItems: 'center' },
  lore: { color: '#AFB9D6', fontSize: 11, lineHeight: 16, fontStyle: 'italic', textAlign: 'center', marginBottom: 14, paddingHorizontal: 10 },
  skyWrap: { borderRadius: 26, borderWidth: 1, borderColor: '#2B4675', overflow: 'hidden' },
  skyHint: { color: '#7F8DAE', fontSize: 8, fontWeight: '900', letterSpacing: 1.1, marginTop: 9 },
  groupPanel: { alignSelf: 'stretch', marginTop: 14, backgroundColor: '#121C3A', borderRadius: 20, borderWidth: 1.5, padding: 14 },
  groupTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupStar: { fontSize: 28, fontWeight: '900' },
  groupName: { fontSize: 12, fontWeight: '900', letterSpacing: 0.9 },
  groupRarity: { color: '#B5C0DA', fontSize: 9, fontWeight: '800', marginTop: 2 },
  groupCount: { fontSize: 17, fontWeight: '900' },
  groupBar: { marginTop: 10 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tile: { borderRadius: 11, borderWidth: 1.5, borderColor: '#2C3A5C', backgroundColor: '#0D152C', overflow: 'hidden' },
  tileArt: { width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18223F' },
  tileImage: { position: 'absolute', width: '100%', height: '130%', top: '-8%' },
  tileImageLocked: { opacity: 0.18 },
  tileIcon: { color: '#6F7FA3', fontSize: 26, fontWeight: '900' },
  tileCheck: { position: 'absolute', right: 4, top: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#49A77A', alignItems: 'center', justifyContent: 'center' },
  tileCheckText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  tileName: { color: '#EAF1FF', fontSize: 7.5, fontWeight: '900', textAlign: 'center', paddingHorizontal: 3, paddingVertical: 5 },
  tileNameLocked: { color: '#6F7FA3' },
  reward: { alignSelf: 'stretch', marginTop: 14, backgroundColor: '#1D1B3A', borderRadius: 19, borderWidth: 1, borderColor: '#4B4470', padding: 16, alignItems: 'center' },
  rewardLabel: { color: '#C9B8DE', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  rewardValue: { color: palette.gold, fontSize: 20, fontWeight: '900', marginTop: 5 },
  cosmeticLabel: { alignSelf: 'flex-start', marginTop: 14, marginBottom: 6 },
  cosmeticRow: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 13, padding: 10, marginBottom: 6, backgroundColor: '#15142C' },
  cosmeticIcon: { fontSize: 18, fontWeight: '900', width: 22, textAlign: 'center' },
  cosmeticKind: { color: '#9F90BE', fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  cosmeticName: { fontSize: 13, fontWeight: '900', marginTop: 1 },
  cosmeticHint: { color: '#BFC6DE', fontSize: 9, lineHeight: 13, marginTop: 2 },
  cosmeticBar: { marginTop: 5 },
  cosmeticCount: { color: '#EAF1FF', fontSize: 10, fontWeight: '900' },
  rewardClaimed: { color: '#9EF0B8', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 12 },
  rewardButton: { alignSelf: 'stretch', marginTop: 12 },
});

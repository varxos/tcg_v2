import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playSound } from '../../audio/sound';
import { Card } from '../../data/catalog';
import { cosmeticsForStat, cosmeticsForWarden } from '../../game/cosmetics';
import { CreatureProgress, typeForCard, typeTheme } from '../../game/creatures';
import { Bag, itemOrder, items } from '../../game/items';
import { Warden, rematchReward, wardenAce, wardens } from '../../game/wardens';
import { tk, useI18n } from '../../i18n';
import { CreatureAvatar, GameButton, InfoButton, TypeChart, TypeChip, palette } from '../common';

export type SquadMember = { card: Card; progress: CreatureProgress; golden: boolean };

export function BattleHub({ header, squad, defeatedWardenIds, bag, ownedCount, wildWins, onWild, onWarden, onEditSquad, onOpenShop }: {
  header: ReactNode; squad: SquadMember[]; defeatedWardenIds: string[]; bag: Bag; ownedCount: number; wildWins: number;
  onWild: () => void; onWarden: (warden: Warden) => void; onEditSquad: () => void; onOpenShop: () => void;
}) {
  const { t } = useI18n();
  const [chartOpen, setChartOpen] = useState(false);
  const nextIndex = wardens.findIndex((warden) => !defeatedWardenIds.includes(warden.id));
  const next = nextIndex === -1 ? null : wardens[nextIndex];
  const levels = squad.map((member) => member.progress.level);
  const average = levels.length ? Math.round(levels.reduce((sum, level) => sum + level, 0) / levels.length) : 0;
  const top = levels.length ? Math.max(...levels) : 0;
  const canBattle = squad.length > 0;
  const sigils = wardens.filter((warden) => defeatedWardenIds.includes(warden.id)).length;
  const wildCosmetics = cosmeticsForStat('wildWins');
  const cosmeticLabel = (kind: string, name: string) => `${t(tk(`cosmetic.${kind}`))} · ${name}`;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        {header}
        <View style={styles.hero}>
          <View style={styles.rowBetween}>
            <Text style={styles.heroCount}>{sigils}/{wardens.length}</Text>
            <InfoButton onPress={() => setChartOpen(true)} color="#BCEFFF" />
          </View>
          <View style={styles.sigilRow}>
            {wardens.map((warden) => {
              const earned = defeatedWardenIds.includes(warden.id);
              return <View key={warden.id} style={[styles.sigil, earned && { borderColor: warden.color, backgroundColor: warden.accent }]}><Text style={[styles.sigilGlyph, { color: earned ? '#FFF9E8' : '#5E6F8A' }]}>{warden.sigil}</Text></View>;
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}><Text style={styles.sectionKicker}>{t('battleHub.yourSquad')}</Text><Text style={styles.sectionMeta}>{squad.length}/5</Text></View>
          <View style={styles.slots}>
            {Array.from({ length: 5 }, (_, index) => {
              const member = squad[index];
              const type = member ? typeTheme[typeForCard(member.card)] : null;
              return (
                <Pressable key={member?.card.id ?? `slot-${index}`} onPress={() => { playSound('tap'); onEditSquad(); }} style={styles.slot}>
                  {member && type ? <>
                    <CreatureAvatar card={member.card} size={50} ring={member.golden ? '#FFD54A' : type.color} />
                    <Text style={styles.slotLevel}>{t('common.level', { level: member.progress.level })}</Text>
                  </> : <View style={styles.slotEmpty}><Text style={styles.slotPlus}>+</Text></View>}
                </Pressable>
              );
            })}
          </View>
          <GameButton label={squad.length ? t('battleHub.editSquad') : t('battleHub.buildSquad')} compact color="#3D5D78" deep="#243F55" onPress={onEditSquad} style={styles.cardButton} />
        </View>

        <View style={styles.wildCard}>
          <View style={styles.wildTop}>
            <Text style={styles.wildGlyph}>❋</Text>
            <View style={styles.flex}>
              <Text style={styles.wildTitle}>Wild Skies</Text>
            </View>
          </View>
          <GameButton label={canBattle ? t('battleHub.explore') : t('battleHub.needSquad')} disabled={!canBattle} color="#3E9C6E" deep="#23664A" onPress={onWild} style={styles.cardButton} />
        </View>

        {next && (
          <View style={[styles.wardenCard, { borderColor: next.color }]}>
            <View style={styles.wardenTop}>
              <CreatureAvatar card={wardenAce(next)} size={80} ring={next.color} />
              <View style={styles.flex}>
                <Text style={styles.wardenName}>{next.name}</Text>
                <View style={styles.wardenChips}>
                  {next.type === 'Mixed' ? <Text style={[styles.levelPill, { borderColor: next.color, color: next.color }]}>◐</Text> : <TypeChip type={next.type} compact />}
                  <Text style={[styles.levelPill, { borderColor: average >= next.recommended ? '#7FE3A8' : '#FFB36B', color: average >= next.recommended ? '#7FE3A8' : '#FFB36B' }]}>{t('common.level', { level: next.recommended })}</Text>
                </View>
              </View>
            </View>
            <GameButton label={canBattle ? t('battleHub.challenge', { name: next.name.toUpperCase() }) : t('battleHub.needSquad')} disabled={!canBattle} onPress={() => onWarden(next)} style={styles.cardButton} />
          </View>
        )}

        <Text style={styles.sectionTitle}>{t('battleHub.theWardens')}</Text>
        <View style={styles.list}>
          {wardens.map((warden, index) => {
            const defeated = defeatedWardenIds.includes(warden.id);
            const locked = nextIndex !== -1 && index > nextIndex;
            const cosmetics = cosmeticsForWarden(warden.id, index);
            return (
              <Pressable key={warden.id} disabled={locked || !canBattle} onPress={() => onWarden(warden)} style={({ pressed }) => [styles.listRow, locked && styles.locked, pressed && styles.pressed]}>
                <View style={[styles.listSigil, { borderColor: locked ? '#4A4062' : warden.color, backgroundColor: defeated ? warden.accent : '#241C3A' }]}><Text style={[styles.listSigilText, { color: locked ? '#6F6488' : defeated ? '#FFF9E8' : warden.color }]}>{locked ? '?' : warden.sigil}</Text></View>
                <View style={styles.flex}>
                  <Text style={styles.listName}>{locked ? '???' : warden.name}</Text>
                </View>
                <Text style={[styles.listState, defeated && { color: '#9EF0B8' }, index === nextIndex && { color: palette.gold }]}>{defeated ? t('battleHub.rematch') : index === nextIndex ? t('battleHub.next') : '🔒'}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}><Text style={styles.sectionKicker}>{t('battleHub.bag')}</Text><Pressable onPress={() => { playSound('tap'); onOpenShop(); }} hitSlop={8}><Text style={styles.heroLink}>{t('battleHub.restock')}</Text></Pressable></View>
          <View style={styles.bagRow}>
            {itemOrder.map((id) => <View key={id} style={styles.bagPill}><Text style={[styles.bagIcon, { color: items[id].color }]}>{items[id].icon}</Text><Text style={styles.bagCount}>×{bag[id] ?? 0}</Text></View>)}
          </View>
        </View>
      </ScrollView>
      {chartOpen && <TypeChart onClose={() => setChartOpen(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  screen: { padding: 20, paddingBottom: 104, gap: 14 },
  hero: { backgroundColor: '#284A65', borderWidth: 1, borderColor: '#5EB8D7', borderRadius: 22, padding: 18 },
  heroKicker: { color: '#BCEFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  heroCount: { color: palette.gold, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  wardenChips: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  levelPill: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 6, paddingVertical: 1.5, fontSize: 9, fontWeight: '900', overflow: 'hidden' },
  heroTitle: { color: palette.text, fontSize: 25, fontWeight: '900', marginTop: 5 },
  heroCopy: { color: '#D3EEF8', fontSize: 12, lineHeight: 17, marginTop: 6 },
  sigilRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  sigil: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: '#46647E', backgroundColor: '#1D3348', alignItems: 'center', justifyContent: 'center' },
  sigilGlyph: { fontSize: 16, fontWeight: '900' },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  heroProgress: { color: palette.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  heroLink: { color: palette.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  card: { backgroundColor: '#2A3855', borderRadius: 18, borderWidth: 1, borderColor: '#5B7188', padding: 13 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionKicker: { color: palette.text, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  sectionMeta: { color: palette.cyan, fontSize: 10, fontWeight: '900' },
  slots: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  slot: { width: '19%', alignItems: 'center' },
  slotType: { position: 'absolute', top: -3, right: 0, fontSize: 12, fontWeight: '900', textShadowColor: '#0B0818', textShadowRadius: 4 },
  slotLevel: { color: '#EAF9FF', fontSize: 9, fontWeight: '900', marginTop: 4 },
  slotLead: { color: palette.gold, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.6 },
  slotEmpty: { width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#6F86A0', alignItems: 'center', justifyContent: 'center' },
  slotPlus: { color: '#8FA7C0', fontSize: 22, fontWeight: '900' },
  cardButton: { marginTop: 12 },
  wildCard: { backgroundColor: '#24473D', borderRadius: 20, borderWidth: 1, borderColor: '#6FBF8F', padding: 15 },
  wildTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  wildGlyph: { color: '#9EF0B8', fontSize: 44, textShadowColor: '#58D59A', textShadowRadius: 12 },
  wildKicker: { color: '#B8F0C8', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  wildTitle: { color: palette.text, fontSize: 19, fontWeight: '900', marginTop: 2 },
  wildCopy: { color: '#D2EEDD', fontSize: 10.5, lineHeight: 15, marginTop: 3 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#1D392F', borderRadius: 12, padding: 9, marginTop: 10 },
  goalIcon: { fontSize: 16, fontWeight: '900', width: 18, textAlign: 'center' },
  goalTitle: { color: palette.text, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.4 },
  goalCopy: { color: '#B9DCC7', fontSize: 8.5, marginTop: 1 },
  goalBar: { marginTop: 5 },
  goalCount: { color: '#E1F6E8', fontSize: 9, fontWeight: '900' },
  wardenCard: { backgroundColor: palette.panel, borderRadius: 22, borderWidth: 2, padding: 16 },
  wardenKicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  wardenTop: { flexDirection: 'row', gap: 13, alignItems: 'center', marginTop: 10 },
  wardenName: { color: palette.text, fontSize: 21, fontWeight: '900' },
  wardenTitle: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginTop: 1 },
  wardenQuote: { color: '#D8CDEB', fontSize: 10.5, lineHeight: 15, fontStyle: 'italic', marginTop: 6 },
  metaRow: { flexDirection: 'row', backgroundColor: '#241A43', borderRadius: 12, paddingVertical: 9, marginTop: 13 },
  meta: { flex: 1, alignItems: 'center' },
  metaValue: { color: palette.gold, fontSize: 14, fontWeight: '900' },
  metaLabel: { color: palette.faint, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.6, marginTop: 2 },
  rewardLine: { gap: 6, marginTop: 12 },
  rewardLabel: { color: '#AFA1C8', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.9 },
  warning: { color: '#FFC7A8', fontSize: 10, lineHeight: 14, fontWeight: '700', marginTop: 10, textAlign: 'center' },
  sectionTitle: { color: palette.text, fontSize: 12, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  list: { gap: 7 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#2A2441', borderRadius: 14, borderWidth: 1, borderColor: '#5B4E70', padding: 10 },
  locked: { opacity: 0.55 },
  listSigil: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  listSigilText: { fontSize: 17, fontWeight: '900' },
  listName: { color: palette.text, fontSize: 12, fontWeight: '900' },
  listCopy: { color: '#BFB4CF', fontSize: 8.5, marginTop: 2 },
  listCosmetic: { fontSize: 7.5, fontWeight: '900', letterSpacing: 0.4, marginTop: 3 },
  listState: { color: palette.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.5, textAlign: 'right' },
  bagRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  bagPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#22304A', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 8 },
  bagIcon: { fontSize: 14, fontWeight: '900' },
  bagName: { flex: 1, color: '#DDEFFA', fontSize: 7.5, fontWeight: '900' },
  bagCount: { color: palette.gold, fontSize: 9, fontWeight: '900' },
});

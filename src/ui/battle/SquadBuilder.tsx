import { useMemo, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playSound } from '../../audio/sound';
import { Rarity, rarityTheme } from '../../data/catalog';
import { baseStatsFor, creatureTypes, learnsetFor, maxLevel, movesAtLevel, statsAtLevel, typeForCard, typeTheme, xpToNext } from '../../game/creatures';
import { PlayerDeck } from '../../game/save';
import { tk, useI18n } from '../../i18n';
import { moveDescKey } from '../../i18n/gameKeys';
import { AnimatedBar, CreatureAvatar, GameButton, InfoButton, TypeChip, palette } from '../common';
import { SquadMember } from './BattleHub';

const rarityRank: Record<Rarity, number> = { Common: 0, Rare: 1, 'Very Rare': 2, Epic: 3, Legendary: 4, Angelic: 5, Demonic: 5 };
type SortMode = 'level' | 'rarity' | 'type';

export function SquadBuilder({ visible, onClose, owned, teamIds, onToggle, decks, selectedDeckId, onLoadDeck, onSaveDeck, candy, onUseCandy }: {
  visible: boolean; onClose: () => void; owned: SquadMember[]; teamIds: string[]; onToggle: (cardId: string) => void;
  decks: PlayerDeck[]; selectedDeckId: string | null; onLoadDeck: (deck: PlayerDeck) => void; onSaveDeck: (deckId: string) => void;
  candy: number; onUseCandy: (cardId: string) => void;
}) {
  const { t } = useI18n();
  const [sort, setSort] = useState<SortMode>('level');
  const [detailId, setDetailId] = useState<string | null>(null);
  const byId = useMemo(() => new Map(owned.map((member) => [member.card.id, member])), [owned]);
  const team = teamIds.map((id) => byId.get(id)).filter((member): member is SquadMember => Boolean(member));
  const sorted = useMemo(() => [...owned].sort((a, b) => {
    if (sort === 'level') return b.progress.level - a.progress.level || rarityRank[b.card.rarity] - rarityRank[a.card.rarity];
    if (sort === 'rarity') return rarityRank[b.card.rarity] - rarityRank[a.card.rarity] || b.progress.level - a.progress.level;
    return creatureTypes.indexOf(typeForCard(a.card)) - creatureTypes.indexOf(typeForCard(b.card)) || b.progress.level - a.progress.level;
  }), [owned, sort]);
  const detail = detailId ? byId.get(detailId) ?? null : null;
  const sortLabels: Record<SortMode, string> = { level: t('squad.sortLevel'), rarity: t('squad.sortRarity'), type: t('squad.sortType') };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View><Text style={styles.title}>{t('squad.title')}</Text></View>
          <Pressable onPress={() => { playSound('back'); onClose(); }} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.slots}>
            {Array.from({ length: 5 }, (_, index) => {
              const member = team[index];
              return (
                <Pressable key={member?.card.id ?? `empty-${index}`} disabled={!member} onPress={() => member && onToggle(member.card.id)} style={styles.slot}>
                  {member ? <CreatureAvatar card={member.card} size={54} ring={member.golden ? '#FFD54A' : typeTheme[typeForCard(member.card)].color} /> : <View style={styles.slotEmpty}><Text style={styles.slotPlus}>+</Text></View>}
                  <Text style={styles.slotLabel} numberOfLines={1}>{member ? t('common.level', { level: member.progress.level }) : '—'}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.section}>{t('squad.decks')}</Text>
          <View style={styles.decks}>
            {decks.map((deck, deckIndex) => {
              const count = deck.cardIds.filter((id) => byId.has(id)).length;
              const selected = deck.id === selectedDeckId;
              return (
                <View key={deck.id} style={[styles.deck, selected && styles.deckSelected]}>
                  <Text style={styles.deckName}>{t('squad.deck', { n: deckIndex + 1 })}</Text>
                  <Text style={styles.deckCount}>{deck.cardIds.length ? `${count}/5` : '—'}</Text>
                  <View style={styles.deckActions}>
                    <Pressable disabled={!deck.cardIds.length} onPress={() => onLoadDeck(deck)} style={[styles.deckButton, !deck.cardIds.length && styles.disabled]}><Text style={styles.deckButtonText}>{t('squad.load')}</Text></Pressable>
                    <Pressable disabled={!team.length} onPress={() => onSaveDeck(deck.id)} style={[styles.deckButton, styles.deckSave, !team.length && styles.disabled]}><Text style={styles.deckButtonText}>{t('squad.save')}</Text></Pressable>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.sortRow}>
            <Text style={styles.section}>{t('squad.yourCreatures', { count: owned.length })}</Text>
            <View style={styles.flex} />
            {(['level', 'rarity', 'type'] as SortMode[]).map((mode) => <Pressable key={mode} onPress={() => { playSound('toggle'); setSort(mode); }} style={[styles.sortChip, sort === mode && styles.sortChipActive]}><Text style={[styles.sortText, sort === mode && styles.sortTextActive]}>{sortLabels[mode]}</Text></Pressable>)}
          </View>
          {owned.length === 0 && <View style={styles.empty}><Text style={styles.emptyIcon}>✦</Text><Text style={styles.emptyTitle}>{t('squad.noCreatures')}</Text></View>}
          {sorted.map((member) => {
            const type = typeForCard(member.card);
            const inTeam = teamIds.includes(member.card.id);
            const full = teamIds.length >= 5 && !inTeam;
            return (
              <Pressable key={member.card.id} disabled={full} onPress={() => onToggle(member.card.id)} style={({ pressed }) => [styles.row, inTeam && styles.rowSelected, full && styles.disabled, pressed && styles.pressed]}>
                <CreatureAvatar card={member.card} size={48} ring={member.golden ? '#FFD54A' : undefined} />
                <View style={styles.flex}>
                  <View style={styles.rowTop}><Text style={styles.rowName} numberOfLines={1}>{member.card.name}</Text><Text style={styles.rowLevel}>{t('common.level', { level: member.progress.level })}</Text></View>
                  <View style={styles.rowChips}><TypeChip type={type} compact /><Text style={[styles.rowRarity, { color: rarityTheme[member.card.rarity].color }]}>{t(tk(`rarity.${member.card.rarity}`)).toUpperCase()}</Text></View>
                </View>
                <View style={styles.rowSide}>
                  <View style={[styles.check, inTeam && styles.checkOn]}><Text style={styles.checkText}>{inTeam ? '✓' : '+'}</Text></View>
                  <InfoButton onPress={() => setDetailId(member.card.id)} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        {detail && <CreatureDetail member={detail} candy={candy} onUseCandy={() => onUseCandy(detail.card.id)} onClose={() => { playSound('back'); setDetailId(null); }} />}
      </SafeAreaView>
    </Modal>
  );
}

function CreatureDetail({ member, candy, onUseCandy, onClose }: { member: SquadMember; candy: number; onUseCandy: () => void; onClose: () => void }) {
  const { t } = useI18n();
  const { card, progress } = member;
  const type = typeForCard(card);
  const theme = typeTheme[type];
  const stats = statsAtLevel(card, progress.level);
  const base = baseStatsFor(card);
  const moves = movesAtLevel(card, progress.level);
  const upcoming = learnsetFor(card).filter((entry) => entry.level > progress.level);
  const next = xpToNext(progress.level);
  const statRows: [string, number, number][] = [[t('stat.hp'), stats.hp, base.hp], [t('stat.attack'), stats.attack, base.attack], [t('stat.defense'), stats.defense, base.defense], [t('stat.speed'), stats.speed, base.speed]];
  return (
    <View style={styles.detailBackdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.detailSheet, { borderColor: theme.color }]}>
        <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
          <View style={styles.detailTop}>
            <CreatureAvatar card={card} size={104} ring={member.golden ? '#FFD54A' : theme.color} />
            <View style={styles.flex}>
              <Text style={styles.detailName}>{card.name}</Text>
              <View style={styles.rowChips}><TypeChip type={type} /><Text style={[styles.rowRarity, { color: rarityTheme[card.rarity].color }]}>{t(tk(`rarity.${card.rarity}`)).toUpperCase()}</Text></View>
              <Text style={styles.detailLevel}>{t('common.level', { level: progress.level })}<Text style={styles.detailMax}> / {maxLevel}</Text></Text>
              <View style={styles.detailXp}><AnimatedBar ratio={next ? progress.xp / next : 1} color={palette.cyan} height={6} /></View>
              {next > 0 && <Text style={styles.detailXpText}>{progress.xp}/{next} XP</Text>}
            </View>
          </View>
          <Text style={styles.section}>{t('squad.statsTitle')}</Text>
          {statRows.map(([label, value, baseValue]) => (
            <View key={label} style={styles.statRow}>
              <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
              <View style={styles.flex}><AnimatedBar ratio={baseValue / 160} color={theme.color} height={6} /></View>
              <Text style={styles.statValue}>{value}</Text>
            </View>
          ))}
          <Text style={styles.section}>{t('squad.moves')}</Text>
          {moves.map((move) => {
            const moveTheme = typeTheme[move.type];
            return (
              <View key={move.id} style={[styles.moveRow, { borderColor: moveTheme.color, backgroundColor: moveTheme.soft }]}>
                <View style={styles.rowTop}><Text style={styles.moveName}>{moveTheme.icon} {move.name}{move.signature ? '  ★' : ''}</Text><Text style={[styles.moveMeta, { color: moveTheme.color }]}>{move.category === 'status' ? t('battleUi.status') : t('battleUi.power', { power: move.power })} · {move.accuracy}% · PP {move.pp}</Text></View>
                <Text style={styles.moveCopy}>{t(moveDescKey(move))}</Text>
              </View>
            );
          })}
          {upcoming.length > 0 && <>
            <Text style={styles.section}>{t('squad.upcoming')}</Text>
            {upcoming.map((entry) => <Text key={entry.move.id} style={styles.upcoming}>{t('common.level', { level: entry.level })} · {typeTheme[entry.move.type].icon} {entry.move.name} — {entry.move.category === 'status' ? t('squad.statusDetail') : t('squad.powerDetail', { power: entry.move.power })}</Text>)}
          </>}
          <GameButton label={progress.level >= maxLevel ? t('squad.maxLevel') : t('squad.useCandy', { count: candy })} disabled={candy <= 0 || progress.level >= maxLevel} color="#8A55B8" deep="#5B3380" sound="levelUp" onPress={onUseCandy} style={styles.candyButton} />
          <Pressable onPress={onClose} style={styles.detailClose}><Text style={styles.detailCloseText}>{t('common.close')}</Text></Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#413260' },
  title: { color: palette.text, fontSize: 24, fontWeight: '900', letterSpacing: 0.8 },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.panel, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: palette.text, fontSize: 28, lineHeight: 30 },
  content: { padding: 18, paddingBottom: 50, gap: 9 },
  slots: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#2A3855', borderRadius: 18, borderWidth: 1, borderColor: '#5B7188', padding: 12 },
  slot: { width: '19%', alignItems: 'center' },
  slotEmpty: { width: 54, height: 54, borderRadius: 27, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#6F86A0', alignItems: 'center', justifyContent: 'center' },
  slotPlus: { color: '#8FA7C0', fontSize: 22, fontWeight: '900' },
  slotLabel: { color: '#EAF9FF', fontSize: 9, fontWeight: '900', marginTop: 5 },
  section: { color: palette.text, fontSize: 10.5, fontWeight: '900', letterSpacing: 1, marginTop: 8 },
  decks: { flexDirection: 'row', gap: 7 },
  deck: { flex: 1, backgroundColor: '#2A2441', borderRadius: 13, borderWidth: 1, borderColor: '#5B4E70', padding: 9 },
  deckSelected: { borderColor: palette.cyan, borderWidth: 2 },
  deckName: { color: palette.text, fontSize: 10, fontWeight: '900' },
  deckCount: { color: '#BFB4CF', fontSize: 8, marginTop: 2 },
  deckActions: { flexDirection: 'row', gap: 4, marginTop: 8 },
  deckButton: { flex: 1, backgroundColor: '#3D5D78', borderRadius: 7, paddingVertical: 6, alignItems: 'center' },
  deckSave: { backgroundColor: '#6A5220' },
  deckButtonText: { color: '#F1FAFF', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  sortChip: { borderRadius: 8, borderWidth: 1, borderColor: '#5A4A7B', backgroundColor: '#2A2047', paddingHorizontal: 7, paddingVertical: 4, marginTop: 8 },
  sortChipActive: { backgroundColor: palette.gold, borderColor: '#FFF4BC' },
  sortText: { color: '#CFC3E4', fontSize: 7.5, fontWeight: '900' },
  sortTextActive: { color: '#403154' },
  empty: { alignItems: 'center', backgroundColor: '#27213C', borderRadius: 18, padding: 24 },
  emptyIcon: { color: palette.cyan, fontSize: 32 },
  emptyTitle: { color: palette.text, fontSize: 15, fontWeight: '900', marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#2A2441', borderRadius: 15, borderWidth: 1, borderColor: '#5B4E70', padding: 9 },
  rowSelected: { borderColor: '#84D6A3', backgroundColor: '#2C3E45' },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  rowName: { flex: 1, color: palette.text, fontSize: 12, fontWeight: '900' },
  rowLevel: { color: palette.gold, fontSize: 11, fontWeight: '900' },
  rowChips: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  rowRarity: { fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 },
  rowSide: { alignItems: 'center', gap: 6 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#A89ABA', backgroundColor: '#453568', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: '#49A77A', borderColor: '#D3F8BE' },
  checkText: { color: palette.text, fontSize: 13, fontWeight: '900' },
  detailBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(8,5,22,.78)', justifyContent: 'flex-end', padding: 12 },
  detailSheet: { maxHeight: '90%', backgroundColor: palette.panel, borderRadius: 24, borderWidth: 2 },
  detailContent: { padding: 18, gap: 6 },
  detailTop: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  detailName: { color: palette.text, fontSize: 20, fontWeight: '900' },
  detailLevel: { color: palette.gold, fontSize: 18, fontWeight: '900', marginTop: 4 },
  detailMax: { color: palette.faint, fontSize: 11 },
  detailXp: { marginTop: 5 },
  detailXpText: { color: '#AFC8D8', fontSize: 8, fontWeight: '700', marginTop: 3 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statLabel: { color: '#CFC3E4', fontSize: 8, fontWeight: '900', width: 64, letterSpacing: 0.4 },
  statValue: { color: palette.text, fontSize: 11, fontWeight: '900', width: 34, textAlign: 'right' },
  moveRow: { borderWidth: 1, borderRadius: 11, padding: 9 },
  moveName: { color: palette.text, fontSize: 11, fontWeight: '900', flex: 1 },
  moveMeta: { fontSize: 7.5, fontWeight: '900' },
  moveCopy: { color: '#DCD2ED', fontSize: 9, lineHeight: 13, marginTop: 3 },
  upcoming: { color: '#C9BEDB', fontSize: 9.5, lineHeight: 15 },
  candyButton: { marginTop: 12 },
  detailClose: { alignSelf: 'center', padding: 10 },
  detailCloseText: { color: palette.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});

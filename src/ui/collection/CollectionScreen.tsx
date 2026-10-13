import { ReactNode, useMemo, useState } from 'react';
import { Animated, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { playSound } from '../../audio/sound';
import { BoosterId, Card, betaEventActive, boosterById, catalog, collectionOrder, goldenEligible, inventoryKey, rarityTheme } from '../../data/catalog';
import { CreatureArt } from '../creatures/CreatureArt';
import { starLabels } from '../../game/constellations';
import { typeForCard, typeTheme } from '../../game/creatures';
import { Bag, itemOrder, items } from '../../game/items';
import { wardens } from '../../game/wardens';
import { hasKey, tk, useI18n } from '../../i18n';
import { styles as app, v2Styles } from '../appStyles';
import { CollectionSlot, GoldenBorderFill, isSecretCard } from '../cards';
import { AnimatedBar, palette } from '../common';
import { StarArt, starPalettes } from '../stars/StarArt';
import { essenceGoal, voidCosmeticPool } from '../../game/void';
import { BlackHole } from '../void/BlackHole';
import { EssenceIcon } from '../void/EssenceIcon';

type Filter = 'all' | 'owned' | 'missing' | 'golden';
export type OwnedArena = { id: string; name: string; icon: string; border: string };
const starFilters: BoosterId[] = ['dawn', 'twilight', 'celestial'];
const stripAccents = (value: string) => {
  try {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
  } catch {
    return value;
  }
};
const normalize = (value: string) => stripAccents(value).toLowerCase();

function FilterChip({ label, active, color = palette.gold, onPress, icon }: { label: string; active: boolean; color?: string; onPress: () => void; icon?: ReactNode }) {
  return (
    <Pressable onPress={() => { playSound('toggle'); onPress(); }} style={[s.chip, active && { backgroundColor: `${color}2E`, borderColor: color }]}>
      {icon}
      <Text style={[s.chipText, active && { color }]}>{label}</Text>
    </Pressable>
  );
}

export function CollectionScreen({ visible, onClose, inventory, shimmer, levelFor, bag, defeatedWardenIds, ownedArenas, essence, voidCosmeticCount }: {
  visible: boolean; onClose: () => void; inventory: Record<string, number>; shimmer: Animated.Value; levelFor: (card: Card) => number;
  bag: Bag; defeatedWardenIds: string[]; ownedArenas: OwnedArena[]; essence: number; voidCosmeticCount: number;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<'creatures' | 'items'>('creatures');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [starFilter, setStarFilter] = useState<BoosterId | 'all'>('all');
  const [selected, setSelected] = useState<{ card: Card; golden: boolean } | null>(null);
  const [artBox, setArtBox] = useState({ width: 0, height: 0 });
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const toggleInfo = (id: string) => { playSound('tap'); setOpenInfo((current) => (current === id ? null : id)); };
  const countsOf = (card: Card) => ({ standard: inventory[inventoryKey(card)] ?? 0, golden: inventory[inventoryKey(card, true)] ?? 0 });
  const discovered = useMemo(() => catalog.filter((card) => (inventory[inventoryKey(card)] ?? 0) + (inventory[inventoryKey(card, true)] ?? 0) > 0).length, [inventory]);
  const goldenOwned = useMemo(() => catalog.filter((card) => (inventory[inventoryKey(card, true)] ?? 0) > 0).length, [inventory]);
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const searching = words.length > 0 || filter !== 'all' || starFilter !== 'all';
  const results = useMemo(() => {
    if (!searching) return [];
    return catalog.filter((card) => {
      const { standard, golden } = countsOf(card);
      const owned = standard + golden > 0;
      if (filter === 'owned' && !owned) return false;
      if (filter === 'missing' && owned) return false;
      if (filter === 'golden' && golden === 0) return false;
      if (starFilter !== 'all' && !card.boosterIds.includes(starFilter)) return false;
      if (words.length === 0) return true;
      const type = typeForCard(card);
      const star = card.boosterIds[0];
      const fields = [t(tk(`rarity.${card.rarity}`)), card.rarity, ...(star ? [starLabels[star], boosterById(star).name] : ['Void Quasar', t('altar.title')])];
      // Undiscovered Legendary and Angelic creatures stay secret: only their rarity and star can be searched.
      if (!isSecretCard(card, owned)) fields.push(card.name, t(tk(`type.${type}`)), type);
      const haystack = normalize(fields.join(' '));
      return words.every((word) => haystack.includes(word));
    }).sort((a, b) => collectionOrder.indexOf(a.rarity) - collectionOrder.indexOf(b.rarity));
  }, [searching, query, filter, starFilter, inventory, t]);

  const openCard = (card: Card) => {
    const { standard, golden } = countsOf(card);
    playSound('tap');
    setSelected({ card, golden: goldenEligible.includes(card.rarity) && standard === 0 && golden > 0 });
  };
  const slot = (card: Card) => {
    const { standard, golden } = countsOf(card);
    return <CollectionSlot key={inventoryKey(card)} card={card} count={standard} goldenCount={golden} shimmer={shimmer} onPress={() => openCard(card)} />;
  };
  const resetSearch = () => { playSound('back'); setQuery(''); setFilter('all'); setStarFilter('all'); };
  const close = () => { playSound('back'); setSelected(null); onClose(); };

  const selectedCount = selected ? inventory[inventoryKey(selected.card, selected.golden)] ?? 0 : 0;
  const locked = Boolean(selected) && selectedCount === 0;
  const sources: { id: BoosterId; event: boolean }[] = selected ? [
    ...selected.card.boosterIds.map((id) => ({ id, event: false })),
    ...(selected.card.rarity === 'Epic' || selected.card.rarity === 'Legendary' ? [{ id: 'sparkle' as BoosterId, event: false }] : []),
    ...(betaEventActive && selected.card.rarity !== 'Demonic' ? [{ id: 'crimson' as BoosterId, event: true }] : []),
  ] : [];
  const totalItems = itemOrder.reduce((sum, id) => sum + (bag[id] ?? 0), 0);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={app.collectionScreen}>
        <View style={app.collectionHeader}>
          <View><Text style={app.collectionTitle}>{t('collection.title')}</Text></View>
          <Pressable onPress={close} style={app.collectionClose} accessibilityRole="button" accessibilityLabel={t('collection.closeA11y')}><Text style={app.collectionCloseText}>×</Text></Pressable>
        </View>
        <View style={s.tabs}>
          {(['creatures', 'items'] as const).map((entry) => (
            <Pressable key={entry} onPress={() => { playSound('toggle'); setTab(entry); }} style={[s.tab, tab === entry && s.tabActive]}>
              <Text style={[s.tabText, tab === entry && s.tabTextActive]}>{entry === 'creatures' ? `▦ ${t('collection.tabCreatures')}` : `✚ ${t('collection.tabItems')}`}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'creatures' ? (
          <ScrollView contentContainerStyle={app.collectionContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={s.summary}>
              <View style={s.summaryRow}>
                <Text style={s.summaryValue}>{t('collection.discovered', { count: discovered, total: catalog.length })}</Text>
                <Text style={s.summaryGolden}>✦ {goldenOwned} {t('opening.golden')}</Text>
              </View>
              <AnimatedBar ratio={discovered / catalog.length} color="#8ED0A7" height={7} />
            </View>
            <View style={s.search}>
              <Text style={s.searchIcon}>⌕</Text>
              <TextInput value={query} onChangeText={setQuery} placeholder={t('collection.search')} placeholderTextColor="#7F739B" style={s.searchInput} autoCorrect={false} autoCapitalize="none" returnKeyType="search" />
              {query ? <Pressable onPress={() => setQuery('')} hitSlop={10}><Text style={s.searchClear}>×</Text></Pressable> : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.chips}>
              {(['all', 'owned', 'missing', 'golden'] as const).map((entry) => (
                <FilterChip key={entry} active={filter === entry} color={entry === 'golden' ? '#FFD54A' : palette.gold} onPress={() => setFilter(entry)}
                  label={entry === 'all' ? t('collection.filterAll') : entry === 'owned' ? t('collection.filterOwned') : entry === 'missing' ? t('collection.filterMissing') : t('collection.filterGolden')} />
              ))}
              <View style={s.chipDivider} />
              <FilterChip label={t('collection.allStars')} active={starFilter === 'all'} color={palette.cyan} onPress={() => setStarFilter('all')} />
              {starFilters.map((id) => (
                <FilterChip key={id} label={starLabels[id]} active={starFilter === id} color={starPalettes[id].main} onPress={() => setStarFilter(id)} icon={<StarArt variant={id} size={16} animated={false} float={false} />} />
              ))}
            </ScrollView>

            {searching ? <>
              <View style={s.resultsHead}>
                <Text style={s.resultsCount}>{t('collection.results', { count: results.length })}</Text>
                <Pressable onPress={resetSearch} hitSlop={8}><Text style={s.resultsClear}>{t('collection.clear')}</Text></Pressable>
              </View>
              {results.length === 0
                ? <View style={s.empty}><Text style={s.emptyIcon}>✧</Text><Text style={s.emptyText}>{t('collection.noResults')}</Text></View>
                : <View style={app.collectionGrid}>{results.map(slot)}</View>}
            </> : collectionOrder.map((rarity) => {
              const cards = catalog.filter((card) => card.rarity === rarity);
              return (
                <View key={rarity} style={app.collectionGroup}>
                  <View style={app.collectionGroupHeader}>
                    <View style={[app.collectionColor, { backgroundColor: rarityTheme[rarity].accent }]} />
                    <Text style={app.collectionGroupTitle}>{t(tk(`rarity.${rarity}`)).toUpperCase()}</Text>
                    <Text style={app.collectionGroupCount}>{cards.filter((card) => countsOf(card).standard + countsOf(card).golden > 0).length}/{cards.length}</Text>
                  </View>
                  {rarity === 'Demonic' && (
                    <View style={app.collectionBoosterSlice}>
                      <View style={app.collectionBoosterLabel}>
                        <View style={s.sliceStar}><EssenceIcon size={20} /></View>
                        <Text style={app.collectionBoosterName}>{t('altar.title')}</Text>
                      </View>
                      <View style={app.collectionGrid}>{cards.map(slot)}</View>
                    </View>
                  )}
                  {starFilters.filter((id) => cards.some((card) => card.boosterIds.includes(id))).map((id, index) => (
                    <View key={id} style={[app.collectionBoosterSlice, index > 0 && app.collectionSeparator]}>
                      <View style={app.collectionBoosterLabel}>
                        <View style={s.sliceStar}><StarArt variant={id} size={20} animated={false} float={false} /></View>
                        <Text style={app.collectionBoosterName}>{boosterById(id).name}</Text>
                      </View>
                      <View style={app.collectionGrid}>{cards.filter((card) => card.boosterIds.includes(id)).map(slot)}</View>
                    </View>
                  ))}
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={app.collectionContent} showsVerticalScrollIndicator={false}>
            <View style={s.sectionHead}><Text style={s.sectionTitle}>{t('collection.bag')}</Text><Text style={s.sectionCount}>{totalItems}</Text></View>
            {itemOrder.map((id) => {
              const item = items[id];
              const count = bag[id] ?? 0;
              const open = openInfo === id;
              return (
                <Pressable key={id} onPress={() => toggleInfo(id)} style={[s.itemRow, count === 0 && !open && s.itemEmpty]}>
                  <View style={[s.itemIcon, { borderColor: item.color, backgroundColor: `${item.color}22` }]}><Text style={[s.itemIconText, { color: item.color }]}>{item.icon}</Text></View>
                  <View style={s.flex}>
                    <Text style={s.itemName}>{item.name}</Text>
                    {open && <Text style={s.itemCopy}>{t(tk(`item.${id}.copy`))}</Text>}
                  </View>
                  <View style={[s.itemCount, count > 0 && { borderColor: item.color, backgroundColor: `${item.color}18` }]}><Text style={[s.itemCountText, count > 0 && { color: item.color }]}>×{count}</Text></View>
                </Pressable>
              );
            })}

            <View style={s.sectionHead}><Text style={s.sectionTitle}>{t('collection.voidSection')}</Text><Text style={s.sectionCount}>{voidCosmeticCount}/{voidCosmeticPool.length}</Text></View>
            <Pressable onPress={() => toggleInfo('essence')} style={[s.itemRow, essence === 0 && openInfo !== 'essence' && s.itemEmpty]}>
              <View style={s.essenceIcon}><EssenceIcon size={46} /></View>
              <View style={s.flex}>
                <Text style={s.itemName}>{t('void.essenceKicker')}</Text>
                {openInfo === 'essence' && <Text style={s.itemCopy}>{t('collection.essenceCopy', { goal: essenceGoal })}</Text>}
                <View style={s.essenceBar}><AnimatedBar ratio={Math.min(1, essence / essenceGoal)} color="#FF2E4D" height={5} /></View>
              </View>
              <View style={[s.itemCount, essence > 0 && { borderColor: '#FF4D6D', backgroundColor: '#FF4D6D18' }]}><Text style={[s.itemCountText, essence > 0 && { color: '#FF8A9A' }]}>{essence}/{essenceGoal}</Text></View>
            </Pressable>

            <View style={s.sectionHead}><Text style={s.sectionTitle}>{t('collection.sigils')}</Text><Text style={s.sectionCount}>{defeatedWardenIds.length}/{wardens.length}</Text></View>
            <View style={s.sigils}>
              {wardens.map((warden) => {
                const earned = defeatedWardenIds.includes(warden.id);
                return (
                  <View key={warden.id} style={[s.sigil, earned && { borderColor: `${warden.color}88` }]}>
                    <View style={[s.sigilOrb, earned && { backgroundColor: warden.accent, borderColor: warden.color, shadowColor: warden.color, shadowOpacity: 0.7, shadowRadius: 8, elevation: 5 }]}>
                      <Text style={[s.sigilGlyph, earned && { color: '#FFF9E8' }]}>{earned ? warden.sigil : '?'}</Text>
                    </View>
                    <Text style={[s.sigilName, !earned && s.sigilNameLocked]} numberOfLines={2}>{warden.sigilName}</Text>
                  </View>
                );
              })}
            </View>

            <View style={s.sectionHead}><Text style={s.sectionTitle}>{t('collection.arenas')}</Text><Text style={s.sectionCount}>{ownedArenas.length}</Text></View>
            <View style={s.arenas}>
              {ownedArenas.map((arena) => (
                <View key={arena.id} style={[s.arena, { borderColor: arena.border }]}>
                  <Text style={[s.arenaIcon, { color: arena.border }]}>{arena.icon}</Text>
                  <Text style={s.arenaName}>{arena.name}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {selected && <View style={app.cardInfoBackdrop}>
          <Pressable style={app.cardInfoDismiss} onPress={() => { playSound('back'); setSelected(null); }} />
          <View style={[app.cardInfoSheet, s.sheet]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={app.cardInfoHeader}>
                <Text style={app.cardInfoKicker}>{selected.golden ? t('collection.goldenVariant') : t(tk(`rarity.${selected.card.rarity}`)).toUpperCase()}</Text>
                <Pressable onPress={() => { playSound('back'); setSelected(null); }} style={app.cardInfoClose} hitSlop={12}><Text style={app.cardInfoCloseText}>×</Text></Pressable>
              </View>
              <Text style={app.cardInfoName}>{locked ? '???' : selected.card.name}</Text>
              {!locked && <Text style={v2Styles.cardInfoMeta}>{t('collection.meta', { icon: typeTheme[typeForCard(selected.card)].icon, type: t(tk(`type.${typeForCard(selected.card)}`)), level: levelFor(selected.card) })}</Text>}
              {goldenEligible.includes(selected.card.rarity) && <View style={app.cardInfoTabs}>
                <Pressable onPress={() => { playSound('toggle'); setSelected({ card: selected.card, golden: false }); }} style={[app.cardInfoTab, !selected.golden && app.cardInfoTabActive]}><Text style={[app.cardInfoTabText, !selected.golden && app.cardInfoTabTextActive]}>{t('collection.standard')}</Text></Pressable>
                <Pressable onPress={() => { playSound('toggle'); setSelected({ card: selected.card, golden: true }); }} style={[app.cardInfoTab, selected.golden && app.cardInfoGoldenTabActive]}><Text style={[app.cardInfoTabText, selected.golden && app.cardInfoGoldenTabTextActive]}>{t('collection.golden')}</Text></Pressable>
              </View>}
              <View style={[app.cardInfoArtworkFrame, selected.golden && app.goldenArtworkShell]}>
                {selected.golden && !locked && <GoldenBorderFill shimmer={shimmer} large frame />}
                <View style={[app.cardInfoArtworkContent, selected.golden && app.goldenArtworkInner]} onLayout={(event) => setArtBox({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
                  {/* Sized to the measured frame: the sky fills it edge to edge and the whole creature fits inside. */}
                  {locked ? <Text style={app.cardInfoSecretQuestion}>?</Text> : artBox.width > 0 && <CreatureArt card={selected.card} size={artBox.width} height={artBox.height} animated />}
                </View>
              </View>
              {locked && <View style={app.cardLockStatus}><Text style={app.cardLockText}>{t('common.locked')}</Text></View>}
              {(locked || hasKey(`lore.${selected.card.id}`)) && <Text style={app.cardInfoDescription}>{locked ? '???' : t(tk(`lore.${selected.card.id}`))}</Text>}
              <Text style={app.cardInfoCopy}>{t('collection.availableFrom')}</Text>
              {sources.map((source) => (
                <View key={source.id} style={[app.cardInfoSource, s.source]}>
                  <View style={s.sourceStar}><StarArt variant={source.id} size={30} animated={false} float={false} /></View>
                  <Text style={app.cardInfoSourceText}>{boosterById(source.id).name}</Text>
                  {source.event && <View style={s.sourceTag}><Text style={s.sourceTagText}>{t('event.beta')}</Text></View>}
                </View>
              ))}
              {selected.card.rarity === 'Demonic' ? (
                <View style={[app.cardInfoSource, s.source]}>
                  <View style={s.sourceStar}><EssenceIcon size={30} /></View>
                  <Text style={app.cardInfoSourceText}>{t('altar.title')}</Text>
                </View>
              ) : (
                <View style={[app.cardInfoSource, s.source]}>
                  <View style={s.sourceStar}><BlackHole size={30} animated={false} particles={false} /></View>
                  <Text style={app.cardInfoSourceText}>Void Quasar</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 12 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#4C3B70', backgroundColor: '#211A38' },
  tabActive: { backgroundColor: '#4A3970', borderColor: '#BCA4E1' },
  tabText: { color: '#BFB2D7', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  tabTextActive: { color: palette.text },
  summary: { backgroundColor: '#2A2146', borderRadius: 18, borderWidth: 1, borderColor: '#5B4A7D', padding: 14, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryValue: { color: palette.text, fontSize: 12, fontWeight: '900', letterSpacing: 0.6 },
  summaryGolden: { color: '#FFD54A', fontSize: 10, fontWeight: '900' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#211A38', borderRadius: 14, borderWidth: 1, borderColor: '#5B4A7D', paddingHorizontal: 12, height: 46 },
  searchIcon: { color: '#A99DBA', fontSize: 18, fontWeight: '900' },
  searchInput: { flex: 1, color: palette.text, fontSize: 13, fontWeight: '700', paddingVertical: 0 },
  searchClear: { color: '#C6B8DE', fontSize: 22, lineHeight: 24, paddingHorizontal: 4 },
  chips: { gap: 6, paddingTop: 10, paddingBottom: 14, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 11, borderWidth: 1, borderColor: '#4C3B70', backgroundColor: '#211A38', paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { color: '#BFB2D7', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  chipDivider: { width: 1, height: 18, backgroundColor: '#4C3B70', marginHorizontal: 2 },
  sliceStar: { width: 20, height: 20, marginRight: 6 },
  resultsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultsCount: { color: palette.gold, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  resultsClear: { color: '#C6B8DE', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { color: '#6F6390', fontSize: 40 },
  emptyText: { color: '#A99DBA', fontSize: 12, textAlign: 'center' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 8 },
  sectionTitle: { color: palette.text, fontSize: 15, fontWeight: '900', letterSpacing: 1.2 },
  sectionCount: { color: palette.gold, fontSize: 10, fontWeight: '900' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#2A2146', borderRadius: 16, borderWidth: 1, borderColor: '#5B4A7D', padding: 12, marginBottom: 8 },
  itemEmpty: { opacity: 0.62 },
  itemIcon: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  itemIconText: { fontSize: 21, fontWeight: '900' },
  itemName: { color: palette.text, fontSize: 13, fontWeight: '900' },
  itemCopy: { color: '#C9BEDB', fontSize: 9.5, lineHeight: 13, marginTop: 2 },
  itemCount: { minWidth: 46, alignItems: 'center', borderRadius: 11, borderWidth: 1, borderColor: '#4C3B70', paddingVertical: 6, paddingHorizontal: 6 },
  itemCountText: { color: '#8F82A8', fontSize: 13, fontWeight: '900' },
  sigils: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  sigil: { width: '22%', flexGrow: 1, alignItems: 'center', backgroundColor: '#221B38', borderRadius: 14, borderWidth: 1, borderColor: '#43375E', paddingVertical: 10, paddingHorizontal: 4 },
  sigilOrb: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#4A4060', backgroundColor: '#1A1530', alignItems: 'center', justifyContent: 'center' },
  sigilGlyph: { fontSize: 20, fontWeight: '900', color: '#5E5577' },
  sigilName: { color: palette.text, fontSize: 8, fontWeight: '900', textAlign: 'center', marginTop: 6 },
  sigilNameLocked: { color: '#9F93B8' },
  arenas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  arena: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1, backgroundColor: '#221B38', paddingHorizontal: 11, paddingVertical: 8 },
  arenaIcon: { fontSize: 15, fontWeight: '900' },
  arenaName: { color: palette.text, fontSize: 10, fontWeight: '900' },
  essenceIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  essenceBar: { marginTop: 6 },
  sheet: { maxHeight: '92%' },
  source: { marginTop: 6 },
  sourceStar: { width: 30, height: 30, marginRight: 9 },
  sourceTag: { marginLeft: 'auto', backgroundColor: '#E2364F', borderRadius: 7, paddingHorizontal: 6, paddingVertical: 2 },
  sourceTagText: { color: '#FFF6F0', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 },
});

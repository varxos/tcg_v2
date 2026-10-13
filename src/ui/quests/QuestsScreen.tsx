import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { playSound } from '../../audio/sound';
import {
  DailyQuest, QuestAction, QuestContext, QuestReward, activeChapterIndex, chapterBonusId, dailyBonus, dailyQuestsFor, goalProgress,
  milestoneTierId, milestoneTracks, milestoneValue, questReady, storyChapters,
} from '../../game/quests';
import { DailyState } from '../../game/save';
import { tk, useI18n } from '../../i18n';
import { AnimatedBar, Countdown, GameButton, RewardChips, palette } from '../common';

type QuestTab = 'story' | 'daily' | 'milestones';
const ROW = 152;
const NODE = 58;

export function QuestsScreen({ header, ctx, claimedIds, daily, clockNow, titleLabel, onClaim, onClaimDaily, onClaimDailyBonus, onNavigate }: {
  header: ReactNode; ctx: QuestContext; claimedIds: string[]; daily: DailyState; clockNow: number; titleLabel: (titleId: string) => string;
  onClaim: (id: string, reward: QuestReward) => void; onClaimDaily: (quest: DailyQuest) => void; onClaimDailyBonus: () => void; onNavigate: (action: QuestAction) => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<QuestTab>('story');
  const [viewedChapter, setViewedChapter] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const pathWidth = width - 40;
  const currentChapter = activeChapterIndex(claimedIds);
  const chapterIndex = viewedChapter !== null && viewedChapter <= currentChapter ? viewedChapter : currentChapter;
  const chapter = storyChapters[chapterIndex];
  const chapterClaimed = chapter.quests.filter((quest) => claimedIds.includes(quest.id)).length;
  const bonusId = chapterBonusId(chapter);
  const bonusClaimed = claimedIds.includes(bonusId);
  const bonusReady = chapterClaimed === chapter.quests.length && !bonusClaimed;

  const dailyQuests = dailyQuestsFor(daily.dateKey);
  const dailyReadyCount = dailyQuests.filter((quest) => daily.counters[quest.stat] >= quest.target && !daily.claimedIds.includes(quest.id)).length;
  const dailyAllClaimed = dailyQuests.every((quest) => daily.claimedIds.includes(quest.id));
  const storyReadyCount = storyChapters[currentChapter].quests.filter((quest) => !claimedIds.includes(quest.id) && questReady(quest, ctx)).length + (storyChapters[currentChapter].quests.every((quest) => claimedIds.includes(quest.id)) && !claimedIds.includes(chapterBonusId(storyChapters[currentChapter])) ? 1 : 0);
  const milestoneReadyCount = milestoneTracks.filter((track) => {
    const tier = track.tiers.findIndex((_, index) => !claimedIds.includes(milestoneTierId(track, index)));
    return tier !== -1 && milestoneValue(track, ctx) >= track.tiers[tier].target;
  }).length;

  const midnight = new Date(clockNow);
  midnight.setHours(24, 0, 0, 0);

  const tabs: { id: QuestTab; label: string; count: number }[] = [
    { id: 'story', label: t('quests.tabStory'), count: storyReadyCount },
    { id: 'daily', label: t('quests.tabDaily'), count: dailyReadyCount + (dailyAllClaimed && !daily.bonusClaimed ? 1 : 0) },
    { id: 'milestones', label: t('quests.tabMilestones'), count: milestoneReadyCount },
  ];
  const go = (action: QuestAction) => { playSound('tap'); onNavigate(action); };

  return (
    <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      {header}
      <View style={styles.tabs}>
        {tabs.map((entry) => (
          <Pressable key={entry.id} onPress={() => { playSound('toggle'); setTab(entry.id); }} style={[styles.tab, tab === entry.id && styles.tabActive]}>
            <Text style={styles.tabText} numberOfLines={1}>{entry.label}</Text>
            {entry.count > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{entry.count}</Text></View>}
          </Pressable>
        ))}
      </View>

      {tab === 'story' && <>
        <View style={styles.chapterPips}>
          {storyChapters.map((entry, index) => {
            const done = claimedIds.includes(chapterBonusId(entry));
            const locked = index > currentChapter;
            const viewing = index === chapterIndex;
            return (
              <Pressable key={entry.id} disabled={locked} onPress={() => { playSound('tap'); setViewedChapter(index); }} style={[styles.pip, done && { backgroundColor: entry.color, borderColor: entry.color }, viewing && styles.pipViewing, locked && styles.pipLocked]}>
                <Text style={[styles.pipText, done && { color: '#231A38' }]}>{done ? '✓' : index + 1}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.chapterCard, { borderColor: chapter.color }]}>
          <Text style={styles.chapterTitle}>{t(tk(`chapter.${chapter.id}.title`))}</Text>
          <View style={styles.progressRow}><View style={styles.flex}><AnimatedBar ratio={chapterClaimed / chapter.quests.length} color={chapter.color} height={7} /></View><Text style={styles.progressText}>{chapterClaimed}/{chapter.quests.length}</Text></View>
          <View style={styles.chapterRewards}><RewardChips celesti={chapter.bonus.celesti} items={chapter.bonus.items} extra={chapter.bonus.titleId ? t('quests.titleReward', { name: titleLabel(chapter.bonus.titleId) }) : undefined} /></View>
          {bonusClaimed ? <Text style={styles.completed}>✓</Text> : bonusReady && <GameButton label={t('quests.claimChapter')} sound={null} color="#C99219" deep="#8A6212" compact onPress={() => onClaim(bonusId, chapter.bonus)} style={styles.chapterButton} />}
        </View>

        <View style={{ height: chapter.quests.length * ROW }}>
          <Svg width={pathWidth} height={chapter.quests.length * ROW} style={StyleSheet.absoluteFill}>
            {chapter.quests.slice(0, -1).map((quest, index) => {
              const x1 = index % 2 === 0 ? NODE / 2 + 2 : pathWidth - NODE / 2 - 2;
              const x2 = index % 2 === 0 ? pathWidth - NODE / 2 - 2 : NODE / 2 + 2;
              const y1 = index * ROW + ROW / 2 + NODE / 2;
              const y2 = (index + 1) * ROW + ROW / 2 - NODE / 2;
              const done = claimedIds.includes(quest.id);
              return <Path key={quest.id} d={`M ${x1} ${y1} C ${x1} ${y1 + ROW * 0.5}, ${x2} ${y2 - ROW * 0.5}, ${x2} ${y2}`} stroke={done ? '#84D6A3' : '#6B5A8E'} strokeWidth={3} strokeDasharray="1 8" strokeLinecap="round" fill="none" />;
            })}
          </Svg>
          {chapter.quests.map((quest, index) => {
            const { value, target } = goalProgress(quest.goal, ctx);
            const claimed = claimedIds.includes(quest.id);
            const ready = !claimed && value >= target;
            return (
              <View key={quest.id} style={[styles.questRow, index % 2 === 1 && styles.questRowReverse]}>
                <Pressable disabled={!ready} onPress={() => onClaim(quest.id, quest.reward)} style={[styles.node, claimed && styles.nodeClaimed, ready && styles.nodeReady]}>
                  <Text style={styles.nodeIcon}>{claimed ? '✓' : quest.icon}</Text>
                </Pressable>
                <View style={[styles.questCard, ready && styles.questCardReady, claimed && styles.questCardClaimed]}>
                  <Text style={styles.questTitle} numberOfLines={2}>{t(tk(`quest.${quest.id}.copy`))}</Text>
                  {!claimed && <View style={styles.progressRow}><View style={styles.flex}><AnimatedBar ratio={Math.min(1, value / target)} color={palette.gold} height={6} /></View><Text style={styles.progressText}>{Math.min(value, target)}/{target}</Text></View>}
                  {!claimed && <View style={styles.questFooter}>
                    <RewardChips celesti={quest.reward.celesti} items={quest.reward.items} />
                    {ready ? <Pressable onPress={() => onClaim(quest.id, quest.reward)} style={styles.claimButton}><Text style={styles.claimText}>{t('common.claim')}</Text></Pressable> : quest.action ? <Pressable onPress={() => go(quest.action!)} style={styles.goButton}><Text style={styles.goText}>{t('common.go')}</Text></Pressable> : null}
                  </View>}
                </View>
              </View>
            );
          })}
        </View>
      </>}

      {tab === 'daily' && <>
        <View style={styles.dailyHero}>
          <Text style={[styles.chapterTitle, styles.flex]}>{t('quests.todaysQuests')}</Text>
          <Countdown target={midnight.getTime()} style={styles.resetText} />
        </View>
        {dailyQuests.map((quest) => {
          const value = daily.counters[quest.stat];
          const claimed = daily.claimedIds.includes(quest.id);
          const ready = !claimed && value >= quest.target;
          return (
            <View key={quest.id} style={[styles.dailyRow, ready && styles.questCardReady, claimed && styles.questCardClaimed]}>
              <View style={[styles.dailyIcon, claimed && styles.nodeClaimed, ready && styles.nodeReady]}><Text style={styles.dailyIconText}>{claimed ? '✓' : quest.icon}</Text></View>
              <View style={styles.flex}>
                <Text style={styles.questTitle}>{t(tk(`daily.${quest.id}.copy`))}</Text>
                {!claimed && <View style={styles.progressRow}><View style={styles.flex}><AnimatedBar ratio={Math.min(1, value / quest.target)} color={palette.cyan} height={6} /></View><Text style={styles.progressText}>{Math.min(value, quest.target)}/{quest.target}</Text></View>}
                {!claimed && <View style={styles.questFooter}>
                  <RewardChips celesti={quest.reward.celesti} items={quest.reward.items} />
                  {ready ? <Pressable onPress={() => onClaimDaily(quest)} style={styles.claimButton}><Text style={styles.claimText}>{t('common.claim')}</Text></Pressable> : <Pressable onPress={() => go(quest.action)} style={styles.goButton}><Text style={styles.goText}>{t('common.go')}</Text></Pressable>}
                </View>}
              </View>
            </View>
          );
        })}
        <View style={[styles.bonusCard, dailyAllClaimed && !daily.bonusClaimed && styles.bonusCardReady]}>
          <Text style={styles.bonusIcon}>✺</Text>
          <View style={styles.flex}>
            <Text style={styles.questTitle}>{t('quests.orbitBonus')}</Text>
            <View style={styles.bonusChips}><RewardChips celesti={dailyBonus.celesti} items={dailyBonus.items} /></View>
          </View>
          {daily.bonusClaimed ? <Text style={styles.claimedText}>✓</Text> : dailyAllClaimed && <Pressable onPress={onClaimDailyBonus} style={styles.claimButton}><Text style={styles.claimText}>{t('common.claim')}</Text></Pressable>}
        </View>
      </>}

      {tab === 'milestones' && milestoneTracks.map((track) => {
        const value = milestoneValue(track, ctx);
        const tierIndex = track.tiers.findIndex((_, index) => !claimedIds.includes(milestoneTierId(track, index)));
        const done = tierIndex === -1;
        const tier = done ? track.tiers[track.tiers.length - 1] : track.tiers[tierIndex];
        const ready = !done && value >= tier.target;
        return (
          <View key={track.id} style={[styles.milestone, ready && styles.questCardReady]}>
            <View style={styles.milestoneTop}>
              <View style={[styles.milestoneIcon, { borderColor: track.color }]}><Text style={[styles.milestoneIconText, { color: track.color }]}>{track.icon}</Text></View>
              <View style={styles.flex}>
                <Text style={styles.questTitle}>{t(tk(`milestone.${track.id}`))}</Text>
              </View>
              <View style={styles.tierPips}>{track.tiers.map((_, index) => <View key={index} style={[styles.tierPip, claimedIds.includes(milestoneTierId(track, index)) && { backgroundColor: track.color }]} />)}</View>
            </View>
            <View style={styles.progressRow}><View style={styles.flex}><AnimatedBar ratio={Math.min(1, value / tier.target)} color={track.color} height={6} /></View><Text style={styles.progressText}>{Math.min(value, tier.target)}/{tier.target}</Text></View>
            {!done && <View style={styles.questFooter}>
              <RewardChips celesti={tier.reward.celesti} items={tier.reward.items} />
              {ready && <Pressable onPress={() => onClaim(milestoneTierId(track, tierIndex), tier.reward)} style={styles.claimButton}><Text style={styles.claimText}>{t('common.claim')}</Text></Pressable>}
            </View>}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  disabled: { opacity: 0.4 },
  screen: { padding: 20, paddingBottom: 104, gap: 14 },
  tabs: { flexDirection: 'row', gap: 7 },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingVertical: 11, paddingHorizontal: 4, backgroundColor: '#29223D', borderColor: '#5C4E75', borderWidth: 1, borderRadius: 12 },
  tabActive: { backgroundColor: '#5A4378', borderColor: '#BCA4E1' },
  tabText: { color: '#F4EAFE', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6, flexShrink: 1 },
  badge: { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: palette.coral, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFFDF1', fontSize: 8, fontWeight: '900' },
  chapterPips: { flexDirection: 'row', justifyContent: 'space-between' },
  pip: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: '#6D598F', backgroundColor: '#2A2441', alignItems: 'center', justifyContent: 'center' },
  pipViewing: { borderColor: palette.gold, borderWidth: 2.5 },
  pipLocked: { opacity: 0.35 },
  pipText: { color: palette.text, fontSize: 11, fontWeight: '900' },
  chapterCard: { backgroundColor: '#3B2C61', borderWidth: 2, borderRadius: 22, padding: 18 },
  kicker: { fontSize: 9.5, fontWeight: '900', letterSpacing: 1.1 },
  chapterTitle: { color: palette.text, fontSize: 24, fontWeight: '900', marginTop: 4 },
  chapterCopy: { color: '#D8CDEB', fontSize: 11.5, lineHeight: 17, marginTop: 5 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9 },
  progressText: { color: '#F8E4A0', fontSize: 9, fontWeight: '900', minWidth: 30, textAlign: 'right' },
  bonusLabel: { color: '#BFAEDB', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.9, marginTop: 12, marginBottom: 5 },
  chapterButton: { marginTop: 12 },
  chapterRewards: { marginTop: 12 },
  completed: { color: '#9EF0B8', fontSize: 10, fontWeight: '900', letterSpacing: 1, textAlign: 'center', marginTop: 12 },
  questRow: { height: ROW, flexDirection: 'row', alignItems: 'center', gap: 10 },
  questRowReverse: { flexDirection: 'row-reverse' },
  node: { width: NODE, height: NODE, borderRadius: NODE / 2, backgroundColor: '#453565', borderWidth: 3, borderColor: '#8370A9', alignItems: 'center', justifyContent: 'center', shadowColor: '#0C0718', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  nodeReady: { backgroundColor: palette.coral, borderColor: '#FFE49A', shadowColor: palette.gold, shadowOpacity: 0.7, shadowRadius: 12 },
  nodeClaimed: { backgroundColor: '#4C9C78', borderColor: '#C8F2B9' },
  nodeIcon: { color: '#FFF4D0', fontSize: 22, fontWeight: '900' },
  questCard: { flex: 1, backgroundColor: palette.panel, borderRadius: 16, borderWidth: 1, borderColor: '#62507D', padding: 11 },
  questCardReady: { borderColor: palette.gold, backgroundColor: '#3E3158' },
  questCardClaimed: { borderColor: '#4E7A64', backgroundColor: '#29303F' },
  questTitle: { color: palette.text, fontSize: 12.5, fontWeight: '900' },
  questCopy: { color: '#C9BEDB', fontSize: 10, lineHeight: 14, marginTop: 3 },
  questFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 9 },
  claimButton: { backgroundColor: '#C99219', borderRadius: 9, borderBottomWidth: 3, borderBottomColor: '#8A6212', paddingHorizontal: 11, paddingVertical: 6 },
  claimText: { color: '#FFF9E8', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  goButton: { backgroundColor: '#3D5D78', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 },
  goText: { color: '#DDF5FF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  claimedText: { color: '#9FB6A9', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  nextChapter: { alignItems: 'center', backgroundColor: '#242033', borderRadius: 16, borderWidth: 1, borderColor: '#41394D', padding: 14 },
  nextKicker: { color: palette.faint, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  nextTitle: { color: '#E1D8EE', fontSize: 13, fontWeight: '900', marginTop: 3, textAlign: 'center' },
  nextCopy: { color: '#9F90BE', fontSize: 9.5, marginTop: 3, textAlign: 'center' },
  dailyHero: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#31455E', borderColor: '#6EABC8', borderWidth: 1, borderRadius: 20, padding: 17 },
  resetText: { color: '#FFE9A8', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  dailyRow: { flexDirection: 'row', gap: 11, backgroundColor: palette.panel, borderRadius: 17, borderWidth: 1, borderColor: '#62507D', padding: 12 },
  dailyIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#453565', borderWidth: 2.5, borderColor: '#8370A9', alignItems: 'center', justifyContent: 'center' },
  dailyIconText: { color: '#FFF4D0', fontSize: 19, fontWeight: '900' },
  bonusCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#3A2F1C', borderRadius: 18, borderWidth: 1, borderColor: '#8C7236', padding: 14 },
  bonusCardReady: { borderColor: palette.gold, backgroundColor: '#5A4520' },
  bonusIcon: { color: palette.gold, fontSize: 34, textShadowColor: '#FFF2A7', textShadowRadius: 10 },
  bonusChips: { marginTop: 7 },
  milestone: { backgroundColor: palette.panel, borderRadius: 17, borderWidth: 1, borderColor: '#62507D', padding: 12 },
  milestoneTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  milestoneIcon: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, backgroundColor: '#241A43', alignItems: 'center', justifyContent: 'center' },
  milestoneIconText: { fontSize: 19, fontWeight: '900' },
  tierPips: { flexDirection: 'row', gap: 3 },
  tierPip: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#463A5E' },
});

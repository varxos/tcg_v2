import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { playSound } from '../../audio/sound';
import { Rarity, collectionOrder, rarityTheme } from '../../data/catalog';
import { AppSettings, DevOdds, defaultDevOdds } from '../../game/save';
import { languages, tk, useI18n } from '../../i18n';
import { InfoButton, palette } from '../common';

function Toggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Pressable onPress={() => { playSound('toggle'); onChange(!value); }} hitSlop={8} style={[styles.toggle, value && styles.toggleOn]}>
      <View style={[styles.knob, value && styles.knobOn]} />
    </Pressable>
  );
}

function VolumeBar({ value, color, onChange, disabled }: { value: number; color: string; onChange: (value: number) => void; disabled: boolean }) {
  const steps = 10;
  const active = Math.round(value * steps);
  return (
    <View style={[styles.volume, disabled && styles.disabled]} pointerEvents={disabled ? 'none' : 'auto'}>
      {Array.from({ length: steps }, (_, index) => (
        <Pressable key={index} hitSlop={{ top: 10, bottom: 10 }} onPress={() => onChange((index + 1) / steps)} style={[styles.volumeStep, { height: 10 + index * 1.6, backgroundColor: index < active ? color : '#3A3052' }]} />
      ))}
      <Text style={styles.volumeValue}>{Math.round(value * 100)}%</Text>
    </View>
  );
}

// Rows stay a single line; the optional explanation hides behind an (i) button.
function Row({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <View style={styles.rowHead}><Text style={styles.rowTitle}>{title}</Text>{hint && <InfoButton onPress={() => setOpen((value) => !value)} />}</View>
        {hint && open && <Text style={styles.rowHint}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

type OddsKey = Rarity | 'golden';

function OddsStepper({ label, color, value, onStep, onHold, onRelease, onExact }: {
  label: string; color: string; value: number; onStep: (delta: number) => void; onHold: (delta: number) => void; onRelease: () => void; onExact: (text: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <View style={styles.oddsRow}>
      <View style={[styles.oddsDot, { backgroundColor: color }]} />
      <Text style={styles.oddsName} numberOfLines={1}>{label}</Text>
      <Pressable onPress={() => onStep(-1)} onLongPress={() => onHold(-1)} onPressOut={onRelease} delayLongPress={280} style={styles.oddsButton}><Text style={styles.oddsButtonText}>−</Text></Pressable>
      <View style={styles.oddsValue}>
        <TextInput value={draft ?? value.toFixed(2)} onFocus={() => setDraft(value.toFixed(2))} onChangeText={(text) => { setDraft(text); onExact(text); }} onBlur={() => setDraft(null)} keyboardType="decimal-pad" selectTextOnFocus style={styles.oddsInput} />
        <Text style={styles.oddsPercent}>%</Text>
      </View>
      <Pressable onPress={() => onStep(1)} onLongPress={() => onHold(1)} onPressOut={onRelease} delayLongPress={280} style={styles.oddsButton}><Text style={styles.oddsButtonText}>+</Text></Pressable>
    </View>
  );
}

// Replaces the old test star: developers can override every star's drop rates from here.
function DevOddsPanel({ value, onChange }: { value: DevOdds; onChange: (next: DevOdds) => void }) {
  const { t } = useI18n();
  const latest = useRef(value);
  latest.current = value;
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const release = () => {
    if (repeat.current) clearInterval(repeat.current);
    repeat.current = null;
  };
  useEffect(() => release, []);
  const clamp = (amount: number) => Math.max(0, Math.min(100, Number(amount.toFixed(2))));
  const apply = (key: OddsKey, amount: (current: number) => number) => {
    const current = latest.current;
    const next = key === 'golden' ? { ...current, golden: clamp(amount(current.golden)) } : { ...current, odds: { ...current.odds, [key]: clamp(amount(current.odds[key])) } };
    latest.current = next;
    onChange(next);
  };
  const step = (key: OddsKey, delta: number) => apply(key, (current) => current + delta);
  const hold = (key: OddsKey, delta: number) => {
    release();
    repeat.current = setInterval(() => step(key, delta), 110);
  };
  const exact = (key: OddsKey, text: string) => {
    const amount = Number(text.replace(',', '.'));
    if (Number.isFinite(amount)) apply(key, () => amount);
  };
  // Demons are never drawn from stars, so their rate is not editable.
  const rarities = collectionOrder.filter((rarity) => rarity !== 'Demonic');
  const total = rarities.reduce((sum, rarity) => sum + value.odds[rarity], 0);
  return (
    <View style={styles.devOdds}>
      <Row title={t('settings.customOdds')} hint={t('settings.customOddsHint')}><Toggle value={value.enabled} onChange={(enabled) => onChange({ ...latest.current, enabled })} /></Row>
      <View style={!value.enabled && styles.disabled} pointerEvents={value.enabled ? 'auto' : 'none'}>
        <Text style={[styles.oddsTotal, Math.abs(total - 100) > 0.01 && styles.oddsTotalWarn]}>{t('settings.oddsTotal', { value: total.toFixed(2) })}</Text>
        {rarities.map((rarity) => (
          <OddsStepper key={rarity} label={t(tk(`rarity.${rarity}`))} color={rarityTheme[rarity].accent} value={value.odds[rarity]} onStep={(delta) => step(rarity, delta)} onHold={(delta) => hold(rarity, delta)} onRelease={release} onExact={(text) => exact(rarity, text)} />
        ))}
        <OddsStepper label={t('settings.goldenChance')} color="#FFD54A" value={value.golden} onStep={(delta) => step('golden', delta)} onHold={(delta) => hold('golden', delta)} onRelease={release} onExact={(text) => exact('golden', text)} />
        <Pressable onPress={() => { playSound('toggle'); onChange({ ...defaultDevOdds(), enabled: latest.current.enabled }); }} style={styles.devReset}><Text style={styles.devResetText}>{t('settings.resetOdds')}</Text></Pressable>
      </View>
    </View>
  );
}

export function SettingsModal({ visible, onClose, settings, onChange, playerId, version, developerMode, onToggleDeveloper, onUnlockAll, onResetSave, devOdds, onDevOddsChange }: {
  visible: boolean; onClose: () => void; settings: AppSettings; onChange: (patch: Partial<AppSettings>) => void; playerId: string; version: string;
  developerMode: boolean; onToggleDeveloper: () => void; onUnlockAll: () => void; onResetSave: () => void; devOdds: DevOdds; onDevOddsChange: (next: DevOdds) => void;
}) {
  const { t } = useI18n();
  const previewVolume = () => setTimeout(() => playSound('reward', 0.7), 80);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View><Text style={styles.title}>{t('settings.title')}</Text></View>
          <Pressable onPress={() => { playSound('back'); onClose(); }} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.section}>{t('settings.language')}</Text>
          <View style={styles.card}>
            <View style={styles.languages}>
              {languages.map((language) => {
                const active = settings.language === language.id;
                return (
                  <Pressable key={language.id} onPress={() => { playSound('toggle'); onChange({ language: language.id }); }} style={[styles.language, active && styles.languageActive]}>
                    <Text style={styles.flag}>{language.flag}</Text>
                    <Text style={[styles.languageName, active && styles.languageNameActive]} numberOfLines={1}>{language.native}</Text>
                    {active && <Text style={styles.languageCheck}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Text style={styles.section}>{t('settings.audio')}</Text>
          <View style={styles.card}>
            <Row title={t('settings.sfx')}><Toggle value={settings.sfx} onChange={(sfx) => onChange({ sfx })} /></Row>
            <View style={styles.volumeRow}><Text style={styles.volumeLabel}>{t('settings.volume')}</Text><VolumeBar value={settings.sfxVolume} color={palette.gold} disabled={!settings.sfx} onChange={(sfxVolume) => { onChange({ sfxVolume }); previewVolume(); }} /></View>
            <View style={styles.divider} />
            <Row title={t('settings.music')}><Toggle value={settings.music} onChange={(music) => onChange({ music })} /></Row>
            <View style={styles.volumeRow}><Text style={styles.volumeLabel}>{t('settings.volume')}</Text><VolumeBar value={settings.musicVolume} color={palette.cyan} disabled={!settings.music} onChange={(musicVolume) => { playSound('tap'); onChange({ musicVolume }); }} /></View>
          </View>

          <Text style={styles.section}>{t('settings.gameplay')}</Text>
          <View style={styles.card}>
            <Row title={t('settings.haptics')}><Toggle value={settings.haptics} onChange={(haptics) => onChange({ haptics })} /></Row>
            <View style={styles.divider} />
            <Row title={t('settings.battleSpeed')}>
              <View style={styles.segment}>
                {(['normal', 'fast'] as const).map((speed) => (
                  <Pressable key={speed} onPress={() => { playSound('toggle'); onChange({ battleSpeed: speed }); }} style={[styles.segmentItem, settings.battleSpeed === speed && styles.segmentItemActive]}>
                    <Text style={[styles.segmentText, settings.battleSpeed === speed && styles.segmentTextActive]}>{speed === 'normal' ? t('settings.normal') : t('settings.fast')}</Text>
                  </Pressable>
                ))}
              </View>
            </Row>
            <View style={styles.divider} />
            <Row title={t('settings.quickOpen')} hint={t('settings.quickOpenHint')}><Toggle value={settings.quickOpen} onChange={(quickOpen) => onChange({ quickOpen })} /></Row>
          </View>

          <Text style={styles.section}>{t('settings.about')}</Text>
          <View style={styles.card}>
            <Row title={t('settings.version')}><Text style={styles.value}>{version}</Text></Row>
            <View style={styles.divider} />
            <Row title={t('settings.playerId')}><Text style={styles.value}>{playerId}</Text></Row>
            <View style={styles.divider} />
            <Row title={t('settings.credits')} hint={t('settings.creditsCopy')} />
          </View>

          <Text style={styles.section}>{t('settings.data')}</Text>
          <Pressable onPress={() => { playSound('error'); onResetSave(); }} style={styles.danger}><Text style={styles.dangerText}>{t('settings.resetSave')}</Text></Pressable>

          <Text style={styles.section}>{t('settings.developer')}</Text>
          <View style={[styles.card, styles.devCard]}>
            <Row title={t('settings.developerMode')}><Toggle value={developerMode} onChange={onToggleDeveloper} /></Row>
            {developerMode && <DevOddsPanel value={devOdds} onChange={onDevOddsChange} />}
            <Pressable onPress={() => { playSound('unlock'); onUnlockAll(); }} style={styles.devButton}><Text style={styles.devButtonText}>{t('settings.unlockAll')}</Text></Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  disabled: { opacity: 0.35 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 15, borderBottomColor: '#413260', borderBottomWidth: 1 },
  title: { color: palette.text, fontSize: 24, fontWeight: '900', letterSpacing: 0.8 },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.panel, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: palette.text, fontSize: 28, lineHeight: 30 },
  content: { padding: 18, paddingBottom: 50, gap: 8 },
  section: { color: '#AFA1C8', fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginTop: 10, marginLeft: 4 },
  card: { backgroundColor: '#2A2441', borderRadius: 18, borderWidth: 1, borderColor: '#5B4E70', padding: 14 },
  languages: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  language: { width: '48.4%', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#211B34', borderRadius: 11, borderWidth: 1, borderColor: '#4A3F62', paddingHorizontal: 10, paddingVertical: 9 },
  languageActive: { borderColor: palette.gold, backgroundColor: '#3B3158' },
  flag: { fontSize: 16 },
  languageName: { flex: 1, color: '#DCD2ED', fontSize: 11, fontWeight: '800' },
  languageNameActive: { color: palette.text, fontWeight: '900' },
  languageCheck: { color: palette.gold, fontSize: 12, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { color: palette.text, fontSize: 12.5, fontWeight: '900' },
  rowHint: { color: '#A99DBA', fontSize: 9, lineHeight: 13, marginTop: 2 },
  value: { color: palette.cyan, fontSize: 11, fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#3E3456', marginVertical: 10 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#3A3052', borderWidth: 1, borderColor: '#5B4E70', padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: '#3E9C6E', borderColor: '#84D6A3' },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#C6B8DE' },
  knobOn: { backgroundColor: '#FFF9E8', transform: [{ translateX: 20 }] },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  volumeLabel: { color: '#BFB4CF', fontSize: 9, fontWeight: '900', width: 56 },
  volume: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  volumeStep: { flex: 1, borderRadius: 3 },
  volumeValue: { color: palette.text, fontSize: 9, fontWeight: '900', width: 36, textAlign: 'right' },
  segment: { flexDirection: 'row', backgroundColor: '#211B34', borderRadius: 10, padding: 3, borderWidth: 1, borderColor: '#4A3F62' },
  segmentItem: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8 },
  segmentItemActive: { backgroundColor: palette.gold },
  segmentText: { color: '#CFC3E4', fontSize: 9, fontWeight: '900' },
  segmentTextActive: { color: '#403154' },
  danger: { backgroundColor: '#5A3448', borderRadius: 14, borderWidth: 1, borderColor: '#8B5266', paddingVertical: 14, alignItems: 'center' },
  dangerText: { color: '#FFE4E8', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  devCard: { backgroundColor: '#39263B', borderColor: '#8B5266', gap: 10 },
  devButton: { backgroundColor: '#B54755', borderRadius: 10, padding: 12, alignItems: 'center' },
  devButtonText: { color: '#FFF5E9', fontSize: 9, fontWeight: '900', letterSpacing: 0.4, textAlign: 'center' },
  devOdds: { backgroundColor: '#2C1D2E', borderRadius: 14, borderWidth: 1, borderColor: '#6E4254', padding: 11 },
  oddsTotal: { color: '#FFB4A8', fontSize: 9, fontWeight: '900', letterSpacing: 0.8, textAlign: 'right', marginTop: 8, marginBottom: 2 },
  oddsTotalWarn: { color: '#FF7B71' },
  oddsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#4B2D39' },
  oddsDot: { width: 7, height: 7, borderRadius: 4 },
  oddsName: { flex: 1, color: '#F2DFE3', fontSize: 11, fontWeight: '800' },
  oddsButton: { width: 29, height: 27, borderRadius: 8, backgroundColor: '#582B3A', borderWidth: 1, borderColor: '#9C4B5B', alignItems: 'center', justifyContent: 'center' },
  oddsButtonText: { color: '#FFEAE3', fontSize: 17, lineHeight: 19, fontWeight: '900' },
  oddsValue: { width: 66, height: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#241620', borderRadius: 7, borderWidth: 1, borderColor: '#754252' },
  oddsInput: { width: 46, color: '#FFF7F1', fontSize: 11, fontWeight: '900', textAlign: 'right', paddingVertical: 0 },
  oddsPercent: { color: '#F1B9BE', fontSize: 10, fontWeight: '900', marginLeft: 1 },
  devReset: { alignSelf: 'center', marginTop: 10, paddingHorizontal: 12, paddingVertical: 6 },
  devResetText: { color: '#E1A9B2', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
});

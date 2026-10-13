import { useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playSound } from '../audio/sound';
import { catalog } from '../data/catalog';
import { cardById, typeChart, typeForCard, typeTheme } from '../game/creatures';
import { tk, useI18n } from '../i18n';
import { CreatureAvatar, GameButton, TypeChip, palette } from './common';

export const starterIds = ['moss', 'dawn-common-11', 'celestial-common-5'];

export function StarterPicker({ visible, onChoose }: { visible: boolean; onChoose: (cardId: string) => void }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState(starterIds[0]);
  const selectedCard = cardById.get(selected) ?? catalog[0];
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={() => undefined}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.stars}>✦   ✧   ✦</Text>
          <Text style={styles.title}>{t('starter.title')}</Text>
          {starterIds.map((id) => {
            const card = cardById.get(id) ?? catalog[0];
            const type = typeForCard(card);
            const theme = typeTheme[type];
            const active = id === selected;
            return (
              <Pressable key={id} onPress={() => { playSound('tap'); setSelected(id); }} style={[styles.option, { borderColor: active ? theme.color : '#5B4E70', backgroundColor: active ? theme.deep : '#2A2441' }]}>
                <CreatureAvatar card={card} size={90} ring={theme.color} />
                <View style={styles.flex}>
                  <Text style={styles.name}>{card.name}</Text>
                  <View style={styles.chips}><TypeChip type={type} /></View>
                  {/* Details only unfold on the chosen starter. */}
                  {active && <>
                    <Text style={styles.description} numberOfLines={3}>{t(tk(`lore.${id}`))}</Text>
                    <Text style={[styles.strong, { color: theme.color }]}>{t('starter.strongVs', { types: typeChart[type].strong.map((entry) => t(tk(`type.${entry}`))).join(' & ') })}</Text>
                  </>}
                </View>
                <View style={[styles.radio, active && { borderColor: theme.color }]}>{active && <View style={[styles.radioDot, { backgroundColor: theme.color }]} />}</View>
              </Pressable>
            );
          })}
          <GameButton label={t('starter.begin', { name: selectedCard.name.toUpperCase() })} sound="unlock" onPress={() => onChoose(selected)} style={styles.button} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  content: { padding: 22, paddingTop: 34, gap: 12 },
  stars: { color: palette.gold, fontSize: 18, textAlign: 'center', textShadowColor: '#FFF2A7', textShadowRadius: 10 },
  title: { color: palette.text, fontSize: 30, fontWeight: '900', textAlign: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, borderWidth: 2, padding: 12 },
  name: { color: palette.text, fontSize: 18, fontWeight: '900' },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  description: { color: '#D8CDEB', fontSize: 10, lineHeight: 14, marginTop: 6 },
  strong: { fontSize: 8.5, fontWeight: '900', marginTop: 5, letterSpacing: 0.3 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#6D598F', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  button: { marginTop: 8 },
});

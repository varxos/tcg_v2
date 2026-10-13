import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Pressable, Text, View } from 'react-native';
import { Card, rarityTheme } from '../data/catalog';
import { tk, useI18n } from '../i18n';
import { styles } from './appStyles';
import { CreatureArt } from './creatures/CreatureArt';

// The artwork is a square vector scene: it is centred and cropped by the card frame.
// The scrim at the foot of the card keeps the name readable whatever the artwork behind it.
const cardArt = {
  holder: { alignItems: 'center' as const, justifyContent: 'center' as const },
  scrim: { position: 'absolute' as const, left: 0, right: 0, bottom: 0, height: '46%' as const },
};

// Demon artwork is dark at the bottom, so their names switch to a light ink.
const demonName = { color: '#FFE3E8', textShadowColor: '#000000', textShadowRadius: 4 };

export function GoldenBorderFill({ shimmer, large, frame = false }: { shimmer: Animated.Value; large: boolean; frame?: boolean }) {
  const distance = frame ? 530 : large ? 290 : 155;
  const travel = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-distance, distance] });
  return <View pointerEvents="none" style={styles.goldenBorderFill}>
    <View style={styles.goldenBorderBase} />
    <Animated.View style={[styles.goldenBorderReflection, large && styles.goldenBorderReflectionLarge, frame && styles.goldenBorderReflectionFrame, { transform: [{ translateX: travel }, { rotate: '-18deg' }] }]}>
      <LinearGradient colors={['transparent', '#FFE072', '#FFFBE7', '#FFFFFF', '#FFE072', 'transparent']} locations={[0, 0.2, 0.38, 0.5, 0.72, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.goldenBorderReflectionGradient} />
    </Animated.View>
  </View>;
}

export function MiniCard({ card, large = false, golden = false, locked = false, shimmer }: { card: Card; large?: boolean; golden?: boolean; locked?: boolean; shimmer?: Animated.Value }) {
  const { t } = useI18n();
  const theme = rarityTheme[card.rarity];
  return (
    <View style={[styles.card, large && styles.cardLarge, golden && styles.goldenCardShell, locked && styles.cardLocked, { backgroundColor: golden ? '#C99219' : locked ? '#343040' : theme.color, borderColor: locked ? '#554E64' : golden ? 'transparent' : theme.accent }]}>
      {golden && shimmer && <GoldenBorderFill shimmer={shimmer} large={large} />}
      <View style={[styles.cardContent, golden && styles.goldenCardInner, golden && large && styles.goldenCardInnerLarge, golden && { backgroundColor: locked ? '#343040' : theme.color }]}>
        <View style={[styles.cardArtwork, locked && styles.cardArtworkLocked, cardArt.holder]} pointerEvents="none">
          <CreatureArt card={card} size={large ? 204 : 108} animated={large && !locked} />
        </View>
        <LinearGradient colors={['transparent', 'rgba(10,6,22,.82)']} style={cardArt.scrim} pointerEvents="none" />
        <View style={[styles.cardTop, { backgroundColor: locked ? '#4A4356' : golden ? '#9E6C15' : theme.accent }]}>
          <Text style={styles.cardRarity} numberOfLines={1}>{golden ? t('collection.golden') : t(tk(`rarity.${card.rarity}`)).toUpperCase()}</Text>
        </View>
        <Text style={[styles.cardName, large && styles.cardNameLarge, locked && styles.cardNameLocked, card.rarity === 'Demonic' && !locked && demonName]} numberOfLines={1}>{card.name}</Text>
        <View style={[styles.cardGem, { backgroundColor: locked ? '#777082' : golden ? '#FFE99A' : theme.accent }]} />
      </View>
    </View>
  );
}

export const isSecretCard = (card: Card, owned: boolean) => (card.rarity === 'Legendary' || card.rarity === 'Angelic') && !owned;

export function CollectionSlot({ card, count, goldenCount = 0, onPress, shimmer }: { card: Card; count: number; goldenCount?: number; onPress: () => void; shimmer?: Animated.Value }) {
  const { t } = useI18n();
  const hasGolden = goldenCount > 0;
  if (isSecretCard(card, count > 0 || hasGolden)) return <Pressable onPress={onPress} style={[styles.collectionSlot, styles.collectionSecret]}><Text style={styles.secretQuestion}>?</Text><Text style={styles.secretCaption}>{t('collection.unknown')}</Text></Pressable>;
  return (
    <Pressable onPress={onPress} style={styles.collectionSlot}>
      <MiniCard card={card} golden={hasGolden} locked={count === 0 && !hasGolden} shimmer={shimmer} />
      {count > 0 && <View style={styles.countBubble}><Text style={styles.countText}>×{count}</Text></View>}
    </Pressable>
  );
}

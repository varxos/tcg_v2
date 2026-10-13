import { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleProp, View, ViewStyle } from 'react-native';
import { Card, Rarity } from '../../data/catalog';
import { typeForCard, typeTheme } from '../../game/creatures';
import { CreatureSprite, SpriteView } from './CreatureSprite';
import { paintedArtwork } from './paintedArt';
import { SPRITE_CANVAS, cardBackdrops, raysOverlay } from './sprites';

// Card illustration: the type's painted sky, light rays for the highest rarities, then the creature.
// full = the creature canvas fills the square; fit = the whole creature stands inside it; head = avatar close-up.
export type ArtFraming = 'full' | 'fit' | 'head';
export type CreatureArtProps = {
  card: Card; size: number;
  /** Frame height when it differs from the width: the sky covers the frame and the whole creature fits its height. */
  height?: number;
  view?: SpriteView; dim?: boolean; background?: boolean; animated?: boolean; framing?: ArtFraming; style?: StyleProp<ViewStyle>;
};

const radiant = new Set<Rarity>(['Legendary', 'Angelic', 'Demonic']);
const HEAD_Y = 236;

function Rays({ size, color, animated }: { size: number; color: string; animated: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 48000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [animated, spin]);
  const box = size * 1.6;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.Image source={raysOverlay} fadeDuration={0} style={{ position: 'absolute', left: (size - box) / 2, top: (size - box) / 2 - size * 0.06, width: box, height: box, tintColor: color, opacity: 0.5, transform: [{ rotate }] }} />;
}

export const CreatureArt = memo(function CreatureArt({ card, size, height: frameHeight, view = 'front', dim = false, background = true, animated = false, framing = 'full', style }: CreatureArtProps) {
  const painting = background && view === 'front' ? paintedArtwork[card.id] : undefined;
  const type = typeForCard(card);
  const height = frameHeight ?? size;
  let inner: number; let left: number; let top: number;
  if (frameHeight !== undefined) {
    // Sized for the biggest creatures (horns and crowns reach canvas row -20, feet row 570, wings span -60 to 660).
    inner = height * 0.94; left = (size - inner) / 2; top = height * 0.5 - inner * (285 / SPRITE_CANVAS);
  } else {
    inner = size * (framing === 'head' ? 1.42 : framing === 'fit' ? 0.88 : 1);
    left = (size - inner) / 2;
    top = framing === 'head' ? size * 0.47 - inner * (HEAD_Y / SPRITE_CANVAS) : framing === 'fit' ? size * 0.02 : 0;
  }
  // The painted skies are 3:4 portraits: cover the frame whatever its shape.
  const skyWidth = Math.max(size, height * 0.75);
  const skyHeight = skyWidth * (4 / 3);
  return (
    <View style={[{ width: size, height, overflow: 'hidden' }, style]} pointerEvents="none">
      <View style={{ width: size, height, opacity: dim ? 0.32 : 1 }}>
        {painting ? (
          <Image source={painting} fadeDuration={0} resizeMode="cover" style={{ width: size, height: size * (4 / 3), marginTop: frameHeight !== undefined ? (height - size * (4 / 3)) / 2 : -size * (framing === 'head' ? 0.3 : 0.15) }} />
        ) : (
          <>
            {background && <Image source={cardBackdrops[type]} fadeDuration={0} style={{ position: 'absolute', left: (size - skyWidth) / 2, top: (height - skyHeight) / 2, width: skyWidth, height: skyHeight }} />}
            {background && radiant.has(card.rarity) && <Rays size={Math.max(size, height)} color={typeTheme[type].color} animated={animated} />}
            <View style={{ position: 'absolute', left, top }}>
              <CreatureSprite card={card} size={inner} view={view} animated={animated} />
            </View>
          </>
        )}
      </View>
    </View>
  );
});

import { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { Card } from '../../data/catalog';
import { CreatureSprite as SpriteData, NECK, SPRITE_CANVAS, SpriteLayer, WingMotion, creatureSprites } from './sprites';

// A painted creature is cut into layers (body, head, one wing mirrored for the other side) so each part
// can move on its own: the head sways about the neck, wings beat about the shoulder, the body breathes.
export type SpriteView = 'front' | 'back';
export type SpritePose = { lunge?: Animated.Value; flash?: Animated.Value };

const GROUND = 560;
const place = (layer: SpriteLayer, k: number) => ({ position: 'absolute' as const, left: layer.x * k, top: layer.y * k, width: layer.w * k, height: layer.h * k });
const full = (size: number) => ({ position: 'absolute' as const, left: 0, top: 0, width: size, height: size });
const degrees = (value: Animated.AnimatedInterpolation<number> | Animated.AnimatedAddition<number>) => value.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });

// React Native rotates about a view's centre; translating to the pivot and back rotates about the pivot.
const aroundPivot = (layer: SpriteLayer, k: number, px: number, py: number, rotate: Animated.AnimatedInterpolation<string>) => {
  const dx = (px - (layer.x + layer.w / 2)) * k;
  const dy = (py - (layer.y + layer.h / 2)) * k;
  return [{ translateX: dx }, { translateY: dy }, { rotate }, { translateX: -dx }, { translateY: -dy }];
};

const wingBeats: Record<WingMotion, { duration: number; up: number; down: number }> = {
  flap: { duration: 900, up: -15, down: 13 },
  flutter: { duration: 230, up: -11, down: 9 },
  wave: { duration: 1600, up: -7, down: 8 },
  snap: { duration: 1300, up: -13, down: 5 },
};

function StaticSprite({ sprite, size, view }: { sprite: SpriteData; size: number; view: SpriteView }) {
  const k = size / SPRITE_CANVAS;
  const { body, head } = sprite[view];
  const wing = sprite.wing;
  const wings = wing ? (
    <>
      <View style={[full(size), { transform: [{ scaleX: -1 }] }]}><Image source={wing.src} style={place(wing, k)} fadeDuration={0} /></View>
      <Image source={wing.src} style={place(wing, k)} fadeDuration={0} />
    </>
  ) : null;
  return (
    <View style={{ width: size, height: size }}>
      {view === 'front' && wings}
      <Image source={body.src} style={place(body, k)} fadeDuration={0} />
      {view === 'back' && wings}
      <Image source={head.src} style={place(head, k)} fadeDuration={0} />
    </View>
  );
}

// Seamless idle motion: a loop always restarts its value at 0, so each motion is driven by a linear clock
// looping 0→1 and read through a finely sampled cosine. The restart lands on exactly the same pose (no jump),
// and a per-creature phase keeps two creatures from moving in lockstep.
const SAMPLES = Array.from({ length: 33 }, (_, i) => i / 32);
const wave = (clock: Animated.Value, phase: number) => clock.interpolate({
  inputRange: SAMPLES,
  outputRange: SAMPLES.map((t) => 0.5 - 0.5 * Math.cos(2 * Math.PI * (t + phase))),
});
const useClock = (duration: number) => {
  const clock = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    clock.setValue(0);
    const loop = Animated.loop(Animated.timing(clock, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [clock, duration]);
  return clock;
};

function AnimatedSprite({ sprite, size, view, pose, lean }: { sprite: SpriteData; size: number; view: SpriteView; pose?: SpritePose; lean: number }) {
  const k = size / SPRITE_CANVAS;
  const motion = sprite.wing?.motion ?? 'flap';
  const phases = useRef([Math.random(), Math.random(), Math.random()]).current;
  const breath = wave(useClock(sprite.floating ? 2200 : 2600), phases[0]);
  const sway = wave(useClock(3700), phases[1]);
  const beat = wave(useClock(wingBeats[motion].duration), phases[2]);
  const still = useRef(new Animated.Value(0)).current;

  const lunge = pose?.lunge ?? still;
  const flash = pose?.flash ?? still;
  const { body, head } = sprite[view];
  const ground = GROUND * k - size / 2;

  // Whole creature: breathing (or hovering) anchored to the ground, squashed by a hit.
  const breatheY = breath.interpolate({ inputRange: [0, 1], outputRange: [1, sprite.floating ? 1.01 : 1.028] });
  const hover = breath.interpolate({ inputRange: [0, 1], outputRange: sprite.floating ? [size * 0.018, -size * 0.018] : [0, 0] });
  const squashY = flash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] });
  const squashX = flash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const bodyTransform = [{ translateY: hover }, { translateY: ground }, { scaleY: Animated.multiply(breatheY, squashY) }, { scaleX: squashX }, { translateY: -ground }];

  // Head: a slow sway about the neck, thrown toward the foe when attacking and pulled back on the wind-up.
  const headAngle = degrees(Animated.add(
    sway.interpolate({ inputRange: [0, 1], outputRange: [-2.6, 2.6] }),
    lunge.interpolate({ inputRange: [-1, 0, 1], outputRange: [-9 * lean, 0, 12 * lean] }),
  ));
  const headTransform = aroundPivot(head, k, NECK.x, NECK.y, headAngle);

  // Wings: steady beat, one big extra downstroke on the attack.
  const wing = sprite.wing;
  const beatSpec = wingBeats[motion];
  const wingAngle = wing ? degrees(Animated.add(
    beat.interpolate({ inputRange: [0, 1], outputRange: [beatSpec.up, beatSpec.down] }),
    lunge.interpolate({ inputRange: [-1, 0, 1], outputRange: [-22, 0, 20] }),
  )) : null;
  const wingView = wing && wingAngle ? <Animated.Image source={wing.src} fadeDuration={0} style={[place(wing, k), { transform: aroundPivot(wing, k, wing.px, wing.py, wingAngle) }]} /> : null;
  const wings = wingView ? (
    <>
      <View style={[full(size), { transform: [{ scaleX: -1 }] }]}>{wingView}</View>
      {wingView}
    </>
  ) : null;

  return (
    <Animated.View style={{ width: size, height: size, transform: bodyTransform }}>
      {view === 'front' && wings}
      <Image source={body.src} style={place(body, k)} fadeDuration={0} />
      {view === 'back' && wings}
      <Animated.View style={[full(size), { transform: headTransform }]}>
        <Image source={head.src} style={place(head, k)} fadeDuration={0} />
      </Animated.View>
      {pose?.flash && (
        <Animated.View pointerEvents="none" style={[full(size), { opacity: flash }]}>
          <Image source={body.src} style={[place(body, k), { tintColor: '#FFFFFF' }]} fadeDuration={0} />
          <Animated.View style={[full(size), { transform: headTransform }]}>
            <Image source={head.src} style={[place(head, k), { tintColor: '#FFFFFF' }]} fadeDuration={0} />
          </Animated.View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

export const hasSprite = (card: Card) => Boolean(creatureSprites[card.id]);

export const CreatureSprite = memo(function CreatureSprite({ card, size, view = 'front', animated = false, pose, lean = 1 }: {
  card: Card; size: number; view?: SpriteView; animated?: boolean; pose?: SpritePose;
  /** +1 when the foe is to the right (player side), -1 when it is to the left. */
  lean?: number;
}) {
  const sprite = creatureSprites[card.id];
  if (!sprite) return null;
  return animated ? <AnimatedSprite sprite={sprite} size={size} view={view} pose={pose} lean={lean} /> : <StaticSprite sprite={sprite} size={size} view={view} />;
});

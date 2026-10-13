import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../../data/catalog';
import { voidVariantOf, voidVariants } from '../../game/void';
import { CreatureAvatar } from '../common';
import { BlackHole } from '../void/BlackHole';

type FrameStyle = { ring: string; glow: string | null; width: number; ornament?: 'crown' | 'astral' | 'wave' | 'sigil' };
export const frameStyles: Record<string, FrameStyle> = {
  basic: { ring: '#B6A4D5', glow: null, width: 0.05 },
  wave: { ring: '#69CDEE', glow: '#69CDEE', width: 0.06, ornament: 'wave' },
  astral: { ring: '#BBA0FF', glow: '#BBA0FF', width: 0.06, ornament: 'astral' },
  sigil: { ring: '#8FE4FF', glow: '#8FE4FF', width: 0.05, ornament: 'sigil' },
  crown: { ring: '#FFD54A', glow: '#FFD54A', width: 0.07, ornament: 'crown' },
};

export function PlayerAvatar({ card, size, frameId = 'basic' }: { card: Card | null; size: number; frameId?: string }) {
  const voidVariant = voidVariantOf(frameId);
  if (voidVariant) {
    // Black hole frames: the avatar becomes the event horizon, wrapped by the lensed ring and the accretion disk.
    const outer = size * (size < 60 ? 1.55 : 1.8);
    const inner = Math.round(size * 0.84);
    const ring = voidVariants[voidVariant].ring;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View pointerEvents="none" style={{ position: 'absolute', left: (size - outer) / 2, top: (size - outer) / 2 }}>
          <BlackHole size={outer} variant={voidVariant} shadowRatio={inner / 2 / outer} tilt={-14} particles={size >= 60} frame>
            {card
              ? <CreatureAvatar card={card} size={inner} ring={ring} style={{ borderWidth: Math.max(1.5, Math.round(size * 0.025)) }} />
              : <Text style={[styles.fallbackStar, { fontSize: inner * 0.5 }]}>✦</Text>}
          </BlackHole>
        </View>
      </View>
    );
  }
  const frame = frameStyles[frameId] ?? frameStyles.basic;
  const inner = Math.round(size * (frame.ornament === 'sigil' ? 0.84 : 0.92));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {frame.glow && <View style={[styles.glow, { width: size * 1.14, height: size * 1.14, borderRadius: size, backgroundColor: frame.glow }]} />}
      {frame.ornament === 'sigil' && <View style={[styles.outerRing, { width: size, height: size, borderRadius: size / 2, borderColor: frame.ring, borderWidth: Math.max(1.5, size * 0.03) }]} />}
      {card ? (
        <CreatureAvatar card={card} size={inner} ring={frame.ring} style={{ borderWidth: Math.max(2, Math.round(size * frame.width)) }} />
      ) : (
        <View style={[styles.fallback, { width: inner, height: inner, borderRadius: inner / 2, borderColor: frame.ring, borderWidth: Math.max(2, Math.round(size * frame.width)) }]}>
          <Text style={[styles.fallbackStar, { fontSize: inner * 0.5 }]}>✦</Text>
        </View>
      )}
      {frame.ornament === 'crown' && <Text style={[styles.ornament, { top: -size * 0.2, fontSize: size * 0.3, color: '#FFD54A' }]}>♛</Text>}
      {frame.ornament === 'astral' && <>
        <Text style={[styles.ornament, { top: -size * 0.04, right: -size * 0.02, fontSize: size * 0.2, color: '#E4D6FF' }]}>✦</Text>
        <Text style={[styles.ornament, { bottom: size * 0.02, left: -size * 0.05, fontSize: size * 0.15, color: '#BBA0FF' }]}>✧</Text>
      </>}
      {frame.ornament === 'wave' && <Text style={[styles.ornament, { bottom: -size * 0.1, fontSize: size * 0.22, color: '#8FE4FF' }]}>≈</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', opacity: 0.22 },
  outerRing: { position: 'absolute' },
  fallback: { backgroundColor: '#282448', alignItems: 'center', justifyContent: 'center' },
  fallbackStar: { color: '#FFF2C1', textShadowColor: '#8FE4FF', textShadowRadius: 8 },
  ornament: { position: 'absolute', fontWeight: '900', textShadowColor: '#0B0818', textShadowRadius: 4 },
});

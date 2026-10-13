import { memo, useId, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { hashSeed } from '../../game/creatures';
import { VoidVariant, voidVariants } from '../../game/void';
import { seeded } from '../stars/StarSky';
import { BlackHole } from './BlackHole';

// Profile banner variant: the animated black hole drifting in its own tinted night.
function VoidBannerBase({ variant, shade = true }: { variant: VoidVariant; shade?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [box, setBox] = useState({ width: 0, height: 0 });
  const colors = voidVariants[variant];
  const stars = useMemo(() => {
    const random = seeded(hashSeed(`void-banner-${variant}`));
    return Array.from({ length: 46 }, () => ({ x: random(), y: random(), r: 0.4 + random() * 1.2, o: 0.2 + random() * 0.7 }));
  }, [variant]);
  const { width, height } = box;
  const size = Math.min(height * 1.9, width * 1.05);
  return (
    <View style={StyleSheet.absoluteFill} onLayout={(event) => setBox({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
      {width > 0 && <>
        <Svg width={width} height={height} style={styles.abs}>
          <Defs>
            <LinearGradient id={`${uid}bg`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#040208" />
              <Stop offset="0.6" stopColor="#0A0614" />
              <Stop offset="1" stopColor="#140A1E" />
            </LinearGradient>
            <RadialGradient id={`${uid}neb`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.glow} stopOpacity={0.32} />
              <Stop offset="1" stopColor={colors.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill={`url(#${uid}bg)`} />
          <Circle cx={width * 0.62} cy={height * 0.5} r={width * 0.62} fill={`url(#${uid}neb)`} />
          {stars.map((star, index) => <Circle key={index} cx={star.x * width} cy={star.y * height} r={star.r} fill="#FFFFFF" opacity={star.o} />)}
        </Svg>
        <View style={[styles.abs, { left: width * 0.62 - size / 2, top: height / 2 - size / 2 }]}>
          <BlackHole size={size} variant={variant} particles={height > 90} tilt={-10} />
        </View>
        {shade && (
          <Svg width={width} height={height} style={styles.abs}>
            <Defs><LinearGradient id={`${uid}shade`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0.45" stopColor="#0A0617" stopOpacity={0} /><Stop offset="1" stopColor="#0A0617" stopOpacity={0.55} /></LinearGradient></Defs>
            <Rect x={0} y={0} width={width} height={height} fill={`url(#${uid}shade)`} />
          </Svg>
        )}
      </>}
    </View>
  );
}

export const VoidBanner = memo(VoidBannerBase);

const styles = StyleSheet.create({ abs: { position: 'absolute', left: 0, top: 0 } });

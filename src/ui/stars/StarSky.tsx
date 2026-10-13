import { memo, useEffect, useId, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { hashSeed } from '../../game/creatures';

export const seeded = (seed: number) => {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 10000) / 10000;
  };
};

function SkyTwinkle({ x, y, delay, color, size }: { x: number; y: number; delay: number; color: string; size: number }) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.delay(1500),
    ]));
    loop.start();
    return () => loop.stop();
  }, [delay, value]);
  return <Animated.Text style={[styles.twinkle, { left: x - 10, top: y - 10, color, fontSize: size, opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.95] }), transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.1] }) }] }]}>✦</Animated.Text>;
}

export type SkyLine = { x1: number; y1: number; x2: number; y2: number; color?: string };

// The same deep-space language as the constellation skies: gradient night, tinted nebulae, a faint galactic band and dotted star lines.
function StarSkyBase({ width, height, colorA, colorB, seed, lines = [], pedestal, density = 70, twinkles = 6, radius = 26 }: {
  width: number; height: number; colorA: string; colorB: string; seed: string; lines?: SkyLine[];
  pedestal?: { x: number; y: number; rx: number }; density?: number; twinkles?: number; radius?: number;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const stars = useMemo(() => {
    const random = seeded(hashSeed(`${seed}-${Math.round(width)}-${Math.round(height)}`));
    return Array.from({ length: density }, () => ({ x: random() * width, y: random() * height, r: 0.35 + random() * 1.25, o: 0.2 + random() * 0.7 }));
  }, [seed, width, height, density]);
  const sparkles = useMemo(() => {
    const random = seeded(hashSeed(`${seed}-twinkle`));
    return Array.from({ length: twinkles }, (_, index) => ({ x: 14 + random() * (width - 28), y: 14 + random() * (height - 28), delay: index * 610, size: 7 + random() * 8 }));
  }, [seed, width, height, twinkles]);
  return (
    <View pointerEvents="none" style={[styles.sky, { width, height, borderRadius: radius }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#03081A" />
            <Stop offset="0.55" stopColor="#0A1938" />
            <Stop offset="1" stopColor="#1A1440" />
          </LinearGradient>
          <RadialGradient id={`${id}a`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colorA} stopOpacity={0.36} />
            <Stop offset="1" stopColor={colorA} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}b`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colorB} stopOpacity={0.34} />
            <Stop offset="1" stopColor={colorB} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}band`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#DCE6FF" stopOpacity={0.12} />
            <Stop offset="1" stopColor="#DCE6FF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}ped`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colorA} stopOpacity={0.55} />
            <Stop offset="1" stopColor={colorA} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${id}bg)`} />
        <Ellipse cx={width * 0.5} cy={height * 0.45} rx={width * 0.95} ry={height * 0.17} fill={`url(#${id}band)`} transform={`rotate(-24 ${width * 0.5} ${height * 0.45})`} />
        <Circle cx={width * 0.78} cy={height * 0.22} r={width * 0.62} fill={`url(#${id}a)`} />
        <Circle cx={width * 0.12} cy={height * 0.86} r={width * 0.55} fill={`url(#${id}b)`} />
        {stars.map((star, index) => <Circle key={index} cx={star.x} cy={star.y} r={star.r} fill="#FFFFFF" opacity={star.o} />)}
        {lines.map((line, index) => <Line key={`l${index}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={line.color ?? '#A9B8DD'} strokeOpacity={0.5} strokeWidth={1.1} strokeDasharray="3 6" strokeLinecap="round" />)}
        {pedestal && <Ellipse cx={pedestal.x} cy={pedestal.y} rx={pedestal.rx} ry={pedestal.rx * 0.2} fill={`url(#${id}ped)`} />}
      </Svg>
      {sparkles.map((sparkle, index) => <SkyTwinkle key={index} {...sparkle} color={index % 2 ? '#FFFFFF' : colorA} />)}
    </View>
  );
}

export const StarSky = memo(StarSkyBase);

const styles = StyleSheet.create({
  sky: { position: 'absolute', top: 0, left: 0, overflow: 'hidden', backgroundColor: '#050B1F' },
  twinkle: { position: 'absolute', width: 20, height: 20, textAlign: 'center', lineHeight: 20, fontWeight: '900' },
});

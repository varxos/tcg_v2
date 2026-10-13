import { memo, useEffect, useId, useMemo, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { BoosterId } from '../../data/catalog';

export type StarPalette = { light: string; main: string; deep: string; glow: string; ray: string };
export const starPalettes: Record<BoosterId, StarPalette> = {
  dawn: { light: '#FFF3C4', main: '#FFB85C', deep: '#D9602B', glow: '#FFB35A', ray: '#FFD68A' },
  twilight: { light: '#EFE6FF', main: '#A68CFA', deep: '#5234B0', glow: '#9C7CFF', ray: '#C7B5FF' },
  celestial: { light: '#E6FDFF', main: '#6FDCEF', deep: '#22679F', glow: '#5FD6F0', ray: '#A9F1FF' },
  crimson: { light: '#FFE3E0', main: '#FF5B6E', deep: '#8E1433', glow: '#FF3D58', ray: '#FFC37A' },
  sparkle: { light: '#FFFFFF', main: '#FFE9A8', deep: '#DB7F22', glow: '#FFD76A', ray: '#FFF4CF' },
};

const C = 100;
const TAU = Math.PI * 2;
const fill = { position: 'absolute' as const, top: 0, left: 0 };
const xy = (angle: number, radius: number) => `${(C + Math.cos(angle) * radius).toFixed(2)} ${(C + Math.sin(angle) * radius).toFixed(2)}`;
type Vertex = { angle: number; radius: number };
const starVertices = (points: number, outer: number, inner: number, rotation: number): Vertex[] =>
  Array.from({ length: points * 2 }, (_, index) => ({ angle: (rotation * Math.PI) / 180 + (index * Math.PI) / points, radius: index % 2 === 0 ? outer : inner }));
const polygon = (vertices: Vertex[]) => `M ${vertices.map((vertex) => xy(vertex.angle, vertex.radius)).join(' L ')} Z`;
const ray = (angle: number, from: number, to: number, spread: number) => `M ${xy(angle - spread, from)} L ${xy(angle, to)} L ${xy(angle + spread, from)} Z`;
const petal = (angle: number, from: number, to: number, spread: number) => {
  const mid = (from + to) / 2;
  return `M ${xy(angle, from)} Q ${xy(angle - spread, mid)} ${xy(angle, to)} Q ${xy(angle + spread, mid)} ${xy(angle, from)} Z`;
};
export const sparkleShape = (cx: number, cy: number, r: number) =>
  `M ${cx} ${cy - r} Q ${cx + r * 0.2} ${cy - r * 0.2} ${cx + r} ${cy} Q ${cx + r * 0.2} ${cy + r * 0.2} ${cx} ${cy + r} Q ${cx - r * 0.2} ${cy + r * 0.2} ${cx - r} ${cy} Q ${cx - r * 0.2} ${cy - r * 0.2} ${cx} ${cy - r} Z`;

// The crescent is sampled as a polygon so it renders identically everywhere (no masks, no arc flags).
const crescent = (cx: number, cy: number, radius: number, innerX: number, innerY: number, innerRadius: number) => {
  const dx = innerX - cx;
  const dy = innerY - cy;
  const d = Math.hypot(dx, dy);
  const a = (radius ** 2 - innerRadius ** 2 + d ** 2) / (2 * d);
  const h = Math.sqrt(Math.max(0, radius ** 2 - a ** 2));
  const mx = cx + (a * dx) / d;
  const my = cy + (a * dy) / d;
  const p1: [number, number] = [mx + (h * dy) / d, my - (h * dx) / d];
  const p2: [number, number] = [mx - (h * dy) / d, my + (h * dx) / d];
  const away = Math.atan2(dy, dx);
  const arc = (ox: number, oy: number, r: number, from: [number, number], to: [number, number]) => {
    const start = Math.atan2(from[1] - oy, from[0] - ox);
    const end = Math.atan2(to[1] - oy, to[0] - ox);
    const positive = (((end - start) % TAU) + TAU) % TAU;
    const distance = (sweep: number) => {
      const middle = start + sweep / 2;
      return Math.abs(Math.atan2(Math.sin(middle - away), Math.cos(middle - away)));
    };
    const sweep = distance(positive) > distance(positive - TAU) ? positive : positive - TAU;
    return Array.from({ length: 19 }, (_, index) => `${(ox + Math.cos(start + (sweep * index) / 18) * r).toFixed(2)} ${(oy + Math.sin(start + (sweep * index) / 18) * r).toFixed(2)}`);
  };
  return `M ${[...arc(cx, cy, radius, p1, p2), ...arc(innerX, innerY, innerRadius, p2, p1)].join(' L ')} Z`;
};

type Shape = [points: number, outer: number, inner: number, rotation: number];
const shapes: Record<BoosterId, { body: Shape; back: Shape }> = {
  dawn: { body: [4, 66, 17, -90], back: [4, 44, 15, -45] },
  twilight: { body: [5, 60, 27, -90], back: [5, 42, 30, -54] },
  celestial: { body: [4, 70, 12, -90], back: [4, 46, 11, -45] },
  crimson: { body: [6, 58, 29, -90], back: [6, 74, 22, -60] },
  sparkle: { body: [8, 60, 24, -90], back: [8, 77, 12, -67.5] },
};
const spinDuration: Record<BoosterId, number> = { dawn: 26000, twilight: 38000, celestial: 30000, crimson: 18000, sparkle: 14000 };
const twinkleSpots: Record<BoosterId, [number, number][]> = {
  dawn: [[0.14, 0.24], [0.86, 0.34], [0.26, 0.84]],
  twilight: [[0.12, 0.62], [0.2, 0.14], [0.84, 0.8]],
  celestial: [[0.16, 0.16], [0.88, 0.6], [0.3, 0.88]],
  crimson: [[0.14, 0.3], [0.84, 0.18], [0.8, 0.86]],
  sparkle: [[0.2, 0.18], [0.86, 0.4], [0.18, 0.78]],
};

function Rays({ variant, colors, charge }: { variant: BoosterId; colors: StarPalette; charge: number }) {
  switch (variant) {
    case 'dawn':
      return <G>
        {Array.from({ length: 16 }, (_, index) => <Path key={index} d={ray((index / 16) * TAU, 26, index % 2 ? 76 : 97, index % 2 ? 0.05 : 0.07)} fill={colors.ray} opacity={index % 2 ? 0.3 : 0.55} />)}
        <Circle cx={C} cy={C} r={82} fill="none" stroke={colors.ray} strokeOpacity={0.35} strokeWidth={1.4} strokeDasharray="1 8" strokeLinecap="round" />
      </G>;
    case 'twilight':
      return <G>
        {Array.from({ length: 8 }, (_, index) => <Path key={index} d={petal((index / 8) * TAU + TAU / 16, 30, 94, 0.2)} fill={colors.ray} opacity={0.2} />)}
        <Circle cx={C} cy={C} r={88} fill="none" stroke={colors.ray} strokeOpacity={0.3} strokeWidth={0.9} strokeDasharray="3 9" />
        {[0.4, 2.5, 4.6].map((angle) => <Circle key={angle} cx={C + Math.cos(angle) * 88} cy={C + Math.sin(angle) * 88} r={2.8} fill={colors.light} opacity={0.9} />)}
      </G>;
    case 'celestial':
      return <G>
        {Array.from({ length: 8 }, (_, index) => <Path key={index} d={ray((index / 8) * TAU, 18, index % 2 ? 72 : 99, 0.02)} fill={colors.light} opacity={index % 2 ? 0.45 : 0.85} />)}
        {Array.from({ length: 4 }, (_, index) => {
          const angle = (index / 4) * TAU + TAU / 8;
          return <Path key={`g${index}`} d={sparkleShape(C + Math.cos(angle) * 80, C + Math.sin(angle) * 80, 5)} fill={colors.light} opacity={0.9} />;
        })}
      </G>;
    case 'crimson':
      return <G>
        {Array.from({ length: 12 }, (_, index) => <Path key={index} d={petal((index / 12) * TAU, 36, index % 2 ? 80 : 97, 0.1)} fill={index % 2 ? colors.main : colors.ray} opacity={index % 2 ? 0.26 : 0.34} />)}
        <Circle cx={C} cy={C} r={87} fill="none" stroke={colors.ray} strokeOpacity={0.75} strokeWidth={1.5} strokeDasharray="2 5" />
        <Circle cx={C} cy={C} r={79} fill="none" stroke={colors.main} strokeOpacity={0.55} strokeWidth={0.9} />
        {Array.from({ length: 6 }, (_, index) => {
          const angle = (index / 6) * TAU;
          const x = C + Math.cos(angle) * 87;
          const y = C + Math.sin(angle) * 87;
          return <Path key={`r${index}`} d={`M ${x} ${y - 5.5} L ${x + 3.8} ${y} L ${x} ${y + 5.5} L ${x - 3.8} ${y} Z`} fill={colors.ray} />;
        })}
      </G>;
    case 'sparkle':
      return <G opacity={0.3 + charge * 0.7}>
        {Array.from({ length: 24 }, (_, index) => <Path key={index} d={ray((index / 24) * TAU, 24, 62 + ((index * 7) % 5) * 9, 0.03)} fill={index % 3 === 0 ? colors.light : colors.ray} opacity={0.35 + ((index * 5) % 4) * 0.13} />)}
        <Circle cx={C} cy={C} r={91} fill="none" stroke={colors.main} strokeOpacity={0.2 + 0.4 * charge} strokeWidth={1.3} strokeDasharray="6 10" />
      </G>;
  }
}

function StarBody({ variant, colors, uid }: { variant: BoosterId; colors: StarPalette; uid: string }) {
  const geometry = useMemo(() => {
    const { body, back } = shapes[variant];
    const vertices = starVertices(...body);
    return {
      back: polygon(starVertices(...back)),
      body: polygon(vertices),
      core: body[2] * 1.15 + 6,
      gloss: { x: C - body[2] * 0.42, y: C - body[2] * 0.5, rx: Math.max(3.5, body[2] * 0.36) },
      // Each point gets a lit and a shaded half, which reads as a cut gem.
      facets: vertices.map((vertex, index) => {
        const next = vertices[(index + 1) % vertices.length];
        return { d: `M ${C} ${C} L ${xy(vertex.angle, vertex.radius)} L ${xy(next.angle, next.radius)} Z`, light: index % 2 === 0 };
      }),
      moon: variant === 'twilight' ? crescent(140, 56, 30, 153, 46, 26) : null,
    };
  }, [variant]);
  const ringPoint = { x: Math.cos(2.3) * 94, y: Math.sin(2.3) * 24 };
  return <>
    <Defs>
      <LinearGradient id={`${uid}body`} x1="0.2" y1="0.05" x2="0.8" y2="0.95">
        <Stop offset="0" stopColor={colors.light} />
        <Stop offset="0.42" stopColor={colors.main} />
        <Stop offset="1" stopColor={colors.deep} />
      </LinearGradient>
      <RadialGradient id={`${uid}core`} cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
        <Stop offset="0.35" stopColor={colors.light} stopOpacity={0.85} />
        <Stop offset="1" stopColor={colors.main} stopOpacity={0} />
      </RadialGradient>
      <LinearGradient id={`${uid}moon`} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#FFFFFF" />
        <Stop offset="1" stopColor={colors.ray} />
      </LinearGradient>
    </Defs>
    {variant === 'celestial' && <G transform="translate(100 100) rotate(-18)">
      <Path d="M -94 0 A 94 24 0 0 1 94 0" fill="none" stroke={colors.main} strokeOpacity={0.45} strokeWidth={6} />
      <Path d="M -94 0 A 94 24 0 0 1 94 0" fill="none" stroke={colors.light} strokeOpacity={0.7} strokeWidth={1.2} />
    </G>}
    {geometry.moon && <Path d={geometry.moon} fill={`url(#${uid}moon)`} opacity={0.95} />}
    <Path d={geometry.back} fill={colors.deep} fillOpacity={0.9} stroke={colors.main} strokeOpacity={0.55} strokeWidth={1.2} strokeLinejoin="round" />
    <Path d={geometry.body} fill={`url(#${uid}body)`} stroke={variant === 'crimson' ? '#FFD27A' : colors.light} strokeWidth={variant === 'crimson' ? 2.4 : 1.6} strokeOpacity={0.9} strokeLinejoin="round" />
    {geometry.facets.map((facet, index) => <Path key={index} d={facet.d} fill={facet.light ? '#FFFFFF' : colors.deep} fillOpacity={facet.light ? 0.2 : 0.3} />)}
    <Circle cx={C} cy={C} r={geometry.core} fill={`url(#${uid}core)`} />
    {/* The gloss sits inside the inner radius so it never floats outside thin star bodies. */}
    <Ellipse cx={geometry.gloss.x} cy={geometry.gloss.y} rx={geometry.gloss.rx} ry={geometry.gloss.rx * 0.5} fill="#FFFFFF" opacity={0.5} transform={`rotate(-35 ${geometry.gloss.x} ${geometry.gloss.y})`} />
    {variant === 'celestial' && <G transform="translate(100 100) rotate(-18)">
      <Path d="M 94 0 A 94 24 0 0 1 -94 0" fill="none" stroke={colors.main} strokeOpacity={0.6} strokeWidth={6} />
      <Path d="M 94 0 A 94 24 0 0 1 -94 0" fill="none" stroke={colors.light} strokeWidth={1.2} />
      <Circle cx={ringPoint.x} cy={ringPoint.y} r={10} fill={colors.light} opacity={0.25} />
      <Circle cx={ringPoint.x} cy={ringPoint.y} r={5.5} fill={colors.light} />
    </G>}
    {variant === 'crimson' && <Circle cx={C} cy={C} r={8} fill="#FFF3D6" />}
  </>;
}

type StarArtProps = {
  variant: BoosterId; size: number; animated?: boolean; float?: boolean; dim?: boolean;
  /** 0 → 1, only affects how bright the Supernova burns. */
  charge?: number;
  /** Multiplies the ray rotation speed. */
  speed?: number;
  phase?: number;
};

function StarArtBase({ variant, size, animated = true, float = true, dim = false, charge = 1, speed = 1, phase = 0 }: StarArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const colors = starPalettes[variant];
  const spin = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animated) return;
    const spinLoop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: spinDuration[variant] / speed, easing: Easing.linear, useNativeDriver: true }));
    const waveLoop = Animated.loop(Animated.sequence([
      Animated.timing(wave, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(wave, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    spinLoop.start();
    const timer = setTimeout(() => waveLoop.start(), phase);
    return () => { clearTimeout(timer); spinLoop.stop(); waveLoop.stop(); };
  }, [animated, speed, variant, phase, spin, wave]);

  const intensity = dim ? 0.35 : 0.45 + Math.max(0, Math.min(1, charge)) * 0.55;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', variant === 'twilight' ? '-360deg' : '360deg'] });
  const translateY = float && animated ? wave.interpolate({ inputRange: [0, 1], outputRange: [size * 0.035, -size * 0.035] }) : 0;
  const auraScale = wave.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });
  const auraOpacity = wave.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
  const twinkleOpacity = [
    wave.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 1, 0.15] }),
    wave.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.15, 1] }),
    wave.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 0.05, 0.95] }),
  ];
  const twinkleSize = Math.max(6, size * 0.09);
  return (
    <Animated.View pointerEvents="none" style={{ width: size, height: size, opacity: dim ? 0.6 : 1, transform: [{ translateY }] }}>
      <Animated.View style={[fill, { width: size, height: size, opacity: auraOpacity, transform: [{ scale: auraScale }] }]}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id={`${uid}aura`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.glow} stopOpacity={0.8 * intensity} />
              <Stop offset="0.38" stopColor={colors.glow} stopOpacity={0.3 * intensity} />
              <Stop offset="1" stopColor={colors.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={C} cy={C} r={100} fill={`url(#${uid}aura)`} />
        </Svg>
      </Animated.View>
      <Animated.View style={[fill, { width: size, height: size, opacity: dim ? 0.5 : 1, transform: [{ rotate }] }]}>
        <Svg width={size} height={size} viewBox="0 0 200 200"><Rays variant={variant} colors={colors} charge={charge} /></Svg>
      </Animated.View>
      <View style={[fill, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox="0 0 200 200"><StarBody variant={variant} colors={colors} uid={uid} /></Svg>
      </View>
      {size >= 70 && twinkleSpots[variant].map(([x, y], index) => (
        <Animated.View key={index} style={{ position: 'absolute', left: x * size - twinkleSize / 2, top: y * size - twinkleSize / 2, width: twinkleSize, height: twinkleSize, opacity: animated ? twinkleOpacity[index] : 0.7 }}>
          <Svg width={twinkleSize} height={twinkleSize} viewBox="0 0 20 20"><Path d={sparkleShape(10, 10, 9.5)} fill={index === 1 ? '#FFFFFF' : colors.light} /></Svg>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

export const StarArt = memo(StarArtBase);

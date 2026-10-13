import { ReactNode, memo, useEffect, useId, useMemo, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { VoidVariant, voidVariants } from '../../game/void';

const diskTexture = require('../../../assets/void/disk.png');
const diskHotTexture = require('../../../assets/void/disk_hot.png');
const haloTexture = require('../../../assets/void/halo.png');
const haloHotTexture = require('../../../assets/void/halo_hot.png');

// The four textures are decoded as soon as the app loads, so the quasar paints at once
// instead of popping in piece by piece the first time the player reaches it.
let warmed = false;
export const warmVoidTextures = () => {
  if (warmed || typeof Image.resolveAssetSource !== 'function') return;
  warmed = true;
  [diskTexture, diskHotTexture, haloTexture, haloHotTexture].forEach((texture) => {
    const uri = Image.resolveAssetSource(texture)?.uri;
    if (uri) void Image.prefetch(uri).catch(() => false);
  });
};
warmVoidTextures();

// The accretion disk is a face-on texture rotated in place, then squashed to fake the viewing inclination.
const DISK_SQUASH = 0.2;

// Keeps rotating from the current angle when the speed changes, so taps can spin the disk up without a jump.
const useSpin = (duration: number, animated: boolean) => {
  const value = useRef(new Animated.Value(Math.random())).current;
  useEffect(() => {
    if (!animated) return;
    let active = true;
    const run = (from: number) => {
      value.setValue(from);
      Animated.timing(value, { toValue: 1, duration: Math.max(80, (1 - from) * duration), easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
        if (active && finished) run(0);
      });
    };
    value.stopAnimation((current) => run(typeof current === 'number' && current >= 0 && current < 1 ? current : 0));
    return () => { active = false; value.stopAnimation(); };
  }, [duration, animated, value]);
  return value;
};

const useWave = (duration: number, animated: boolean) => {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(value, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [duration, animated, value]);
  return value;
};

type Interpolated = Animated.AnimatedInterpolation<string | number>;

function Ring({ size, left, top, squash = 1, texture, hotTexture, color, hotColor, spin, hotSpin, hotOpacity }: {
  size: number; left: number; top: number; squash?: number; texture: number; hotTexture: number; color: string; hotColor: string;
  spin: Interpolated; hotSpin: Interpolated; hotOpacity: Interpolated;
}) {
  return (
    <View style={{ position: 'absolute', left, top, width: size, height: size, transform: [{ scaleY: squash }] }}>
      <Animated.Image source={texture} fadeDuration={0} style={{ position: 'absolute', width: size, height: size, tintColor: color, transform: [{ rotate: spin }] }} />
      <Animated.Image source={hotTexture} fadeDuration={0} style={{ position: 'absolute', width: size, height: size, tintColor: hotColor, opacity: hotOpacity, transform: [{ rotate: hotSpin }] }} />
    </View>
  );
}

function Clip({ left, top, width, height, children }: { left: number; top: number; width: number; height: number; children: ReactNode }) {
  return <View style={{ position: 'absolute', left, top, width: Math.max(0, width), height: Math.max(0, height), overflow: 'hidden' }}>{children}</View>;
}

function InfallDot({ index, count, size, radius, tilt, color, speed }: { index: number; count: number; size: number; radius: number; tilt: number; color: string; speed: number }) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay((index * 3600) / count / speed),
      Animated.timing(value, { toValue: 1, duration: 3600 / speed, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]));
    value.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [index, count, speed, value]);
  const path = useMemo(() => {
    const a0 = (index / count) * Math.PI * 2;
    const start = size * (0.47 + (index % 3) * 0.015);
    const cos = Math.cos((tilt * Math.PI) / 180);
    const sin = Math.sin((tilt * Math.PI) / 180);
    const steps = Array.from({ length: 11 }, (_, step) => step / 10);
    const points = steps.map((t) => {
      const r = start * (1 - t) + radius * 1.08 * t;
      const a = a0 + t * Math.PI * 2.4;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * 0.22;
      return { x: x * cos - y * sin, y: x * sin + y * cos };
    });
    return { steps, xs: points.map((point) => point.x), ys: points.map((point) => point.y) };
  }, [index, count, size, radius, tilt]);
  const dot = 2 + (index % 3);
  return (
    <Animated.View style={{
      position: 'absolute', left: size / 2 - dot / 2, top: size / 2 - dot / 2, width: dot, height: dot, borderRadius: dot, backgroundColor: color,
      opacity: value.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [0, 1, 0.85, 0] }),
      transform: [
        { translateX: value.interpolate({ inputRange: path.steps, outputRange: path.xs }) },
        { translateY: value.interpolate({ inputRange: path.steps, outputRange: path.ys }) },
        { scale: value.interpolate({ inputRange: [0, 1], outputRange: [1.2, 0.35] }) },
      ],
    }} />
  );
}

type BlackHoleProps = {
  size: number; variant?: VoidVariant; speed?: number; intensity?: number; tilt?: number;
  /** Radius of the event horizon as a fraction of the size. */
  shadowRatio?: number;
  particles?: boolean; animated?: boolean;
  /** Avatar frames keep the front of the disk off the face in the middle. */
  frame?: boolean;
  children?: ReactNode;
};

function BlackHoleBase({ size, variant = 'gargantua', speed = 1, intensity = 1, tilt = -9, shadowRatio = 0.17, particles = true, animated = true, frame = false, children }: BlackHoleProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const colors = voidVariants[variant];
  const S = size;
  const C = S / 2;
  const R = S * shadowRatio;
  const D = S * 0.98;
  const H = R * 2.05 * 2;
  const diskSpin = useSpin(14000 / speed, animated);
  const hotSpin = useSpin(9000 / speed, animated);
  const haloSpin = useSpin(21000 / speed, animated);
  const wave = useWave(2800, animated);
  const turn = (value: Animated.Value) => value.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const diskRotate = turn(diskSpin);
  const hotRotate = turn(hotSpin);
  const haloRotate = turn(haloSpin);
  const hotOpacity = wave.interpolate({ inputRange: [0, 1], outputRange: [0.5 * intensity, Math.min(1, 0.95 * intensity)] });
  const glowScale = wave.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.05] });
  const disk = (left: number, top: number) => (
    <Ring size={D} left={left} top={top} squash={DISK_SQUASH} texture={diskTexture} hotTexture={diskHotTexture} color={colors.body} hotColor={colors.hot} spin={diskRotate} hotSpin={hotRotate} hotOpacity={hotOpacity} />
  );
  const halo = (left: number, top: number, scale: number, opacity: number) => (
    <View style={{ position: 'absolute', left, top, width: H, height: H, opacity, transform: [{ scale }] }}>
      <Ring size={H} left={0} top={0} texture={haloTexture} hotTexture={haloHotTexture} color={colors.body} hotColor={colors.hot} spin={haloRotate} hotSpin={diskRotate} hotOpacity={hotOpacity} />
    </View>
  );
  const tilted = { position: 'absolute' as const, left: 0, top: 0, width: S, height: S, transform: [{ rotate: `${tilt}deg` }] };
  const gap = R * 0.98;
  return (
    <View style={{ width: S, height: S }} pointerEvents="box-none">
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: S, height: S, opacity: Math.min(1, intensity), transform: [{ scale: glowScale }] }}>
        <Svg width={S} height={S}>
          <Defs>
            <RadialGradient id={`${uid}glow`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.glow} stopOpacity={0.6} />
              <Stop offset="0.36" stopColor={colors.glow} stopOpacity={0.2} />
              <Stop offset="1" stopColor={colors.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={C} cy={C} r={C} fill={`url(#${uid}glow)`} />
        </Svg>
      </Animated.View>

      <View pointerEvents="none" style={tilted}>
        <Clip left={0} top={0} width={S} height={C}>{disk((S - D) / 2, C - D / 2)}</Clip>
        <Clip left={0} top={0} width={S} height={C}>{halo(C - H / 2, C - H / 2, 1, 1)}</Clip>
        <Clip left={0} top={C} width={S} height={C}>{halo(C - H / 2, -H / 2, 0.8, 0.85)}</Clip>
      </View>

      <View style={{ position: 'absolute', left: C - R, top: C - R, width: R * 2, height: R * 2, borderRadius: R, backgroundColor: '#000000', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
      <Svg pointerEvents="none" width={S} height={S} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Circle cx={C} cy={C} r={R * 1.04} stroke={colors.ring} strokeWidth={Math.max(1.5, S * 0.014)} strokeOpacity={0.22} fill="none" />
        <Circle cx={C} cy={C} r={R * 1.005} stroke={colors.ring} strokeWidth={Math.max(0.8, S * 0.005)} strokeOpacity={0.95} fill="none" />
      </Svg>

      <View pointerEvents="none" style={tilted}>
        {frame ? <>
          <Clip left={0} top={C} width={C - gap} height={C}>{disk((S - D) / 2, -D / 2)}</Clip>
          <Clip left={C + gap} top={C} width={C - gap} height={C}>{disk((S - D) / 2 - (C + gap), -D / 2)}</Clip>
        </> : <Clip left={0} top={C} width={S} height={C}>{disk((S - D) / 2, -D / 2)}</Clip>}
        {!frame && (
          <Svg width={S} height={S} style={{ position: 'absolute', left: 0, top: 0 }}>
            <Defs>
              <RadialGradient id={`${uid}beam`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.45 * Math.min(1, intensity)} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            {/* Relativistic beaming: the side of the disk moving towards us looks brighter. */}
            <Ellipse cx={C - D * 0.25} cy={C + S * 0.004} rx={D * 0.2} ry={D * 0.04} fill={`url(#${uid}beam)`} />
          </Svg>
        )}
      </View>
      {particles && animated && Array.from({ length: 9 }, (_, index) => <InfallDot key={index} index={index} count={9} size={S} radius={R} tilt={tilt} color={colors.hot} speed={speed} />)}
    </View>
  );
}

export const BlackHole = memo(BlackHoleBase);

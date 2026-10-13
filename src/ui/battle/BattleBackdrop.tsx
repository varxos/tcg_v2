import { memo, useMemo } from 'react';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { hashSeed } from '../../game/creatures';
import { ArenaId } from '../../game/wardens';

type ArenaPalette = { sky: [string, string, string]; glowA: string; glowB: string; hillFar: string; hillNear: string; platform: string; platformEdge: string; rim: string; star: string };
export const arenaPalettes: Record<ArenaId, ArenaPalette> = {
  nebula: { sky: ['#081530', '#123452', '#1F5470'], glowA: '#4F9DBF', glowB: '#8064A8', hillFar: '#0F2A44', hillNear: '#133850', platform: '#2A6A86', platformEdge: '#0E2B3F', rim: '#8FE4FF', star: '#D8F6FF' },
  wildwood: { sky: ['#0B1F1C', '#1D3C33', '#35604C'], glowA: '#8FD28A', glowB: '#FFE072', hillFar: '#12302A', hillNear: '#183E31', platform: '#3F7456', platformEdge: '#173226', rim: '#B8F0A8', star: '#F2FFE2' },
  ember: { sky: ['#1C0A16', '#43202F', '#7A3B3E'], glowA: '#FF9072', glowB: '#FFC75F', hillFar: '#2E1220', hillNear: '#3B1826', platform: '#88404F', platformEdge: '#35141F', rim: '#FFB38F', star: '#FFE9D8' },
  aurora: { sky: ['#0E0A26', '#2A1F4E', '#4B3775'], glowA: '#73DDEC', glowB: '#F39DC8', hillFar: '#1E1740', hillNear: '#251D4E', platform: '#56459A', platformEdge: '#211A40', rim: '#D7C9F0', star: '#F4EEFF' },
};

const mulberry = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type Point = { x: number; y: number };
function BattleBackdropBase({ width, height, arena, enemy, enemySize, player, playerSize }: { width: number; height: number; arena: ArenaId; enemy: Point; enemySize: number; player: Point; playerSize: number }) {
  const colors = arenaPalettes[arena];
  const stars = useMemo(() => {
    const random = mulberry(hashSeed(`${arena}-${Math.round(width)}`));
    return Array.from({ length: 48 }, () => ({ x: random() * width, y: random() * height * 0.58, r: 0.4 + random() * 1.3, o: 0.25 + random() * 0.7 }));
  }, [arena, width, height]);
  if (width <= 0 || height <= 0) return null;
  const id = `arena-${arena}`;
  const farHill = `M0 ${height * 0.5} C ${width * 0.18} ${height * 0.42}, ${width * 0.34} ${height * 0.54}, ${width * 0.52} ${height * 0.47} S ${width * 0.84} ${height * 0.4}, ${width} ${height * 0.49} L ${width} ${height} L 0 ${height} Z`;
  const nearHill = `M0 ${height * 0.62} C ${width * 0.22} ${height * 0.56}, ${width * 0.42} ${height * 0.66}, ${width * 0.62} ${height * 0.6} S ${width * 0.9} ${height * 0.57}, ${width} ${height * 0.63} L ${width} ${height} L 0 ${height} Z`;
  const platform = (center: Point, size: number, key: string) => {
    const cy = center.y + size * 0.44;
    return [
      <Ellipse key={`${key}-shadow`} cx={center.x} cy={cy + size * 0.05} rx={size * 0.78} ry={size * 0.2} fill="#05030C" opacity={0.45} />,
      <Ellipse key={`${key}-base`} cx={center.x} cy={cy} rx={size * 0.74} ry={size * 0.19} fill={`url(#${id}-platform)`} />,
      <Ellipse key={`${key}-rim`} cx={center.x} cy={cy} rx={size * 0.74} ry={size * 0.19} fill="none" stroke={colors.rim} strokeWidth={1.4} opacity={0.65} />,
      <Ellipse key={`${key}-inner`} cx={center.x} cy={cy - size * 0.015} rx={size * 0.46} ry={size * 0.1} fill="none" stroke={colors.rim} strokeWidth={1} opacity={0.28} />,
    ];
  };
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
      <Defs>
        <LinearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.sky[0]} />
          <Stop offset="0.55" stopColor={colors.sky[1]} />
          <Stop offset="1" stopColor={colors.sky[2]} />
        </LinearGradient>
        <RadialGradient id={`${id}-glowA`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.glowA} stopOpacity={0.5} />
          <Stop offset="1" stopColor={colors.glowA} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${id}-glowB`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.glowB} stopOpacity={0.36} />
          <Stop offset="1" stopColor={colors.glowB} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`${id}-ground`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.hillNear} />
          <Stop offset="1" stopColor={colors.sky[0]} />
        </LinearGradient>
        <RadialGradient id={`${id}-platform`} cx="50%" cy="40%" r="60%">
          <Stop offset="0" stopColor={colors.platform} />
          <Stop offset="1" stopColor={colors.platformEdge} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill={`url(#${id}-sky)`} />
      <Circle cx={width * 0.8} cy={height * 0.14} r={width * 0.55} fill={`url(#${id}-glowA)`} />
      <Circle cx={width * 0.08} cy={height * 0.42} r={width * 0.45} fill={`url(#${id}-glowB)`} />
      {stars.map((star, index) => <Circle key={index} cx={star.x} cy={star.y} r={star.r} fill={colors.star} opacity={star.o} />)}
      <Path d={farHill} fill={colors.hillFar} opacity={0.85} />
      <Path d={nearHill} fill={`url(#${id}-ground)`} />
      <Path d={`M ${width * 0.5} ${height * 0.6} L ${-width * 0.2} ${height} M ${width * 0.5} ${height * 0.6} L ${width * 1.2} ${height} M ${width * 0.5} ${height * 0.6} L ${width * 0.5} ${height}`} stroke={colors.rim} strokeWidth={1} opacity={0.08} />
      {platform(enemy, enemySize, 'enemy')}
      {platform(player, playerSize, 'player')}
    </Svg>
  );
}

export const BattleBackdrop = memo(BattleBackdropBase);

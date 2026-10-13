import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { hashSeed } from '../../game/creatures';
import { voidVariantOf } from '../../game/void';
import { VoidBanner } from '../void/VoidBanner';

const W = 360;
const H = 230;
const seeded = (text: string) => {
  let state = hashSeed(text) || 1;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5; state >>>= 0;
    return state / 4294967296;
  };
};
const sparkle = (cx: number, cy: number, r: number) => `M ${cx} ${cy - r} Q ${cx + r * 0.2} ${cy - r * 0.2} ${cx + r} ${cy} Q ${cx + r * 0.2} ${cy + r * 0.2} ${cx} ${cy + r} Q ${cx - r * 0.2} ${cy + r * 0.2} ${cx - r} ${cy} Q ${cx - r * 0.2} ${cy - r * 0.2} ${cx} ${cy - r} Z`;

function Stars({ seed, count, color = '#FFFFFF', maxY = H }: { seed: string; count: number; color?: string; maxY?: number }) {
  const stars = useMemo(() => {
    const random = seeded(seed);
    return Array.from({ length: count }, () => ({ x: random() * W, y: random() * maxY, r: 0.4 + random() * 1.3, o: 0.25 + random() * 0.7 }));
  }, [seed, count, maxY]);
  return <>{stars.map((star, index) => <Circle key={index} cx={star.x} cy={star.y} r={star.r} fill={color} opacity={star.o} />)}</>;
}

function Particles({ seed, count, colors, minR, maxR, fromY = 0, toY = H }: { seed: string; count: number; colors: string[]; minR: number; maxR: number; fromY?: number; toY?: number }) {
  const items = useMemo(() => {
    const random = seeded(seed);
    return Array.from({ length: count }, (_, index) => ({ x: random() * W, y: fromY + random() * (toY - fromY), r: minR + random() * (maxR - minR), o: 0.3 + random() * 0.6, color: colors[index % colors.length] }));
  }, [seed, count, fromY, toY, minR, maxR]);
  return <>{items.map((item, index) => <Circle key={index} cx={item.x} cy={item.y} r={item.r} fill={item.color} opacity={item.o} />)}</>;
}

const fireflies = (() => {
  const random = seeded('fireflies');
  return Array.from({ length: 16 }, () => ({ x: random() * W, y: 30 + random() * 160, r: 1 + random() * 1.6 }));
})();

function BannerArt({ id }: { id: string }) {
  const g = (name: string) => `banner-${id}-${name}`;
  switch (id) {
    case 'starchart': {
      const points = [[34, 64], [92, 40], [148, 72], [212, 50], [272, 90], [326, 60]];
      return <>
        <Defs>
          <LinearGradient id={g('bg')} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#040A1C" /><Stop offset="0.6" stopColor="#0A1B3D" /><Stop offset="1" stopColor="#15305A" /></LinearGradient>
          <RadialGradient id={g('a')} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#73DDEC" stopOpacity={0.34} /><Stop offset="1" stopColor="#73DDEC" stopOpacity={0} /></RadialGradient>
          <RadialGradient id={g('b')} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#8064A8" stopOpacity={0.36} /><Stop offset="1" stopColor="#8064A8" stopOpacity={0} /></RadialGradient>
          <RadialGradient id={g('halo')} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#73DDEC" stopOpacity={0.7} /><Stop offset="1" stopColor="#73DDEC" stopOpacity={0} /></RadialGradient>
        </Defs>
        <Rect width={W} height={H} fill={`url(#${g('bg')})`} />
        <Circle cx={270} cy={50} r={180} fill={`url(#${g('a')})`} />
        <Circle cx={50} cy={210} r={160} fill={`url(#${g('b')})`} />
        {[110, 160, 210, 260].map((r) => <Circle key={r} cx={180} cy={270} r={r} fill="none" stroke="#73DDEC" strokeOpacity={0.09} strokeWidth={1} />)}
        {[-60, -30, 0, 30, 60].map((angle) => { const rad = ((angle - 90) * Math.PI) / 180; return <Line key={angle} x1={180} y1={270} x2={180 + Math.cos(rad) * 300} y2={270 + Math.sin(rad) * 300} stroke="#73DDEC" strokeOpacity={0.07} strokeWidth={1} />; })}
        <Stars seed="starchart" count={70} />
        {points.slice(0, -1).map((point, index) => <G key={index}>
          <Line x1={point[0]} y1={point[1]} x2={points[index + 1][0]} y2={points[index + 1][1]} stroke="#73DDEC" strokeWidth={6} strokeOpacity={0.15} strokeLinecap="round" />
          <Line x1={point[0]} y1={point[1]} x2={points[index + 1][0]} y2={points[index + 1][1]} stroke="#73DDEC" strokeWidth={1.6} strokeOpacity={0.9} strokeLinecap="round" />
        </G>)}
        <Line x1={148} y1={72} x2={176} y2={132} stroke="#5E6F8E" strokeWidth={1.2} strokeDasharray="4 6" />
        <Line x1={176} y1={132} x2={238} y2={150} stroke="#5E6F8E" strokeWidth={1.2} strokeDasharray="4 6" />
        {points.map((point, index) => <G key={`s${index}`}><Circle cx={point[0]} cy={point[1]} r={20} fill={`url(#${g('halo')})`} /><Path d={sparkle(point[0], point[1], 9)} fill="#73DDEC" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={0.8} /><Circle cx={point[0]} cy={point[1]} r={2} fill="#FFFFFF" /></G>)}
        {[[176, 132], [238, 150]].map((point, index) => <Path key={`d${index}`} d={sparkle(point[0], point[1], 7)} fill="#0D1832" stroke="#A48AF4" strokeWidth={1.4} />)}
      </>;
    }
    case 'ember':
      return <>
        <Defs>
          <LinearGradient id={g('bg')} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#1C0A16" /><Stop offset="0.6" stopColor="#4A1D2A" /><Stop offset="1" stopColor="#7A3437" /></LinearGradient>
          <RadialGradient id={g('glow')} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#FF9072" stopOpacity={0.6} /><Stop offset="1" stopColor="#FF9072" stopOpacity={0} /></RadialGradient>
        </Defs>
        <Rect width={W} height={H} fill={`url(#${g('bg')})`} />
        <Ellipse cx={180} cy={250} rx={280} ry={140} fill={`url(#${g('glow')})`} />
        <Particles seed="ember" count={46} colors={['#FFB38F', '#FFC75F', '#FF8069']} minR={0.8} maxR={2.6} />
        <Path d={`M0 ${H} L0 190 C 60 170, 110 200, 170 182 S 280 168, ${W} 186 L ${W} ${H} Z`} fill="#1E0A12" opacity={0.9} />
      </>;
    case 'wildwood':
      return <>
        <Defs>
          <LinearGradient id={g('bg')} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#0B1F1C" /><Stop offset="0.6" stopColor="#1D3C33" /><Stop offset="1" stopColor="#35604C" /></LinearGradient>
          <RadialGradient id={g('glow')} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#FFE072" stopOpacity={0.9} /><Stop offset="1" stopColor="#FFE072" stopOpacity={0} /></RadialGradient>
        </Defs>
        <Rect width={W} height={H} fill={`url(#${g('bg')})`} />
        {[0, 1, 2].map((ray) => <Path key={ray} d={`M ${20 + ray * 40} 0 L ${80 + ray * 55} 0 L ${220 + ray * 60} ${H} L ${140 + ray * 50} ${H} Z`} fill="#FFE072" opacity={0.05} />)}
        <Path d={`M0 ${H} L0 150 C 70 120, 120 160, 190 140 S 300 120, ${W} 150 L ${W} ${H} Z`} fill="#12302A" />
        <Path d={`M0 ${H} L0 185 C 80 165, 150 200, 230 180 S 320 170, ${W} 188 L ${W} ${H} Z`} fill="#183E31" />
        {fireflies.map((fly, index) => <G key={index}><Circle cx={fly.x} cy={fly.y} r={fly.r * 5} fill={`url(#${g('glow')})`} opacity={0.35} /><Circle cx={fly.x} cy={fly.y} r={fly.r} fill="#FFF4B8" /></G>)}
      </>;
    case 'dawn':
      return <>
        <Defs>
          <LinearGradient id={g('bg')} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#2F2448" /><Stop offset="0.55" stopColor="#8E4E6A" /><Stop offset="1" stopColor="#E7936A" /></LinearGradient>
          <RadialGradient id={g('sun')} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#FFF1C9" stopOpacity={1} /><Stop offset="0.35" stopColor="#FFC75F" stopOpacity={0.6} /><Stop offset="1" stopColor="#FFAB76" stopOpacity={0} /></RadialGradient>
        </Defs>
        <Rect width={W} height={H} fill={`url(#${g('bg')})`} />
        <Stars seed="dawn" count={24} maxY={90} />
        <Circle cx={180} cy={228} r={150} fill={`url(#${g('sun')})`} />
        {[[70, 150, 60], [290, 130, 70], [190, 175, 90]].map(([x, y, rx], index) => <Ellipse key={index} cx={x} cy={y} rx={rx} ry={12} fill="#FFE9D8" opacity={0.14} />)}
      </>;
    case 'aurora':
      return <>
        <Defs>
          <LinearGradient id={g('bg')} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#0E0A26" /><Stop offset="1" stopColor="#2F2458" /></LinearGradient>
          <LinearGradient id={g('ribbon')} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#73DDEC" stopOpacity={0} /><Stop offset="0.3" stopColor="#73DDEC" stopOpacity={0.8} /><Stop offset="0.7" stopColor="#D79CF7" stopOpacity={0.8} /><Stop offset="1" stopColor="#F39DC8" stopOpacity={0} /></LinearGradient>
        </Defs>
        <Rect width={W} height={H} fill={`url(#${g('bg')})`} />
        <Stars seed="aurora" count={60} />
        {[[40, 0.35, 34], [80, 0.28, 22], [118, 0.2, 14]].map(([y, opacity, width], index) => <G key={index}>
          <Path d={`M -20 ${y + 40} C 60 ${y - 30}, 140 ${y + 70}, 220 ${y + 10} S 330 ${y - 20}, 390 ${y + 30}`} stroke={`url(#${g('ribbon')})`} strokeWidth={width * 2} strokeOpacity={opacity * 0.35} fill="none" strokeLinecap="round" />
          <Path d={`M -20 ${y + 40} C 60 ${y - 30}, 140 ${y + 70}, 220 ${y + 10} S 330 ${y - 20}, 390 ${y + 30}`} stroke={`url(#${g('ribbon')})`} strokeWidth={width} strokeOpacity={opacity} fill="none" strokeLinecap="round" />
        </G>)}
      </>;
    case 'seraph':
      return <>
        <Defs>
          <LinearGradient id={g('bg')} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#6A5230" /><Stop offset="0.6" stopColor="#3E2F20" /><Stop offset="1" stopColor="#2A1F18" /></LinearGradient>
          <RadialGradient id={g('halo')} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#FFF1C9" stopOpacity={0.8} /><Stop offset="1" stopColor="#FFF1C9" stopOpacity={0} /></RadialGradient>
        </Defs>
        <Rect width={W} height={H} fill={`url(#${g('bg')})`} />
        {Array.from({ length: 14 }, (_, index) => { const a = -Math.PI * 0.05 + (index / 13) * Math.PI * 1.1; return <Path key={index} d={`M 180 -10 L ${180 + Math.cos(a) * 420 - 14} ${-10 + Math.sin(a) * 420} L ${180 + Math.cos(a) * 420 + 14} ${-10 + Math.sin(a) * 420} Z`} fill="#FFF1C9" opacity={0.06} />; })}
        <Circle cx={180} cy={10} r={120} fill={`url(#${g('halo')})`} opacity={0.6} />
        <Ellipse cx={180} cy={22} rx={58} ry={14} fill="none" stroke="#FFF1C9" strokeOpacity={0.55} strokeWidth={2} />
        {[[60, 200, 90], [300, 205, 100], [180, 222, 130]].map(([x, y, rx], index) => <Ellipse key={index} cx={x} cy={y} rx={rx} ry={26} fill="#FFF1C9" opacity={0.1} />)}
        <Stars seed="seraph" count={26} color="#FFF1C9" />
      </>;
    case 'golden':
      return <>
        <Defs>
          <LinearGradient id={g('bg')} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#5B4A1C" /><Stop offset="0.5" stopColor="#3B2F13" /><Stop offset="1" stopColor="#6A5420" /></LinearGradient>
        </Defs>
        <Rect width={W} height={H} fill={`url(#${g('bg')})`} />
        {[-60, 40, 140, 240].map((x, index) => <Path key={index} d={`M ${x} ${H} L ${x + 60} ${H} L ${x + 200} 0 L ${x + 140} 0 Z`} fill="#FFE072" opacity={index % 2 ? 0.08 : 0.14} />)}
        <Stars seed="golden" count={40} color="#FFE9A1" />
        {[[60, 60], [300, 50], [250, 170], [110, 180]].map(([x, y], index) => <Path key={index} d={sparkle(x, y, 8 + (index % 2) * 4)} fill="#FFE072" opacity={0.85} />)}
      </>;
    default:
      return <>
        <Defs>
          <LinearGradient id={g('bg')} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#3A3468" /><Stop offset="1" stopColor="#1F1A3E" /></LinearGradient>
          <RadialGradient id={g('glow')} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#8064A8" stopOpacity={0.45} /><Stop offset="1" stopColor="#8064A8" stopOpacity={0} /></RadialGradient>
        </Defs>
        <Rect width={W} height={H} fill={`url(#${g('bg')})`} />
        <Circle cx={290} cy={40} r={170} fill={`url(#${g('glow')})`} />
        <Stars seed="night" count={50} />
        <Path d="M 312 30 A 22 22 0 1 0 312 74 A 17 17 0 1 1 312 30 Z" fill="#FFF2C1" opacity={0.85} />
      </>;
  }
}

function ProfileBannerBase({ id, radius = 24, shade = true }: { id: string; radius?: number; shade?: boolean }) {
  const voidVariant = voidVariantOf(id);
  if (voidVariant) {
    return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}><VoidBanner variant={voidVariant} shade={shade} /></View>;
  }
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <BannerArt id={id} />
        {shade && <>
          <Defs><LinearGradient id={`shade-${id}`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0.45" stopColor="#0A0617" stopOpacity={0} /><Stop offset="1" stopColor="#0A0617" stopOpacity={0.5} /></LinearGradient></Defs>
          <Rect width={W} height={H} fill={`url(#shade-${id})`} />
        </>}
      </Svg>
    </View>
  );
}

export const ProfileBanner = memo(ProfileBannerBase);

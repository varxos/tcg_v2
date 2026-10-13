import { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Constellation, groupCards, groupComplete, groupOwnedCount, starColors, starLabels } from '../../game/constellations';
import { hashSeed } from '../../game/creatures';
import { tk, useI18n } from '../../i18n';

const sparklePath = (cx: number, cy: number, r: number) =>
  `M ${cx} ${cy - r} Q ${cx + r * 0.2} ${cy - r * 0.2} ${cx + r} ${cy} Q ${cx + r * 0.2} ${cy + r * 0.2} ${cx} ${cy + r} Q ${cx - r * 0.2} ${cy + r * 0.2} ${cx - r} ${cy} Q ${cx - r * 0.2} ${cy - r * 0.2} ${cx} ${cy - r} Z`;

const seeded = (seed: number) => {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 10000) / 10000;
  };
};

function Twinkle({ x, y, delay, color, size }: { x: number; y: number; delay: number; color: string; size: number }) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.delay(1400),
    ]));
    loop.start();
    return () => loop.stop();
  }, [delay, value]);
  return <Animated.Text pointerEvents="none" style={[styles.twinkle, { left: x - 10, top: y - 10, color, fontSize: size, opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.95] }), transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.1] }) }] }]}>✦</Animated.Text>;
}

function ConstellationSkyBase({ constellation, inventory, width, height, selectedIndex = null, onSelect, mini = false }: {
  constellation: Constellation; inventory: Record<string, number>; width: number; height: number; selectedIndex?: number | null; onSelect?: (index: number) => void; mini?: boolean;
}) {
  const { t } = useI18n();
  const golden = Boolean(constellation.groups[0]?.golden);
  const color = constellation.color;
  const id = `sky-${constellation.id}-${mini ? 'mini' : 'full'}`;
  const lit = constellation.groups.map((group) => groupComplete(group, inventory));
  const complete = lit.every(Boolean);
  // Every line and star is computed from the same pixel coordinates, so strokes always meet star centers.
  const points = constellation.shape.points.map((point) => ({ x: point.x * width, y: point.y * height }));
  const decor = constellation.shape.decor.map((point) => ({ x: point.x * width, y: point.y * height }));
  const resolve = (key: string) => (key[0] === 'p' ? points[Number(key.slice(1))] : decor[Number(key.slice(1))]);
  const decorLit = decor.map((_, index) => {
    const key = `d${index}`;
    const neighbors = constellation.shape.edges.filter((edge) => edge.includes(key)).map((edge) => (edge[0] === key ? edge[1] : edge[0])).filter((entry) => entry[0] === 'p');
    return complete || (neighbors.length > 0 && neighbors.every((entry) => lit[Number(entry.slice(1))]));
  });
  const isLit = (key: string) => (key[0] === 'p' ? lit[Number(key.slice(1))] : decorLit[Number(key.slice(1))]);
  const background = useMemo(() => {
    const random = seeded(hashSeed(`${constellation.id}-${Math.round(width)}`));
    return Array.from({ length: mini ? 22 : 72 }, () => ({ x: random() * width, y: random() * height, r: (mini ? 0.3 : 0.4) + random() * (mini ? 0.8 : 1.3), o: 0.2 + random() * 0.7 }));
  }, [constellation.id, width, height, mini]);
  const twinkles = useMemo(() => {
    const random = seeded(hashSeed(`${constellation.id}-twinkle`));
    return Array.from({ length: 7 }, (_, index) => ({ x: 14 + random() * (width - 28), y: 14 + random() * (height - 28), delay: index * 520, size: 8 + random() * 8 }));
  }, [constellation.id, width, height]);
  const radius = mini ? Math.max(3.5, width * 0.055) : Math.max(11, Math.min(17, width * 0.045));

  return (
    <View style={{ width, height, borderRadius: mini ? 16 : 26, overflow: 'hidden', backgroundColor: golden ? '#1F1606' : '#050B1F' }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={golden ? '#1A1206' : '#040A1C'} />
            <Stop offset="0.6" stopColor={golden ? '#2E220C' : '#0A1B3D'} />
            <Stop offset="1" stopColor={golden ? '#3E2E10' : '#15305A'} />
          </LinearGradient>
          <RadialGradient id={`${id}-nebulaA`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={complete ? 0.42 : 0.24} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}-nebulaB`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={golden ? '#FF9C3A' : '#8064A8'} stopOpacity={0.3} />
            <Stop offset="1" stopColor={golden ? '#FF9C3A' : '#8064A8'} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.7} />
            <Stop offset="0.4" stopColor={color} stopOpacity={0.2} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${id}-bg)`} />
        <Circle cx={width * 0.74} cy={height * 0.26} r={width * 0.6} fill={`url(#${id}-nebulaA)`} />
        <Circle cx={width * 0.18} cy={height * 0.8} r={width * 0.5} fill={`url(#${id}-nebulaB)`} />
        {background.map((star, index) => <Circle key={index} cx={star.x} cy={star.y} r={star.r} fill="#FFFFFF" opacity={star.o} />)}

        {constellation.shape.edges.map(([a, b]) => {
          const from = resolve(a);
          const to = resolve(b);
          const on = isLit(a) && isLit(b);
          return (
            <G key={`${a}-${b}`}>
              {on && <Line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={mini ? 3 : 8} strokeOpacity={0.16} strokeLinecap="round" />}
              <Line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={on ? color : '#5E6F8E'} strokeWidth={on ? (mini ? 1.3 : 2) : mini ? 0.8 : 1.2} strokeOpacity={on ? 0.95 : 0.6} strokeDasharray={on ? undefined : mini ? '2 3' : '4 6'} strokeLinecap="round" />
            </G>
          );
        })}

        {decor.map((point, index) => <Path key={`d${index}`} d={sparklePath(point.x, point.y, radius * 0.42)} fill={decorLit[index] ? color : '#72819E'} opacity={decorLit[index] ? 0.95 : 0.55} />)}

        {points.map((point, index) => {
          const group = constellation.groups[index];
          const on = lit[index];
          const owned = groupOwnedCount(group, inventory);
          const total = groupCards(group).length;
          const ratio = total ? owned / total : 0;
          const ring = radius * 1.6;
          const circumference = 2 * Math.PI * ring;
          const starColor = starColors[group.boosterId];
          const labelAbove = point.y + ring + 30 > height;
          const labelX = Math.max(46, Math.min(width - 46, point.x));
          const labelY = labelAbove ? point.y - ring - 20 : point.y + ring + 15;
          return (
            <G key={`p${index}`}>
              {on && <Circle cx={point.x} cy={point.y} r={radius * 3.2} fill={`url(#${id}-halo)`} />}
              {!mini && <Circle cx={point.x} cy={point.y} r={ring} fill="none" stroke="#22324E" strokeWidth={2.6} />}
              {!mini && ratio > 0 && <Circle cx={point.x} cy={point.y} r={ring} fill="none" stroke={on ? color : starColor} strokeWidth={2.6} strokeDasharray={`${circumference * ratio} ${circumference}`} strokeLinecap="round" transform={`rotate(-90 ${point.x} ${point.y})`} />}
              {!mini && selectedIndex === index && <Circle cx={point.x} cy={point.y} r={radius * 2.25} fill="none" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={1.2} strokeDasharray="3 4" />}
              <Path d={sparklePath(point.x, point.y, radius)} fill={on ? color : '#0D1832'} stroke={on ? '#FFFFFF' : starColor} strokeWidth={on ? 0.9 : mini ? 1 : 1.5} strokeOpacity={on ? 0.7 : 0.9} />
              {on && <Circle cx={point.x} cy={point.y} r={radius * 0.22} fill="#FFFFFF" />}
              {!mini && <>
                <SvgText x={labelX} y={labelY} fill={starColor} fontSize={9} fontWeight="bold" textAnchor="middle" letterSpacing={0.8}>{starLabels[group.boosterId]}</SvgText>
                <SvgText x={labelX} y={labelY + 11} fill={on ? '#E8F4FF' : '#A3B1CC'} fontSize={7.5} fontWeight="bold" textAnchor="middle">{`${golden ? `${t('constellations.golden')} ` : ''}${t(tk(`rarity.${group.rarity}`)).toUpperCase()} · ${owned}/${total}`}</SvgText>
              </>}
            </G>
          );
        })}
      </Svg>
      {!mini && twinkles.map((twinkle, index) => <Twinkle key={index} x={twinkle.x} y={twinkle.y} delay={twinkle.delay} size={twinkle.size} color={index % 2 ? '#FFFFFF' : color} />)}
      {!mini && onSelect && points.map((point, index) => (
        <Pressable key={`touch-${index}`} onPress={() => onSelect(index)} hitSlop={6} style={[styles.touch, { left: point.x - 30, top: point.y - 30 }]} accessibilityLabel={`${starLabels[constellation.groups[index].boosterId]} ${constellation.groups[index].rarity}`} />
      ))}
    </View>
  );
}

export const ConstellationSky = memo(ConstellationSkyBase);

const styles = StyleSheet.create({
  twinkle: { position: 'absolute', width: 20, height: 20, textAlign: 'center', lineHeight: 20, fontWeight: '900' },
  touch: { position: 'absolute', width: 60, height: 60, borderRadius: 30 },
});

import { memo, useId } from 'react';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

// Demon Essence: a horned flame with a slit eye at its heart.
function EssenceIconBase({ size, dim = false }: { size: number; dim?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={dim ? 0.45 : 1}>
      <Defs>
        <RadialGradient id={`${uid}glow`} cx="50%" cy="55%" r="50%">
          <Stop offset="0" stopColor="#FF2E4D" stopOpacity={0.7} />
          <Stop offset="1" stopColor="#FF2E4D" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`${uid}flame`} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#5C0A24" />
          <Stop offset="0.45" stopColor="#E0223F" />
          <Stop offset="1" stopColor="#FFB07A" />
        </LinearGradient>
        <RadialGradient id={`${uid}core`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFF1D0" />
          <Stop offset="0.6" stopColor="#FF8A5A" />
          <Stop offset="1" stopColor="#E0223F" />
        </RadialGradient>
      </Defs>
      <Circle cx={50} cy={56} r={48} fill={`url(#${uid}glow)`} />
      <Path d="M 30 30 L 22 8 L 40 24 Z M 70 30 L 78 8 L 60 24 Z" fill="#3A0614" stroke="#FF6B7E" strokeWidth={1.5} />
      <Path d="M 50 12 C 64 30, 80 44, 78 64 C 76 82, 64 92, 50 92 C 36 92, 24 82, 22 64 C 20 44, 36 30, 50 12 Z" fill={`url(#${uid}flame)`} stroke="#FF8A9A" strokeWidth={1.8} />
      <Path d="M 50 34 C 58 46, 66 54, 64 66 C 62 76, 56 82, 50 82 C 44 82, 38 76, 36 66 C 34 54, 42 46, 50 34 Z" fill={`url(#${uid}core)`} opacity={0.9} />
      <Ellipse cx={50} cy={64} rx={10} ry={7} fill="#1A0206" />
      <Ellipse cx={50} cy={64} rx={2.4} ry={6.5} fill="#FFD27A" />
    </Svg>
  );
}

export const EssenceIcon = memo(EssenceIconBase);

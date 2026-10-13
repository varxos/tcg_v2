import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '../../audio/sound';
import { useI18n } from '../../i18n';
import { haptic } from '../feedback';
import { StarArt } from './StarArt';

const particles = Array.from({ length: 18 }, (_, index) => {
  const angle = (index / 18) * Math.PI * 2 + (index % 2) * 0.12;
  const distance = 150 + (index % 3) * 45;
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, icon: index % 3 === 0 ? '✦' : index % 3 === 1 ? '✧' : '•', color: ['#FFF4CF', '#FFD76A', '#FFB85C'][index % 3], size: 14 + (index % 4) * 4 };
});

// A dedicated reveal for the Supernova: the star charges, collapses, then explodes into light before the card appears.
export function SupernovaSequence({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const { t } = useI18n();
  const progress = useRef(new Animated.Value(0)).current;
  const finished = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    doneRef.current();
  };
  useEffect(() => {
    if (!visible) return;
    finished.current = false;
    progress.setValue(0);
    playSound('starCharge');
    haptic('medium');
    const flash = setTimeout(() => { playSound('hitSuper'); haptic('success'); }, 1480);
    const animation = Animated.timing(progress, { toValue: 1, duration: 2900, easing: Easing.linear, useNativeDriver: true });
    animation.start(({ finished: complete }) => { if (complete) finish(); });
    return () => { clearTimeout(flash); animation.stop(); };
  }, [visible, progress]);

  const starScale = progress.interpolate({ inputRange: [0, 0.48, 0.54, 0.6], outputRange: [0.5, 1.12, 1.32, 2.8], extrapolate: 'clamp' });
  const starOpacity = progress.interpolate({ inputRange: [0, 0.06, 0.53, 0.6], outputRange: [0, 1, 1, 0], extrapolate: 'clamp' });
  const shake = progress.interpolate({ inputRange: [0.28, 0.32, 0.36, 0.4, 0.44, 0.48, 0.52, 0.54], outputRange: [0, -4, 5, -6, 7, -8, 8, 0], extrapolate: 'clamp' });
  const implosion = progress.interpolate({ inputRange: [0, 0.5], outputRange: [2.4, 0.5], extrapolate: 'clamp' });
  const implosionOpacity = progress.interpolate({ inputRange: [0, 0.1, 0.45, 0.52], outputRange: [0, 0.6, 0.5, 0], extrapolate: 'clamp' });
  const flash = progress.interpolate({ inputRange: [0.5, 0.56, 0.74], outputRange: [0, 1, 0], extrapolate: 'clamp' });
  const titleScale = progress.interpolate({ inputRange: [0.6, 0.7, 0.78], outputRange: [0.4, 1.15, 1], extrapolate: 'clamp' });
  const titleOpacity = progress.interpolate({ inputRange: [0.6, 0.67], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={finish}>
      <Pressable style={styles.backdrop} onPress={finish}>
        <View style={styles.center} pointerEvents="none">
          <Animated.View style={[styles.ring, styles.implosion, { opacity: implosionOpacity, transform: [{ scale: implosion }] }]} />
          {[0, 1, 2].map((index) => {
            const start = 0.54 + index * 0.05;
            return <Animated.View key={index} style={[styles.ring, { borderColor: index === 1 ? '#FFB85C' : '#FFF4CF', opacity: progress.interpolate({ inputRange: [start, start + 0.04, 1], outputRange: [0, 0.9, 0], extrapolate: 'clamp' }), transform: [{ scale: progress.interpolate({ inputRange: [start, 1], outputRange: [0.2, 4.4 + index], extrapolate: 'clamp' }) }] }]} />;
          })}
          {particles.map((particle, index) => (
            <Animated.Text key={index} style={[styles.particle, { color: particle.color, fontSize: particle.size, opacity: progress.interpolate({ inputRange: [0.56, 0.62, 0.95, 1], outputRange: [0, 1, 0.8, 0], extrapolate: 'clamp' }), transform: [
              { translateX: progress.interpolate({ inputRange: [0.56, 1], outputRange: [0, particle.x], extrapolate: 'clamp' }) },
              { translateY: progress.interpolate({ inputRange: [0.56, 1], outputRange: [0, particle.y], extrapolate: 'clamp' }) },
            ] }]}>{particle.icon}</Animated.Text>
          ))}
          <Animated.View style={{ opacity: starOpacity, transform: [{ translateX: shake }, { scale: starScale }] }}>
            <StarArt variant="sparkle" size={230} speed={5} float={false} />
          </Animated.View>
          <Animated.View style={[styles.titleWrap, { opacity: titleOpacity, transform: [{ scale: titleScale }] }]}>
            <Text style={styles.title}>{t('supernova.burst')}</Text>
            <Text style={styles.subtitle}>{t('supernova.guaranteed')}</Text>
          </Animated.View>
        </View>
        <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flash }]} />
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,3,13,.95)', alignItems: 'center', justifyContent: 'center' },
  center: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 3 },
  implosion: { borderColor: '#FFD76A', borderWidth: 2 },
  particle: { position: 'absolute', fontWeight: '900', textShadowColor: '#FFF4A8', textShadowRadius: 10 },
  titleWrap: { position: 'absolute', alignItems: 'center' },
  title: { color: '#FFF6D8', fontSize: 38, fontWeight: '900', letterSpacing: 2, textShadowColor: '#FFB347', textShadowRadius: 22 },
  subtitle: { color: '#FFE3A1', fontSize: 11, fontWeight: '900', letterSpacing: 1.4, marginTop: 6, textShadowColor: '#2A1406', textShadowRadius: 8 },
  flash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFF8E6' },
});

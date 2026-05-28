import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { NextPrayerInfo, formatCountdown } from '../utils/prayerEngine';

interface CountdownDisplayProps {
  nextPrayer: NextPrayerInfo | null;
}

export const CountdownDisplay: React.FC<CountdownDisplayProps> = ({ nextPrayer }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    glow.start();

    return () => {
      pulse.stop();
      glow.stop();
    };
  }, []);

  if (!nextPrayer) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  const countdownText = formatCountdown(nextPrayer.remainingMinutes, nextPrayer.remainingSeconds);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      <Animated.View style={[styles.glowRing, { opacity: glowAnim }]} />
      <View style={styles.innerCircle}>
        <Text style={styles.label}>NEXT PRAYER</Text>
        <Text style={styles.prayerName}>{nextPrayer.name}</Text>
        <Text style={styles.countdown}>{countdownText}</Text>
        <Text style={styles.timeLabel}>at {nextPrayer.time}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
  },
  glowRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 2,
    borderColor: '#00C896',
    backgroundColor: 'rgba(0, 200, 150, 0.05)',
  },
  innerCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0, 200, 150, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 150, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(0, 200, 150, 0.7)',
    letterSpacing: 2,
    marginBottom: 4,
  },
  prayerName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  countdown: {
    fontSize: 36,
    fontWeight: '200',
    color: '#00C896',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  timeLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
  },
  loading: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});

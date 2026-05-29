import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { NextPrayerInfo, formatCountdown } from '../utils/prayerEngine';

interface CountdownDisplayProps {
  nextPrayer: NextPrayerInfo | null;
}

export const CountdownDisplay: React.FC<CountdownDisplayProps> = ({ nextPrayer }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.2)).current;
  const outerRingAnim = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.55,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.2,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );

    const outerRing = Animated.loop(
      Animated.sequence([
        Animated.timing(outerRingAnim, {
          toValue: 0.35,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(outerRingAnim, {
          toValue: 0.15,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    glow.start();
    outerRing.start();

    return () => {
      pulse.stop();
      glow.stop();
      outerRing.stop();
    };
  }, [glowAnim, outerRingAnim, pulseAnim]);

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
      {/* Decorative outer ring */}
      <Animated.View style={[styles.outerDecoRing, { opacity: outerRingAnim }]} />
      {/* Glow ring */}
      <Animated.View style={[styles.glowRing, { opacity: glowAnim }]} />
      {/* Main circle */}
      <View style={styles.innerCircle}>
        <Text style={styles.label}>NEXT PRAYER</Text>
        <Text style={styles.prayerName}>{nextPrayer.name}</Text>
        <Text style={styles.countdown}>{countdownText}</Text>
        <Text style={styles.remainingLabel}>remaining</Text>
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
  outerDecoRing: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: 'rgba(0, 232, 162, 0.12)',
    borderStyle: 'dashed',
  },
  glowRing: {
    position: 'absolute',
    width: 275,
    height: 275,
    borderRadius: 137.5,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 232, 162, 0.15)',
    backgroundColor: 'rgba(0, 232, 162, 0.02)',
  },
  innerCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#111827',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 232, 162, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00E8A2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(0, 232, 162, 0.6)',
    letterSpacing: 4,
    marginBottom: 6,
  },
  prayerName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  countdown: {
    fontSize: 44,
    fontWeight: '300',
    color: '#00E8A2',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0, 232, 162, 0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  remainingLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(240, 244, 248, 0.4)',
    letterSpacing: 1.5,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  timeLabel: {
    fontSize: 13,
    color: 'rgba(240, 244, 248, 0.35)',
    marginTop: 6,
  },
  loading: {
    fontSize: 16,
    color: 'rgba(240, 244, 248, 0.4)',
  },
});

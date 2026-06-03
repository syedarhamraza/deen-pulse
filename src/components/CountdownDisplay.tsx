import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { NextPrayerInfo, formatCountdown } from '../utils/prayerEngine';

interface CountdownDisplayProps {
  nextPrayer: NextPrayerInfo | null;
  isWindowActive?: boolean;
}

export const CountdownDisplay: React.FC<CountdownDisplayProps> = ({ nextPrayer, isWindowActive = false }) => {
  if (!nextPrayer) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Synchronizing schedule...</Text>
      </View>
    );
  }

  const accentColor = isWindowActive ? '#FFD700' : '#00E8A2';
  const glowColor = isWindowActive ? 'rgba(255, 215, 0, 0.45)' : 'rgba(0, 232, 162, 0.35)';
  const borderColor = isWindowActive ? 'rgba(255, 215, 0, 0.35)' : 'rgba(0, 232, 162, 0.25)';
  const outerBorderColor = isWindowActive ? 'rgba(255, 215, 0, 0.15)' : 'rgba(0, 232, 162, 0.12)';
  const countdownText = isWindowActive ? 'ACTIVE' : formatCountdown(nextPrayer.remainingMinutes, nextPrayer.remainingSeconds);

  return (
    <View style={styles.outerContainer}>
      <View style={styles.circularWrapper}>
        {/* Outer static minimal accent ring */}
        <View style={[styles.outerAccentRing, { borderColor: outerBorderColor }]} />

        {/* Central Glassmorphic Countdown Circle */}
        <View style={[styles.countdownCircle, { borderColor }]}>
          <Text style={[styles.statusLabel, { color: accentColor }]}>
            {isWindowActive ? 'PRAYER ACTIVE' : 'UPCOMING PRAYER'}
          </Text>

          <Text style={[styles.countdownText, { color: accentColor, textShadowColor: glowColor }]}>
            {countdownText}
          </Text>

          <Text style={styles.remainingText}>
            {isWindowActive ? 'adhan window' : 'remaining'}
          </Text>

          {/* Sub-divider line inside circle */}
          <View style={styles.circleDivider} />

          <View style={styles.prayerInfoContainer}>
            <Text style={styles.prayerName}>{nextPrayer.name}</Text>
            <Text style={styles.timeLabel}>at {nextPrayer.time}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    backgroundColor: '#121624',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
    width: '100%',
  },
  circularWrapper: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  outerAccentRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
  },
  countdownCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(18, 22, 36, 0.4)', // sleek glassmorphism
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    padding: 16,
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 8,
  },
  countdownText: {
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  remainingText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 4,
    textAlign: 'center',
  },
  circleDivider: {
    width: 32,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 12,
  },
  prayerInfoContainer: {
    alignItems: 'center',
  },
  prayerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  timeLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
    textAlign: 'center',
  },
});

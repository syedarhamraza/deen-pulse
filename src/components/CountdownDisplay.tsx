import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { NextPrayerInfo, formatCountdown } from '../utils/prayerEngine';

interface CountdownDisplayProps {
  nextPrayer: NextPrayerInfo | null;
  isWindowActive?: boolean;
}

export const CountdownDisplay: React.FC<CountdownDisplayProps> = ({ nextPrayer, isWindowActive = false }) => {
  const breatheAnim = useRef(new Animated.Value(0.4)).current;
  const pulseDotAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Breathing progress bar animation
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.0,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0.4,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    // Live dot pulsing
    const pulseDot = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseDotAnim, {
          toValue: 1.0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseDotAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    breathe.start();
    pulseDot.start();

    return () => {
      breathe.stop();
      pulseDot.stop();
    };
  }, [breatheAnim, pulseDotAnim]);

  if (!nextPrayer) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Synchronizing schedule...</Text>
      </View>
    );
  }

  const accentColor = isWindowActive ? '#FFD700' : '#00E8A2';
  const glowColor = isWindowActive ? 'rgba(255, 215, 0, 0.45)' : 'rgba(0, 232, 162, 0.35)';
  const borderColor = isWindowActive ? 'rgba(255, 215, 0, 0.3)' : 'rgba(0, 232, 162, 0.2)';
  const countdownText = isWindowActive ? 'ACTIVE' : formatCountdown(nextPrayer.remainingMinutes, nextPrayer.remainingSeconds);

  return (
    <View style={[styles.consoleCard, { borderColor }]}>
      {/* Top Header Row */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Icon name="clock" size={13} color={accentColor} />
          <Text style={[styles.headerText, { color: isWindowActive ? '#FFD700' : '#00E8A2' }]}>
            {isWindowActive ? 'PRAYER ACTIVE' : 'UPCOMING PRAYER'}
          </Text>
        </View>
        <View style={styles.liveIndicator}>
          <Animated.View style={[styles.liveDot, { backgroundColor: accentColor, opacity: pulseDotAnim }]} />
          <Text style={styles.liveText}>LIVE MONITOR</Text>
        </View>
      </View>

      {/* Middle Dynamic Row */}
      <View style={styles.mainInfoRow}>
        <View style={styles.prayerColumn}>
          <Text style={styles.prayerName}>{nextPrayer.name}</Text>
          <Text style={styles.timeLabel}>begins at {nextPrayer.time}</Text>
        </View>

        <View style={styles.timeColumn}>
          <Text style={[styles.countdownText, { color: accentColor, textShadowColor: glowColor }]}>
            {countdownText}
          </Text>
          <Text style={styles.remainingText}>
            {isWindowActive ? 'adhan window' : 'remaining'}
          </Text>
        </View>
      </View>

      {/* Bottom breathing line */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, { backgroundColor: accentColor, opacity: breatheAnim }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    height: 160,
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
  consoleCard: {
    backgroundColor: '#121624',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 20,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 0.5,
  },
  mainInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  prayerColumn: {
    flex: 1.2,
  },
  prayerName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  timeLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 4,
  },
  timeColumn: {
    flex: 1.8,
    alignItems: 'flex-end',
  },
  countdownText: {
    fontSize: 38,
    fontWeight: '300',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  remainingText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 1.5,
    marginTop: 18,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    width: '100%',
    borderRadius: 1.5,
  },
});

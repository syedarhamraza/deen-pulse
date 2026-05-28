import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PrayerTime, NextPrayerInfo, getPrayerStatus, formatCountdown } from '../utils/prayerEngine';

interface PrayerCardProps {
  prayer: PrayerTime;
  nextPrayer: NextPrayerInfo;
}

const PRAYER_ICONS: Record<string, string> = {
  Fajr: '🌅',
  Dhuhr: '☀️',
  Asr: '🌤️',
  Maghrib: '🌇',
  Isha: '🌙',
};

export const PrayerCard: React.FC<PrayerCardProps> = ({ prayer, nextPrayer }) => {
  const now = new Date();
  const status = getPrayerStatus(prayer, nextPrayer, now);

  const isNext = status === 'next';
  const isActive = status === 'active';
  const isPassed = status === 'passed';

  return (
    <View style={[
      styles.card,
      isNext && styles.cardNext,
      isActive && styles.cardActive,
      isPassed && styles.cardPassed,
    ]}>
      <View style={[
        styles.indicator,
        isNext && styles.indicatorNext,
        isActive && styles.indicatorActive,
        isPassed && styles.indicatorPassed,
      ]} />
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{PRAYER_ICONS[prayer.name] || '🕌'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[
          styles.name,
          isPassed && styles.namePassed,
        ]}>{prayer.name}</Text>
        <Text style={[
          styles.time,
          isPassed && styles.timePassed,
        ]}>{prayer.time}</Text>
      </View>
      {isNext && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {formatCountdown(nextPrayer.remainingMinutes, nextPrayer.remainingSeconds)}
          </Text>
        </View>
      )}
      {isActive && (
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Active</Text>
        </View>
      )}
      {isPassed && (
        <View style={styles.passedBadge}>
          <Text style={styles.passedBadgeText}>✓</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1f2c',
    borderRadius: 16,
    marginHorizontal: 20,
    marginVertical: 5,
    paddingVertical: 16,
    paddingHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardNext: {
    backgroundColor: 'rgba(0, 200, 150, 0.1)',
    borderWidth: 1,
    borderColor: '#00C896',
  },
  cardActive: {
    backgroundColor: 'rgba(0, 200, 150, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 150, 0.4)',
  },
  cardPassed: {
    opacity: 0.5,
  },
  indicator: {
    width: 3,
    height: '80%',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  indicatorNext: {
    backgroundColor: '#00C896',
  },
  indicatorActive: {
    backgroundColor: '#00C896',
  },
  indicatorPassed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  icon: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  namePassed: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  time: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  timePassed: {
    color: 'rgba(255, 255, 255, 0.25)',
  },
  badge: {
    backgroundColor: '#00C896',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  activeBadge: {
    backgroundColor: 'rgba(0, 200, 150, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00C896',
  },
  passedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passedBadgeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
  },
});

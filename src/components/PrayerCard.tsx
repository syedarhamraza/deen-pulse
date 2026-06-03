import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { PrayerTime, NextPrayerInfo, getPrayerStatus, formatCountdown } from '../utils/prayerEngine';

interface PrayerCardProps {
  prayer: PrayerTime;
  nextPrayer: NextPrayerInfo;
  currentDate?: Date;
}

// Map prayer names to Feather icons
const getPrayerIcon = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('fajr')) return 'sunrise';
  if (lower.includes('dhuhr') || lower.includes('zuhr')) return 'sun';
  if (lower.includes('asr')) return 'cloud';
  if (lower.includes('maghrib')) return 'sunset';
  if (lower.includes('isha')) return 'moon';
  return 'clock';
};

export const PrayerCard: React.FC<PrayerCardProps> = ({ prayer, nextPrayer, currentDate }) => {
  const now = currentDate || new Date();
  const status = getPrayerStatus(prayer, nextPrayer, now);

  const isNext = status === 'next';
  const isActive = status === 'active';
  const isPassed = status === 'passed';

  const iconName = getPrayerIcon(prayer.name);

  return (
    <View style={[
      styles.card,
      isNext && styles.cardNext,
      isActive && styles.cardActive,
      isPassed && styles.cardPassed,
    ]}>
          {/* Prayer icon */}
      <View style={[
        styles.iconContainer,
        isNext && styles.iconContainerNext,
        isActive && styles.iconContainerActive,
        isPassed && styles.iconContainerPassed,
      ]}>
        <Icon
          name={isPassed ? 'check' : iconName}
          size={18}
          color={isPassed ? 'rgba(240, 244, 248, 0.25)' : isActive ? '#FFD700' : isNext ? '#00E8A2' : 'rgba(240, 244, 248, 0.5)'}
        />
      </View>

      {/* Prayer info */}
      <View style={styles.info}>
        <Text style={[
          styles.name,
          isPassed && styles.namePassed,
          isNext && styles.nameNext,
          isActive && styles.nameActive,
        ]}>{prayer.name}</Text>
        <Text style={[
          styles.time,
          isPassed && styles.timePassed,
          isActive && styles.timeActive,
        ]}>{prayer.time}</Text>
      </View>

      {/* Status badge */}
      {isNext && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {formatCountdown(nextPrayer.remainingMinutes, nextPrayer.remainingSeconds)}
          </Text>
        </View>
      )}
      {isActive && (
        <View style={styles.activeBadge}>
          <View style={styles.activeDot} />
          <Text style={styles.activeBadgeText}>NOW</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 20,
    marginHorizontal: 20,
    marginVertical: 5,
    paddingVertical: 16,
    paddingHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(240, 244, 248, 0.05)',
  },
  cardNext: {
    backgroundColor: '#102931',
    borderWidth: 1,
    borderColor: '#00E8A2',
    elevation: 4,
    shadowColor: '#00E8A2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardActive: {
    backgroundColor: '#1C1917',
    borderWidth: 1,
    borderColor: '#FFD700',
    elevation: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  cardPassed: {
    opacity: 0.5,
    borderColor: 'rgba(240, 244, 248, 0.02)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(240, 244, 248, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconContainerNext: {
    backgroundColor: 'rgba(0, 232, 162, 0.12)',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
  },
  iconContainerPassed: {
    backgroundColor: 'rgba(240, 244, 248, 0.03)',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F0F4F8',
    letterSpacing: 0.3,
  },
  nameNext: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nameActive: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  namePassed: {
    color: 'rgba(240, 244, 248, 0.4)',
  },
  time: {
    fontSize: 13,
    color: 'rgba(240, 244, 248, 0.45)',
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  timeActive: {
    color: 'rgba(255, 215, 0, 0.7)',
  },
  timePassed: {
    color: 'rgba(240, 244, 248, 0.2)',
  },
  badge: {
    backgroundColor: '#00E8A2',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#00E8A2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#080B14',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD700',
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD700',
  },
  passedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(240, 244, 248, 0.05)',
  },
  passedBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(240, 244, 248, 0.3)',
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { PrayerTime, NextPrayerInfo, getPrayerStatus, formatCountdown, getTimezoneAbbreviation } from '../utils/prayerEngine';

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
  const tz = getTimezoneAbbreviation(prayer.date);
  const displayTime = prayer.time.includes('(') ? prayer.time : `${prayer.time} (${tz})`;

  return (
    <View style={[
      styles.card,
      isNext && styles.cardNext,
      isActive && styles.cardActive,
      isPassed && styles.cardPassed,
    ]}>
      {/* Left indicator column (Checkmark / Circle Outline / Alignment Spacer) */}
      {isNext || isActive ? (
        <View style={styles.checkIconSpacer} />
      ) : (
        <Icon
          name={isPassed ? 'check-circle' : 'circle'}
          size={14}
          color={isPassed ? '#00F29D' : 'rgba(255, 255, 255, 0.15)'}
          style={styles.checkIcon}
        />
      )}

      {/* Prayer icon (custom sun/star position icons) */}
      <View style={[
        styles.iconContainer,
        isNext && styles.iconContainerNext,
        isActive && styles.iconContainerActive,
        isPassed && styles.iconContainerPassed,
      ]}>
        <Icon
          name={iconName}
          size={18}
          color={isPassed ? 'rgba(255, 255, 255, 0.25)' : (isActive || isNext) ? '#00F29D' : 'rgba(255, 255, 255, 0.4)'}
        />
      </View>

      {/* Prayer info (inline name and time) */}
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
          isNext && styles.timeNext,
        ]}>{displayTime}</Text>
      </View>

      {/* Pill-shaped badge on the right displaying remaining countdown time */}
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
    backgroundColor: '#111417', // Solid dark obsidian card base
    borderRadius: 20,
    marginHorizontal: 20,
    marginVertical: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#1C2024', // Clean subtle solid border
  },
  cardNext: {
    backgroundColor: '#141D20', // Solid emerald-obsidian tint
    borderWidth: 1,
    borderColor: '#0B6646', // Luminous emerald border
    shadowColor: '#00F29D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  cardActive: {
    backgroundColor: '#141D20',
    borderWidth: 1,
    borderColor: '#0B6646',
    shadowColor: '#00F29D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  cardPassed: {
    opacity: 0.5,
    backgroundColor: '#0F1113', // Even darker obsidian for passed rows
    borderColor: '#131618',
  },
  checkIcon: {
    marginRight: 12,
  },
  checkIconSpacer: {
    width: 14,
    marginRight: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerNext: {
    backgroundColor: 'rgba(0, 242, 157, 0.08)',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(0, 242, 157, 0.08)',
  },
  iconContainerPassed: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
    color: 'rgba(255, 255, 255, 0.4)',
  },
  time: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 3,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  timeNext: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeActive: {
    color: '#00F29D',
  },
  timePassed: {
    color: 'rgba(255, 255, 255, 0.2)',
  },
  badge: {
    backgroundColor: 'rgba(11, 102, 70, 0.25)', // dark emerald translucent
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
    shadowColor: '#00F29D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00F29D',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 242, 157, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F29D',
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00F29D',
  },
  passedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  passedBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.3)',
  },
});

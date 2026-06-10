/*
 * Copyright (C) 2026 Syed Arham Raza
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NextPrayerInfo, formatCountdown, getTimezoneAbbreviation } from '../utils/prayerEngine';

interface CountdownDisplayProps {
  nextPrayer: NextPrayerInfo | null;
  isWindowActive?: boolean;
  activePrayerName?: string | null;
}

export const CountdownDisplay: React.FC<CountdownDisplayProps> = ({ nextPrayer, isWindowActive = false, activePrayerName }) => {
  if (!nextPrayer) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Synchronizing schedule...</Text>
      </View>
    );
  }

  const accentColor = '#00F29D';
  const glowColor = 'rgba(0, 242, 157, 0.45)';
  const borderColor = isWindowActive ? '#00F29D' : '#0B6646';
  const outerBorderColor = isWindowActive ? 'rgba(0, 242, 157, 0.25)' : 'rgba(0, 242, 157, 0.12)';
  const countdownText = isWindowActive ? 'ACTIVE' : formatCountdown(nextPrayer.remainingMinutes, nextPrayer.remainingSeconds);
  const tz = getTimezoneAbbreviation();
  const displayName = (isWindowActive && activePrayerName) ? activePrayerName : nextPrayer.name;
  const subtitleText = isWindowActive 
    ? `${displayName} Adhan Window (${tz})` 
    : nextPrayer.time.includes('(')
      ? `${displayName} at ${nextPrayer.time}`
      : `${displayName} at ${nextPrayer.time} (${tz})`;

  return (
    <View style={styles.outerContainer}>
      <View style={styles.circularWrapper}>
        {/* Thick sleek translucent outer track */}
        <View style={[styles.outerAccentRing, { borderColor: outerBorderColor, shadowColor: accentColor }]} />

        {/* Central Glassmorphic Countdown Circle */}
        <View style={[styles.countdownCircle, { borderColor }]}>
          <Text style={[styles.countdownText, { color: accentColor, textShadowColor: glowColor }]}>
            {countdownText}
          </Text>

          <Text style={styles.subtitleText}>
            {subtitleText}
          </Text>
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
    backgroundColor: '#0B0F12',
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
    borderWidth: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  countdownCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#0B0F12', // Solid deep obsidian matching screen base
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
  countdownText: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
    marginTop: 8,
    textAlign: 'center',
  },
});

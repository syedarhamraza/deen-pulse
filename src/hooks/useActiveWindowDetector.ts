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

import { useEffect, useRef } from 'react';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NextPrayerInfo, PrayerTime } from '../utils/prayerEngine';

const { PrayerCapsuleModule } = NativeModules;

export const ADHAN_SOUND_ENABLED_KEY = '@deenpulse_adhan_sound_enabled';

export function useActiveWindowDetector(nextPrayer: NextPrayerInfo | null, prayerTimes: PrayerTime[]) {
  const lastTriggeredPrayer = useRef<string | null>(null);

  // Compute active state dynamically on every tick based on current time
  const now = new Date();
  const activePrayer = prayerTimes.find(prayer => {
    const diffMs = now.getTime() - prayer.date.getTime();
    // Active if current time is within 15 minutes after the prayer start
    return diffMs >= 0 && diffMs < 15 * 60 * 1000;
  });

  const isWindowActive = !!activePrayer;
  const activePrayerName = activePrayer ? activePrayer.name : null;

  // Initialize lastTriggeredPrayer on mount to prevent triggering when opening the app while already active
  useEffect(() => {
    if (activePrayerName) {
      lastTriggeredPrayer.current = activePrayerName;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger alert if the active prayer started very recently (e.g., within the last 15 seconds)
  useEffect(() => {
    if (activePrayer) {
      const elapsedMs = Date.now() - activePrayer.date.getTime();
      if (elapsedMs >= 0 && elapsedMs < 15000) {
        if (lastTriggeredPrayer.current !== activePrayer.name) {
          lastTriggeredPrayer.current = activePrayer.name;

          // Trigger native sound alert if enabled
          AsyncStorage.getItem(ADHAN_SOUND_ENABLED_KEY).then(val => {
            if (val === 'true' || val === null) { // Default to true if not set
              PrayerCapsuleModule?.playPrayerAlert(activePrayer.name);
            }
          }).catch(err => {
            console.warn('Failed to retrieve adhan sound enabled key', err);
            PrayerCapsuleModule?.playPrayerAlert(activePrayer.name);
          });
        }
      }
    }
  }, [activePrayerName, activePrayer]);

  return {
    isWindowActive,
    activePrayerName,
  };
}

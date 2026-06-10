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

import { useState, useEffect } from 'react';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PrayerTime, getNextPrayer, NextPrayerInfo } from '../utils/prayerEngine';

const { PrayerCapsuleModule } = NativeModules;

export const CAT3_NOTIFICATION_MODE_KEY = '@deenpulse_cat3_notification_mode';

export function usePrayerCountdown(
  prayerTimes: PrayerTime[],
  liveActivityEnabled: boolean = true,
  capsuleFormat: string = 'name',
  notificationStyle: string = 'standard',
  location: { latitude: number; longitude: number } | null = null,
  deviceCategory: number = 3,
  cat3NotificationMode: 'ongoing' | 'reminder' = 'reminder',
  cat1NotificationMode: 'alltime' | 'prior' = 'alltime',
  cat1PriorLeadTime: number = 15,
  cat2NotificationMode: 'alltime' | 'prior' | 'simple' | 'nocapsule' = 'alltime',
  cat2PriorLeadTime: number = 15
) {
  const [nextPrayer, setNextPrayer] = useState<NextPrayerInfo | null>(null);

  // Sync prayer timings schedule to background service whenever they load/change
  useEffect(() => {
    if (prayerTimes.length === 0) return;

    if (!liveActivityEnabled) {
      try {
        PrayerCapsuleModule?.stopCapsule();
        if (deviceCategory === 3) {
          PrayerCapsuleModule?.cancelReminders();
        }
      } catch (e) {
        console.warn('Failed to stop capsule:', e);
      }
      return;
    }

    try {
      // Pass today's and tomorrow's timings to the Kotlin service
      const scheduleList = [
        ...prayerTimes.map(p => ({ name: p.name, timestamp: p.date.getTime() })),
        ...prayerTimes.map(p => {
          const tomorrowDate = new Date(p.date.getTime());
          tomorrowDate.setDate(tomorrowDate.getDate() + 1);
          return { name: p.name, timestamp: tomorrowDate.getTime() };
        })
      ];
      const prayersJson = JSON.stringify(scheduleList);
      AsyncStorage.setItem('@deenpulse_last_prayers_json', prayersJson).catch(() => {});

      const isReminderOrPrior = 
        (deviceCategory === 3 && cat3NotificationMode === 'reminder') ||
        (deviceCategory === 1 && cat1NotificationMode === 'prior') ||
        (deviceCategory === 2 && (cat2NotificationMode === 'prior' || cat2NotificationMode === 'simple'));

      if (isReminderOrPrior) {
        // Schedule AlarmManager reminders/prior triggers, stop persistent foreground service
        PrayerCapsuleModule?.stopCapsule();
        PrayerCapsuleModule?.scheduleReminders(prayersJson);
      } else {
        // Cat1/Cat2 Mode A/D or Cat 3 ongoing mode: use persistent foreground service
        const activeMode = deviceCategory === 1 ? cat1NotificationMode : (deviceCategory === 2 ? cat2NotificationMode : 'alltime');
        PrayerCapsuleModule?.cancelReminders();
        PrayerCapsuleModule?.updateLiveCapsule(prayersJson, capsuleFormat, notificationStyle, activeMode);
      }

      // Sync to Wear OS watch if location coordinates are available
      if (location) {
        AsyncStorage.getItem('@deenpulse_auto_sync_wear').then(val => {
          if (val === 'true' || val === null) {
            PrayerCapsuleModule?.syncToWear(prayersJson, location.latitude, location.longitude);
            AsyncStorage.setItem('@deenpulse_last_wear_sync', new Date().toISOString()).catch(() => {});
          }
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Failed to update live capsule or sync to wear:', e);
    }
  }, [prayerTimes, liveActivityEnabled, capsuleFormat, notificationStyle, location, deviceCategory, cat3NotificationMode, cat1NotificationMode, cat1PriorLeadTime, cat2NotificationMode, cat2PriorLeadTime]);

  // Main UI countdown tick
  useEffect(() => {
    if (prayerTimes.length === 0) return;

    const updateCountdown = () => {
      const now = new Date();
      const next = getNextPrayer(prayerTimes, now);
      setNextPrayer(next);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [prayerTimes]);

  return nextPrayer;
}

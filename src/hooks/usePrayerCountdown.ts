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
  cat3NotificationMode: 'ongoing' | 'reminder' = 'reminder'
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

      if (deviceCategory === 3 && cat3NotificationMode === 'reminder') {
        // Cat3 reminder mode: schedule AlarmManager reminders, no foreground service
        PrayerCapsuleModule?.stopCapsule();
        PrayerCapsuleModule?.scheduleReminders(prayersJson);
      } else {
        // Cat1/Cat2 or Cat3 ongoing mode: use foreground service
        PrayerCapsuleModule?.cancelReminders();
        PrayerCapsuleModule?.updateLiveCapsule(prayersJson, capsuleFormat, notificationStyle);
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
  }, [prayerTimes, liveActivityEnabled, capsuleFormat, notificationStyle, location, deviceCategory, cat3NotificationMode]);

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

import { useState, useEffect } from 'react';
import { NativeModules } from 'react-native';
import { PrayerTime, getNextPrayer, NextPrayerInfo } from '../utils/prayerEngine';

const { PrayerCapsuleModule } = NativeModules;

export function usePrayerCountdown(
  prayerTimes: PrayerTime[],
  liveActivityEnabled: boolean = true,
  capsuleFormat: string = 'name',
  notificationStyle: string = 'standard'
) {
  const [nextPrayer, setNextPrayer] = useState<NextPrayerInfo | null>(null);

  // Sync prayer timings schedule to background service whenever they load/change
  useEffect(() => {
    if (prayerTimes.length === 0) return;

    if (!liveActivityEnabled) {
      try {
        PrayerCapsuleModule?.stopCapsule();
      } catch (e) {
        console.warn('Failed to stop capsule:', e);
      }
      return;
    }

    try {
      // Pass today's and tomorrow's timings to the Kotlin service
      const scheduleList = [
        ...prayerTimes.map(p => ({ name: p.name, timestamp: p.date.getTime() })),
        ...prayerTimes.map(p => ({ name: p.name, timestamp: p.date.getTime() + 24 * 60 * 60 * 1000 }))
      ];
      const prayersJson = JSON.stringify(scheduleList);
      PrayerCapsuleModule?.updateLiveCapsule(prayersJson, capsuleFormat, notificationStyle);
    } catch (e) {
      console.warn('Failed to update live capsule:', e);
    }
  }, [prayerTimes, liveActivityEnabled, capsuleFormat, notificationStyle]);

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

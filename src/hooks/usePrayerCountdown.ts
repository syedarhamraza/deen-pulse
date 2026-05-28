import { useState, useEffect, useRef } from 'react';
import { NativeModules } from 'react-native';
import { PrayerTime, getNextPrayer, NextPrayerInfo } from '../utils/prayerEngine';

const { PrayerCapsuleModule } = NativeModules;

export function usePrayerCountdown(prayerTimes: PrayerTime[], liveActivityEnabled: boolean = true) {
  const [nextPrayer, setNextPrayer] = useState<NextPrayerInfo | null>(null);
  const lastPrayerName = useRef<string>('');
  const lastTargetMs = useRef<number>(0);

  useEffect(() => {
    if (prayerTimes.length === 0) return;

    if (!liveActivityEnabled) {
      try {
        PrayerCapsuleModule?.stopCapsule();
      } catch (e) {
        console.warn('Failed to stop capsule:', e);
      }
      lastPrayerName.current = '';
      lastTargetMs.current = 0;
    }

    const updateCountdown = () => {
      const now = new Date();
      const next = getNextPrayer(prayerTimes, now);
      setNextPrayer(next);

      if (next && liveActivityEnabled) {
        const matchingPrayer = prayerTimes.find(p => p.name === next.name);
        if (matchingPrayer) {
          let targetMs = matchingPrayer.date.getTime();
          // Handle tomorrow Fajr rollover
          if (targetMs < now.getTime() && next.name === prayerTimes[0].name) {
            const tom = new Date(matchingPrayer.date);
            tom.setDate(tom.getDate() + 1);
            targetMs = tom.getTime();
          }

          if (lastPrayerName.current !== next.name || lastTargetMs.current !== targetMs) {
            lastPrayerName.current = next.name;
            lastTargetMs.current = targetMs;
            try {
              PrayerCapsuleModule?.updateLiveCapsule(next.name, targetMs);
            } catch (e) {
              console.warn('Failed to update live capsule:', e);
            }
          }
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [prayerTimes, liveActivityEnabled]);

  return nextPrayer;
}

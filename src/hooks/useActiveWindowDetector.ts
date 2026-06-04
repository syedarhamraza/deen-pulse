import { useState, useEffect, useRef } from 'react';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NextPrayerInfo } from '../utils/prayerEngine';

const { PrayerCapsuleModule } = NativeModules;

export const ADHAN_SOUND_ENABLED_KEY = '@deenpulse_adhan_sound_enabled';

interface ActiveState {
  active: boolean;
  prayerName: string | null;
  startTime: number | null;
}

export function useActiveWindowDetector(nextPrayer: NextPrayerInfo | null) {
  const [activeState, setActiveState] = useState<ActiveState>({
    active: false,
    prayerName: null,
    startTime: null,
  });

  const lastTriggeredPrayer = useRef<string | null>(null);

  useEffect(() => {
    if (!nextPrayer) return;

    const { name, remainingMinutes, remainingSeconds } = nextPrayer;

    // Detect the exact transition to 00:00:00 (or if it went slightly past but hasn't triggered yet)
    if (remainingMinutes <= 0 && remainingSeconds <= 0) {
      if (lastTriggeredPrayer.current !== name) {
        lastTriggeredPrayer.current = name;
        
        // Trigger state
        const now = Date.now();
        setActiveState({
          active: true,
          prayerName: name,
          startTime: now,
        });

        // Trigger native sound alert if enabled
        AsyncStorage.getItem(ADHAN_SOUND_ENABLED_KEY).then(val => {
          if (val === 'true' || val === null) { // Default to true if not set
            PrayerCapsuleModule?.playPrayerAlert(name);
          }
        }).catch(err => {
          console.warn('Failed to retrieve adhan sound enabled key', err);
          PrayerCapsuleModule?.playPrayerAlert(name);
        });
      }
    }
  }, [nextPrayer]);

  // Handle active window timeout auto-reset after 15 minutes
  useEffect(() => {
    if (activeState.active && activeState.startTime) {
      const elapsed = Date.now() - activeState.startTime;
      const fifteenMinutes = 15 * 60 * 1000;
      
      if (elapsed >= fifteenMinutes) {
        setActiveState({ active: false, prayerName: null, startTime: null });
        return;
      }

      const timeLeft = fifteenMinutes - elapsed;
      const timer = setTimeout(() => {
        setActiveState({ active: false, prayerName: null, startTime: null });
      }, timeLeft);

      return () => clearTimeout(timer);
    }
  }, [activeState]);

  return {
    isWindowActive: activeState.active,
    activePrayerName: activeState.prayerName,
  };
}

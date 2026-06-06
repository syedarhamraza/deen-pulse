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

import { useState, useEffect, useCallback } from 'react';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DeviceProfile,
  DEVICE_PROFILE_KEY,
  ONBOARDING_COMPLETE_KEY,
  buildDeviceProfile,
  getProfileFromStorage,
} from '../utils/deviceProfiles';

const { PrayerCapsuleModule } = NativeModules;

export function useDeviceProfile() {
  const [profile, setProfile] = useState<DeviceProfile | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const storedProfile = await getProfileFromStorage();
        const onboardingDone = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);

        if (storedProfile) {
          setProfile(storedProfile);
          // Make sure native module knows the category on restart
          PrayerCapsuleModule?.setDeviceCategory(storedProfile.category);
        }
        setIsOnboardingComplete(onboardingDone === 'true');
      } catch (e) {
        console.error('Failed to load onboarding info', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const completeOnboarding = useCallback(async (selectedBrand: string) => {
    try {
      const newProfile = buildDeviceProfile(selectedBrand);
      setProfile(newProfile);
      setIsOnboardingComplete(true);

      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      await AsyncStorage.setItem(DEVICE_PROFILE_KEY, JSON.stringify(newProfile));

      // Update Native Module
      PrayerCapsuleModule?.setDeviceCategory(newProfile.category);
    } catch (e) {
      console.error('Failed to complete onboarding', e);
    }
  }, []);

  return {
    profile,
    isOnboardingComplete,
    isLoading,
    completeOnboarding,
  };
}

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

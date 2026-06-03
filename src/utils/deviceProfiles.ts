import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DeviceProfile {
  brand: string;            // UI-friendly name, e.g., 'oppo', 'vivo', 'samsung', 'xiaomi', 'pixel', 'oneplus', 'realme', 'other'
  manufacturer: string;     // raw Platform.constants.Manufacturer or similar
  category: 1 | 2 | 3;      // OEM notification behavior tier
}

export const OEM_CATEGORIES: Record<string, 1 | 2 | 3> = {
  oppo: 1,
  oneplus: 1,
  realme: 1,
  vivo: 2,
  iqoo: 2,
};

export const ONBOARDING_COMPLETE_KEY = '@deenpulse_onboarding_complete';
export const DEVICE_PROFILE_KEY = '@deenpulse_device_profile';
export const FORCE_LIVE_NOTIFICATION_KEY = '@deenpulse_force_live_notification';

export function getCategoryForManufacturer(manufacturer: string): 1 | 2 | 3 {
  const mfgClean = manufacturer.toLowerCase().trim();
  if (OEM_CATEGORIES[mfgClean] !== undefined) {
    return OEM_CATEGORIES[mfgClean];
  }
  return 3; // Default category
}

export function detectDeviceCategory(): { brand: string; manufacturer: string; category: 1 | 2 | 3 } {
  if (Platform.OS !== 'android') {
    return {
      brand: 'other',
      manufacturer: 'apple',
      category: 3,
    };
  }

  // Under the new architecture, constants are safe to access, but we guard just in case.
  const constants = (Platform.constants || {}) as { Brand?: string; Manufacturer?: string };
  const manufacturer = constants.Manufacturer || 'unknown';
  const brand = constants.Brand || 'unknown';

  const mfgLower = manufacturer.toLowerCase().trim();
  const brandLower = brand.toLowerCase().trim();

  // Try to find a match in our categories
  let category = getCategoryForManufacturer(mfgLower);
  if (category === 3) {
    category = getCategoryForManufacturer(brandLower);
  }

  // Determine a UI-friendly brand string
  let brandName = 'other';
  const knownBrands = ['oppo', 'vivo', 'samsung', 'xiaomi', 'pixel', 'oneplus', 'realme', 'iqoo'];
  for (const kb of knownBrands) {
    if (mfgLower.includes(kb) || brandLower.includes(kb)) {
      brandName = kb;
      break;
    }
  }

  return {
    brand: brandName,
    manufacturer,
    category,
  };
}

export function buildDeviceProfile(selectedBrand: string): DeviceProfile {
  const detected = detectDeviceCategory();
  const brandLower = selectedBrand.toLowerCase().trim();
  const category = getCategoryForManufacturer(brandLower);

  return {
    brand: brandLower,
    manufacturer: brandLower === detected.brand ? detected.manufacturer : selectedBrand,
    category,
  };
}

export async function getProfileFromStorage(): Promise<DeviceProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(DEVICE_PROFILE_KEY);
    if (raw) {
      return JSON.parse(raw) as DeviceProfile;
    }
  } catch (e) {
    console.error('Failed to load device profile from storage', e);
  }
  return null;
}

export async function saveProfileToStorage(profile: DeviceProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(DEVICE_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save device profile to storage', e);
  }
}

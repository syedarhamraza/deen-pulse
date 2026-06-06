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
    manufacturer: detected.manufacturer,
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

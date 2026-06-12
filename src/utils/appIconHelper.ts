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

import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { PrayerCapsuleModule } = NativeModules;

export type AppIconType = 'default' | 'emerald' | 'blue';

/**
 * Changes the app launcher icon dynamically.
 * Android: Toggles activity-aliases.
 * iOS: Bypassed.
 */
export async function changeAppIcon(iconName: AppIconType): Promise<boolean> {
  try {
    // Save selection in local storage
    await AsyncStorage.setItem('@deenpulse_app_icon', iconName);

    if (Platform.OS === 'android') {
      if (PrayerCapsuleModule && typeof PrayerCapsuleModule.changeAppIcon === 'function') {
        return await PrayerCapsuleModule.changeAppIcon(iconName);
      } else {
        console.warn('PrayerCapsuleModule.changeAppIcon is not available.');
        return false;
      }
    }

    // iOS is bypassed (we do not change app icon on iOS)
    return true;
  } catch (error) {
    console.error('Failed to change app icon:', error);
    return false;
  }
}

/**
 * Retrieves the currently configured app icon setting.
 */
export async function getCurrentAppIcon(): Promise<AppIconType> {
  try {
    const value = await AsyncStorage.getItem('@deenpulse_app_icon');
    if (value === 'emerald' || value === 'blue') {
      return value;
    }
    return 'default';
  } catch {
    return 'default';
  }
}

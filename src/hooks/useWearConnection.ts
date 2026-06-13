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

const { PrayerCapsuleModule } = NativeModules;

export const LAST_WEAR_SYNC_KEY = '@deenpulse_last_wear_sync';

export function useWearConnection() {
  const [isConnected, setIsConnected] = useState(true);
  const [watchName, setWatchName] = useState('Galaxy Watch 7');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    setIsConnected(true);
    setWatchName('Galaxy Watch 7');
  }, []);

  const loadLastSyncTime = useCallback(async () => {
    try {
      const time = await AsyncStorage.getItem(LAST_WEAR_SYNC_KEY);
      setLastSyncTime(time);
    } catch (e) {
      console.warn('Failed to load last wear sync time', e);
    }
  }, []);

  useEffect(() => {
    checkConnection();
    loadLastSyncTime();

    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [checkConnection, loadLastSyncTime]);

  return {
    isConnected,
    watchName,
    lastSyncTime,
    refreshSyncTime: loadLastSyncTime,
  };
}

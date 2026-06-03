import { useState, useEffect, useCallback } from 'react';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { PrayerCapsuleModule } = NativeModules;

export const LAST_WEAR_SYNC_KEY = '@deenpulse_last_wear_sync';

export function useWearConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [watchName, setWatchName] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      if (PrayerCapsuleModule?.getWearConnectionStatus) {
        const status = await PrayerCapsuleModule.getWearConnectionStatus();
        setIsConnected(status.connected);
        setWatchName(status.nodeName || '');
      }
    } catch (e) {
      console.warn('Failed to check Wear OS connection status', e);
    }
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

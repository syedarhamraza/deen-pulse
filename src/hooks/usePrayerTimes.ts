import { useState, useEffect, useCallback } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PrayerTime, parsePrayerTimings } from '../utils/prayerEngine';

interface Location {
  latitude: number;
  longitude: number;
}

interface UsePrayerTimesResult {
  prayerTimes: PrayerTime[];
  loading: boolean;
  error: string | null;
  location: Location | null;
  refresh: () => void;
}

const FALLBACK_LOCATION = { latitude: 33.6844, longitude: 72.8104 }; // Islamabad default

export function usePrayerTimes(method: number = 2, autoDetectGPS: boolean = true): UsePrayerTimesResult {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<Location | null>(null);

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'DeenPulse Location Permission',
          message: 'DeenPulse needs your location to calculate accurate prayer times for your area.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const getCalendarAndParse = useCallback(async (lat: number, lng: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const day = now.getDate();

      const cacheKey = `@deenpulse_calendar_${lat.toFixed(4)}_${lng.toFixed(4)}_${method}_${month}_${year}`;
      
      let calendarDataStr = await AsyncStorage.getItem(cacheKey);
      let timings: Record<string, string> | null = null;

      if (calendarDataStr) {
        try {
          const calendarData = JSON.parse(calendarDataStr);
          if (calendarData[day - 1]?.timings) {
            timings = calendarData[day - 1].timings;
          }
        } catch (e) {
          // JSON parse failed
        }
      }

      if (!timings) {
        // Fetch fresh calendar from AlAdhan API
        const url = `https://api.aladhan.com/v1/calendar?latitude=${lat}&longitude=${lng}&method=${method}&month=${month}&year=${year}`;
        const response = await fetch(url);
        const json = await response.json();
        
        if (json.code === 200 && json.data) {
          await AsyncStorage.setItem(cacheKey, JSON.stringify(json.data));
          if (json.data[day - 1]?.timings) {
            timings = json.data[day - 1].timings;
          }
        }
      }

      if (timings) {
        const parsed = parsePrayerTimings(timings);
        setPrayerTimes(parsed);
      } else {
        setError('Failed to load prayer timings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch calendar');
    } finally {
      setLoading(false);
    }
  }, [method]);

  const loadTimes = useCallback(async () => {
    if (!autoDetectGPS) {
      setLocation(FALLBACK_LOCATION);
      getCalendarAndParse(FALLBACK_LOCATION.latitude, FALLBACK_LOCATION.longitude);
      return;
    }

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setError('Location permission denied. Using default Islamabad coordinates.');
      setLocation(FALLBACK_LOCATION);
      getCalendarAndParse(FALLBACK_LOCATION.latitude, FALLBACK_LOCATION.longitude);
      return;
    }

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        getCalendarAndParse(latitude, longitude);
      },
      (err) => {
        setError(`Location error: ${err.message}. Using default.`);
        setLocation(FALLBACK_LOCATION);
        getCalendarAndParse(FALLBACK_LOCATION.latitude, FALLBACK_LOCATION.longitude);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, [autoDetectGPS, getCalendarAndParse]);

  useEffect(() => {
    loadTimes();
  }, [loadTimes]);

  return { prayerTimes, loading, error, location, refresh: loadTimes };
}

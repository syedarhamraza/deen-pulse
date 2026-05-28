import { useState, useEffect, useCallback, useRef } from 'react';
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

export function usePrayerTimes(
  locationMode: 'gps' | 'cached',
  juristicMethod: 'standard' | 'hanafi',
  calculationRule: 'auto' | 'karachi' | 'isna'
): UsePrayerTimesResult {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const isFirstRender = useRef(true);

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

  const loadTimes = useCallback(async (forceRefreshGPS: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setError('Location permission denied.');
        setLoading(false);
        setLocation(null);
        return;
      }

      const performFetch = async (lat: number, lng: number) => {
        try {
          const now = new Date();
          const month = now.getMonth() + 1;
          const year = now.getFullYear();
          const day = now.getDate();

          const cacheKey = `@deenpulse_calendar_${lat.toFixed(4)}_${lng.toFixed(4)}_${month}_${year}`;
          
          if (forceRefreshGPS) {
            console.log("Flushing active AsyncStorage day-cache for key:", cacheKey);
            await AsyncStorage.removeItem(cacheKey);
          }

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
            // Construct API url dynamically based on settings
            let url = `https://api.aladhan.com/v1/calendar?latitude=${lat}&longitude=${lng}&month=${month}&year=${year}`;
            
            if (calculationRule === 'auto') {
              url += '&method=99';
            } else if (calculationRule === 'karachi') {
              url += '&method=1';
            } else if (calculationRule === 'isna') {
              url += '&method=2';
            }

            if (juristicMethod === 'hanafi') {
              url += '&school=1';
            } else {
              url += '&school=0';
            }

            console.log("Fetching prayer times from URL:", url);

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
      };

      if (locationMode === 'gps' || forceRefreshGPS) {
        // Query raw hardware GPS coordinates
        Geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            // Explicitly console.log the raw longitude and latitude numbers immediately upon acquisition
            console.log("GPS Location Acquired - Lat:", latitude, "Long:", longitude);
            
            // Save cache coordinates
            await AsyncStorage.setItem('@deenpulse_cached_lat', latitude.toString());
            await AsyncStorage.setItem('@deenpulse_cached_lng', longitude.toString());
            
            setLocation({ latitude, longitude });
            performFetch(latitude, longitude);
          },
          (err) => {
            setError(`Location error: ${err.message}`);
            setLoading(false);
            setLocation(null);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      } else {
        // Use cached coordinates if available
        const cachedLat = await AsyncStorage.getItem('@deenpulse_cached_lat');
        const cachedLng = await AsyncStorage.getItem('@deenpulse_cached_lng');
        if (cachedLat && cachedLng) {
          const lat = parseFloat(cachedLat);
          const lng = parseFloat(cachedLng);
          console.log("Using Cached Location - Lat:", lat, "Long:", lng);
          setLocation({ latitude: lat, longitude: lng });
          performFetch(lat, lng);
        } else {
          console.log("No cached location found. Querying GPS...");
          Geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              console.log("GPS Location Acquired - Lat:", latitude, "Long:", longitude);
              
              await AsyncStorage.setItem('@deenpulse_cached_lat', latitude.toString());
              await AsyncStorage.setItem('@deenpulse_cached_lng', longitude.toString());
              
              setLocation({ latitude, longitude });
              performFetch(latitude, longitude);
            },
            (err) => {
              setError(`Location error: ${err.message}`);
              setLoading(false);
              setLocation(null);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
        }
      }
    } catch (e: any) {
      setError(e.message || 'Error initializing location request');
      setLoading(false);
    }
  }, [locationMode, juristicMethod, calculationRule]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      loadTimes(false);
    } else {
      console.log("Settings changed. Instantly flushing cache and querying GPS...");
      loadTimes(true);
    }
  }, [locationMode, juristicMethod, calculationRule]);

  const forceManualRefresh = useCallback(() => {
    loadTimes(true);
  }, [loadTimes]);

  return {
    prayerTimes,
    loading,
    error,
    location,
    refresh: forceManualRefresh,
  };
}

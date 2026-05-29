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
  offlineFallback: boolean;
}

// Low-power, one-shot GPS configuration — "Fetch and Kill" architecture.
// enableHighAccuracy: false → uses cell tower / Wi-Fi triangulation (not full GPS satellites)
// maximumAge: 600000 → reuses any OS-cached position from the last 10 minutes
// timeout: 10000 → reduced since low-accuracy fixes resolve faster
const GPS_LOW_POWER_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 600000,
};

export type CalculationMethod =
  | 'auto'
  | 'karachi'
  | 'isna'
  | 'mwl'
  | 'makkah'
  | 'egypt'
  | 'shia'
  | 'gulf'
  | 'kuwait'
  | 'qatar'
  | 'singapore'
  | 'france'
  | 'turkey'
  | 'russia'
  | 'dubai'
  | 'jakim'
  | 'tunisia'
  | 'algeria'
  | 'indonesia'
  | 'morocco'
  | 'portugal'
  | 'jordan';

export function usePrayerTimes(
  locationMode: 'gps' | 'cached',
  juristicMethod: 'standard' | 'hanafi',
  calculationRule: CalculationMethod
): UsePrayerTimesResult {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [offlineFallback, setOfflineFallback] = useState(false);
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

  // ─── Build a stable cache key using PERSISTED coordinates ───────────────────
  // This prevents GPS jitter (tiny fluctuations in lat/lng between reads) from
  // creating duplicate cache entries and triggering redundant API calls.
  const buildStableCacheKey = async (
    rawLat: number,
    rawLng: number,
    month: number,
    year: number
  ): Promise<string> => {
    const stableLat = (await AsyncStorage.getItem('@deenpulse_cached_lat')) || rawLat.toString();
    const stableLng = (await AsyncStorage.getItem('@deenpulse_cached_lng')) || rawLng.toString();
    return `@deenpulse_calendar_${parseFloat(stableLat).toFixed(4)}_${parseFloat(stableLng).toFixed(4)}_${month}_${year}`;
  };

  // ─── Core network fetch + cache write ──────────────────────────────────────
  const performFetch = useCallback(async (
    lat: number,
    lng: number,
    month: number,
    year: number,
    day: number,
    cacheKey: string,
    forceRefresh: boolean
  ) => {
    try {
      if (forceRefresh) {
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
          // JSON parse failed — will re-fetch below
        }
      }

      if (!timings) {
        // Construct API url dynamically based on settings
        let url = `https://api.aladhan.com/v1/calendar?latitude=${lat}&longitude=${lng}&month=${month}&year=${year}`;
        
        const CALCULATION_METHOD_MAP: Record<CalculationMethod, string> = {
          auto: '99',
          karachi: '1',
          isna: '2',
          mwl: '3',
          makkah: '4',
          egypt: '5',
          shia: '0',
          gulf: '8',
          kuwait: '9',
          qatar: '10',
          singapore: '11',
          france: '12',
          turkey: '13',
          russia: '14',
          dubai: '16',
          jakim: '17',
          tunisia: '18',
          algeria: '19',
          indonesia: '20',
          morocco: '21',
          portugal: '22',
          jordan: '23',
        };

        const methodCode = CALCULATION_METHOD_MAP[calculationRule] || '99';
        url += `&method=${methodCode}`;

        if (juristicMethod === 'hanafi') {
          url += '&school=1';
        } else {
          url += '&school=0';
        }

        console.log("Fetching prayer times from URL:", url);

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        const json = await response.json();
        
        if (json.code === 200 && json.data) {
          // Save entire month calendar array to local persistent storage
          await AsyncStorage.setItem(cacheKey, JSON.stringify(json.data));
          // Stamp the current month so future app opens skip network entirely
          await AsyncStorage.setItem('@deenpulse_cache_month', `${year}-${month}`);
          console.log("Monthly calendar cached. Month stamp written:", `${year}-${month}`);

          if (json.data[day - 1]?.timings) {
            timings = json.data[day - 1].timings;
          }
        } else {
          throw new Error('Invalid API response structure');
        }
      }

      if (timings) {
        const parsed = parsePrayerTimings(timings);
        setPrayerTimes(parsed);
      } else {
        throw new Error('Failed to parse timings');
      }
    } catch (err: any) {
      console.warn('Timings fetch/parse error, trying offline fallback:', err);
      
      // Connectivity/Fetch failed: Try to fall back to ANY cached calendar database
      let fallbackTimings: Record<string, string> | null = null;
      try {
        const keys = await AsyncStorage.getAllKeys();
        const calendarKeys = keys.filter(k => k.startsWith('@deenpulse_calendar_'));
        if (calendarKeys.length > 0) {
          // Pick the first available cached calendar
          const latestKey = calendarKeys[0];
          const dataStr = await AsyncStorage.getItem(latestKey);
          if (dataStr) {
            const calendarData = JSON.parse(dataStr);
            if (calendarData[day - 1]?.timings) {
              fallbackTimings = calendarData[day - 1].timings;
            } else if (calendarData[0]?.timings) {
              fallbackTimings = calendarData[0].timings;
            }
          }
        }
      } catch (e) {
        console.warn('Storage fallback search failed:', e);
      }

      if (fallbackTimings) {
        const parsed = parsePrayerTimings(fallbackTimings);
        setPrayerTimes(parsed);
        setOfflineFallback(true);
      } else {
        setError(err.message || 'Connectivity issue occurred and no cached fallback dataset found.');
      }
    } finally {
      setLoading(false);
    }
  }, [juristicMethod, calculationRule]);

  // ─── One-shot GPS acquisition with immediate hardware kill ─────────────────
  // Strict "Fetch and Kill" routine: fire getCurrentPosition ONCE, save coords,
  // then immediately call stopObserving() to put the GPS module to sleep.
  const acquireGPSOnce = (
    onSuccess: (lat: number, lng: number) => void,
    onError: (err: any) => void
  ) => {
    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log("GPS Location Acquired - Lat:", latitude, "Long:", longitude);

        // Immediately kill the GPS hardware module — zero background drain
        Geolocation.stopObserving();
        console.log("GPS hardware module put to sleep — zero background drain.");

        // Persist coordinates for future cache-only lookups
        await AsyncStorage.setItem('@deenpulse_cached_lat', latitude.toString());
        await AsyncStorage.setItem('@deenpulse_cached_lng', longitude.toString());

        setLocation({ latitude, longitude });
        onSuccess(latitude, longitude);
      },
      (err) => {
        // Ensure GPS module is released even on failure
        Geolocation.stopObserving();
        console.warn(`GPS acquisition failed: ${err.message}. Module released.`);
        onError(err);
      },
      GPS_LOW_POWER_OPTIONS
    );
  };

  // ─── Main data loading orchestrator ────────────────────────────────────────
  // Implements local-first retrieval: on app init, wakes, and view shifts,
  // immediately pull from local cache. Only activate GPS/network when:
  //   1. Cold boot with no cached coordinates (first install)
  //   2. User changes juristic method or calculation rule (forceRefreshGPS)
  //   3. Manual refresh action (forceRefreshGPS)
  //   4. New month boundary detected
  const loadTimes = useCallback(async (forceRefreshGPS: boolean = false) => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const day = now.getDate();
    const currentMonthStamp = `${year}-${month}`;

    setLoading(true);
    setError(null);
    setOfflineFallback(false);

    // ── LOCAL-FIRST FAST PATH ────────────────────────────────────────────
    // If NOT a forced refresh, try to serve entirely from local cache.
    // This path activates ZERO GPS hardware and ZERO network radios.
    if (!forceRefreshGPS) {
      try {
        const cachedLat = await AsyncStorage.getItem('@deenpulse_cached_lat');
        const cachedLng = await AsyncStorage.getItem('@deenpulse_cached_lng');

        if (cachedLat && cachedLng) {
          const lat = parseFloat(cachedLat);
          const lng = parseFloat(cachedLng);
          const cacheKey = `@deenpulse_calendar_${lat.toFixed(4)}_${lng.toFixed(4)}_${month}_${year}`;

          // Check if we already have this month's calendar cached
          const calendarDataStr = await AsyncStorage.getItem(cacheKey);
          if (calendarDataStr) {
            try {
              const calendarData = JSON.parse(calendarDataStr);
              if (calendarData[day - 1]?.timings) {
                const timings = calendarData[day - 1].timings;
                const parsed = parsePrayerTimings(timings);
                setPrayerTimes(parsed);
                setLocation({ latitude: lat, longitude: lng });
                setLoading(false);
                console.log("LOCAL CACHE HIT — served from disk. Zero GPS, zero network.");
                return; // ← Early exit: no GPS, no network, no battery drain
              }
            } catch (e) {
              // JSON parse failed — fall through to network path
            }
          }

          // Cache key exists but no valid data for today — check month boundary
          const cachedMonth = await AsyncStorage.getItem('@deenpulse_cache_month');
          if (cachedMonth === currentMonthStamp) {
            // Same month but missing today's data (shouldn't happen with monthly cache,
            // but handle gracefully) — fetch from network using cached coords
            console.log("Same month but day data missing. Fetching from API with cached coords...");
            setLocation({ latitude: lat, longitude: lng });
            await performFetch(lat, lng, month, year, day, cacheKey, false);
            return;
          }

          // New month detected — fetch fresh monthly calendar (still no GPS needed,
          // coordinates don't change monthly, reuse cached coords)
          console.log("New month detected:", currentMonthStamp, "— fetching fresh monthly calendar...");
          setLocation({ latitude: lat, longitude: lng });
          await performFetch(lat, lng, month, year, day, cacheKey, false);
          return;
        }

        // No cached coordinates at all — this is a cold boot / first install.
        // Fall through to GPS acquisition below.
        console.log("No cached coordinates found — cold boot detected. Will query GPS...");
      } catch (e) {
        console.warn("Local cache check failed:", e);
        // Fall through to GPS path
      }
    }

    // ── GPS + NETWORK PATH ───────────────────────────────────────────────
    // Only reached when:
    //   1. forceRefreshGPS === true (settings change or manual refresh)
    //   2. Cold boot with zero cached coordinates (first install)
    //
    // Both cases require location permission before GPS activation.
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setError('Location permission denied.');
      setLoading(false);
      setLocation(null);
      return;
    }

    // Fire one-shot low-power GPS — "Fetch and Kill" pattern
    acquireGPSOnce(
      async (latitude, longitude) => {
        // GPS acquired — build stable cache key and fetch monthly calendar
        const cacheKey = await buildStableCacheKey(latitude, longitude, month, year);
        await performFetch(latitude, longitude, month, year, day, cacheKey, forceRefreshGPS);
      },
      async (err) => {
        // GPS failed — try cached coordinates as fallback
        console.warn(`Location acquisition failed: ${err.message}. Trying cache fallback...`);
        try {
          const cachedLat = await AsyncStorage.getItem('@deenpulse_cached_lat');
          const cachedLng = await AsyncStorage.getItem('@deenpulse_cached_lng');
          if (cachedLat && cachedLng) {
            const lat = parseFloat(cachedLat);
            const lng = parseFloat(cachedLng);
            setLocation({ latitude: lat, longitude: lng });
            const cacheKey = await buildStableCacheKey(lat, lng, month, year);
            await performFetch(lat, lng, month, year, day, cacheKey, forceRefreshGPS);
          } else {
            setError(`Location error: ${err.message}`);
            setLoading(false);
            setLocation(null);
          }
        } catch (e) {
          setError(`Location error: ${err.message}`);
          setLoading(false);
          setLocation(null);
        }
      }
    );
  }, [locationMode, juristicMethod, calculationRule, performFetch]);

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
    offlineFallback,
  };
}

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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  Linking,
  DeviceEventEmitter,
  Vibration,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { usePrayerTimes, CalculationMethod } from './src/hooks/usePrayerTimes';
import { PrayerTime } from './src/utils/prayerEngine';
import { usePrayerCountdown } from './src/hooks/usePrayerCountdown';
import { NativeModules } from 'react-native';

// Imported components & screens
import { FluidModal, ModalFadeOverlay } from './src/components/FluidModal';
import { FluidAlert } from './src/components/FluidAlert';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { PrayerRulesScreen } from './src/screens/PrayerRulesScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { DataManagementScreen } from './src/screens/DataManagementScreen';
import { AboutScreen } from './src/screens/AboutScreen';
import { UpdateCheckScreen } from './src/screens/UpdateCheckScreen';
import { AppIconScreen } from './src/screens/AppIconScreen';
import { OEMGuidanceScreen } from './src/screens/OEMGuidanceScreen';
import { WearOSControlScreen } from './src/screens/WearOSControlScreen';
import { Cat1NotificationGuideScreen } from './src/screens/Cat1NotificationGuideScreen';
import { DeveloperOptionsScreen } from './src/screens/DeveloperOptionsScreen';
import { useDeviceProfile } from './src/hooks/useDeviceProfile';
import { OnboardingRoute } from './src/navigation/OnboardingRoute';
import { RootStackParamList } from './src/navigation/types';

const { PrayerCapsuleModule } = NativeModules;

const Stack = createNativeStackNavigator<RootStackParamList>();

export type { Screen } from './src/navigation/types';

const CALCULATION_LABELS: Record<CalculationMethod, string> = {
  auto: 'Auto-Detect by Region',
  karachi: 'University of Islamic Sciences, Karachi',
  isna: 'Islamic Society of North America (ISNA)',
  mwl: 'Muslim World League (MWL)',
  makkah: 'Umm Al-Qura University, Makkah',
  egypt: 'Egyptian General Authority of Survey',
  shia: 'Shia Ithna-Ashari (Jafari)',
  gulf: 'Gulf Region',
  kuwait: 'Kuwait',
  qatar: 'Qatar',
  singapore: 'Majlis Ugama Islam Singapura, Singapore',
  france: 'Union Organization Islamic de France',
  turkey: 'Diyanet İşleri Başkanlığı, Turkey',
  russia: 'Spiritual Administration of Muslims of Russia',
  dubai: 'Dubai, UAE',
  jakim: 'Jabatan Kemajuan Islam Malaysia (JAKIM)',
  tunisia: 'Tunisia',
  algeria: 'Algeria',
  indonesia: 'KEMENAG, Indonesia',
  morocco: 'Morocco',
  portugal: 'Comunidade Islamica de Lisboa, Portugal',
  jordan: 'Ministry of Awqaf, Jordan',
};

interface CustomAlertConfig {
  visible: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}



// Light tactile device vibration feedback
export const triggerHaptic = () => {
  try {
    Vibration.vibrate(15);
  } catch {
    // Ignore if not supported on the device
  }
};




// Smooth feathered gradient overlay to fade out scrolling content under sticky headers
export function HeaderFadeOverlay() {
  return null;
}


export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <DeenPulseApp />
    </SafeAreaProvider>
  );
}

function DeenPulseApp(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { profile, isOnboardingComplete, isLoading: isProfileLoading, completeOnboarding, updateDeviceProfile } = useDeviceProfile();
  const [locationMode, setLocationMode] = useState<'gps' | 'cached'>('gps');
  const [juristicMethod, setJuristicMethod] = useState<'standard' | 'hanafi'>('standard');
  const [calculationRule, setCalculationRule] = useState<CalculationMethod>('auto');

  const [capsuleFormat, setCapsuleFormat] = useState<'name' | 'name_time' | 'time' | 'name_countdown'>('name');
  const [notificationStyle, setNotificationStyle] = useState<'standard' | 'with_time' | 'with_countdown'>('standard');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [cat3NotificationMode, setCat3NotificationMode] = useState<'ongoing' | 'reminder'>('reminder');
  const [cat1NotificationMode, setCat1NotificationMode] = useState<'alltime' | 'prior'>('alltime');
  const [cat1PriorLeadTime, setCat1PriorLeadTime] = useState<5 | 10 | 15>(15);
  const [cat2NotificationMode, setCat2NotificationMode] = useState<'alltime' | 'prior' | 'simple' | 'nocapsule'>('alltime');
  const [cat2PriorLeadTime, setCat2PriorLeadTime] = useState<5 | 10 | 15>(15);
  const [mockPrayerTimes, setMockPrayerTimes] = useState<PrayerTime[] | null>(null);

  const [showCapsuleFormatPicker, setShowCapsuleFormatPicker] = useState(false);
  const [showNotificationStylePicker, setShowNotificationStylePicker] = useState(false);

  const [showJuristicPicker, setShowJuristicPicker] = useState(false);
  const [showCalculationPicker, setShowCalculationPicker] = useState(false);

  // Custom alert modal config
  const [alertConfig, setAlertConfig] = useState<CustomAlertConfig>({
    visible: false,
    title: '',
    message: '',
  });

  const offlineAlertShown = useRef(false);

  const { prayerTimes, loading, error, location, refresh, offlineFallback } = usePrayerTimes(
    locationMode,
    juristicMethod,
    calculationRule
  );

  const activePrayerTimes = mockPrayerTimes || prayerTimes;
  const nextPrayer = usePrayerCountdown(
    activePrayerTimes,
    true,
    capsuleFormat,
    notificationStyle,
    location,
    profile?.category ?? 3,
    cat3NotificationMode,
    cat1NotificationMode,
    cat1PriorLeadTime,
    cat2NotificationMode,
    cat2PriorLeadTime
  );

  // Load preferences and setup guide state on startup
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const mode = await AsyncStorage.getItem('@deenpulse_location_mode');
        const juristic = await AsyncStorage.getItem('@deenpulse_juristic_method');
        const rule = await AsyncStorage.getItem('@deenpulse_calculation_rule');
        const format = await AsyncStorage.getItem('@deenpulse_capsule_format');
        const style = await AsyncStorage.getItem('@deenpulse_notification_style');
        const sound = await AsyncStorage.getItem('@deenpulse_adhan_sound_enabled');
        const cat3Mode = await AsyncStorage.getItem('@deenpulse_cat3_notification_mode');
        const cat1Mode = await AsyncStorage.getItem('@deenpulse_cat1_notification_mode');
        const cat1Lead = await AsyncStorage.getItem('@deenpulse_prior_lead_time');
        const cat2Mode = await AsyncStorage.getItem('@deenpulse_cat2_notification_mode');
        const cat2Lead = await AsyncStorage.getItem('@deenpulse_cat2_prior_lead_time');

        if (mode !== null) setLocationMode(mode as 'gps' | 'cached');
        if (juristic !== null) setJuristicMethod(juristic as 'standard' | 'hanafi');
        if (rule !== null) setCalculationRule(rule as CalculationMethod);
        if (format !== null) setCapsuleFormat(format as 'name' | 'name_time' | 'time' | 'name_countdown');
        if (style !== null) setNotificationStyle(style as 'standard' | 'with_time' | 'with_countdown');
        if (sound !== null) setSoundEnabled(sound === 'true');
        if (cat3Mode !== null) setCat3NotificationMode(cat3Mode as 'ongoing' | 'reminder');
        if (cat1Mode !== null) setCat1NotificationMode(cat1Mode as 'alltime' | 'prior');
        if (cat1Lead !== null) setCat1PriorLeadTime(parseInt(cat1Lead, 10) as 5 | 10 | 15);
        if (cat2Mode !== null) setCat2NotificationMode(cat2Mode as 'alltime' | 'prior' | 'simple' | 'nocapsule');
        if (cat2Lead !== null) setCat2PriorLeadTime(parseInt(cat2Lead, 10) as 5 | 10 | 15);
      } catch (e) {
        console.warn('Failed to load settings:', e);
      }
    };
    loadSettings();
  }, []);

  // Synchronize settings to Wear OS watch automatically when they change
  useEffect(() => {
    AsyncStorage.getItem('@deenpulse_sync_settings_to_wear').then(syncPref => {
      if (syncPref === 'true' || syncPref === null) {
        PrayerCapsuleModule?.syncSettingsToWear(juristicMethod, calculationRule);
      }
    }).catch(err => {
      console.warn('Failed to load sync settings to wear preference', err);
      PrayerCapsuleModule?.syncSettingsToWear(juristicMethod, calculationRule);
    });
  }, [juristicMethod, calculationRule]);

  const showAlert = useCallback((
    title: string,
    message: string,
    onConfirm?: () => void,
    onCancel?: () => void,
    confirmText: string = 'OK',
    cancelText: string = 'Cancel'
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      onConfirm: () => {
        triggerHaptic();
        setAlertConfig(prev => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: onCancel ? () => {
        triggerHaptic();
        setAlertConfig(prev => ({ ...prev, visible: false }));
        onCancel();
      } : undefined,
      confirmText,
      cancelText,
    });
  }, []);

  // Monitor network connectivity failure warning
  useEffect(() => {
    if (offlineFallback && !offlineAlertShown.current) {
      showAlert(
        'Offline Fallback',
        'You\'re offline. Showing cached prayer times.'
      );
      offlineAlertShown.current = true;
    } else if (!offlineFallback) {
      offlineAlertShown.current = false;
    }
  }, [offlineFallback, showAlert]);

  const handleLocationModeChange = async (value: boolean) => {
    const newMode = value ? 'gps' : 'cached';
    try {
      await AsyncStorage.setItem('@deenpulse_location_mode', newMode);
      setLocationMode(newMode);
    } catch (e: any) {
      console.warn('Failed to save location mode preference:', e);
      showAlert('Error', 'Failed to save location mode preference.');
    }
  };

  const updateSetting = async (key: string, value: string, setter: (val: any) => void, closePicker: () => void) => {
    try {
      await AsyncStorage.setItem(key, value);
      setter(value);
    } catch (e: any) {
      console.warn(`Failed to save setting ${key}:`, e);
      showAlert('Error', 'Failed to save setting preference.');
    } finally {
      closePicker();
    }
  };

  const handleAppReset = () => {
    showAlert(
      'Reset App Cache',
      'This will clear all data and refresh your prayer times.',
      async () => {
        try {
          await AsyncStorage.clear();
          setLocationMode('gps');
          setJuristicMethod('standard');
          setCalculationRule('auto');
          setCapsuleFormat('name');
          setNotificationStyle('standard');
          try {
            PrayerCapsuleModule?.stopCapsule();
          } catch (e) {
            console.warn(e);
          }
          showAlert('Reset Complete', 'Cache cleared. Performing fresh GPS lookup.');
        } catch (e) {
          console.warn(e);
        }
      },
      () => { },
      'RESET',
      'CANCEL'
    );
  };

  const handleRequestGPS = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission Required',
            message: 'DeenPulse needs your location to calculate prayer times.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          showAlert('Location Access', 'GPS permission granted.', () => {
            refresh();
          });
        } else {
          showAlert('Location Access', 'GPS permission denied.');
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const openAppNotificationSettings = () => {
    try {
      Linking.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [
        { key: 'android.provider.extra.APP_PACKAGE', value: 'com.deenpulse' },
      ]);
    } catch {
      Linking.openSettings();
    }
  };

  const getJuristicLabel = () => {
    return juristicMethod === 'standard' ? 'Standard (Shafi\'i, Maliki, Hanbali)' : 'Hanafi';
  };

  const getCalculationLabel = () => {
    return CALCULATION_LABELS[calculationRule] || 'Auto-Detect by Region';
  };

  const getCapsuleFormatLabel = () => {
    if (profile?.category === 2) {
      if (capsuleFormat === 'name_countdown') return 'Name & Countdown (e.g., Asr (16m 10s))';
      if (capsuleFormat === 'name_time') return 'Name & Time (e.g., Asr (5:12 PM))';
      if (capsuleFormat === 'time') return 'Time Only (e.g., 5:12 PM)';
      return 'Name Only (e.g., Asr)';
    }
    if (capsuleFormat === 'name_time') return 'Name & Time (e.g., Fajr (5:12 AM))';
    if (capsuleFormat === 'time') return 'Time Only (e.g., 5:12 AM)';
    if (capsuleFormat === 'name_countdown') return 'Name & Countdown (e.g., Fajr (45m 12s))';
    return 'Name Only (e.g., Fajr)';
  };

  const getNotificationStyleLabel = () => {
    if (profile?.category === 2) {
      if (notificationStyle === 'with_time') return 'Name & Time (e.g., Asr at 5:12 PM)';
      if (notificationStyle === 'with_countdown') return 'Name & Countdown (e.g., Asr in 16m 10s)';
      return 'Name Only (e.g., Asr)';
    }
    if (notificationStyle === 'with_time') return 'With Time (e.g., Next Prayer: Fajr (5:12 AM))';
    if (notificationStyle === 'with_countdown') return 'With Countdown (e.g., Next Prayer: Fajr (45m 12s))';
    return 'Standard (e.g., Next Prayer: Fajr)';
  };

  // Listen to refresh requests from ongoing notification action buttons
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('onRefreshRequested', () => {
      console.log('Refresh requested from native ongoing notification.');
      refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  /**
   * Bug 2 Fix — ColorOS Stuck-Active Self-Healing.
   *
   * Every time the app comes to the foreground (MainActivity.onResume fires),
   * verify that AlarmManager PendingIntents still exist in the OS.
   * ColorOS and Funtouch OS can wipe them when they kill background processes.
   * If any are missing, verifyAndReconcileAlarms() re-schedules them automatically.
   */
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('onAppForegrounded', async () => {
      if (!PrayerCapsuleModule || !activePrayerTimes || activePrayerTimes.length === 0) return;
      try {
        // Build the same prayer JSON format that scheduleReminders() expects
        const prayersForReconcile = activePrayerTimes
          .filter(p => p.date.getTime() > Date.now())
          .map(p => ({ name: p.name, timestamp: p.date.getTime() }));
        if (prayersForReconcile.length === 0) return;

        const reconciled: boolean = await PrayerCapsuleModule.verifyAndReconcileAlarms(
          JSON.stringify(prayersForReconcile)
        );
        if (reconciled) {
          console.log('[DeenPulse] Alarm reconciliation: PendingIntents were missing and have been re-scheduled.');
        }
      } catch (e) {
        console.warn('[DeenPulse] verifyAndReconcileAlarms failed:', e);
      }
    });
    return () => sub.remove();
  }, [activePrayerTimes]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {isProfileLoading ? (
        <View style={styles.flex1}>
          <View style={styles.screenContainer} />
        </View>
      ) : (
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName={isOnboardingComplete ? 'dashboard' : 'onboarding'}
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
              animationMatchesGesture: true,
            }}
          >
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }}>
              {() => <OnboardingRoute onComplete={completeOnboarding} />}
            </Stack.Screen>
            <Stack.Screen name="dashboard" options={{ gestureEnabled: false }}>
              {() => (
                <DashboardScreen
                  onRefresh={() => refresh()}
                  loading={loading && !mockPrayerTimes}
                  error={error}
                  prayerTimes={activePrayerTimes}
                  nextPrayer={nextPrayer}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="settings" component={SettingsScreen} />
            <Stack.Screen name="prayer_rules">
              {() => (
                <PrayerRulesScreen
                  onJuristicMethodPress={() => setShowJuristicPicker(true)}
                  onCalculationRulePress={() => setShowCalculationPicker(true)}
                  juristicMethodLabel={getJuristicLabel()}
                  calculationRuleLabel={getCalculationLabel()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="notifications">
              {() => (
                <NotificationsScreen
                  onAllowNotificationsPress={() => openAppNotificationSettings()}
                  onCapsuleFormatPress={() => setShowCapsuleFormatPicker(true)}
                  onNotificationStylePress={() => setShowNotificationStylePicker(true)}
                  soundEnabled={soundEnabled}
                  onSoundToggle={async (val) => {
                    setSoundEnabled(val);
                    await AsyncStorage.setItem('@deenpulse_adhan_sound_enabled', val ? 'true' : 'false');
                  }}
                  capsuleFormatLabel={getCapsuleFormatLabel()}
                  notificationStyleLabel={getNotificationStyleLabel()}
                  deviceCategory={profile?.category}
                  cat3NotificationMode={cat3NotificationMode}
                  onCat3ModeChange={async (mode: 'ongoing' | 'reminder') => {
                    setCat3NotificationMode(mode);
                    await AsyncStorage.setItem('@deenpulse_cat3_notification_mode', mode);
                  }}
                  cat1NotificationMode={cat1NotificationMode}
                  cat1PriorLeadTime={cat1PriorLeadTime}
                  onCat1ModeChange={async (mode: 'alltime' | 'prior') => {
                    setCat1NotificationMode(mode);
                    await AsyncStorage.setItem('@deenpulse_cat1_notification_mode', mode);
                    PrayerCapsuleModule?.setCat1NotificationMode(mode);
                    // If switching to alltime, stop any pending prior-window alarms
                    if (mode === 'alltime') {
                      PrayerCapsuleModule?.cancelReminders();
                    }
                  }}
                  onCat1LeadTimeChange={async (minutes: 5 | 10 | 15) => {
                    setCat1PriorLeadTime(minutes);
                    await AsyncStorage.setItem('@deenpulse_prior_lead_time', String(minutes));
                    PrayerCapsuleModule?.setPriorNotificationLeadTime(minutes);
                    // Re-schedule with new lead time if in prior mode
                    if (cat1NotificationMode === 'prior' && activePrayerTimes.length > 0) {
                      const prayersJson = JSON.stringify(
                        activePrayerTimes.map(p => ({ name: p.name, timestamp: p.date.getTime() }))
                      );
                      PrayerCapsuleModule?.scheduleReminders(prayersJson);
                    }
                  }}
                  cat2NotificationMode={cat2NotificationMode}
                  cat2PriorLeadTime={cat2PriorLeadTime}
                  onCat2ModeChange={async (mode: 'alltime' | 'prior' | 'simple' | 'nocapsule') => {
                    setCat2NotificationMode(mode);
                    await AsyncStorage.setItem('@deenpulse_cat2_notification_mode', mode);
                    PrayerCapsuleModule?.setCat2NotificationMode(mode);
                    // If switching to alltime or nocapsule, cancel pending alarms
                    if (mode === 'alltime' || mode === 'nocapsule') {
                      PrayerCapsuleModule?.cancelReminders();
                    }
                  }}
                  onCat2LeadTimeChange={async (minutes: 5 | 10 | 15) => {
                    setCat2PriorLeadTime(minutes);
                    await AsyncStorage.setItem('@deenpulse_cat2_prior_lead_time', String(minutes));
                    PrayerCapsuleModule?.setCat2PriorLeadTime(minutes);
                    // Re-schedule with new lead time if in prior mode
                    if (cat2NotificationMode === 'prior' && activePrayerTimes.length > 0) {
                      const prayersJson = JSON.stringify(
                        activePrayerTimes.map(p => ({ name: p.name, timestamp: p.date.getTime() }))
                      );
                      PrayerCapsuleModule?.scheduleReminders(prayersJson);
                    }
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="oem_guidance">
              {() => (
                <OEMGuidanceScreen
                  profile={profile}
                  onUpdateProfile={updateDeviceProfile}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="wearos_control" component={WearOSControlScreen} />
            <Stack.Screen name="cat1_notification_guide">
              {() => (
                <Cat1NotificationGuideScreen
                  onOpenSettings={() => openAppNotificationSettings()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="data_management">
              {() => (
                <DataManagementScreen
                  locationMode={locationMode}
                  onLocationModeChange={(val) => handleLocationModeChange(val)}
                  onRequestGPS={() => handleRequestGPS()}
                  onClearCacheReset={() => handleAppReset()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="about" component={AboutScreen} />
            <Stack.Screen name="update_check" component={UpdateCheckScreen} />
            <Stack.Screen name="app_icon" component={AppIconScreen} />
            <Stack.Screen name="developer_options">
              {() => (
                <DeveloperOptionsScreen
                  isSimulating={mockPrayerTimes !== null}
                  onSimulatePrayer={() => {
                    const now = new Date();
                    const mockDate = new Date(now.getTime() + 1000);

                    const formatTimeStr = (d: Date) => {
                      let hours = d.getHours();
                      const minutes = d.getMinutes();
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      hours = hours % 12;
                      hours = hours ? hours : 12;
                      const minStr = minutes < 10 ? '0' + minutes : minutes;
                      return `${hours}:${minStr} ${ampm}`;
                    };

                    const mockPrayers = [
                      {
                        name: 'Test Prayer',
                        time: formatTimeStr(mockDate),
                        date: mockDate,
                      },
                    ];
                    setMockPrayerTimes(mockPrayers);
                  }}
                  onClearSimulation={() => {
                    setMockPrayerTimes(null);
                  }}
                  onTriggerImmediateAlert={() => {
                    PrayerCapsuleModule?.playPrayerAlert('Test Prayer');
                  }}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      )}

      {/* Status Bar Capsule Format Picker Modal */}
      <FluidModal
        visible={showCapsuleFormatPicker}
        onClose={() => {
          triggerHaptic();
          setShowCapsuleFormatPicker(false);
        }}
        title="Status Bar Capsule Style"
      >
        {profile?.category === 2 ? (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                capsuleFormat === 'name' && styles.modalItemSelected,
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
              ]}
              onPress={() => {
                triggerHaptic();
                updateSetting('@deenpulse_capsule_format', 'name', setCapsuleFormat, () => setShowCapsuleFormatPicker(false));
              }}
            >
              <Text style={[
                styles.modalItemText,
                capsuleFormat === 'name' && styles.modalItemTextSelected,
              ]}>Name Only (e.g., Asr)</Text>
              {capsuleFormat === 'name' && <Icon name="check" size={16} color="#00F29D" />}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                capsuleFormat === 'name_countdown' && styles.modalItemSelected,
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
              ]}
              onPress={() => {
                triggerHaptic();
                updateSetting('@deenpulse_capsule_format', 'name_countdown', setCapsuleFormat, () => setShowCapsuleFormatPicker(false));
              }}
            >
              <Text style={[
                styles.modalItemText,
                capsuleFormat === 'name_countdown' && styles.modalItemTextSelected,
              ]}>Name & Countdown (e.g., Asr (16m 10s))</Text>
              {capsuleFormat === 'name_countdown' && <Icon name="check" size={16} color="#00F29D" />}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                capsuleFormat === 'name_time' && styles.modalItemSelected,
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
              ]}
              onPress={() => {
                triggerHaptic();
                updateSetting('@deenpulse_capsule_format', 'name_time', setCapsuleFormat, () => setShowCapsuleFormatPicker(false));
              }}
            >
              <Text style={[
                styles.modalItemText,
                capsuleFormat === 'name_time' && styles.modalItemTextSelected,
              ]}>Name & Time (e.g., Asr (5:12 PM))</Text>
              {capsuleFormat === 'name_time' && <Icon name="check" size={16} color="#00F29D" />}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                capsuleFormat === 'time' && styles.modalItemSelected,
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
              ]}
              onPress={() => {
                triggerHaptic();
                updateSetting('@deenpulse_capsule_format', 'time', setCapsuleFormat, () => setShowCapsuleFormatPicker(false));
              }}
            >
              <Text style={[
                styles.modalItemText,
                capsuleFormat === 'time' && styles.modalItemTextSelected,
              ]}>Time Only (e.g., 5:12 PM)</Text>
              {capsuleFormat === 'time' && <Icon name="check" size={16} color="#00F29D" />}
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                capsuleFormat === 'name' && styles.modalItemSelected,
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
              ]}
              onPress={() => {
                triggerHaptic();
                updateSetting('@deenpulse_capsule_format', 'name', setCapsuleFormat, () => setShowCapsuleFormatPicker(false));
              }}
            >
              <Text style={[
                styles.modalItemText,
                capsuleFormat === 'name' && styles.modalItemTextSelected,
              ]}>Name Only (e.g., Fajr)</Text>
              {capsuleFormat === 'name' && <Icon name="check" size={16} color="#00F29D" />}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                capsuleFormat === 'name_time' && styles.modalItemSelected,
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
              ]}
              onPress={() => {
                triggerHaptic();
                updateSetting('@deenpulse_capsule_format', 'name_time', setCapsuleFormat, () => setShowCapsuleFormatPicker(false));
              }}
            >
              <Text style={[
                styles.modalItemText,
                capsuleFormat === 'name_time' && styles.modalItemTextSelected,
              ]}>Name & Time (e.g., Fajr (5:12 AM))</Text>
              {capsuleFormat === 'name_time' && <Icon name="check" size={16} color="#00F29D" />}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                capsuleFormat === 'time' && styles.modalItemSelected,
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
              ]}
              onPress={() => {
                triggerHaptic();
                updateSetting('@deenpulse_capsule_format', 'time', setCapsuleFormat, () => setShowCapsuleFormatPicker(false));
              }}
            >
              <Text style={[
                styles.modalItemText,
                capsuleFormat === 'time' && styles.modalItemTextSelected,
              ]}>Time Only (e.g., 5:12 AM)</Text>
              {capsuleFormat === 'time' && <Icon name="check" size={16} color="#00F29D" />}
            </Pressable>
          </>
        )}
      </FluidModal>

      {/* Notification Style Picker Modal */}
      <FluidModal
        visible={showNotificationStylePicker}
        onClose={() => {
          triggerHaptic();
          setShowNotificationStylePicker(false);
        }}
        title={profile?.category === 2 ? "Notification Style" : "Notification Title Style"}
      >
        {profile?.category === 2 ? (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                notificationStyle === 'standard' && styles.modalItemSelected,
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
              ]}
              onPress={() => {
                triggerHaptic();
                updateSetting('@deenpulse_notification_style', 'standard', setNotificationStyle, () => setShowNotificationStylePicker(false));
              }}
            >
              <Text style={[
                styles.modalItemText,
                notificationStyle === 'standard' && styles.modalItemTextSelected,
              ]}>Name Only (e.g., Asr)</Text>
              {notificationStyle === 'standard' && <Icon name="check" size={16} color="#00F29D" />}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                notificationStyle === 'with_countdown' && styles.modalItemSelected,
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
              ]}
              onPress={() => {
                triggerHaptic();
                updateSetting('@deenpulse_notification_style', 'with_countdown', setNotificationStyle, () => setShowNotificationStylePicker(false));
              }}
            >
              <Text style={[
                styles.modalItemText,
                notificationStyle === 'with_countdown' && styles.modalItemTextSelected,
              ]}>Name & Countdown (e.g., Asr in 16m 10s)</Text>
              {notificationStyle === 'with_countdown' && <Icon name="check" size={16} color="#00F29D" />}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                notificationStyle === 'with_time' && styles.modalItemSelected,
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
              ]}
              onPress={() => {
                triggerHaptic();
                updateSetting('@deenpulse_notification_style', 'with_time', setNotificationStyle, () => setShowNotificationStylePicker(false));
              }}
            >
              <Text style={[
                styles.modalItemText,
                notificationStyle === 'with_time' && styles.modalItemTextSelected,
              ]}>Name & Time (e.g., Asr at 5:12 PM)</Text>
              {notificationStyle === 'with_time' && <Icon name="check" size={16} color="#00F29D" />}
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                notificationStyle === 'standard' && styles.modalItemSelected,
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
              ]}
              onPress={() => {
                triggerHaptic();
                updateSetting('@deenpulse_notification_style', 'standard', setNotificationStyle, () => setShowNotificationStylePicker(false));
              }}
            >
              <Text style={[
                styles.modalItemText,
                notificationStyle === 'standard' && styles.modalItemTextSelected,
              ]}>Standard (e.g., Next Prayer: Fajr)</Text>
              {notificationStyle === 'standard' && <Icon name="check" size={16} color="#00F29D" />}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                notificationStyle === 'with_time' && styles.modalItemSelected,
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
              ]}
              onPress={() => {
                triggerHaptic();
                updateSetting('@deenpulse_notification_style', 'with_time', setNotificationStyle, () => setShowNotificationStylePicker(false));
              }}
            >
              <Text style={[
                styles.modalItemText,
                notificationStyle === 'with_time' && styles.modalItemTextSelected,
              ]}>With Time (e.g., Next Prayer: Fajr (5:12 AM))</Text>
              {notificationStyle === 'with_time' && <Icon name="check" size={16} color="#00F29D" />}
            </Pressable>
            {profile?.category !== 1 && (
              <Pressable
                style={({ pressed }) => [
                  styles.modalItem,
                  notificationStyle === 'with_countdown' && styles.modalItemSelected,
                  { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
                ]}
                onPress={() => {
                  triggerHaptic();
                  updateSetting('@deenpulse_notification_style', 'with_countdown', setNotificationStyle, () => setShowNotificationStylePicker(false));
                }}
              >
                <Text style={[
                  styles.modalItemText,
                  notificationStyle === 'with_countdown' && styles.modalItemTextSelected,
                ]}>With Countdown (e.g., Next Prayer: Fajr (45m 12s))</Text>
                {notificationStyle === 'with_countdown' && <Icon name="check" size={16} color="#00F29D" />}
              </Pressable>
            )}
          </>
        )}
      </FluidModal>

      {/* Juristic Method Picker Modal */}
      <FluidModal
        visible={showJuristicPicker}
        onClose={() => {
          triggerHaptic();
          setShowJuristicPicker(false);
        }}
        title="Juristic Method (Asr)"
      >
        <Pressable
          style={({ pressed }) => [
            styles.modalItem,
            juristicMethod === 'standard' && styles.modalItemSelected,
            { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
          ]}
          onPress={() => {
            triggerHaptic();
            updateSetting('@deenpulse_juristic_method', 'standard', setJuristicMethod, () => setShowJuristicPicker(false));
          }}
        >
          <Text style={[
            styles.modalItemText,
            juristicMethod === 'standard' && styles.modalItemTextSelected,
          ]}>Standard (Shafi'i, Maliki, Hanbali)</Text>
          {juristicMethod === 'standard' && <Icon name="check" size={16} color="#00F29D" />}
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.modalItem,
            juristicMethod === 'hanafi' && styles.modalItemSelected,
            { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
          ]}
          onPress={() => {
            triggerHaptic();
            updateSetting('@deenpulse_juristic_method', 'hanafi', setJuristicMethod, () => setShowJuristicPicker(false));
          }}
        >
          <Text style={[
            styles.modalItemText,
            juristicMethod === 'hanafi' && styles.modalItemTextSelected,
          ]}>Hanafi</Text>
          {juristicMethod === 'hanafi' && <Icon name="check" size={16} color="#00F29D" />}
        </Pressable>
      </FluidModal>

      {/* Calculation Rule Picker Modal */}
      <FluidModal
        visible={showCalculationPicker}
        onClose={() => {
          triggerHaptic();
          setShowCalculationPicker(false);
        }}
        title="Calculation Rule"
      >
        <View style={styles.modalScrollContainer}>
          <ModalFadeOverlay position="top" />
          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(CALCULATION_LABELS).map(([key, label]) => (
              <Pressable
                key={key}
                style={({ pressed }) => [
                  styles.modalItem,
                  calculationRule === key && styles.modalItemSelected,
                  { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
                ]}
                onPress={() => {
                  triggerHaptic();
                  updateSetting('@deenpulse_calculation_rule', key, setCalculationRule as any, () => setShowCalculationPicker(false));
                }}
              >
                <Text style={[
                  styles.modalItemText,
                  calculationRule === key && styles.modalItemTextSelected,
                ]}>{label}</Text>
                {calculationRule === key && <Icon name="check" size={16} color="#00F29D" />}
              </Pressable>
            ))}
          </ScrollView>
          <ModalFadeOverlay position="bottom" />
        </View>
      </FluidModal>

      {/* Beautiful Custom Alert Modal */}
      <FluidAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
      />
    </View>
  );
}

export const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  infoValLink: {
    fontSize: 14,
    color: '#00F29D',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  linkTextFooter: {
    color: '#00F29D',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  appNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aboutBrandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  betaBadge: {
    backgroundColor: 'rgba(0, 242, 157, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.25)',
    alignSelf: 'center',
  },
  betaBadgeText: {
    color: '#00F29D',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  container: {
    flex: 1,
    backgroundColor: '#0B0F12',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#0B0F12',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 4,
    marginBottom: 14,
    backgroundColor: '#0B0F12',
  },
  appName: {
    fontSize: 28,
    fontWeight: '400', // Sleek, clean geometric weight
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  appNameHighlight: {
    fontWeight: '800', // Bold modern weight for "Pulse"
    color: '#00F29D', // Vibrant neon mint green
    textShadowColor: 'rgba(0, 242, 157, 0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)', // Subtle neon green border tint
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },

  cardContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  settingsRowCard: {
    backgroundColor: '#111417',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.2)',
  },
  rowIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 242, 157, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rowIcon: {
    marginRight: 16,
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rowDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  menuDetailCard: {
    backgroundColor: '#111417',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.2)',
  },
  menuDetailLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  menuDetailValue: {
    fontSize: 14,
    color: '#00F29D',
    fontWeight: '600',
    marginBottom: 0,
  },
  menuDetailDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    lineHeight: 18,
  },
  destructiveBorder: {
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },
  destructiveText: {
    color: '#FF6B6B',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#0B0F12',
  },
  fadeOverlayContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -24,
    height: 24,
    zIndex: 10,
    flexDirection: 'column',
  },
  fadeLine1: { height: 3, width: '100%', backgroundColor: 'rgba(11, 15, 18, 0.96)' },
  fadeLine2: { height: 3, width: '100%', backgroundColor: 'rgba(11, 15, 18, 0.88)' },
  fadeLine3: { height: 3, width: '100%', backgroundColor: 'rgba(11, 15, 18, 0.76)' },
  fadeLine4: { height: 3, width: '100%', backgroundColor: 'rgba(11, 15, 18, 0.60)' },
  fadeLine5: { height: 3, width: '100%', backgroundColor: 'rgba(11, 15, 18, 0.44)' },
  fadeLine6: { height: 3, width: '100%', backgroundColor: 'rgba(11, 15, 18, 0.28)' },
  fadeLine7: { height: 3, width: '100%', backgroundColor: 'rgba(11, 15, 18, 0.14)' },
  fadeLine8: { height: 3, width: '100%', backgroundColor: 'rgba(11, 15, 18, 0.05)' },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)', // Subtle neon green border tint
    marginRight: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  subTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },


  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 16,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 14,
    color: 'rgba(255, 200, 150, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: 'rgba(0, 242, 157, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00F29D',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.2)',
    letterSpacing: 2,
    marginHorizontal: 12,
  },
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  footerDivider: {
    width: '30%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  footerLink: {
    color: '#00F29D',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  modalBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalContent: {
    backgroundColor: '#111417',
    borderRadius: 28,
    width: '100%',
    paddingBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 242, 157, 0.2)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  modalGrabber: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  grabberBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(240, 244, 248, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalItemSelected: {
    backgroundColor: 'rgba(0, 242, 157, 0.06)',
    borderColor: 'rgba(0, 242, 157, 0.35)',
  },
  modalItemText: {
    flex: 1,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  modalItemTextSelected: {
    color: '#00F29D',
    fontWeight: '700',
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  alertContainer: {
    backgroundColor: '#111417',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.2)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  alertMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    marginBottom: 24,
    letterSpacing: -0.1,
  },
  alertButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  alertButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertButtonCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  alertButtonConfirm: {
    backgroundColor: 'rgba(0, 242, 157, 0.15)',
  },
  alertButtonDestructive: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  alertButtonTextCancel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  alertButtonTextConfirm: {
    color: '#00F29D',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  aboutHeaderBlock: {
    backgroundColor: '#111417',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.2)',
  },
  aboutAccentBar: {
    width: 40,
    height: 3,
    backgroundColor: '#00F29D',
    borderRadius: 1.5,
    marginVertical: 10,
  },
  aboutBranding: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  aboutTagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 6,
  },
  aboutSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoKey: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  infoVal: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  versionBadge: {
    backgroundColor: 'rgba(0, 242, 157, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  versionBadgeText: {
    color: '#00F29D',
    fontSize: 12,
    fontWeight: '700',
  },
  setupGuideCard: {
    backgroundColor: '#111417',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    marginTop: 8,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.2)',
  },
  setupCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  setupCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  setupCardDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
    marginBottom: 8,
  },
  setupCardArrow: {
    alignSelf: 'flex-end',
  },
  guideContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  guideStepCard: {
    backgroundColor: '#111417',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.2)',
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 242, 157, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepBadgeText: {
    color: '#00F29D',
    fontWeight: '800',
    fontSize: 14,
  },
  stepNumLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00F29D',
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    marginBottom: 12,
  },
  guideImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#000000',
    resizeMode: 'cover',
  },
  guideCompleteBtn: {
    backgroundColor: '#00F29D',
    borderRadius: 18,
    borderColor: '#00ffc4ff',
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  guideCompleteText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  skeletonContainer: {
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  skeletonCountdownWrapper: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 15,
    position: 'relative',
  },
  skeletonCountdownOuterRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 6,
    borderColor: 'rgba(0, 242, 157, 0.05)',
  },
  skeletonCountdownInnerCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#0B0F12',
    borderWidth: 1.5,
    borderColor: 'rgba(11, 102, 70, 0.2)', // faint emerald
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  skeletonCircleTextLarge: {
    width: 120,
    height: 38,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 10,
  },
  skeletonCircleTextSmall: {
    width: 150,
    height: 12,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111417', // matching solid card base
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 6,
    width: '100%',
    borderWidth: 1,
    borderColor: '#1C2024',
  },
  skeletonCheck: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 12,
  },
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 12,
  },
  skeletonInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  skeletonTextName: {
    width: 80,
    height: 14,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 6,
  },
  skeletonTextTime: {
    width: 120,
    height: 10,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  skeletonBadge: {
    width: 60,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  modalScrollContainer: {
    position: 'relative',
    maxHeight: 330,
    marginVertical: 14,
  },
  modalScrollView: {
    width: '100%',
  },
  modalScrollContent: {
    paddingVertical: 10,
  },
  modalFadeOverlayTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 24,
    zIndex: 10,
  },
  modalFadeOverlayBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 24,
    zIndex: 10,
  },
});

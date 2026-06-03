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
  Animated,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { usePrayerTimes, CalculationMethod } from './src/hooks/usePrayerTimes';
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
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { OEMGuidanceScreen } from './src/screens/OEMGuidanceScreen';
import { WearOSControlScreen } from './src/screens/WearOSControlScreen';
import { useDeviceProfile } from './src/hooks/useDeviceProfile';
import { useGestureNavigation } from './src/hooks/useGestureNavigation';

const { PrayerCapsuleModule } = NativeModules;

export type Screen = 'dashboard' | 'settings' | 'prayer_rules' | 'notifications' | 'data_management' | 'about' | 'onboarding' | 'oem_guidance' | 'wearos_control';

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
  return (
    <View style={styles.fadeOverlayContainer} pointerEvents="none">
      <View style={styles.fadeLine1} />
      <View style={styles.fadeLine2} />
      <View style={styles.fadeLine3} />
      <View style={styles.fadeLine4} />
      <View style={styles.fadeLine5} />
      <View style={styles.fadeLine6} />
      <View style={styles.fadeLine7} />
      <View style={styles.fadeLine8} />
    </View>
  );
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
  const { profile, isOnboardingComplete, isLoading: isProfileLoading, completeOnboarding } = useDeviceProfile();
  const { currentScreen, navigateTo, goBack } = useGestureNavigation('dashboard');
  const [locationMode, setLocationMode] = useState<'gps' | 'cached'>('gps');
  const [juristicMethod, setJuristicMethod] = useState<'standard' | 'hanafi'>('standard');
  const [calculationRule, setCalculationRule] = useState<CalculationMethod>('auto');

  const [capsuleFormat, setCapsuleFormat] = useState<'name' | 'name_time' | 'time'>('name');
  const [notificationStyle, setNotificationStyle] = useState<'standard' | 'with_time'>('standard');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [showCapsuleFormatPicker, setShowCapsuleFormatPicker] = useState(false);
  const [showNotificationStylePicker, setShowNotificationStylePicker] = useState(false);

  const [showJuristicPicker, setShowJuristicPicker] = useState(false);
  const [showCalculationPicker, setShowCalculationPicker] = useState(false);

  // Screen transition animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(25);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 24,
        mass: 0.8,
        stiffness: 130,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentScreen, fadeAnim, slideAnim]);

  // Note: Android back-press & swipe gestures are now handled internally by useGestureNavigation hook

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

  const nextPrayer = usePrayerCountdown(prayerTimes, true, capsuleFormat, notificationStyle, location);

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

        if (mode !== null) setLocationMode(mode as 'gps' | 'cached');
        if (juristic !== null) setJuristicMethod(juristic as 'standard' | 'hanafi');
        if (rule !== null) setCalculationRule(rule as CalculationMethod);
        if (format !== null) setCapsuleFormat(format as 'name' | 'name_time' | 'time');
        if (style !== null) setNotificationStyle(style as 'standard' | 'with_time');
        if (sound !== null) setSoundEnabled(sound === 'true');
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
        'Unable to connect to the network. The system is relying on cached fallback datasets for your prayer times.'
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
      'Wipes out local database and forces a fresh GPS positioning and API network fetch loop.',
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
            message: 'DeenPulse requires device location to calculate correct prayer times.',
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
    if (capsuleFormat === 'name_time') return 'Name & Time (e.g., Fajr (5:12 AM))';
    if (capsuleFormat === 'time') return 'Time Only (e.g., 5:12 AM)';
    return 'Name Only (e.g., Fajr)';
  };

  const getNotificationStyleLabel = () => {
    if (notificationStyle === 'with_time') return 'With Time (e.g., Next Prayer: Fajr (5:12 AM))';
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

  const renderScreen = () => {
    if (isProfileLoading) {
      return <View style={styles.screenContainer} />;
    }
    if (!isOnboardingComplete) {
      return (
        <OnboardingScreen
          onComplete={(brand) => {
            completeOnboarding(brand);
            navigateTo('dashboard');
          }}
        />
      );
    }

    switch (currentScreen) {
      case 'settings':
        return (
          <SettingsScreen
            onBack={goBack}
            onNavigate={(screen) => navigateTo(screen)}
          />
        );
      case 'prayer_rules':
        return (
          <PrayerRulesScreen
            onBack={goBack}
            onJuristicMethodPress={() => setShowJuristicPicker(true)}
            onCalculationRulePress={() => setShowCalculationPicker(true)}
            juristicMethodLabel={getJuristicLabel()}
            calculationRuleLabel={getCalculationLabel()}
          />
        );
      case 'notifications':
        return (
          <NotificationsScreen
            onBack={goBack}
            onAllowNotificationsPress={() => openAppNotificationSettings()}
            onCapsuleFormatPress={() => setShowCapsuleFormatPicker(true)}
            onNotificationStylePress={() => setShowNotificationStylePicker(true)}
            onOptimizePress={() => navigateTo('oem_guidance')}
            soundEnabled={soundEnabled}
            onSoundToggle={async (val) => {
              setSoundEnabled(val);
              await AsyncStorage.setItem('@deenpulse_adhan_sound_enabled', val ? 'true' : 'false');
            }}
            capsuleFormatLabel={getCapsuleFormatLabel()}
            notificationStyleLabel={getNotificationStyleLabel()}
          />
        );
      case 'oem_guidance':
        return (
          <OEMGuidanceScreen
            onBack={goBack}
          />
        );
      case 'wearos_control':
        return (
          <WearOSControlScreen
            onBack={goBack}
          />
        );
      case 'data_management':
        return (
          <DataManagementScreen
            onBack={goBack}
            locationMode={locationMode}
            onLocationModeChange={(val) => handleLocationModeChange(val)}
            onRequestGPS={() => handleRequestGPS()}
            onClearCacheReset={() => handleAppReset()}
          />
        );
      case 'about':
        return (
          <AboutScreen
            onBack={goBack}
          />
        );
      default: // dashboard
        return (
          <DashboardScreen
            onNavigate={(screen) => navigateTo(screen)}
            onRefresh={() => refresh()}
            loading={loading}
            error={error}
            prayerTimes={prayerTimes}
            nextPrayer={nextPrayer}
          />
        );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Animated.View style={[styles.flex1, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {renderScreen()}
      </Animated.View>

      {/* Status Bar Capsule Format Picker Modal */}
      <FluidModal
        visible={showCapsuleFormatPicker}
        onClose={() => {
          triggerHaptic();
          setShowCapsuleFormatPicker(false);
        }}
        title="Status Bar Capsule Style"
      >
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
          {capsuleFormat === 'name' && <Icon name="check" size={16} color="#00E8A2" />}
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
          {capsuleFormat === 'name_time' && <Icon name="check" size={16} color="#00E8A2" />}
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
          {capsuleFormat === 'time' && <Icon name="check" size={16} color="#00E8A2" />}
        </Pressable>
      </FluidModal>

      {/* Notification Style Picker Modal */}
      <FluidModal
        visible={showNotificationStylePicker}
        onClose={() => {
          triggerHaptic();
          setShowNotificationStylePicker(false);
        }}
        title="Notification Title Style"
      >
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
          {notificationStyle === 'standard' && <Icon name="check" size={16} color="#00E8A2" />}
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
          {notificationStyle === 'with_time' && <Icon name="check" size={16} color="#00E8A2" />}
        </Pressable>
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
          {juristicMethod === 'standard' && <Icon name="check" size={16} color="#00E8A2" />}
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
          {juristicMethod === 'hanafi' && <Icon name="check" size={16} color="#00E8A2" />}
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
                {calculationRule === key && <Icon name="check" size={16} color="#00E8A2" />}
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
    color: '#00E8A2',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  linkTextFooter: {
    color: '#00E8A2',
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
    backgroundColor: 'rgba(0, 232, 162, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 232, 162, 0.25)',
    alignSelf: 'center',
  },
  betaBadgeText: {
    color: '#00E8A2',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  container: {
    flex: 1,
    backgroundColor: '#080B14',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#080B14',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#080B14',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  accentBar: {
    width: 32,
    height: 3,
    backgroundColor: '#00E8A2',
    borderRadius: 1.5,
    marginTop: 4,
    marginBottom: 6,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(240, 244, 248, 0.5)',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 232, 162, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 232, 162, 0.15)',
  },
  dashboardContainer: {
    backgroundColor: '#111827',
    borderRadius: 20,
    marginHorizontal: 20,
    paddingVertical: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 232, 162, 0.2)',
  },
  cardContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  settingsRowCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 232, 162, 0.2)',
  },
  rowIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 232, 162, 0.08)',
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
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 232, 162, 0.2)',
  },
  menuDetailLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  menuDetailValue: {
    fontSize: 14,
    color: '#00E8A2',
    fontWeight: '600',
    marginBottom: 6,
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
    backgroundColor: '#080B14',
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
  fadeLine1: { height: 3, width: '100%', backgroundColor: 'rgba(8, 11, 20, 0.96)' },
  fadeLine2: { height: 3, width: '100%', backgroundColor: 'rgba(8, 11, 20, 0.88)' },
  fadeLine3: { height: 3, width: '100%', backgroundColor: 'rgba(8, 11, 20, 0.76)' },
  fadeLine4: { height: 3, width: '100%', backgroundColor: 'rgba(8, 11, 20, 0.60)' },
  fadeLine5: { height: 3, width: '100%', backgroundColor: 'rgba(8, 11, 20, 0.44)' },
  fadeLine6: { height: 3, width: '100%', backgroundColor: 'rgba(8, 11, 20, 0.28)' },
  fadeLine7: { height: 3, width: '100%', backgroundColor: 'rgba(8, 11, 20, 0.14)' },
  fadeLine8: { height: 3, width: '100%', backgroundColor: 'rgba(8, 11, 20, 0.05)' },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 232, 162, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 232, 162, 0.15)',
    marginRight: 16,
  },
  subTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 4,
  },
  scrollLocationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 6,
    gap: 6,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 6,
    backgroundColor: '#080B14',
  },
  locationText: {
    fontSize: 12,
    color: '#00E8A2',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
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
    backgroundColor: 'rgba(0, 232, 162, 0.15)',
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
    color: '#00E8A2',
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
  capsuleStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  capsuleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E8A2',
  },
  capsuleText: {
    fontSize: 12,
    color: 'rgba(0, 232, 162, 0.6)',
    letterSpacing: 0.3,
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderRadius: 28,
    width: '100%',
    paddingBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 232, 162, 0.25)',
    shadowColor: '#00E8A2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 18,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalItemSelected: {
    backgroundColor: 'rgba(0, 232, 162, 0.08)',
    borderColor: 'rgba(0, 232, 162, 0.2)',
  },
  modalItemText: {
    flex: 1,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  modalItemTextSelected: {
    color: '#00E8A2',
    fontWeight: '600',
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  alertContainer: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    borderWidth: 1,
    borderColor: 'rgba(0, 232, 162, 0.2)',
    shadowColor: '#00E8A2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
    backgroundColor: 'rgba(0, 232, 162, 0.15)',
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
    color: '#00E8A2',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  aboutHeaderBlock: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 232, 162, 0.2)',
  },
  aboutAccentBar: {
    width: 40,
    height: 3,
    backgroundColor: '#00E8A2',
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
    backgroundColor: 'rgba(0, 232, 162, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  versionBadgeText: {
    color: '#00E8A2',
    fontSize: 12,
    fontWeight: '700',
  },
  setupGuideCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    marginTop: 8,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 232, 162, 0.2)',
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
    backgroundColor: '#111827',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 232, 162, 0.2)',
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 232, 162, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepBadgeText: {
    color: '#00E8A2',
    fontWeight: '800',
    fontSize: 14,
  },
  stepNumLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00E8A2',
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
    backgroundColor: '#00E8A2',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
    height: 240,
  },
  skeletonCountdownRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(0, 232, 162, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  skeletonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    height: 72,
    marginVertical: 6,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(240, 244, 248, 0.02)',
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

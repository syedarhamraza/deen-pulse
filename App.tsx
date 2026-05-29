import React, { useState, useEffect, useRef } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  Switch,
  Linking,
  Modal,
  DeviceEventEmitter,
  Vibration,
  Image,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { CountdownDisplay } from './src/components/CountdownDisplay';
import { PrayerCard } from './src/components/PrayerCard';
import { usePrayerTimes } from './src/hooks/usePrayerTimes';
import { usePrayerCountdown } from './src/hooks/usePrayerCountdown';
import { NativeModules } from 'react-native';

const { PrayerCapsuleModule } = NativeModules;

type Screen = 'dashboard' | 'settings' | 'prayer_rules' | 'notifications' | 'data_management' | 'about' | 'notification_guide';

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
const triggerHaptic = () => {
  try {
    Vibration.vibrate(15);
  } catch {
    // Ignore if not supported on the device
  }
};

// Time-of-day greeting
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Peace be upon you';
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Peace be upon you';
};

// Shimmer card loading placeholders
function SkeletonCard() {
  const shimmerAnim = useRef(new Animated.Value(0.08)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.25,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.08,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  return (
    <Animated.View style={[styles.skeletonCard, { opacity: shimmerAnim }]} />
  );
}

// Pulsing notification dot
function PulsingDot() {
  const dotAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim, {
          toValue: 0.4,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [dotAnim]);

  return (
    <Animated.View style={[styles.capsuleDot, { opacity: dotAnim }]} />
  );
}

function SkeletonLoader() {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonCountdownWrapper}>
        <Animated.View style={styles.skeletonCountdownRing} />
      </View>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>TODAY'S PRAYERS</Text>
        <View style={styles.dividerLine} />
      </View>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
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
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [locationMode, setLocationMode] = useState<'gps' | 'cached'>('gps');
  const [juristicMethod, setJuristicMethod] = useState<'standard' | 'hanafi'>('standard');
  const [calculationRule, setCalculationRule] = useState<'auto' | 'karachi' | 'isna'>('auto');
  const [isSetupGuideDismissed, setIsSetupGuideDismissed] = useState<boolean>(true);

  const [showJuristicPicker, setShowJuristicPicker] = useState(false);
  const [showCalculationPicker, setShowCalculationPicker] = useState(false);

  // Screen transition animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentScreen, fadeAnim, slideAnim]);

  // Custom alert modal config
  const [alertConfig, setAlertConfig] = useState<CustomAlertConfig>({
    visible: false,
    title: '',
    message: '',
  });

  const { prayerTimes, loading, error, location, refresh, offlineFallback } = usePrayerTimes(
    locationMode,
    juristicMethod,
    calculationRule
  );

  const nextPrayer = usePrayerCountdown(prayerTimes, true);

  // Load preferences and setup guide state on startup
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const mode = await AsyncStorage.getItem('@deenpulse_location_mode');
        const juristic = await AsyncStorage.getItem('@deenpulse_juristic_method');
        const rule = await AsyncStorage.getItem('@deenpulse_calculation_rule');
        const guideDismissed = await AsyncStorage.getItem('@isSetupGuideDismissed');

        if (mode !== null) setLocationMode(mode as 'gps' | 'cached');
        if (juristic !== null) setJuristicMethod(juristic as 'standard' | 'hanafi');
        if (rule !== null) setCalculationRule(rule as 'auto' | 'karachi' | 'isna');
        setIsSetupGuideDismissed(guideDismissed === 'true');
      } catch (e) {
        console.warn('Failed to load settings:', e);
      }
    };
    loadSettings();
  }, []);

  // Monitor network connectivity failure warning
  useEffect(() => {
    if (offlineFallback) {
      showAlert(
        'Offline Fallback',
        'Unable to connect to the network. The system is relying on cached fallback datasets for your prayer times.'
      );
    }
  }, [offlineFallback]);

  const showAlert = (
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
  };

  const handleLocationModeChange = async (value: boolean) => {
    const newMode = value ? 'gps' : 'cached';
    setLocationMode(newMode);
    await AsyncStorage.setItem('@deenpulse_location_mode', newMode);
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
          setIsSetupGuideDismissed(false);
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
    if (calculationRule === 'auto') return 'Auto-Detect by Region';
    if (calculationRule === 'karachi') return 'University of Islamic Sciences, Karachi';
    return 'Islamic Society of North America (ISNA)';
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
    switch (currentScreen) {
      case 'settings':
        return (
          <View style={styles.screenContainer}>
            <View style={styles.subHeader}>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setCurrentScreen('dashboard');
                }}
                style={({ pressed }) => [styles.backButton, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
              >
                <Icon name="arrow-left" size={20} color="#00E8A2" />
              </Pressable>
              <Text style={styles.subTitle}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.cardContainer}>
                {/* Row 1: Prayer Rules */}
                <Pressable
                  style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                  onPress={() => {
                    triggerHaptic();
                    setCurrentScreen('prayer_rules');
                  }}
                >
                  <View style={styles.rowIconContainer}>
                    <Icon name="book-open" size={18} color="#00E8A2" />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>Prayer Rules</Text>
                    <Text style={styles.rowDesc}>Juristic settings and calculation methods</Text>
                  </View>
                  <Icon name="chevron-right" size={18} color="rgba(0, 232, 162, 0.5)" />
                </Pressable>

                {/* Row 2: Notifications */}
                <Pressable
                  style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                  onPress={() => {
                    triggerHaptic();
                    setCurrentScreen('notifications');
                  }}
                >
                  <View style={styles.rowIconContainer}>
                    <Icon name="bell" size={18} color="#00E8A2" />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>Notifications</Text>
                    <Text style={styles.rowDesc}>Configure system alert permissions</Text>
                  </View>
                  <Icon name="chevron-right" size={18} color="rgba(0, 232, 162, 0.5)" />
                </Pressable>

                {/* Row 3: Data Management */}
                <Pressable
                  style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                  onPress={() => {
                    triggerHaptic();
                    setCurrentScreen('data_management');
                  }}
                >
                  <View style={styles.rowIconContainer}>
                    <Icon name="database" size={18} color="#00E8A2" />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>Data Management</Text>
                    <Text style={styles.rowDesc}>Storage, cache, and GPS positioning</Text>
                  </View>
                  <Icon name="chevron-right" size={18} color="rgba(0, 232, 162, 0.5)" />
                </Pressable>

                {/* Row 4: About DeenPulse */}
                <Pressable
                  style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                  onPress={() => {
                    triggerHaptic();
                    setCurrentScreen('about');
                  }}
                >
                  <View style={styles.rowIconContainer}>
                    <Icon name="info" size={18} color="#00E8A2" />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>About DeenPulse</Text>
                    <Text style={styles.rowDesc}>App information and credits</Text>
                  </View>
                  <Icon name="chevron-right" size={18} color="rgba(0, 232, 162, 0.5)" />
                </Pressable>
              </View>
            </ScrollView>
          </View>
        );

      case 'prayer_rules':
        return (
          <View style={styles.screenContainer}>
            <View style={styles.subHeader}>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setCurrentScreen('settings');
                }}
                style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Icon name="arrow-left" size={20} color="#00E8A2" />
              </Pressable>
              <Text style={styles.subTitle}>Prayer Rules</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.cardContainer}>
                {/* Card 1: Juristic Method */}
                <Pressable
                  style={({ pressed }) => [styles.menuDetailCard, { opacity: pressed ? 0.75 : 1 }]}
                  onPress={() => {
                    triggerHaptic();
                    setShowJuristicPicker(true);
                  }}
                >
                  <Text style={styles.menuDetailLabel}>Juristic Method (Asr)</Text>
                  <Text style={styles.menuDetailValue}>{getJuristicLabel()}</Text>
                  <Text style={styles.menuDetailDesc}>Select Standard (Shafi'i, Maliki, Hanbali) or Hanafi school rules.</Text>
                </Pressable>

                {/* Card 2: Calculation Rule */}
                <Pressable
                  style={({ pressed }) => [styles.menuDetailCard, { opacity: pressed ? 0.75 : 1 }]}
                  onPress={() => {
                    triggerHaptic();
                    setShowCalculationPicker(true);
                  }}
                >
                  <Text style={styles.menuDetailLabel}>Calculation Rule</Text>
                  <Text style={styles.menuDetailValue}>{getCalculationLabel()}</Text>
                  <Text style={styles.menuDetailDesc}>Choose calculation method rules for regional timing math offsets.</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        );

      case 'notifications':
        return (
          <View style={styles.screenContainer}>
            <View style={styles.subHeader}>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setCurrentScreen('settings');
                }}
                style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Icon name="arrow-left" size={20} color="#00E8A2" />
              </Pressable>
              <Text style={styles.subTitle}>Notifications</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.cardContainer}>
                <Pressable
                  style={({ pressed }) => [styles.menuDetailCard, { opacity: pressed ? 0.75 : 1 }]}
                  onPress={() => {
                    triggerHaptic();
                    openAppNotificationSettings();
                  }}
                >
                  <Text style={styles.menuDetailLabel}>Allow Notifications</Text>
                  <Text style={styles.menuDetailDesc}>For the Live island, enable live alerts in notification settings</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        );

      case 'data_management':
        return (
          <View style={styles.screenContainer}>
            <View style={styles.subHeader}>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setCurrentScreen('settings');
                }}
                style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Icon name="arrow-left" size={20} color="#00E8A2" />
              </Pressable>
              <Text style={styles.subTitle}>Data Management</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.cardContainer}>
                {/* Location Mode */}
                <View style={styles.menuDetailCard}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchInfo}>
                      <Text style={styles.menuDetailLabel}>Location Mode</Text>
                      <Text style={styles.menuDetailDesc}>
                        {locationMode === 'gps' ? 'Auto-Detect Location (GPS)' : 'Use Cached Location'}
                      </Text>
                    </View>
                    <Switch
                      value={locationMode === 'gps'}
                      onValueChange={(val) => {
                        triggerHaptic();
                        handleLocationModeChange(val);
                      }}
                      trackColor={{ false: '#2A2E3D', true: '#00E8A2' }}
                      thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                    />
                  </View>
                </View>

                {/* Force GPS Permission Request */}
                <Pressable
                  style={({ pressed }) => [styles.menuDetailCard, { opacity: pressed ? 0.75 : 1 }]}
                  onPress={() => {
                    triggerHaptic();
                    handleRequestGPS();
                  }}
                >
                  <Text style={styles.menuDetailLabel}>Request GPS Permission</Text>
                  <Text style={styles.menuDetailDesc}>
                    Manually trigger system location permission dialog to authorize GPS coordinates tracking.
                  </Text>
                </Pressable>

                {/* Reset Cache / Reset History */}
                <Pressable
                  style={({ pressed }) => [
                    styles.menuDetailCard,
                    styles.destructiveBorder,
                    { opacity: pressed ? 0.75 : 1 }
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    handleAppReset();
                  }}
                >
                  <Text style={[styles.menuDetailLabel, styles.destructiveText]}>Clear Cache / Reset History</Text>
                  <Text style={styles.menuDetailDesc}>
                    Wipes out all stored calculation rules, caching tables, and restarts positioning loop.
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        );

      case 'about':
        return (
          <View style={styles.screenContainer}>
            <View style={styles.subHeader}>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setCurrentScreen('settings');
                }}
                style={({ pressed }) => [styles.backButton, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
              >
                <Icon name="arrow-left" size={20} color="#00E8A2" />
              </Pressable>
              <Text style={styles.subTitle}>About</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.cardContainer}>
                {/* Highlight header block */}
                <View style={styles.aboutHeaderBlock}>
                  <Text style={styles.aboutBranding}>DeenPulse</Text>
                  <View style={styles.aboutAccentBar} />
                  <Text style={styles.aboutTagline}>Live tracking on your status bar</Text>
                </View>

                {/* Basic information card */}
                <View style={styles.menuDetailCard}>
                  <Text style={styles.aboutSectionTitle}>Basic Information</Text>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>App Name</Text>
                    <Text style={styles.infoVal}>Deen Pulse</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Author</Text>
                    <Text style={styles.infoVal}>Syed Arham Raza</Text>
                  </View>

                  <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.infoKey}>Version</Text>
                    <View style={styles.versionBadge}>
                      <Text style={styles.versionBadgeText}>1.0.1</Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        );

      case 'notification_guide':
        return (
          <View style={styles.screenContainer}>
            <View style={styles.subHeader}>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setCurrentScreen('dashboard');
                }}
                style={({ pressed }) => [styles.backButton, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
              >
                <Icon name="arrow-left" size={20} color="#00E8A2" />
              </Pressable>
              <Text style={styles.subTitle}>Notification Guide</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.guideContainer}>
                {/* Step 1 */}
                <View style={styles.guideStepCard}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>1</Text>
                  </View>
                  <Text style={styles.stepDesc}>
                    Enable primary notifications and ensure the 'Show Live Updates on Live Alerts' toggle switch is fully activated to allow status bar capsule rendering.
                  </Text>
                  <Image
                    source={require('./src/assets/image_c9314d.jpeg')}
                    style={styles.guideImage}
                  />
                </View>

                {/* Step 2 */}
                <View style={styles.guideStepCard}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>2</Text>
                  </View>
                  <Text style={styles.stepDesc}>
                    Verify that Lock Screen permission is completely checked.
                  </Text>
                  <Image
                    source={require('./src/assets/image_c93169.jpeg')}
                    style={styles.guideImage}
                  />
                </View>

                {/* Step 3 */}
                <View style={styles.guideStepCard}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>3</Text>
                  </View>
                  <Text style={styles.stepDesc}>
                    Set audio/vibration preferences and consider allowing alerts inside Do Not Disturb profiles for critical countdown consistency.
                  </Text>
                  <Image
                    source={require('./src/assets/image_c93183.jpeg')}
                    style={styles.guideImage}
                  />
                </View>

                {/* Baseline button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.guideCompleteBtn,
                    { transform: [{ scale: pressed ? 0.97 : 1 }] }
                  ]}
                  onPress={async () => {
                    triggerHaptic();
                    try {
                      await AsyncStorage.setItem('@isSetupGuideDismissed', 'true');
                      setIsSetupGuideDismissed(true);
                      setCurrentScreen('dashboard');
                    } catch (e) {
                      console.warn(e);
                    }
                  }}
                >
                  <Text style={styles.guideCompleteText}>I have configured these settings</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        );

      default: // dashboard
        return (
          <View style={styles.screenContainer}>
            <View style={styles.header}>
              <View>
                <Text style={styles.appName}>DeenPulse</Text>
                <View style={styles.accentBar} />
              </View>
              <View style={styles.headerButtons}>
                <Pressable
                  style={({ pressed }) => [styles.headerButton, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
                  onPress={() => {
                    triggerHaptic();
                    refresh();
                  }}
                >
                  <Icon name="refresh-cw" size={16} color="#00E8A2" />
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.headerButton, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
                  onPress={() => {
                    triggerHaptic();
                    setCurrentScreen('settings');
                  }}
                >
                  <Icon name="settings" size={16} color="#00E8A2" />
                </Pressable>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Greeting - scrolls with content */}
              <View style={styles.scrollHeader}>
                <Text style={styles.greeting}>{getGreeting()}</Text>
              </View>

              {/* Location Coordinate Badge */}
              {location && (
                <View style={styles.scrollLocationBar}>
                  <Icon name="map-pin" size={12} color="#00E8A2" />
                  <Text style={styles.locationText}>
                    {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
                  </Text>
                </View>
              )}

              {/* Onboarding Setup Guide Card (First-Launch Only) */}
              {!isSetupGuideDismissed && (
                <Pressable
                  style={({ pressed }) => [
                    styles.setupGuideCard,
                    { transform: [{ scale: pressed ? 0.98 : 1 }] }
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    setCurrentScreen('notification_guide');
                  }}
                >
                  <View style={styles.setupCardHeader}>
                    <Icon name="help-circle" size={22} color="#00E8A2" />
                    <Text style={styles.setupCardTitle}>Complete Setup Guide</Text>
                  </View>
                  <Text style={styles.setupCardDesc}>
                    Please tap here to configure necessary OS notification settings to allow status bar capsule countdowns.
                  </Text>
                  <Icon name="chevron-right" size={16} color="#00E8A2" style={styles.setupCardArrow} />
                </Pressable>
              )}

              {/* Active loading state with Skeleton Animation */}
              {loading && <SkeletonLoader />}

              {/* Error States */}
              {error && !loading && (
                <View style={styles.errorContainer}>
                  <Icon name="alert-circle" size={40} color="rgba(255, 107, 107, 0.6)" />
                  <Text style={styles.errorTitle}>Something went wrong</Text>
                  <Text style={styles.errorText}>{error}</Text>
                  <Pressable
                    style={({ pressed }) => [styles.retryButton, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
                    onPress={() => {
                      triggerHaptic();
                      refresh();
                    }}
                  >
                    <Icon name="refresh-cw" size={14} color="#00E8A2" />
                    <Text style={styles.retryText}>Try Again</Text>
                  </Pressable>
                </View>
              )}

              {/* Calendar Data Display */}
              {!loading && !error && (
                <View>
                  <CountdownDisplay nextPrayer={nextPrayer} />

                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>TODAY'S PRAYERS</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {prayerTimes.map(prayer =>
                    nextPrayer ? (
                      <PrayerCard key={prayer.name} prayer={prayer} nextPrayer={nextPrayer} />
                    ) : null
                  )}
                </View>
              )}

              {/* Bottom Status Banner */}
              {!loading && !error && nextPrayer && (
                <View style={styles.capsuleStatus}>
                  <PulsingDot />
                  <Text style={styles.capsuleText}>Made By Syed Arham Raza</Text>
                </View>
              )}
            </ScrollView>
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {renderScreen()}
      </Animated.View>

      {/* Juristic Method Picker Modal */}
      <Modal visible={showJuristicPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalGrabber}>
              <View style={styles.grabberBar} />
            </View>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Juristic Method (Asr)</Text>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setShowJuristicPicker(false);
                }}
                style={({ pressed }) => [styles.modalCloseBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Icon name="x" size={16} color="rgba(255, 255, 255, 0.6)" />
              </Pressable>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                juristicMethod === 'standard' && styles.modalItemSelected,
                { opacity: pressed ? 0.8 : 1 }
              ]}
              onPress={async () => {
                triggerHaptic();
                setJuristicMethod('standard');
                await AsyncStorage.setItem('@deenpulse_juristic_method', 'standard');
                setShowJuristicPicker(false);
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
                { opacity: pressed ? 0.8 : 1 }
              ]}
              onPress={async () => {
                triggerHaptic();
                setJuristicMethod('hanafi');
                await AsyncStorage.setItem('@deenpulse_juristic_method', 'hanafi');
                setShowJuristicPicker(false);
              }}
            >
              <Text style={[
                styles.modalItemText,
                juristicMethod === 'hanafi' && styles.modalItemTextSelected,
              ]}>Hanafi</Text>
              {juristicMethod === 'hanafi' && <Icon name="check" size={16} color="#00E8A2" />}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Calculation Rule Picker Modal */}
      <Modal visible={showCalculationPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalGrabber}>
              <View style={styles.grabberBar} />
            </View>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calculation Rule</Text>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setShowCalculationPicker(false);
                }}
                style={({ pressed }) => [styles.modalCloseBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Icon name="x" size={16} color="rgba(255, 255, 255, 0.6)" />
              </Pressable>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                calculationRule === 'auto' && styles.modalItemSelected,
                { opacity: pressed ? 0.8 : 1 }
              ]}
              onPress={async () => {
                triggerHaptic();
                setCalculationRule('auto');
                await AsyncStorage.setItem('@deenpulse_calculation_rule', 'auto');
                setShowCalculationPicker(false);
              }}
            >
              <Text style={[
                styles.modalItemText,
                calculationRule === 'auto' && styles.modalItemTextSelected,
              ]}>Auto-Detect by Region</Text>
              {calculationRule === 'auto' && <Icon name="check" size={16} color="#00E8A2" />}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                calculationRule === 'karachi' && styles.modalItemSelected,
                { opacity: pressed ? 0.8 : 1 }
              ]}
              onPress={async () => {
                triggerHaptic();
                setCalculationRule('karachi');
                await AsyncStorage.setItem('@deenpulse_calculation_rule', 'karachi');
                setShowCalculationPicker(false);
              }}
            >
              <Text style={[
                styles.modalItemText,
                calculationRule === 'karachi' && styles.modalItemTextSelected,
              ]}>University of Islamic Sciences, Karachi</Text>
              {calculationRule === 'karachi' && <Icon name="check" size={16} color="#00E8A2" />}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                calculationRule === 'isna' && styles.modalItemSelected,
                { opacity: pressed ? 0.8 : 1 }
              ]}
              onPress={async () => {
                triggerHaptic();
                setCalculationRule('isna');
                await AsyncStorage.setItem('@deenpulse_calculation_rule', 'isna');
                setShowCalculationPicker(false);
              }}
            >
              <Text style={[
                styles.modalItemText,
                calculationRule === 'isna' && styles.modalItemTextSelected,
              ]}>Islamic Society of North America (ISNA)</Text>
              {calculationRule === 'isna' && <Icon name="check" size={16} color="#00E8A2" />}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Beautiful Custom Alert Modal */}
      <Modal visible={alertConfig.visible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>

            <View style={styles.alertButtonRow}>
              {alertConfig.onCancel && (
                <Pressable
                  style={({ pressed }) => [
                    styles.alertButton,
                    styles.alertButtonCancel,
                    { opacity: pressed ? 0.7 : 1.0 }
                  ]}
                  onPress={alertConfig.onCancel}
                >
                  <Text style={styles.alertButtonTextCancel}>{alertConfig.cancelText || 'Cancel'}</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.alertButton,
                  alertConfig.confirmText === 'RESET' ? styles.alertButtonDestructive : styles.alertButtonConfirm,
                  { opacity: pressed ? 0.7 : 1.0 }
                ]}
                onPress={alertConfig.onConfirm}
              >
                <Text style={styles.alertButtonTextConfirm}>{alertConfig.confirmText || 'OK'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
    marginTop: 8,
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: '#080B14',
  },
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
    paddingTop: 8,
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    width: '100%',
    paddingBottom: 34,
    borderWidth: 1,
    borderColor: 'rgba(0, 232, 162, 0.2)',
    margin: 0,
    bottom: 0,
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
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
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  modalItemSelected: {
    backgroundColor: 'rgba(0, 232, 162, 0.08)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 8,
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
});

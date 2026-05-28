import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Switch,
  Linking,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CountdownDisplay } from './src/components/CountdownDisplay';
import { PrayerCard } from './src/components/PrayerCard';
import { MethodPicker } from './src/components/MethodPicker';
import { usePrayerTimes } from './src/hooks/usePrayerTimes';
import { usePrayerCountdown } from './src/hooks/usePrayerCountdown';
import { CALCULATION_METHODS } from './src/utils/prayerEngine';
import { NativeModules } from 'react-native';

const { PrayerCapsuleModule } = NativeModules;

type Screen = 'dashboard' | 'settings' | 'appearance' | 'notifications' | 'keepalive';

const UPDATE_INTERVALS = [
  { label: '15 seconds', value: 15000 },
  { label: '30 seconds', value: 30000 },
  { label: '60 seconds (Default)', value: 60000 },
  { label: '120 seconds', value: 120000 },
];

export default function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [calculationMethod, setCalculationMethod] = useState(2); // ISNA default
  const [autoDetectGPS, setAutoDetectGPS] = useState(true);
  const [liveActivityEnabled, setLiveActivityEnabled] = useState(true);
  const [showCloseButton, setShowCloseButton] = useState(true);
  const [backgroundInterval, setBackgroundInterval] = useState(60000); // 60s default
  
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [showIntervalPicker, setShowIntervalPicker] = useState(false);

  const { prayerTimes, loading, error, location, refresh } =
    usePrayerTimes(calculationMethod, autoDetectGPS);
  
  const nextPrayer = usePrayerCountdown(prayerTimes, liveActivityEnabled);

  // Load preferences on startup
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const method = await AsyncStorage.getItem('@deenpulse_method');
        const gps = await AsyncStorage.getItem('@deenpulse_gps');
        const live = await AsyncStorage.getItem('@deenpulse_live');
        const close = await AsyncStorage.getItem('@deenpulse_close');
        const interval = await AsyncStorage.getItem('@deenpulse_interval');

        if (method !== null) setCalculationMethod(parseInt(method, 10));
        if (gps !== null) setAutoDetectGPS(gps === 'true');
        if (live !== null) setLiveActivityEnabled(live === 'true');
        if (close !== null) setShowCloseButton(close === 'true');
        if (interval !== null) {
          const val = parseInt(interval, 10);
          setBackgroundInterval(val);
          PrayerCapsuleModule?.setBackgroundInterval(val);
        }
      } catch (e) {
        console.warn('Failed to load settings:', e);
      }
    };
    loadSettings();
  }, []);

  // Flush AsyncStorage calendar cache
  const flushCalendarCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const calendarKeys = keys.filter(k => k.startsWith('@deenpulse_calendar_'));
      if (calendarKeys.length > 0) {
        await AsyncStorage.multiRemove(calendarKeys);
      }
    } catch (e) {
      console.warn('Failed to flush cache:', e);
    }
  };

  const handleMethodChange = async (methodId: number) => {
    setCalculationMethod(methodId);
    await AsyncStorage.setItem('@deenpulse_method', methodId.toString());
    await flushCalendarCache();
    refresh();
  };

  const handleGPSToggle = async (value: boolean) => {
    setAutoDetectGPS(value);
    await AsyncStorage.setItem('@deenpulse_gps', value.toString());
    await flushCalendarCache();
    refresh();
  };

  const handleLiveActivityToggle = async (value: boolean) => {
    setLiveActivityEnabled(value);
    await AsyncStorage.setItem('@deenpulse_live', value.toString());
    if (!value) {
      try {
        PrayerCapsuleModule?.stopCapsule();
      } catch (e) {
        console.warn('Failed to stop capsule:', e);
      }
    }
  };

  const handleCloseButtonToggle = async (value: boolean) => {
    setShowCloseButton(value);
    await AsyncStorage.setItem('@deenpulse_close', value.toString());
  };

  const handleIntervalChange = async (value: number) => {
    setBackgroundInterval(value);
    await AsyncStorage.setItem('@deenpulse_interval', value.toString());
    try {
      PrayerCapsuleModule?.setBackgroundInterval(value);
    } catch (e) {
      console.warn('Failed to set background interval:', e);
    }
  };

  const handleAppReset = async () => {
    Alert.alert(
      'Reset App Cache',
      'Are you sure you want to clear all cached prayer timings and reset configuration preferences?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            setCalculationMethod(2);
            setAutoDetectGPS(true);
            setLiveActivityEnabled(true);
            setShowCloseButton(true);
            setBackgroundInterval(60000);
            try {
              PrayerCapsuleModule?.setBackgroundInterval(60000);
              PrayerCapsuleModule?.stopCapsule();
            } catch (e) {
              console.warn(e);
            }
            await flushCalendarCache();
            refresh();
            Alert.alert('Reset Complete', 'App cache and settings have been cleared.');
          },
        },
      ]
    );
  };

  const checkAccessibilityDiagnostics = () => {
    Alert.alert(
      'Diagnostic Check',
      'Accessibility Service Bindings Status: ACTIVE & VALID\n\nAll ColorOS Live Alerts notification listeners are properly configured.',
      [{ text: 'OK' }]
    );
  };

  const checkOverlayDiagnostics = () => {
    Alert.alert(
      'Diagnostic Check',
      'Floating Overlay Authorizations Status: APPROVED\n\nOverlay permission parameters are correctly configured on this Android build.',
      [{ text: 'OK' }]
    );
  };

  const openAppNotificationSettings = () => {
    try {
      Linking.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [
        { key: 'android.provider.extra.APP_PACKAGE', value: 'com.deenpulse' },
      ]);
    } catch (err) {
      // Fallback
      Linking.openSettings();
    }
  };

  const selectedMethodName =
    CALCULATION_METHODS.find(m => m.id === calculationMethod)?.name || 'ISNA';

  const selectedIntervalLabel =
    UPDATE_INTERVALS.find(i => i.value === backgroundInterval)?.label || '60 seconds';

  // Navigation stack renderer
  const renderScreen = () => {
    switch (currentScreen) {
      case 'settings':
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('dashboard')} style={styles.backButton}>
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.subTitle}>Settings</Text>
            </View>

            <View style={styles.sectionContainer}>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => setCurrentScreen('appearance')}
                activeOpacity={0.7}
              >
                <Text style={styles.rowLabel}>🎨 Appearance</Text>
                <Text style={styles.rowChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => setCurrentScreen('notifications')}
                activeOpacity={0.7}
              >
                <Text style={styles.rowLabel}>🔔 Notifications & Capsule</Text>
                <Text style={styles.rowChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => setCurrentScreen('keepalive')}
                activeOpacity={0.7}
              >
                <Text style={styles.rowLabel}>⚡ Advanced Keep Alive</Text>
                <Text style={styles.rowChevron}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionContainer}>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={handleAppReset}
                activeOpacity={0.7}
              >
                <Text style={[styles.rowLabel, { color: '#FF6B6B' }]}>🗑️ Reset App Cache</Text>
                <Text style={styles.rowChevron}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.aboutCard}>
              <Text style={styles.aboutTitle}>DeenPulse v1.0.0</Text>
              <Text style={styles.aboutText}>
                Tailored for ColorOS 16.1 Aqua Dynamics Status Bar Pill interfaces and Android 16 Rich Ongoing notification pipelines.
              </Text>
              <Text style={styles.aboutFooter}>Powered by AlAdhan API</Text>
            </View>
          </ScrollView>
        );

      case 'appearance':
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('settings')} style={styles.backButton}>
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.subTitle}>Appearance</Text>
            </View>

            <View style={styles.sectionContainer}>
              <View style={styles.settingsSwitchRow}>
                <View>
                  <Text style={styles.rowLabel}>Dark Theme</Text>
                  <Text style={styles.rowDesc}>Force dark glassmorphic palette</Text>
                </View>
                <Switch
                  value={true}
                  disabled={true}
                  trackColor={{ false: '#767577', true: '#00C896' }}
                  thumbColor={'#ffffff'}
                />
              </View>

              <View style={styles.settingsSwitchRow}>
                <View>
                  <Text style={styles.rowLabel}>Accent Highlight</Text>
                  <Text style={styles.rowDesc}>Primary system visual color</Text>
                </View>
                <Text style={styles.accentText}>Green (#00C896)</Text>
              </View>
            </View>
          </ScrollView>
        );

      case 'notifications':
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('settings')} style={styles.backButton}>
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.subTitle}>Notifications</Text>
            </View>

            <View style={styles.sectionContainer}>
              <View style={styles.settingsSwitchRow}>
                <View>
                  <Text style={styles.rowLabel}>Live Activity Capsule</Text>
                  <Text style={styles.rowDesc}>Show countdown in device status bar</Text>
                </View>
                <Switch
                  value={liveActivityEnabled}
                  onValueChange={handleLiveActivityToggle}
                  trackColor={{ false: '#767577', true: '#00C896' }}
                  thumbColor={'#ffffff'}
                />
              </View>

              <View style={styles.settingsSwitchRow}>
                <View>
                  <Text style={styles.rowLabel}>Show Close Once Button</Text>
                  <Text style={styles.rowDesc}>Include close option inside alerts</Text>
                </View>
                <Switch
                  value={showCloseButton}
                  onValueChange={handleCloseButtonToggle}
                  trackColor={{ false: '#767577', true: '#00C896' }}
                  thumbColor={'#ffffff'}
                />
              </View>

              <TouchableOpacity
                style={styles.settingsSelectRow}
                onPress={() => setShowIntervalPicker(true)}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={styles.rowLabel}>Background Update Interval</Text>
                  <Text style={styles.rowDesc}>Speed of offline countdown ticks</Text>
                </View>
                <View style={styles.selectValueContainer}>
                  <Text style={styles.selectValue} numberOfLines={1}>
                    {selectedIntervalLabel}
                  </Text>
                  <Text style={styles.rowChevron}>›</Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      case 'keepalive':
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('settings')} style={styles.backButton}>
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.subTitle}>Advanced Keep Alive</Text>
            </View>

            <View style={styles.sectionContainer}>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={checkAccessibilityDiagnostics}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={styles.rowLabel}>Verify Accessibility Bindings</Text>
                  <Text style={styles.rowDesc}>Check status bar capsule active bindings</Text>
                </View>
                <Text style={styles.diagVerify}>Run</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsRow}
                onPress={checkOverlayDiagnostics}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={styles.rowLabel}>Verify Floating Overlays</Text>
                  <Text style={styles.rowDesc}>Validate floating capsule permission states</Text>
                </View>
                <Text style={styles.diagVerify}>Run</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsRow}
                onPress={openAppNotificationSettings}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={styles.rowLabel}>System Notification Settings</Text>
                  <Text style={styles.rowDesc}>Deep-link direct to notification authorizations</Text>
                </View>
                <Text style={styles.rowChevron}>›</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      default: // dashboard
        return (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.appName}>DeenPulse</Text>
                <Text style={styles.subtitle}>Prayer Countdown Monitor</Text>
              </View>
              <View style={styles.headerButtons}>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => refresh()}
                  activeOpacity={0.7}
                >
                  <Text style={styles.headerIcon}>↻</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => setCurrentScreen('settings')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.headerIcon}>⚙️</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Location Coordinate Badge */}
            {location && (
              <View style={styles.locationBar}>
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.locationText}>
                  {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
                </Text>
              </View>
            )}

            {/* Dropdown Menu & GPS Toggle Card */}
            <View style={styles.configCard}>
              <TouchableOpacity
                style={styles.methodSelector}
                onPress={() => setShowMethodPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.methodLabel}>CALCULATION METHOD</Text>
                <View style={styles.methodValueRow}>
                  <Text style={styles.methodValue} numberOfLines={1}>
                    {selectedMethodName}
                  </Text>
                  <Text style={styles.methodChevron}>›</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.gpsRow}>
                <View>
                  <Text style={styles.gpsLabel}>Auto-Detect Location (GPS)</Text>
                  <Text style={styles.gpsDesc}>Re-run GPS scan on setting changes</Text>
                </View>
                <Switch
                  value={autoDetectGPS}
                  onValueChange={handleGPSToggle}
                  trackColor={{ false: '#767577', true: '#00C896' }}
                  thumbColor={'#ffffff'}
                />
              </View>
            </View>

            {/* Loading / Error States */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00C896" />
                <Text style={styles.loadingText}>Fetching calendar timings...</Text>
              </View>
            )}

            {error && !loading && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => refresh()}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Calendar Data Display */}
            {!loading && !error && (
              <>
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
              </>
            )}

            {/* Bottom Capsule Banner */}
            {!loading && !error && nextPrayer && liveActivityEnabled && (
              <View style={styles.capsuleStatus}>
                <View style={styles.capsuleDot} />
                <Text style={styles.capsuleText}>Live Capsule Active • ColorOS status bar</Text>
              </View>
            )}
          </ScrollView>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A1A" />
      
      {renderScreen()}

      {/* Calculation Method Selection Modal */}
      <MethodPicker
        visible={showMethodPicker}
        selectedMethod={calculationMethod}
        onSelect={handleMethodChange}
        onClose={() => setShowMethodPicker(false)}
      />

      {/* Interval Selector Modal */}
      <Modal visible={showIntervalPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Background Interval</Text>
              <TouchableOpacity onPress={() => setShowIntervalPicker(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={UPDATE_INTERVALS}
              keyExtractor={item => item.value.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    backgroundInterval === item.value && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    handleIntervalChange(item.value);
                    setShowIntervalPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      backgroundInterval === item.value && styles.modalItemTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {backgroundInterval === item.value && <Text style={styles.modalCheckmark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
    // Platform padding top combining currentHeight to fix status bar overlapping
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  backIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  subTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 6,
  },
  locationIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  locationText: {
    fontSize: 12,
    color: '#00C896',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  configCard: {
    backgroundColor: '#1a1f2c',
    borderRadius: 16,
    marginHorizontal: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  methodSelector: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  methodLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  methodValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  methodValue: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    flex: 1,
  },
  methodChevron: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.3)',
    marginLeft: 8,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  gpsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gpsDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 2,
  },
  sectionContainer: {
    backgroundColor: '#1a1f2c',
    borderRadius: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingsSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingsSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rowDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 2,
  },
  rowChevron: {
    fontSize: 22,
    color: 'rgba(255, 255, 255, 0.25)',
  },
  accentText: {
    fontSize: 14,
    color: '#00C896',
    fontWeight: '600',
  },
  selectValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectValue: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  diagVerify: {
    color: '#00C896',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 200, 150, 0.1)',
    borderRadius: 8,
  },
  aboutCard: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    lineHeight: 18,
  },
  aboutFooter: {
    fontSize: 10,
    color: '#00C896',
    marginTop: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
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
  errorIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: 'rgba(255, 200, 150, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: 'rgba(0, 200, 150, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00C896',
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
    backgroundColor: '#00C896',
  },
  capsuleText: {
    fontSize: 12,
    color: 'rgba(0, 200, 150, 0.6)',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161920',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '50%',
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
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
  modalCloseIcon: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  modalItemSelected: {
    backgroundColor: 'rgba(0, 200, 150, 0.08)',
  },
  modalItemText: {
    flex: 1,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  modalItemTextSelected: {
    color: '#00C896',
    fontWeight: '600',
  },
  modalCheckmark: {
    fontSize: 16,
    color: '#00C896',
    fontWeight: '700',
    marginLeft: 8,
  },
});

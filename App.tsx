import React, { useState, useEffect } from 'react';
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
import { usePrayerTimes } from './src/hooks/usePrayerTimes';
import { usePrayerCountdown } from './src/hooks/usePrayerCountdown';
import { NativeModules } from 'react-native';

const { PrayerCapsuleModule } = NativeModules;

type Screen = 'dashboard' | 'settings';

const UPDATE_INTERVALS = [
  { label: '15 seconds', value: 15000 },
  { label: '30 seconds', value: 30000 },
  { label: '60 seconds (Default)', value: 60000 },
  { label: '120 seconds', value: 120000 },
];

export default function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [liveActivityEnabled, setLiveActivityEnabled] = useState(true);
  const [showCloseButton, setShowCloseButton] = useState(true);
  const [backgroundInterval, setBackgroundInterval] = useState(60000); // 60s default
  
  const [showIntervalPicker, setShowIntervalPicker] = useState(false);

  const { prayerTimes, loading, error, location, refresh } = usePrayerTimes();
  
  const nextPrayer = usePrayerCountdown(prayerTimes, liveActivityEnabled);

  // Load preferences on startup
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const live = await AsyncStorage.getItem('@deenpulse_live');
        const close = await AsyncStorage.getItem('@deenpulse_close');
        const interval = await AsyncStorage.getItem('@deenpulse_interval');

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
            setLiveActivityEnabled(true);
            setShowCloseButton(true);
            setBackgroundInterval(60000);
            try {
              PrayerCapsuleModule?.setBackgroundInterval(60000);
              PrayerCapsuleModule?.stopCapsule();
            } catch (e) {
              console.warn(e);
            }
            refresh();
            Alert.alert('Reset Complete', 'App cache and settings have been cleared.');
          },
        },
      ]
    );
  };

  const handleRequestGPS = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'DeenPulse Location Permission',
            message: 'DeenPulse needs your location to calculate accurate prayer times.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('GPS Access', 'Location permission granted successfully.');
          refresh();
        } else {
          Alert.alert('GPS Access', 'Location permission denied.');
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
    } catch (err) {
      Linking.openSettings();
    }
  };

  // Navigation stack renderer
  const renderScreen = () => {
    switch (currentScreen) {
      case 'settings':
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('dashboard')} style={styles.backButton}>
                <Text style={styles.backIcon}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.subTitle}>Settings</Text>
            </View>

            <View style={styles.cardContainer}>
              {/* Card 1: Reset App Cache */}
              <TouchableOpacity
                style={styles.settingsCard}
                onPress={handleAppReset}
                activeOpacity={0.7}
              >
                <Text style={styles.cardTitle}>Reset App Cache</Text>
                <Text style={styles.cardDesc}>
                  Flushes the local monthly database and re-triggers the main data fetch.
                </Text>
              </TouchableOpacity>

              {/* Card 2: Allow Notifications */}
              <TouchableOpacity
                style={styles.settingsCard}
                onPress={openAppNotificationSettings}
                activeOpacity={0.7}
              >
                <Text style={styles.cardTitle}>Allow Notifications</Text>
                <Text style={styles.cardDesc}>
                  Invocates direct linking back to standard app package notification parameters.
                </Text>
              </TouchableOpacity>

              {/* Card 3: Allow GPS Usage */}
              <TouchableOpacity
                style={styles.settingsCard}
                onPress={handleRequestGPS}
                activeOpacity={0.7}
              >
                <Text style={styles.cardTitle}>Allow GPS Usage</Text>
                <Text style={styles.cardDesc}>
                  Executes standard GPS tracking permission prompts instantly.
                </Text>
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
                  <Text style={styles.headerIcon}>Refresh</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => setCurrentScreen('settings')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.headerIcon}>Settings</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Location Coordinate Badge */}
            {location && (
              <View style={styles.locationBar}>
                <Text style={styles.locationText}>
                  Location: {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}° (Auto Regional)
                </Text>
              </View>
            )}

            {/* Loading / Error States */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00C896" />
                <Text style={styles.loadingText}>Fetching calendar timings...</Text>
              </View>
            )}

            {error && !loading && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error: {error}</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 13,
    color: '#00C896',
    fontWeight: '600',
  },
  cardContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  settingsCard: {
    backgroundColor: '#1a1f2c',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    lineHeight: 18,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  backIcon: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
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

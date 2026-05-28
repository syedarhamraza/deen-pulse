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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid } from 'react-native';
import { CountdownDisplay } from './src/components/CountdownDisplay';
import { PrayerCard } from './src/components/PrayerCard';
import { usePrayerTimes } from './src/hooks/usePrayerTimes';
import { usePrayerCountdown } from './src/hooks/usePrayerCountdown';
import { NativeModules } from 'react-native';

const { PrayerCapsuleModule } = NativeModules;

type Screen = 'dashboard' | 'settings';

export default function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [locationMode, setLocationMode] = useState<'gps' | 'cached'>('gps');
  const [juristicMethod, setJuristicMethod] = useState<'standard' | 'hanafi'>('standard');
  const [calculationRule, setCalculationRule] = useState<'auto' | 'karachi' | 'isna'>('auto');

  const [showJuristicPicker, setShowJuristicPicker] = useState(false);
  const [showCalculationPicker, setShowCalculationPicker] = useState(false);

  const { prayerTimes, loading, error, location, refresh } = usePrayerTimes(
    locationMode,
    juristicMethod,
    calculationRule
  );

  const nextPrayer = usePrayerCountdown(prayerTimes, true);

  // Load settings on startup
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const mode = await AsyncStorage.getItem('@deenpulse_location_mode');
        const juristic = await AsyncStorage.getItem('@deenpulse_juristic_method');
        const rule = await AsyncStorage.getItem('@deenpulse_calculation_rule');

        if (mode !== null) setLocationMode(mode as 'gps' | 'cached');
        if (juristic !== null) setJuristicMethod(juristic as 'standard' | 'hanafi');
        if (rule !== null) setCalculationRule(rule as 'auto' | 'karachi' | 'isna');
      } catch (e) {
        console.warn('Failed to load settings:', e);
      }
    };
    loadSettings();
  }, []);

  const handleLocationModeChange = async (value: boolean) => {
    const newMode = value ? 'gps' : 'cached';
    setLocationMode(newMode);
    await AsyncStorage.setItem('@deenpulse_location_mode', newMode);
  };

  const handleAppReset = async () => {
    Alert.alert(
      'Reset App Cache',
      'Wipes out local database and forces a fresh GPS positioning and API network fetch loop.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              setLocationMode('gps');
              setJuristicMethod('standard');
              setCalculationRule('auto');
              try {
                PrayerCapsuleModule?.stopCapsule();
              } catch (e) {
                console.warn(e);
              }
              // The settings change will auto-trigger fresh GPS & fetch in hook.
              Alert.alert('Reset Complete', 'Cache cleared. Performing fresh GPS lookup.');
            } catch (e) {
              console.warn(e);
            }
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
            title: 'Location Permission Required',
            message: 'DeenPulse requires device location to calculate correct prayer times.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Location Access', 'GPS permission granted.');
          refresh();
        } else {
          Alert.alert('Location Access', 'GPS permission denied.');
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

  const getJuristicLabel = () => {
    return juristicMethod === 'standard' ? 'Standard (Shafi\'i, Maliki, Hanbali)' : 'Hanafi';
  };

  const getCalculationLabel = () => {
    if (calculationRule === 'auto') return 'Auto-Detect by Region';
    if (calculationRule === 'karachi') return 'University of Islamic Sciences, Karachi';
    return 'Islamic Society of North America (ISNA)';
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'settings':
        return (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('dashboard')} style={styles.backButton}>
                <Text style={styles.backIcon}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.subTitle}>Settings</Text>
            </View>

            <View style={styles.cardContainer}>
              {/* Card 1: Location Mode */}
              <View style={styles.settingsCard}>
                <View style={styles.cardRow}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>Location Mode</Text>
                    <Text style={styles.cardDesc}>
                      {locationMode === 'gps' ? 'Auto-Detect Location (GPS)' : 'Use Cached Location'}
                    </Text>
                  </View>
                  <Switch
                    value={locationMode === 'gps'}
                    onValueChange={handleLocationModeChange}
                    trackColor={{ false: '#2A2E3D', true: '#00C896' }}
                    thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                  />
                </View>
              </View>

              {/* Card 2: Juristic Method (Asr) */}
              <TouchableOpacity
                style={styles.settingsCard}
                onPress={() => setShowJuristicPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.cardTitle}>Juristic Method (Asr)</Text>
                <Text style={styles.cardValue}>{getJuristicLabel()}</Text>
                <Text style={styles.cardDesc}>Tap to select standard Shafi'i/Maliki/Hanbali or Hanafi math rules.</Text>
              </TouchableOpacity>

              {/* Card 3: Calculation Rule */}
              <TouchableOpacity
                style={styles.settingsCard}
                onPress={() => setShowCalculationPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.cardTitle}>Calculation Rule</Text>
                <Text style={styles.cardValue}>{getCalculationLabel()}</Text>
                <Text style={styles.cardDesc}>Select the calculation standard rules for timings.</Text>
              </TouchableOpacity>

              {/* Card 4: Reset App Cache */}
              <TouchableOpacity
                style={styles.settingsCard}
                onPress={handleAppReset}
                activeOpacity={0.7}
              >
                <Text style={styles.cardTitle}>Reset App Cache</Text>
                <Text style={styles.cardDesc}>
                  Instantly wipes out the local AsyncStorage database and forces fresh GPS positioning and network loop.
                </Text>
              </TouchableOpacity>

              {/* Card 5: Allow Notifications */}
              <TouchableOpacity
                style={styles.settingsCard}
                onPress={openAppNotificationSettings}
                activeOpacity={0.7}
              >
                <Text style={styles.cardTitle}>Allow Notifications</Text>
                <Text style={styles.cardDesc}>
                  Deep-links directly to the native app package notification settings toggle panel.
                </Text>
              </TouchableOpacity>

              {/* Card 6: Allow GPS Usage */}
              <TouchableOpacity
                style={styles.settingsCard}
                onPress={handleRequestGPS}
                activeOpacity={0.7}
              >
                <Text style={styles.cardTitle}>Allow GPS Usage</Text>
                <Text style={styles.cardDesc}>
                  Triggers standard system tracking permission dialog prompt.
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
                  Location: {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
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
              <View style={styles.dashboardContainer}>
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
                <View style={styles.capsuleDot} />
                <Text style={styles.capsuleText}>Ongoing Notification Active</Text>
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

      {/* Juristic Method Picker Modal */}
      <Modal visible={showJuristicPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Juristic Method (Asr)</Text>
              <TouchableOpacity onPress={() => setShowJuristicPicker(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.modalItem,
                juristicMethod === 'standard' && styles.modalItemSelected,
              ]}
              onPress={async () => {
                setJuristicMethod('standard');
                await AsyncStorage.setItem('@deenpulse_juristic_method', 'standard');
                setShowJuristicPicker(false);
              }}
            >
              <Text style={[
                styles.modalItemText,
                juristicMethod === 'standard' && styles.modalItemTextSelected,
              ]}>Standard (Shafi'i, Maliki, Hanbali)</Text>
              {juristicMethod === 'standard' && <Text style={styles.modalCheckmark}>✓</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalItem,
                juristicMethod === 'hanafi' && styles.modalItemSelected,
              ]}
              onPress={async () => {
                setJuristicMethod('hanafi');
                await AsyncStorage.setItem('@deenpulse_juristic_method', 'hanafi');
                setShowJuristicPicker(false);
              }}
            >
              <Text style={[
                styles.modalItemText,
                juristicMethod === 'hanafi' && styles.modalItemTextSelected,
              ]}>Hanafi</Text>
              {juristicMethod === 'hanafi' && <Text style={styles.modalCheckmark}>✓</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Calculation Rule Picker Modal */}
      <Modal visible={showCalculationPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calculation Rule</Text>
              <TouchableOpacity onPress={() => setShowCalculationPicker(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.modalItem,
                calculationRule === 'auto' && styles.modalItemSelected,
              ]}
              onPress={async () => {
                setCalculationRule('auto');
                await AsyncStorage.setItem('@deenpulse_calculation_rule', 'auto');
                setShowCalculationPicker(false);
              }}
            >
              <Text style={[
                styles.modalItemText,
                calculationRule === 'auto' && styles.modalItemTextSelected,
              ]}>Auto-Detect by Region</Text>
              {calculationRule === 'auto' && <Text style={styles.modalCheckmark}>✓</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalItem,
                calculationRule === 'karachi' && styles.modalItemSelected,
              ]}
              onPress={async () => {
                setCalculationRule('karachi');
                await AsyncStorage.setItem('@deenpulse_calculation_rule', 'karachi');
                setShowCalculationPicker(false);
              }}
            >
              <Text style={[
                styles.modalItemText,
                calculationRule === 'karachi' && styles.modalItemTextSelected,
              ]}>University of Islamic Sciences, Karachi</Text>
              {calculationRule === 'karachi' && <Text style={styles.modalCheckmark}>✓</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalItem,
                calculationRule === 'isna' && styles.modalItemSelected,
              ]}
              onPress={async () => {
                setCalculationRule('isna');
                await AsyncStorage.setItem('@deenpulse_calculation_rule', 'isna');
                setShowCalculationPicker(false);
              }}
            >
              <Text style={[
                styles.modalItemText,
                calculationRule === 'isna' && styles.modalItemTextSelected,
              ]}>Islamic Society of North America (ISNA)</Text>
              {calculationRule === 'isna' && <Text style={styles.modalCheckmark}>✓</Text>}
            </TouchableOpacity>
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
  dashboardContainer: {
    backgroundColor: '#1a1f2c',
    borderRadius: 16,
    marginHorizontal: 20,
    paddingVertical: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
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
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardInfo: {
    flex: 1,
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 14,
    color: '#00C896',
    fontWeight: '600',
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
  locationText: {
    fontSize: 12,
    color: '#00C896',
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

import React, { useState, useEffect } from 'react';
import {
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
  Modal,
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

type Screen = 'dashboard' | 'settings' | 'prayer_rules' | 'notifications' | 'data_management' | 'about';

interface CustomAlertConfig {
  visible: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
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

  const [showJuristicPicker, setShowJuristicPicker] = useState(false);
  const [showCalculationPicker, setShowCalculationPicker] = useState(false);

  // Custom alert modal config
  const [alertConfig, setAlertConfig] = useState<CustomAlertConfig>({
    visible: false,
    title: '',
    message: '',
  });

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
        setAlertConfig(prev => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: onCancel ? () => {
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
      () => {},
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
                <Icon name="arrow-left" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.subTitle}>Settings</Text>
            </View>

            <View style={styles.cardContainer}>
              {/* Row 1: Prayer Rules */}
              <TouchableOpacity
                style={styles.settingsRowCard}
                onPress={() => setCurrentScreen('prayer_rules')}
                activeOpacity={0.7}
              >
                <Icon name="book-open" size={20} color="#00C896" style={styles.rowIcon} />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>Prayer Rules</Text>
                  <Text style={styles.rowDesc}>Juristic settings and calculation methods</Text>
                </View>
                <Icon name="chevron-right" size={18} color="rgba(255, 255, 255, 0.3)" />
              </TouchableOpacity>

              {/* Row 2: Notifications */}
              <TouchableOpacity
                style={styles.settingsRowCard}
                onPress={() => setCurrentScreen('notifications')}
                activeOpacity={0.7}
              >
                <Icon name="bell" size={20} color="#00C896" style={styles.rowIcon} />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>Notifications</Text>
                  <Text style={styles.rowDesc}>Configure system alert permissions</Text>
                </View>
                <Icon name="chevron-right" size={18} color="rgba(255, 255, 255, 0.3)" />
              </TouchableOpacity>

              {/* Row 3: Data Management */}
              <TouchableOpacity
                style={styles.settingsRowCard}
                onPress={() => setCurrentScreen('data_management')}
                activeOpacity={0.7}
              >
                <Icon name="database" size={20} color="#00C896" style={styles.rowIcon} />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>Data Management</Text>
                  <Text style={styles.rowDesc}>Storage, cache, and GPS positioning</Text>
                </View>
                <Icon name="chevron-right" size={18} color="rgba(255, 255, 255, 0.3)" />
              </TouchableOpacity>

              {/* Row 4: About DeenPulse */}
              <TouchableOpacity
                style={styles.settingsRowCard}
                onPress={() => setCurrentScreen('about')}
                activeOpacity={0.7}
              >
                <Icon name="info" size={20} color="#00C896" style={styles.rowIcon} />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>About DeenPulse</Text>
                  <Text style={styles.rowDesc}>App information and credits</Text>
                </View>
                <Icon name="chevron-right" size={18} color="rgba(255, 255, 255, 0.3)" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      case 'prayer_rules':
        return (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('settings')} style={styles.backButton}>
                <Icon name="arrow-left" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.subTitle}>Prayer Rules</Text>
            </View>

            <View style={styles.cardContainer}>
              {/* Card 1: Juristic Method */}
              <TouchableOpacity
                style={styles.menuDetailCard}
                onPress={() => setShowJuristicPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.menuDetailLabel}>Juristic Method (Asr)</Text>
                <Text style={styles.menuDetailValue}>{getJuristicLabel()}</Text>
                <Text style={styles.menuDetailDesc}>Select Standard (Shafi'i, Maliki, Hanbali) or Hanafi school rules.</Text>
              </TouchableOpacity>

              {/* Card 2: Calculation Rule */}
              <TouchableOpacity
                style={styles.menuDetailCard}
                onPress={() => setShowCalculationPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.menuDetailLabel}>Calculation Rule</Text>
                <Text style={styles.menuDetailValue}>{getCalculationLabel()}</Text>
                <Text style={styles.menuDetailDesc}>Choose calculation method rules for regional timing math offsets.</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      case 'notifications':
        return (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('settings')} style={styles.backButton}>
                <Icon name="arrow-left" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.subTitle}>Notifications</Text>
            </View>

            <View style={styles.cardContainer}>
              <TouchableOpacity
                style={styles.menuDetailCard}
                onPress={openAppNotificationSettings}
                activeOpacity={0.7}
              >
                <Text style={styles.menuDetailLabel}>Allow Notifications</Text>
                <Text style={styles.menuDetailDesc}>
                  Deep-links directly to the native Android OS system app notification settings panel to toggle alerts.
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      case 'data_management':
        return (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('settings')} style={styles.backButton}>
                <Icon name="arrow-left" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.subTitle}>Data Management</Text>
            </View>

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
                    onValueChange={handleLocationModeChange}
                    trackColor={{ false: '#2A2E3D', true: '#00C896' }}
                    thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                  />
                </View>
              </View>

              {/* Force GPS Permission Request */}
              <TouchableOpacity
                style={styles.menuDetailCard}
                onPress={handleRequestGPS}
                activeOpacity={0.7}
              >
                <Text style={styles.menuDetailLabel}>Request GPS Permission</Text>
                <Text style={styles.menuDetailDesc}>
                  Manually trigger system location permission dialog to authorize GPS coordinates tracking.
                </Text>
              </TouchableOpacity>

              {/* Reset Cache / Reset History */}
              <TouchableOpacity
                style={[styles.menuDetailCard, styles.destructiveBorder]}
                onPress={handleAppReset}
                activeOpacity={0.7}
              >
                <Text style={[styles.menuDetailLabel, styles.destructiveText]}>Clear Cache / Reset History</Text>
                <Text style={styles.menuDetailDesc}>
                  Wipes out all stored calculation rules, caching tables, and restarts positioning loop.
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      case 'about':
        return (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('settings')} style={styles.backButton}>
                <Icon name="arrow-left" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.subTitle}>About</Text>
            </View>

            <View style={styles.cardContainer}>
              {/* Highlight header block */}
              <View style={styles.aboutHeaderBlock}>
                <Text style={styles.aboutBranding}>DeenPulse</Text>
                <Text style={styles.aboutTagline}>Live tracking on your status bar</Text>
              </View>

              {/* Basic information card */}
              <View style={styles.menuDetailCard}>
                <Text style={styles.aboutSectionTitle}>Basic Information</Text>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>App Name</Text>
                  <Text style={styles.infoVal}>DeenPulse</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Author</Text>
                  <Text style={styles.infoVal}>Syed Arham Raza</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Version</Text>
                  <Text style={styles.infoVal}>1.1.0</Text>
                </View>
              </View>
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
                  <Icon name="refresh-cw" size={16} color="#00C896" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => setCurrentScreen('settings')}
                  activeOpacity={0.7}
                >
                  <Icon name="settings" size={16} color="#00C896" />
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {renderScreen()}

      {/* Juristic Method Picker Modal */}
      <Modal visible={showJuristicPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Juristic Method (Asr)</Text>
              <TouchableOpacity onPress={() => setShowJuristicPicker(false)} style={styles.modalCloseBtn}>
                <Icon name="x" size={16} color="rgba(255, 255, 255, 0.6)" />
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
              {juristicMethod === 'standard' && <Icon name="check" size={16} color="#00C896" />}
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
              {juristicMethod === 'hanafi' && <Icon name="check" size={16} color="#00C896" />}
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
                <Icon name="x" size={16} color="rgba(255, 255, 255, 0.6)" />
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
              {calculationRule === 'auto' && <Icon name="check" size={16} color="#00C896" />}
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
              {calculationRule === 'karachi' && <Icon name="check" size={16} color="#00C896" />}
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
              {calculationRule === 'isna' && <Icon name="check" size={16} color="#00C896" />}
            </TouchableOpacity>
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
                <TouchableOpacity
                  style={[styles.alertButton, styles.alertButtonCancel]}
                  onPress={alertConfig.onCancel}
                >
                  <Text style={styles.alertButtonTextCancel}>{alertConfig.cancelText || 'Cancel'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.alertButton,
                  alertConfig.confirmText === 'RESET' ? styles.alertButtonDestructive : styles.alertButtonConfirm
                ]}
                onPress={alertConfig.onConfirm}
              >
                <Text style={styles.alertButtonTextConfirm}>{alertConfig.confirmText || 'OK'}</Text>
              </TouchableOpacity>
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
    backgroundColor: '#0A0A1A',
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
    gap: 12,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
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
  settingsRowCard: {
    backgroundColor: '#1a1f2c',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
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
    backgroundColor: '#1a1f2c',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuDetailLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  menuDetailValue: {
    fontSize: 14,
    color: '#00C896',
    fontWeight: '600',
    marginBottom: 6,
  },
  menuDetailDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    lineHeight: 18,
  },
  destructiveBorder: {
    borderColor: 'rgba(235, 87, 87, 0.2)',
  },
  destructiveText: {
    color: '#EB5757',
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
    marginBottom: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    width: '100%',
    paddingBottom: 34,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    margin: 0,
    bottom: 0,
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
    backgroundColor: 'rgba(0, 200, 150, 0.06)',
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
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    backgroundColor: '#1f2538',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
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
    backgroundColor: 'rgba(0, 200, 150, 0.15)',
  },
  alertButtonDestructive: {
    backgroundColor: 'rgba(235, 87, 87, 0.15)',
  },
  alertButtonTextCancel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  alertButtonTextConfirm: {
    color: '#00C896',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  aboutHeaderBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
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
});

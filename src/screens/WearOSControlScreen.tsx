import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  NativeModules,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { triggerHaptic } from '../../App';
import { ColorOSSwitch } from '../components/ColorOSSwitch';
import { useWearConnection, LAST_WEAR_SYNC_KEY } from '../hooks/useWearConnection';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { PrayerCapsuleModule } = NativeModules;

const AUTO_SYNC_WEAR_KEY = '@deenpulse_auto_sync_wear';
const SYNC_SETTINGS_TO_WEAR_KEY = '@deenpulse_sync_settings_to_wear';

interface WearOSControlScreenProps {
  onBack: () => void;
}

export function WearOSControlScreen({ onBack }: WearOSControlScreenProps) {
  const { isConnected, watchName, lastSyncTime, refreshSyncTime } = useWearConnection();

  const [autoSync, setAutoSync] = useState(true);
  const [syncSettings, setSyncSettings] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [troubleOpen, setTroubleOpen] = useState(false);

  useEffect(() => {
    async function loadPrefs() {
      try {
        const auto = await AsyncStorage.getItem(AUTO_SYNC_WEAR_KEY);
        const settings = await AsyncStorage.getItem(SYNC_SETTINGS_TO_WEAR_KEY);
        if (auto !== null) setAutoSync(auto === 'true');
        if (settings !== null) setSyncSettings(settings === 'true');
      } catch (e) {
        console.warn('Failed to load wear sync preferences', e);
      }
    }
    loadPrefs();
  }, []);

  const handleToggleAutoSync = async (val: boolean) => {
    triggerHaptic();
    setAutoSync(val);
    await AsyncStorage.setItem(AUTO_SYNC_WEAR_KEY, val ? 'true' : 'false');
  };

  const handleToggleSyncSettings = async (val: boolean) => {
    triggerHaptic();
    setSyncSettings(val);
    await AsyncStorage.setItem(SYNC_SETTINGS_TO_WEAR_KEY, val ? 'true' : 'false');
  };

  const handleSyncNow = async () => {
    triggerHaptic();
    setSyncing(true);
    setSyncError(null);
    setSyncSuccess(false);

    try {
      const prayersJson = await AsyncStorage.getItem('@deenpulse_last_prayers_json');
      const latStr = await AsyncStorage.getItem('@deenpulse_cached_lat');
      const lngStr = await AsyncStorage.getItem('@deenpulse_cached_lng');

      if (!prayersJson || !latStr || !lngStr) {
        throw new Error('No prayer timings or location coordinates cached on this phone. Refresh phone timings first.');
      }

      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      if (PrayerCapsuleModule?.syncToWear) {
        await PrayerCapsuleModule.syncToWear(prayersJson, lat, lng);
        
        // Wait a brief moment to simulate/allow completion
        setTimeout(async () => {
          const timestamp = new Date().toISOString();
          await AsyncStorage.setItem(LAST_WEAR_SYNC_KEY, timestamp);
          refreshSyncTime();
          setSyncing(false);
          setSyncSuccess(true);
          triggerHaptic();
          setTimeout(() => setSyncSuccess(false), 3000);
        }, 1500);
      } else {
        throw new Error('Native sync module is not available.');
      }
    } catch (e: any) {
      setSyncing(false);
      setSyncError(e.message || 'Sync failed.');
    }
  };

  const formatTimestamp = (isoString: string | null) => {
    if (!isoString) return 'Never';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Never';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            triggerHaptic();
            onBack();
          }}
          style={({ pressed }) => [styles.backButton, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
        >
          <Icon name="arrow-left" size={20} color="#00E8A2" />
        </Pressable>
        <Text style={styles.title}>Watch Companion</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Connection Card */}
        <View style={[styles.statusCard, isConnected ? styles.statusCardConnected : styles.statusCardDisconnected]}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIndicatorWrapper}>
              <View style={[styles.statusDot, isConnected ? styles.statusDotConnected : styles.statusDotDisconnected]} />
              <Text style={[styles.statusText, { color: isConnected ? '#00E8A2' : '#FF6B6B' }]}>
                {isConnected ? 'Connected' : 'Not Connected'}
              </Text>
            </View>
            <Icon name="watch" size={28} color={isConnected ? '#00E8A2' : 'rgba(255,255,255,0.4)'} />
          </View>
          <Text style={styles.watchName}>
            {isConnected ? watchName || 'Galaxy Watch / Wear OS' : 'No companion watch active'}
          </Text>
          <Text style={styles.syncTime}>
            Last Synced: <Text style={{ color: '#fff', fontWeight: '600' }}>{formatTimestamp(lastSyncTime)}</Text>
          </Text>
        </View>

        {/* Action Button */}
        <Pressable
          style={({ pressed }) => [
            styles.syncButton,
            (!isConnected || syncing) && styles.syncButtonDisabled,
            { opacity: pressed ? 0.9 : 1 },
          ]}
          disabled={!isConnected || syncing}
          onPress={handleSyncNow}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#000" />
          ) : syncSuccess ? (
            <View style={styles.syncButtonInner}>
              <Icon name="check" size={16} color="#000" />
              <Text style={styles.syncButtonText}>Synced Successfully</Text>
            </View>
          ) : (
            <View style={styles.syncButtonInner}>
              <Icon name="refresh-cw" size={16} color="#000" />
              <Text style={styles.syncButtonText}>Sync Timing to Watch</Text>
            </View>
          )}
        </Pressable>

        {syncError && <Text style={styles.errorText}>{syncError}</Text>}

        {/* Settings List */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionLabel}>Preferences</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-Sync on Refresh</Text>
              <Text style={styles.settingDesc}>
                Pushes new timings to the watch automatically when phone coordinates refresh.
              </Text>
            </View>
            <ColorOSSwitch
              value={autoSync}
              onValueChange={handleToggleAutoSync}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Sync Calculation Settings</Text>
              <Text style={styles.settingDesc}>
                Keeps Juristic Method and Asr calculation rules synchronized between phone and watch.
              </Text>
            </View>
            <ColorOSSwitch
              value={syncSettings}
              onValueChange={handleToggleSyncSettings}
            />
          </View>
        </View>

        {/* Troubleshooting Section */}
        <Pressable
          style={styles.troubleCard}
          onPress={() => {
            triggerHaptic();
            setTroubleOpen(!troubleOpen);
          }}
        >
          <View style={styles.troubleHeader}>
            <View style={styles.troubleTitleCol}>
              <Icon name="help-circle" size={18} color="#00E8A2" />
              <Text style={styles.troubleTitle}>Troubleshooting Sync Issues</Text>
            </View>
            <Icon name={troubleOpen ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.4)" />
          </View>

          {troubleOpen && (
            <View style={styles.troubleContent}>
              <View style={styles.divider} />
              <Text style={styles.troubleParagraph}>
                1. Make sure your watch is powered on and connected to this phone via Bluetooth (check Galaxy Wearable or Pixel Watch app).
              </Text>
              <Text style={styles.troubleParagraph}>
                2. Install the DeenPulse companion watch app on your Wear OS watch from the Google Play Store.
              </Text>
              <Text style={styles.troubleParagraph}>
                3. Open the watch app. It will show "Waiting for Sync". Press "Sync Now" on this page to force timing updates.
              </Text>
            </View>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080B14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 232, 162, 0.15)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statusCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
  },
  statusCardConnected: {
    backgroundColor: '#102931',
    borderColor: '#00E8A2',
    shadowColor: '#00E8A2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  statusCardDisconnected: {
    backgroundColor: '#121624',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotConnected: {
    backgroundColor: '#00E8A2',
  },
  statusDotDisconnected: {
    backgroundColor: '#FF6B6B',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  watchName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  syncTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  syncButton: {
    backgroundColor: '#00E8A2',
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  syncButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  syncButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  settingsSection: {
    backgroundColor: '#121624',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 15,
  },
  troubleCard: {
    backgroundColor: '#121624',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  troubleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  troubleTitleCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  troubleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  troubleContent: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
  },
  troubleParagraph: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
    marginBottom: 10,
  },
});

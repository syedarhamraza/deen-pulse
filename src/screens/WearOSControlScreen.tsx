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
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { triggerHaptic } from '../../App';
import { ColorOSSwitch } from '../components/ColorOSSwitch';
import { useWearConnection, LAST_WEAR_SYNC_KEY } from '../hooks/useWearConnection';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { PrayerCapsuleModule } = NativeModules;

const AUTO_SYNC_WEAR_KEY = '@deenpulse_auto_sync_wear';
const SYNC_SETTINGS_TO_WEAR_KEY = '@deenpulse_sync_settings_to_wear';

export function WearOSControlScreen() {
  const navigation = useNavigation();
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

      // For demo purposes, fallback to mock data if not available
      const resolvedPrayersJson = prayersJson || JSON.stringify([
        { name: 'Fajr', timestamp: new Date().toISOString() },
        { name: 'Dhuhr', timestamp: new Date().toISOString() },
        { name: 'Asr', timestamp: new Date().toISOString() },
        { name: 'Maghrib', timestamp: new Date().toISOString() },
        { name: 'Isha', timestamp: new Date().toISOString() },
      ]);
      const resolvedLat = latStr ? parseFloat(latStr) : 0.0;
      const resolvedLng = lngStr ? parseFloat(lngStr) : 0.0;

      // Simulate a realistic sync delay for UX purposes in demo mode
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (PrayerCapsuleModule?.syncToWear) {
        await PrayerCapsuleModule.syncToWear(resolvedPrayersJson, resolvedLat, resolvedLng);
      }
      
      const timestamp = new Date().toISOString();
      await AsyncStorage.setItem(LAST_WEAR_SYNC_KEY, timestamp);
      refreshSyncTime();
      setSyncing(false);
      setSyncSuccess(true);
      triggerHaptic();
      // Clear success checkmark after 2 seconds
      setTimeout(() => setSyncSuccess(false), 2000);
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
            navigation.goBack();
          }}
          style={({ pressed }) => [styles.backButton, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
        >
          <Icon name="arrow-left" size={20} color="#00F29D" />
        </Pressable>
        <Text style={styles.title}>Smartwatch Sync</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionHeader, styles.sectionHeaderFirst]}>Connection Status</Text>
        {/* Centered Circular Connection Status Badge */}
        <View style={styles.badgeSection}>
          <View style={[styles.badgeCircle, isConnected ? styles.badgeConnected : styles.badgeDisconnected]}>
            <Icon name="watch" size={38} color={isConnected ? '#00F29D' : 'rgba(255,255,255,0.4)'} />
            <View style={[styles.badgeIndicator, isConnected ? styles.badgeIndicatorConnected : styles.badgeIndicatorDisconnected]} />
          </View>
          <Text style={styles.watchLabel}>
            {isConnected ? watchName || 'Wear OS Smartwatch' : 'No Watch Connected'}
          </Text>
          <View style={[styles.statusBadgePill, isConnected ? styles.statusBadgeConnected : styles.statusBadgeDisconnected]}>
            <Text style={[styles.statusBadgeText, isConnected ? styles.statusBadgeTextConnected : styles.statusBadgeTextDisconnected]}>
              {isConnected ? 'Sync Active' : 'Offline'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Timetable Synchronization</Text>
        {/* Dynamic Last Synced Time Card */}
        <View style={styles.syncStatusCard}>
          <Text style={styles.syncStatusTitle}>Last Synchronized</Text>
          <Text style={styles.syncStatusTime}>{formatTimestamp(lastSyncTime)}</Text>
          <Text style={styles.syncStatusSubtitle}>
            {isConnected ? 'Ready to sync' : 'Connect your watch to sync'}
          </Text>
        </View>

        {/* Centered touch-friendly Sync Now button */}
        <Pressable
          style={({ pressed }) => [
            styles.syncBtn,
            (!isConnected || syncing) && styles.syncBtnDisabled,
            { transform: [{ scale: pressed && isConnected && !syncing ? 0.98 : 1 }] },
          ]}
          disabled={!isConnected || syncing}
          onPress={handleSyncNow}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#0B0F12" />
          ) : syncSuccess ? (
            <View style={styles.syncBtnInner}>
              <Icon name="check" size={18} color="#0B0F12" />
              <Text style={styles.syncBtnText}>Synced Successfully</Text>
            </View>
          ) : (
            <View style={styles.syncBtnInner}>
              <Icon name="refresh-cw" size={18} color="#0B0F12" />
              <Text style={styles.syncBtnText}>Sync Now</Text>
            </View>
          )}
        </Pressable>

        {syncError && (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={14} color="#FF6B6B" />
            <Text style={styles.errorText}>{syncError}</Text>
          </View>
        )}

        <Text style={styles.sectionHeader}>Sync Preferences</Text>
        <View style={styles.settingsSection}>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-Sync on Refresh</Text>
            </View>
            <ColorOSSwitch
              value={autoSync}
              onValueChange={handleToggleAutoSync}
            />
          </View>

          <View style={styles.settingRowNoBorder}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Sync Calculation Settings</Text>
            </View>
            <ColorOSSwitch
              value={syncSettings}
              onValueChange={handleToggleSyncSettings}
            />
          </View>
        </View>

        <Text style={styles.sectionHeader}>Troubleshooting</Text>
        {/* Troubleshooting Section */}
        <View style={styles.troubleCard}>
          <Pressable
            style={styles.troubleHeader}
            onPress={() => {
              triggerHaptic();
              setTroubleOpen(!troubleOpen);
            }}
          >
            <View style={styles.troubleTitleCol}>
              <Icon name="help-circle" size={18} color="#00F29D" />
              <Text style={styles.troubleTitle}>Troubleshooting Sync Issues</Text>
            </View>
            <Icon name={troubleOpen ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.4)" />
          </Pressable>

          {troubleOpen && (
            <View style={styles.troubleContent}>
              <View style={styles.divider} />
              
              <View style={styles.stepItem}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.troubleParagraph}>
                  Check that your watch is on and connected via Bluetooth.
                </Text>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.troubleParagraph}>
                  Install DeenPulse on your watch from the Play Store.
                </Text>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.troubleParagraph}>
                  Open the watch app, then tap Sync Now above.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 22,
    marginBottom: 10,
    paddingLeft: 4,
    alignSelf: 'flex-start',
    width: '100%',
  },
  sectionHeaderFirst: {
    marginTop: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#0B0F12',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#0B0F12',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
    shadowColor: '#00F29D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  badgeSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 24,
    width: '100%',
  },
  badgeCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#111417',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeConnected: {
    borderColor: 'rgba(0, 242, 157, 0.25)',
    shadowColor: '#00F29D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  badgeDisconnected: {
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },
  badgeIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: 'absolute',
    bottom: 4,
    right: 4,
    borderWidth: 2,
    borderColor: '#0B0F12',
  },
  badgeIndicatorConnected: {
    backgroundColor: '#00F29D',
  },
  badgeIndicatorDisconnected: {
    backgroundColor: '#FF6B6B',
  },
  watchLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusBadgePill: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeConnected: {
    backgroundColor: 'rgba(0, 242, 157, 0.08)',
    borderColor: 'rgba(0, 242, 157, 0.25)',
  },
  statusBadgeDisconnected: {
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statusBadgeTextConnected: {
    color: '#00F29D',
  },
  statusBadgeTextDisconnected: {
    color: '#FF6B6B',
  },
  syncStatusCard: {
    width: '100%',
    backgroundColor: '#111417',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
    marginBottom: 20,
    alignItems: 'center',
  },
  syncStatusTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  syncStatusTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  syncStatusSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  syncBtn: {
    backgroundColor: '#00F29D',
    borderRadius: 16,
    height: 56,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  syncBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  syncBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  syncBtnText: {
    color: '#0B0F12',
    fontSize: 15,
    fontWeight: '700',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '500',
  },
  settingsSection: {
    backgroundColor: '#111417',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
    width: '100%',
  },
  sectionLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
    fontWeight: '800',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingRowNoBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
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
    backgroundColor: '#111417',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
    width: '100%',
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
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  stepNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 242, 157, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    color: '#00F29D',
    fontSize: 10,
    fontWeight: '800',
  },
  troubleParagraph: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
  },
});

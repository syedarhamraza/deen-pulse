import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Platform, PermissionsAndroid, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { triggerHaptic, HeaderFadeOverlay } from '../../App';
import { ColorOSSwitch } from '../components/ColorOSSwitch';

interface DataManagementScreenProps {
  onBack: () => void;
  locationMode: 'gps' | 'cached';
  onLocationModeChange: (val: boolean) => void;
  onRequestGPS: () => void;
  onClearCacheReset: () => void;
}

export function DataManagementScreen({
  onBack,
  locationMode,
  onLocationModeChange,
  onRequestGPS,
  onClearCacheReset,
}: DataManagementScreenProps) {
  const [gpsGranted, setGpsGranted] = useState<boolean | null>(null);

  const checkGPSPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        setGpsGranted(hasPermission);
      } catch (err) {
        console.warn('Failed to check GPS permission:', err);
        setGpsGranted(false);
      }
    } else {
      setGpsGranted(true);
    }
  };

  useEffect(() => {
    checkGPSPermission();
  }, []);

  const handleRequestGPS = async () => {
    triggerHaptic();
    onRequestGPS();
    // Re-verify the permission status after a brief delay to allow the user to accept/deny
    setTimeout(() => {
      checkGPSPermission();
    }, 1200);
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
          <Icon name="arrow-left" size={20} color="#00F29D" />
        </Pressable>
        <Text style={styles.title}>Data Management</Text>
        <HeaderFadeOverlay />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.cardContainer}>
          {/* Location Mode */}
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.cardLabel}>Location Mode</Text>
                <Text style={styles.cardDesc}>
                  {locationMode === 'gps'
                    ? 'Auto-Detect Location (GPS)'
                    : 'Use Static Cached Coordinates'}
                </Text>
              </View>
              <ColorOSSwitch
                value={locationMode === 'gps'}
                onValueChange={(val) => {
                  triggerHaptic();
                  onLocationModeChange(val);
                }}
              />
            </View>
          </View>

          {/* Force GPS Permission Request */}
          <Pressable
            style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={handleRequestGPS}
          >
            <View style={styles.rowLayout}>
              <View style={styles.infoLayout}>
                <Text style={styles.cardLabel}>GPS Location Permission</Text>
                <Text style={styles.cardDesc}>
                  Manually trigger system location authorization settings for accurate local calculations.
                </Text>
              </View>
              {gpsGranted !== null && (
                <View
                  style={[
                    styles.statusBadge,
                    gpsGranted ? styles.statusBadgeGranted : styles.statusBadgeDenied,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      gpsGranted ? styles.statusDotGranted : styles.statusDotDenied,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: gpsGranted ? '#00F29D' : '#FF6B6B' },
                    ]}
                  >
                    {gpsGranted ? 'Active' : 'Setup'}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>

          {/* Reset Cache / Reset History */}
          <Pressable
            style={({ pressed }) => [
              styles.card,
              styles.destructiveBorder,
              { transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
            onPress={() => {
              triggerHaptic();
              onClearCacheReset();
            }}
          >
            <Text style={[styles.cardLabel, styles.destructiveText]}>
              Clear Cache & App Reset
            </Text>
            <Text style={styles.cardDesc}>
              Wipes out all stored calculation rules, cached locations, and restarts the initial setup wizard.
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
  cardContainer: {
    gap: 12,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#111417',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
  },
  destructiveBorder: {
    borderColor: 'rgba(255, 107, 107, 0.25)',
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
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    lineHeight: 18,
  },
  rowLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoLayout: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
  },
  statusBadgeGranted: {
    backgroundColor: 'rgba(0, 242, 157, 0.08)',
    borderColor: 'rgba(0, 242, 157, 0.2)',
  },
  statusBadgeDenied: {
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotGranted: {
    backgroundColor: '#00F29D',
  },
  statusDotDenied: {
    backgroundColor: '#FF6B6B',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

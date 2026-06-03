import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  NativeModules,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { triggerHaptic } from '../../App';
import {
  getProfileFromStorage,
  DeviceProfile,
  FORCE_LIVE_NOTIFICATION_KEY,
} from '../utils/deviceProfiles';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { PrayerCapsuleModule } = NativeModules;

interface OEMGuidanceScreenProps {
  onBack: () => void;
}

export function OEMGuidanceScreen({ onBack }: OEMGuidanceScreenProps) {
  const [profile, setProfile] = useState<DeviceProfile | null>(null);
  const [forceCapsule, setForceCapsule] = useState(false);

  useEffect(() => {
    async function loadData() {
      const p = await getProfileFromStorage();
      setProfile(p);

      const forceVal = await AsyncStorage.getItem(FORCE_LIVE_NOTIFICATION_KEY);
      setForceCapsule(forceVal === 'true');
    }
    loadData();
  }, []);

  const handleToggleForceCapsule = async (value: boolean) => {
    triggerHaptic();
    setForceCapsule(value);
    await AsyncStorage.setItem(FORCE_LIVE_NOTIFICATION_KEY, value ? 'true' : 'false');
    PrayerCapsuleModule?.setForcePromotedNotification(value);
  };

  const handleOpenSettings = () => {
    triggerHaptic();
    PrayerCapsuleModule?.openAppSettings();
  };

  const renderCategoryGuidance = () => {
    if (!profile) return null;

    switch (profile.category) {
      case 1:
        return (
          <View style={styles.guidanceCard}>
            <View style={styles.cardHeader}>
              <Icon name="check-circle" size={20} color="#00E8A2" />
              <Text style={styles.cardTitle}>Category 1 Integration (Active)</Text>
            </View>
            <Text style={styles.cardDescription}>
              Your {profile.brand.toUpperCase()} device supports the advanced Status Bar Capsule. We have locked the countdown tracking element into your status bar pill cleanly.
            </Text>
            <View style={styles.tipBox}>
              <Icon name="info" size={16} color="#00E8A2" style={styles.tipIcon} />
              <Text style={styles.tipText}>
                OPPO / ColorOS / Realme devices sometimes freeze background services. Ensure 'Auto-Launch' is enabled for DeenPulse.
              </Text>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.guidanceCard}>
            <View style={styles.cardHeader}>
              <Icon name="check-circle" size={20} color="#00E8A2" />
              <Text style={styles.cardTitle}>Category 2 Integration (Active)</Text>
            </View>
            <Text style={styles.cardDescription}>
              Your {profile.brand.toUpperCase()} device utilizes Vivo's Origin Island / Lockscreen display. We bypass custom text wrappers to prevent layout displacement and use a pure native chronometer for clean alignment.
            </Text>
            <View style={styles.tipBox}>
              <Icon name="info" size={16} color="#00E8A2" style={styles.tipIcon} />
              <Text style={styles.tipText}>
                To prevent countdown stalling, make sure DeenPulse is allowed to start in the background under 'High Background Power Consumption' settings.
              </Text>
            </View>
          </View>
        );
      case 3:
      default:
        return (
          <View style={styles.guidanceCard}>
            <View style={styles.cardHeader}>
              <Icon name="sliders" size={20} color="#00E8A2" />
              <Text style={styles.cardTitle}>Category 3 Integration (Standard)</Text>
            </View>
            <Text style={styles.cardDescription}>
              Your device uses standard high-priority ongoing notifications for background tracking. This is the most stable path for Samsung OneUI, Xiaomi HyperOS, and Google Pixel.
            </Text>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Experimental Live Capsule</Text>
                <Text style={styles.toggleDesc}>
                  Attempt to force status bar capsule pill. May cause layout glitches on unsupported devices.
                </Text>
              </View>
              <Switch
                value={forceCapsule}
                onValueChange={handleToggleForceCapsule}
                trackColor={{ false: '#334155', true: 'rgba(0, 232, 162, 0.4)' }}
                thumbColor={forceCapsule ? '#00E8A2' : '#cbd5e1'}
              />
            </View>
          </View>
        );
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
        <Text style={styles.title}>Device Optimization</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <Text style={styles.label}>Selected Device Brand</Text>
          <Text style={styles.profileValue}>
            {profile ? profile.brand.toUpperCase() : 'Detecting...'}
          </Text>
        </View>

        {renderCategoryGuidance()}

        <View style={styles.generalCard}>
          <Text style={styles.generalTitle}>Recommended Settings</Text>
          <Text style={styles.generalDesc}>
            To ensure the live countdown pill functions smoothly on your lock screen and in the background, verify these settings in your phone's system menus:
          </Text>

          <View style={styles.bulletRow}>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletNumber}>1</Text>
            </View>
            <View style={styles.bulletContent}>
              <Text style={styles.bulletTitle}>Remove Battery Limits</Text>
              <Text style={styles.bulletDesc}>
                Set Battery Optimization to 'Unrestricted' or 'No Restrictions'.
              </Text>
            </View>
          </View>

          <View style={styles.bulletRow}>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletNumber}>2</Text>
            </View>
            <View style={styles.bulletContent}>
              <Text style={styles.bulletTitle}>Enable Auto-Start / Background Start</Text>
              <Text style={styles.bulletDesc}>
                Allow DeenPulse to launch automatically and run in the background.
              </Text>
            </View>
          </View>

          <View style={styles.bulletRow}>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletNumber}>3</Text>
            </View>
            <View style={styles.bulletContent}>
              <Text style={styles.bulletTitle}>Lock Screen Permissions</Text>
              <Text style={styles.bulletDesc}>
                Ensure 'Show on Lock Screen' is enabled for notifications.
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.settingsButton, { opacity: pressed ? 0.9 : 1 }]}
            onPress={handleOpenSettings}
          >
            <Icon name="external-link" size={16} color="#000" />
            <Text style={styles.settingsButtonText}>Open System Settings</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
  profileSection: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  label: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#00E8A2',
  },
  guidanceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 232, 162, 0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    marginBottom: 16,
  },
  tipBox: {
    backgroundColor: 'rgba(0, 232, 162, 0.05)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0, 232, 162, 0.1)',
  },
  tipIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(0, 232, 162, 0.9)',
    lineHeight: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  toggleDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 15,
  },
  generalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  generalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  generalDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
    marginBottom: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bulletPoint: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 232, 162, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bulletNumber: {
    color: '#00E8A2',
    fontWeight: '800',
    fontSize: 12,
  },
  bulletContent: {
    flex: 1,
  },
  bulletTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  bulletDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 16,
  },
  settingsButton: {
    backgroundColor: '#00E8A2',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  settingsButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
});

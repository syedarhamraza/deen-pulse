import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { styles, triggerHaptic, HeaderFadeOverlay } from '../../App';
import { ColorOSSwitch } from '../components/ColorOSSwitch';

interface NotificationsScreenProps {
  onBack: () => void;
  onAllowNotificationsPress: () => void;
  onCapsuleFormatPress: () => void;
  onNotificationStylePress: () => void;
  onOptimizePress: () => void;
  soundEnabled: boolean;
  onSoundToggle: (val: boolean) => void;
  capsuleFormatLabel: string;
  notificationStyleLabel: string;
  deviceCategory?: number;
  cat3NotificationMode?: 'ongoing' | 'reminder';
  onCat3ModeChange?: (mode: 'ongoing' | 'reminder') => void;
}

export function NotificationsScreen({
  onBack,
  onAllowNotificationsPress,
  onCapsuleFormatPress,
  onNotificationStylePress,
  onOptimizePress,
  soundEnabled,
  onSoundToggle,
  capsuleFormatLabel,
  notificationStyleLabel,
  deviceCategory,
  cat3NotificationMode = 'reminder',
  onCat3ModeChange,
}: NotificationsScreenProps) {
  return (
    <View style={styles.screenContainer}>
      <View style={styles.subHeader}>
        <Pressable
          onPress={() => {
            triggerHaptic();
            onBack();
          }}
          style={({ pressed }) => [styles.backButton, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
        >
          <Icon name="arrow-left" size={20} color="#00F29D" />
        </Pressable>
        <Text style={styles.subTitle}>Notifications</Text>
        <HeaderFadeOverlay />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.cardContainer}>
          <Pressable
            style={({ pressed }) => [styles.menuDetailCard, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => {
              triggerHaptic();
              onAllowNotificationsPress();
            }}
          >
            <Text style={styles.menuDetailLabel}>Allow Notifications</Text>
            <Text style={styles.menuDetailDesc}>For the Live island, enable live alerts in notification settings</Text>
          </Pressable>

          {/* Device Optimization Navigation */}
          <Pressable
            style={({ pressed }) => [styles.menuDetailCard, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => {
              triggerHaptic();
              onOptimizePress();
            }}
          >
            <Text style={styles.menuDetailLabel}>Optimize for Your Device</Text>
            <Text style={styles.menuDetailDesc}>Configure brand-specific notification capsule settings and power profiles</Text>
          </Pressable>

          {/* Audible Prayer Alert Switch */}
          <View style={[styles.menuDetailCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={styles.menuDetailLabel}>Audible Prayer Alert</Text>
              <Text style={styles.menuDetailDesc}>Play the system default notification sound when a prayer time begins.</Text>
            </View>
            <ColorOSSwitch
              value={soundEnabled}
              onValueChange={(val) => {
                triggerHaptic();
                onSoundToggle(val);
              }}
            />
          </View>

          {/* Cat3 Notification Mode Toggle */}
          {deviceCategory === 3 && (
            <View style={styles.menuDetailCard}>
              <Text style={styles.menuDetailLabel}>Background Notification Mode</Text>
              <Text style={styles.menuDetailDesc}>
                Choose how DeenPulse notifies you about upcoming prayers on your device.
              </Text>
              <View style={{ marginTop: 12, gap: 8 }}>
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    onCat3ModeChange?.('reminder');
                  }}
                  style={({ pressed }) => [{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: cat3NotificationMode === 'reminder' ? '#00F29D' : 'rgba(255,255,255,0.08)',
                    backgroundColor: cat3NotificationMode === 'reminder' ? 'rgba(0, 242, 157, 0.08)' : 'rgba(255,255,255,0.02)',
                    opacity: pressed ? 0.7 : 1,
                  }]}
                >
                  <View style={{
                    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                    borderColor: cat3NotificationMode === 'reminder' ? '#00F29D' : 'rgba(255,255,255,0.3)',
                    alignItems: 'center', justifyContent: 'center', marginRight: 12,
                  }}>
                    {cat3NotificationMode === 'reminder' && (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#00F29D' }} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>15-Minute Reminder</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
                      Sends a one-time notification 15 minutes before each prayer. Battery efficient.
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    onCat3ModeChange?.('ongoing');
                  }}
                  style={({ pressed }) => [{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: cat3NotificationMode === 'ongoing' ? '#00F29D' : 'rgba(255,255,255,0.08)',
                    backgroundColor: cat3NotificationMode === 'ongoing' ? 'rgba(0, 242, 157, 0.08)' : 'rgba(255,255,255,0.02)',
                    opacity: pressed ? 0.7 : 1,
                  }]}
                >
                  <View style={{
                    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                    borderColor: cat3NotificationMode === 'ongoing' ? '#00F29D' : 'rgba(255,255,255,0.3)',
                    alignItems: 'center', justifyContent: 'center', marginRight: 12,
                  }}>
                    {cat3NotificationMode === 'ongoing' && (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#00F29D' }} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Ongoing Notification</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
                      Persistent countdown in the notification drawer. Uses more battery but always visible.
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          )}

          {/* Status Bar Capsule Format Choice */}
          {(deviceCategory === 1 || deviceCategory === 2) && (
            <Pressable
              style={({ pressed }) => [styles.menuDetailCard, { opacity: pressed ? 0.75 : 1 }]}
              onPress={() => {
                triggerHaptic();
                onCapsuleFormatPress();
              }}
            >
              <Text style={styles.menuDetailLabel}>Status Bar Capsule Style</Text>
              <Text style={styles.menuDetailValue}>{capsuleFormatLabel}</Text>
              <Text style={styles.menuDetailDesc}>Choose what information is displayed directly inside your device's status bar capsule.</Text>
            </Pressable>
          )}

          {/* Notification Title Format Choice — Cat3 only shows when in 'ongoing' mode */}
          {((deviceCategory === 2) || (deviceCategory === 3 && cat3NotificationMode === 'ongoing')) && (
            <Pressable
              style={({ pressed }) => [styles.menuDetailCard, { opacity: pressed ? 0.75 : 1 }]}
              onPress={() => {
                triggerHaptic();
                onNotificationStylePress();
              }}
            >
              <Text style={styles.menuDetailLabel}>
                {deviceCategory === 2 ? 'Notification Style' : 'Notification Title Style'}
              </Text>
              <Text style={styles.menuDetailValue}>{notificationStyleLabel}</Text>
              <Text style={styles.menuDetailDesc}>
                {deviceCategory === 2
                  ? 'Customize the layout of the notification content text shown in the lock screen and drawer banner.'
                  : 'Customize the title layout shown in the lock screen and drawer notification banner.'}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

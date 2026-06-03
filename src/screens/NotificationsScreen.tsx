import React from 'react';
import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { styles, triggerHaptic, HeaderFadeOverlay } from '../../App';

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
}: NotificationsScreenProps) {
  return (
    <View style={styles.screenContainer}>
      <View style={styles.subHeader}>
        <Pressable
          onPress={() => {
            triggerHaptic();
            onBack();
          }}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Icon name="arrow-left" size={20} color="#00E8A2" />
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
            <Switch
              value={soundEnabled}
              onValueChange={(val) => {
                triggerHaptic();
                onSoundToggle(val);
              }}
              trackColor={{ false: '#334155', true: 'rgba(0, 232, 162, 0.4)' }}
              thumbColor={soundEnabled ? '#00E8A2' : '#cbd5e1'}
            />
          </View>

          {/* Status Bar Capsule Format Choice */}
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

          {/* Notification Title Format Choice */}
          <Pressable
            style={({ pressed }) => [styles.menuDetailCard, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => {
              triggerHaptic();
              onNotificationStylePress();
            }}
          >
            <Text style={styles.menuDetailLabel}>Notification Title Style</Text>
            <Text style={styles.menuDetailValue}>{notificationStyleLabel}</Text>
            <Text style={styles.menuDetailDesc}>Customize the title layout shown in the lock screen and drawer notification banner.</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

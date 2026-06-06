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

import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { styles, triggerHaptic, HeaderFadeOverlay } from '../../App';
import { ColorOSSwitch } from '../components/ColorOSSwitch';
import { RootStackParamList } from '../navigation/types';

interface NotificationsScreenProps {
  onAllowNotificationsPress: () => void;
  onCapsuleFormatPress: () => void;
  onNotificationStylePress: () => void;
  soundEnabled: boolean;
  onSoundToggle: (val: boolean) => void;
  capsuleFormatLabel: string;
  notificationStyleLabel: string;
  deviceCategory?: number;
  cat3NotificationMode?: 'ongoing' | 'reminder';
  onCat3ModeChange?: (mode: 'ongoing' | 'reminder') => void;
}

export function NotificationsScreen({
  onAllowNotificationsPress,
  onCapsuleFormatPress,
  onNotificationStylePress,
  soundEnabled,
  onSoundToggle,
  capsuleFormatLabel,
  notificationStyleLabel,
  deviceCategory,
  cat3NotificationMode = 'reminder',
  onCat3ModeChange,
}: NotificationsScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={styles.screenContainer}>
      <View style={styles.subHeader}>
        <Pressable
          onPress={() => {
            triggerHaptic();
            navigation.goBack();
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
              if (deviceCategory === 1) {
                navigation.navigate('cat1_notification_guide');
              } else {
                onAllowNotificationsPress();
              }
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
              navigation.navigate('oem_guidance');
            }}
          >
            <Text style={styles.menuDetailLabel}>Optimize for Your Device</Text>
            <Text style={styles.menuDetailDesc}>Configure brand-specific notification capsule settings and power profiles</Text>
          </Pressable>

          {/* Audible Prayer Alert Switch */}
          <View style={[styles.menuDetailCard, localStyles.switchCard]}>
            <View style={localStyles.switchInfo}>
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
              <View style={localStyles.radioGroup}>
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    onCat3ModeChange?.('reminder');
                  }}
                  style={({ pressed }) => [
                    localStyles.radioButton,
                    cat3NotificationMode === 'reminder' ? localStyles.radioButtonSelected : localStyles.radioButtonUnselected,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                >
                  <View style={[
                    localStyles.radioDot,
                    cat3NotificationMode === 'reminder' ? localStyles.radioDotSelected : localStyles.radioDotUnselected,
                  ]}>
                    {cat3NotificationMode === 'reminder' && (
                      <View style={localStyles.radioDotFill} />
                    )}
                  </View>
                  <View style={localStyles.radioLabelWrap}>
                    <Text style={localStyles.radioTitle}>15-Minute Reminder</Text>
                    <Text style={localStyles.radioSubtitle}>
                      Sends a one-time notification 15 minutes before each prayer. Battery efficient.
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    onCat3ModeChange?.('ongoing');
                  }}
                  style={({ pressed }) => [
                    localStyles.radioButton,
                    cat3NotificationMode === 'ongoing' ? localStyles.radioButtonSelected : localStyles.radioButtonUnselected,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                >
                  <View style={[
                    localStyles.radioDot,
                    cat3NotificationMode === 'ongoing' ? localStyles.radioDotSelected : localStyles.radioDotUnselected,
                  ]}>
                    {cat3NotificationMode === 'ongoing' && (
                      <View style={localStyles.radioDotFill} />
                    )}
                  </View>
                  <View style={localStyles.radioLabelWrap}>
                    <Text style={localStyles.radioTitle}>Ongoing Notification</Text>
                    <Text style={localStyles.radioSubtitle}>
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

const localStyles = StyleSheet.create({
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  radioGroup: {
    marginTop: 12,
    gap: 8,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  radioButtonSelected: {
    borderColor: '#00F29D',
    backgroundColor: 'rgba(0, 242, 157, 0.08)',
  },
  radioButtonUnselected: {
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioDotSelected: {
    borderColor: '#00F29D',
  },
  radioDotUnselected: {
    borderColor: 'rgba(255,255,255,0.3)',
  },
  radioDotFill: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00F29D',
  },
  radioLabelWrap: {
    flex: 1,
  },
  radioTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  radioSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
});

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
import Icon from 'react-native-vector-icons/Feather';
import { triggerHaptic, HeaderFadeOverlay } from '../../App';

interface Cat1NotificationGuideScreenProps {
  onOpenSettings: () => void;
}

export function Cat1NotificationGuideScreen({
  onOpenSettings,
}: Cat1NotificationGuideScreenProps) {
  const navigation = useNavigation();
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
        <Text style={styles.title}>Notification Settings</Text>
        <HeaderFadeOverlay />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.introSection}>
          <Text style={styles.introText}>
            Because you are using an <Text style={styles.brandHighlight}>OPPO, OnePlus, or Realme</Text> device, ColorOS rules apply. Please verify that notifications are fully active to enable the live status bar capsule tracking pill.
          </Text>
        </View>

        <View style={styles.cardContainer}>
          {/* Step 1 */}
          <View style={styles.guideCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <Text style={styles.stepTitle}>Enable Live Alerts</Text>
            </View>
            <Text style={styles.stepDesc}>
              Tap the button below to open system settings. Go to <Text style={styles.semibold}>Manage Notifications</Text> and ensure the <Text style={styles.semibold}>Live Alerts</Text> (or Active Updates) channel is fully toggled ON.
            </Text>
          </View>

          {/* Step 2 */}
          <View style={styles.guideCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <Text style={styles.stepTitle}>Show on Lock Screen</Text>
            </View>
            <Text style={styles.stepDesc}>
              Ensure that <Text style={styles.semibold}>Lock Screen</Text> permissions are completely checked so the countdown widget updates when the phone is locked.
            </Text>
          </View>

          {/* Step 3 */}
          <View style={styles.guideCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
              <Text style={styles.stepTitle}>Allow Ring & Vibrate</Text>
            </View>
            <Text style={styles.stepDesc}>
              Ensure notifications are set to ring and vibrate rather than silent. This guarantees the background thread is allocated CPU priority to update the timer.
            </Text>
          </View>
        </View>

        {/* CTAs */}
        <Pressable
          style={({ pressed }) => [styles.primaryButton, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          onPress={() => {
            triggerHaptic();
            onOpenSettings();
          }}
        >
          <Icon name="settings" size={18} color="#000" />
          <Text style={styles.primaryButtonText}>Open System Settings</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryButton, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          onPress={() => {
            triggerHaptic();
            navigation.goBack();
          }}
        >
          <Icon name="check" size={16} color="#00F29D" />
          <Text style={styles.secondaryButtonText}>I have configured these settings</Text>
        </Pressable>
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
  introSection: {
    marginBottom: 20,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  introText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
  },
  brandHighlight: {
    color: '#00F29D',
    fontWeight: '700',
  },
  cardContainer: {
    marginBottom: 24,
  },
  guideCard: {
    backgroundColor: '#111417',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 242, 157, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.25)',
  },
  stepNumber: {
    color: '#00F29D',
    fontSize: 11,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 18,
  },
  semibold: {
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  primaryButton: {
    backgroundColor: '#00F29D',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
  },
  secondaryButtonText: {
    color: '#00F29D',
    fontSize: 13,
    fontWeight: '700',
  },
});

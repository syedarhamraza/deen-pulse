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
import { View, Text, ScrollView, Pressable, Platform, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { styles, triggerHaptic, HeaderFadeOverlay } from '../../App';
import { RootStackParamList } from '../navigation/types';

export function SettingsScreen() {
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
        <Text style={styles.subTitle}>Settings</Text>
        <HeaderFadeOverlay />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.cardContainer}>
          
          {/* Group 1: Prayer & Calculation */}
          <Text style={[localStyles.sectionHeader, localStyles.sectionHeaderFirst]}>Prayer Settings</Text>

          {/* Row 1: Prayer Rules */}
          <Pressable
            style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={() => {
              triggerHaptic();
              navigation.navigate('prayer_rules');
            }}
          >
            <View style={styles.rowIconContainer}>
              <Icon name="book-open" size={18} color="#00F29D" />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Calculation Methods</Text>
            </View>
            <Icon name="chevron-right" size={18} color="rgba(0, 242, 157, 0.5)" />
          </Pressable>

          {/* Row 2: Data Management */}
          <Pressable
            style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={() => {
              triggerHaptic();
              navigation.navigate('data_management');
            }}
          >
            <View style={styles.rowIconContainer}>
              <Icon name="database" size={18} color="#00F29D" />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Location & Storage</Text>
            </View>
            <Icon name="chevron-right" size={18} color="rgba(0, 242, 157, 0.5)" />
          </Pressable>

          {/* Group 2: Notifications & Integration */}
          <Text style={localStyles.sectionHeader}>Alerts & Device</Text>

          {/* Row 3: Notifications */}
          <Pressable
            style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={() => {
              triggerHaptic();
              navigation.navigate('notifications');
            }}
          >
            <View style={styles.rowIconContainer}>
              <Icon name="bell" size={18} color="#00F29D" />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Alerts & Sound</Text>
            </View>
            <Icon name="chevron-right" size={18} color="rgba(0, 242, 157, 0.5)" />
          </Pressable>

          {/* Row 4: Device Optimization */}
          <Pressable
            style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={() => {
              triggerHaptic();
              navigation.navigate('oem_guidance');
            }}
          >
            <View style={styles.rowIconContainer}>
              <Icon name="cpu" size={18} color="#00F29D" />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Battery & OEM</Text>
            </View>
            <Icon name="chevron-right" size={18} color="rgba(0, 242, 157, 0.5)" />
          </Pressable>

          {/* Row 5: Watch Companion */}
          <Pressable
            style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={() => {
              triggerHaptic();
              navigation.navigate('wearos_control');
            }}
          >
            <View style={styles.rowIconContainer}>
              <Icon name="watch" size={18} color="#00F29D" />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Smartwatch Sync</Text>
            </View>
            <Icon name="chevron-right" size={18} color="rgba(0, 242, 157, 0.5)" />
          </Pressable>

          {/* Row: App Icon (Android Only) */}
          {Platform.OS === 'android' && (
            <Pressable
              style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
              onPress={() => {
                triggerHaptic();
                navigation.navigate('app_icon');
              }}
            >
              <View style={styles.rowIconContainer}>
                <Icon name="image" size={18} color="#00F29D" />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>App Icon</Text>
              </View>
              <Icon name="chevron-right" size={18} color="rgba(0, 242, 157, 0.5)" />
            </Pressable>
          )}

          {/* Group 3: About & Diagnostics */}
          <Text style={localStyles.sectionHeader}>More</Text>

          {/* Row: Software Update */}
          <Pressable
            style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={() => {
              triggerHaptic();
              navigation.navigate('update_check');
            }}
          >
            <View style={styles.rowIconContainer}>
              <Icon name="refresh-cw" size={18} color="#00F29D" />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Software Update</Text>
            </View>
            <Icon name="chevron-right" size={18} color="rgba(0, 242, 157, 0.5)" />
          </Pressable>

          {/* Row: About */}
          <Pressable
            style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={() => {
              triggerHaptic();
              navigation.navigate('about');
            }}
          >
            <View style={styles.rowIconContainer}>
              <Icon name="info" size={18} color="#00F29D" />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>About DeenPulse</Text>
            </View>
            <Icon name="chevron-right" size={18} color="rgba(0, 242, 157, 0.5)" />
          </Pressable>

          {/* Row 7: Developer Options */}
          <Pressable
            style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={() => {
              triggerHaptic();
              navigation.navigate('developer_options');
            }}
          >
            <View style={styles.rowIconContainer}>
              <Icon name="tool" size={18} color="#00F29D" />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Developer Tools</Text>
            </View>
            <Icon name="chevron-right" size={18} color="rgba(0, 242, 157, 0.5)" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 22,
    marginBottom: 10,
    paddingLeft: 4,
  },
  sectionHeaderFirst: {
    marginTop: 4,
  },
});

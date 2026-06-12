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
import { View, Text, ScrollView, Pressable, Platform, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { styles, triggerHaptic, HeaderFadeOverlay } from '../../App';
import { RootStackParamList } from '../navigation/types';
import { FluidModal } from '../components/FluidModal';
import { changeAppIcon, getCurrentAppIcon, AppIconType } from '../utils/appIconHelper';

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [appIcon, setAppIcon] = useState<AppIconType>('default');
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      getCurrentAppIcon().then(setAppIcon);
    }
  }, []);

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
          <Text style={[localStyles.sectionHeader, localStyles.sectionHeaderFirst]}>Prayer & Calculation</Text>

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
              <Text style={styles.rowTitle}>Prayer Rules</Text>
              <Text style={styles.rowDesc}>Juristic settings and calculation methods</Text>
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
              <Text style={styles.rowTitle}>Data Management</Text>
              <Text style={styles.rowDesc}>Storage, cache, and GPS positioning</Text>
            </View>
            <Icon name="chevron-right" size={18} color="rgba(0, 242, 157, 0.5)" />
          </Pressable>

          {/* Group 2: Notifications & Integration */}
          <Text style={localStyles.sectionHeader}>Notifications & Integration</Text>

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
              <Text style={styles.rowTitle}>Notifications</Text>
              <Text style={styles.rowDesc}>Configure system alert permissions</Text>
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
              <Text style={styles.rowTitle}>Device Optimization</Text>
              <Text style={styles.rowDesc}>Battery profiles and OEM-specific settings</Text>
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
              <Text style={styles.rowTitle}>Watch Companion</Text>
              <Text style={styles.rowDesc}>Manage Wear OS sync and connection status</Text>
            </View>
            <Icon name="chevron-right" size={18} color="rgba(0, 242, 157, 0.5)" />
          </Pressable>

          {/* Row: App Icon (Android Only) */}
          {Platform.OS === 'android' && (
            <Pressable
              style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
              onPress={() => {
                triggerHaptic();
                setShowIconPicker(true);
              }}
            >
              <View style={styles.rowIconContainer}>
                <Icon name="image" size={18} color="#00F29D" />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>App Icon</Text>
                <Text style={styles.rowDesc}>
                  {appIcon === 'emerald' ? 'Glass Dome' : appIcon === 'blue' ? 'Oasis Glow' : 'Obsidian Mint'}
                </Text>
              </View>
              <Icon name="chevron-right" size={18} color="rgba(0, 242, 157, 0.5)" />
            </Pressable>
          )}

          {/* Group 3: About & Diagnostics */}
          <Text style={localStyles.sectionHeader}>About & Diagnostics</Text>
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
              <Text style={styles.rowTitle}>About</Text>
              <Text style={styles.rowDesc}>App information and credits</Text>
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
              <Text style={styles.rowTitle}>Developer Options</Text>
              <Text style={styles.rowDesc}>Trigger test notifications and simulations</Text>
            </View>
            <Icon name="chevron-right" size={18} color="rgba(0, 242, 157, 0.5)" />
          </Pressable>
        </View>
      </ScrollView>

      {/* App Icon Picker Modal */}
      <FluidModal
        visible={showIconPicker}
        onClose={() => {
          triggerHaptic();
          setShowIconPicker(false);
        }}
        title="Choose App Icon"
      >
        <View style={localStyles.modalContainer}>
          {/* Default Option */}
          <Pressable
            style={({ pressed }) => [
              styles.modalItem,
              appIcon === 'default' && styles.modalItemSelected,
              localStyles.modalItemRow,
              { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}
            onPress={async () => {
              triggerHaptic();
              const success = await changeAppIcon('default');
              if (success) setAppIcon('default');
              setShowIconPicker(false);
            }}
          >
            <Image
              source={require('../assets/icons/app_icon_default.png')}
              style={localStyles.modalItemImage}
            />
            <Text style={[
              styles.modalItemText,
              appIcon === 'default' && styles.modalItemTextSelected,
              localStyles.modalItemTextFlex
            ]}>Obsidian Mint</Text>
            {appIcon === 'default' && <Icon name="check" size={16} color="#00F29D" />}
          </Pressable>

          {/* Emerald Option */}
          <Pressable
            style={({ pressed }) => [
              styles.modalItem,
              appIcon === 'emerald' && styles.modalItemSelected,
              localStyles.modalItemRow,
              { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}
            onPress={async () => {
              triggerHaptic();
              const success = await changeAppIcon('emerald');
              if (success) setAppIcon('emerald');
              setShowIconPicker(false);
            }}
          >
            <Image
              source={require('../assets/icons/app_icon_emerald.png')}
              style={localStyles.modalItemImage}
            />
            <Text style={[
              styles.modalItemText,
              appIcon === 'emerald' && styles.modalItemTextSelected,
              localStyles.modalItemTextFlex
            ]}>Glass Dome</Text>
            {appIcon === 'emerald' && <Icon name="check" size={16} color="#00F29D" />}
          </Pressable>

          {/* Blue Option */}
          <Pressable
            style={({ pressed }) => [
              styles.modalItem,
              appIcon === 'blue' && styles.modalItemSelected,
              localStyles.modalItemRow,
              { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}
            onPress={async () => {
              triggerHaptic();
              const success = await changeAppIcon('blue');
              if (success) setAppIcon('blue');
              setShowIconPicker(false);
            }}
          >
            <Image
              source={require('../assets/icons/app_icon_blue.png')}
              style={localStyles.modalItemImage}
            />
            <Text style={[
              styles.modalItemText,
              appIcon === 'blue' && styles.modalItemTextSelected,
              localStyles.modalItemTextFlex
            ]}>Oasis Glow</Text>
            {appIcon === 'blue' && <Icon name="check" size={16} color="#00F29D" />}
          </Pressable>
        </View>
      </FluidModal>
    </View>
  );
}

const localStyles = StyleSheet.create({
  modalContainer: {
    gap: 12,
  },
  modalItemImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 16,
  },
  modalItemTextFlex: {
    flex: 1,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
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

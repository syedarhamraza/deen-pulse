import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { styles, triggerHaptic, HeaderFadeOverlay, Screen } from '../../App';

interface SettingsScreenProps {
  onBack: () => void;
  onNavigate: (screen: Screen) => void;
}

export function SettingsScreen({ onBack, onNavigate }: SettingsScreenProps) {
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
        <Text style={styles.subTitle}>Settings</Text>
        <HeaderFadeOverlay />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.cardContainer}>
          {/* Row 1: Prayer Rules */}
          <Pressable
            style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={() => {
              triggerHaptic();
              onNavigate('prayer_rules');
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

          {/* Row 2: Notifications */}
          <Pressable
            style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={() => {
              triggerHaptic();
              onNavigate('notifications');
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

          {/* Row: Watch Companion */}
          <Pressable
            style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={() => {
              triggerHaptic();
              onNavigate('wearos_control');
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

          {/* Row 3: Data Management */}
          <Pressable
            style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={() => {
              triggerHaptic();
              onNavigate('data_management');
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

          {/* Row 4: About DeenPulse */}
          <Pressable
            style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={() => {
              triggerHaptic();
              onNavigate('about');
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

          {/* Row: Developer Options */}
          <Pressable
            style={({ pressed }) => [styles.settingsRowCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={() => {
              triggerHaptic();
              onNavigate('developer_options');
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
    </View>
  );
}

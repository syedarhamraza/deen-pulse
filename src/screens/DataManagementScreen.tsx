import React from 'react';
import { View, Text, ScrollView, Pressable, Switch, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { styles, triggerHaptic, HeaderFadeOverlay } from '../../App';

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
        <Text style={styles.subTitle}>Data Management</Text>
        <HeaderFadeOverlay />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.cardContainer}>
          {/* Location Mode */}
          <View style={styles.menuDetailCard}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.menuDetailLabel}>Location Mode</Text>
                <Text style={styles.menuDetailDesc}>
                  {locationMode === 'gps' ? 'Auto-Detect Location (GPS)' : 'Use Cached Location'}
                </Text>
              </View>
              <Switch
                value={locationMode === 'gps'}
                onValueChange={(val) => {
                  triggerHaptic();
                  onLocationModeChange(val);
                }}
                trackColor={{ false: '#2A2E3D', true: '#00E8A2' }}
                thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
              />
            </View>
          </View>

          {/* Force GPS Permission Request */}
          <Pressable
            style={({ pressed }) => [styles.menuDetailCard, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => {
              triggerHaptic();
              onRequestGPS();
            }}
          >
            <Text style={styles.menuDetailLabel}>Request GPS Permission</Text>
            <Text style={styles.menuDetailDesc}>
              Manually trigger system location permission dialog to authorize GPS coordinates tracking.
            </Text>
          </Pressable>

          {/* Reset Cache / Reset History */}
          <Pressable
            style={({ pressed }) => [
              styles.menuDetailCard,
              styles.destructiveBorder,
              { opacity: pressed ? 0.75 : 1 }
            ]}
            onPress={() => {
              triggerHaptic();
              onClearCacheReset();
            }}
          >
            <Text style={[styles.menuDetailLabel, styles.destructiveText]}>Clear Cache / Reset History</Text>
            <Text style={styles.menuDetailDesc}>
              Wipes out all stored calculation rules, caching tables, and restarts positioning loop.
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

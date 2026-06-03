import React from 'react';
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { styles, triggerHaptic, HeaderFadeOverlay } from '../../App';

interface AboutScreenProps {
  onBack: () => void;
}

export function AboutScreen({ onBack }: AboutScreenProps) {
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
          <Icon name="arrow-left" size={20} color="#00E8A2" />
        </Pressable>
        <Text style={styles.subTitle}>About</Text>
        <HeaderFadeOverlay />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.cardContainer}>
          {/* Highlight header block */}
          <View style={styles.aboutHeaderBlock}>
            <View style={styles.aboutBrandingContainer}>
              <Text style={styles.aboutBranding}>DeenPulse</Text>
            </View>
            <View style={styles.aboutAccentBar} />
            <Text style={styles.aboutTagline}>Live tracking on your status bar</Text>
          </View>

          {/* Basic information card */}
          <View style={styles.menuDetailCard}>
            <Text style={styles.aboutSectionTitle}>Basic Information</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>App Name</Text>
              <Text style={styles.infoVal}>DeenPulse</Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.infoRow, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => {
                triggerHaptic();
                Linking.openURL('https://github.com/syedarhamraza').catch(err =>
                  console.warn('Failed to open URL:', err)
                );
              }}
            >
              <Text style={styles.infoKey}>Owner</Text>
              <Text style={styles.infoValLink}>Syed Arham Raza</Text>
            </Pressable>

            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoKey}>Version</Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionBadgeText}>1.0.2</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

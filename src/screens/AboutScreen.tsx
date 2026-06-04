import React from 'react';
import { View, Text, ScrollView, Pressable, Linking, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { triggerHaptic, HeaderFadeOverlay } from '../../App';

interface AboutScreenProps {
  onBack: () => void;
}

export function AboutScreen({ onBack }: AboutScreenProps) {
  const handleOpenGitHub = () => {
    triggerHaptic();
    Linking.openURL('https://github.com/syedarhamraza').catch(err =>
      console.warn('Failed to open URL:', err)
    );
  };

  const handleCheckUpdates = () => {
    triggerHaptic();
    // In a real app this would query a version endpoint. Mocking for premium feedback.
    Alert.alert('DeenPulse Hub', 'DeenPulse is up to date!\nVersion: 1.0.2 (Stable)');
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
          <Icon name="arrow-left" size={20} color="#00F29D" />
        </Pressable>
        <Text style={styles.title}>About</Text>
        <HeaderFadeOverlay />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Branding Hero Block */}
        <View style={styles.heroSection}>
          <View style={styles.logoOuterRing}>
            <View style={styles.logoInnerRing}>
              <Icon name="activity" size={42} color="#00F29D" style={styles.logoIcon} />
            </View>
          </View>
          <Text style={styles.appName}>DeenPulse</Text>
          <Text style={styles.appTagline}>Live tracking on your status bar</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>v1.0.2 Stable</Text>
          </View>
        </View>

        {/* Feature Pillars Grid */}
        <Text style={styles.sectionLabel}>Key Features</Text>
        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <Icon name="feather" size={20} color="#00F29D" style={styles.featureIcon} />
            <Text style={styles.featureTitle}>Live Capsule</Text>
            <Text style={styles.featureDesc}>Status bar tracking lock-in</Text>
          </View>

          <View style={styles.featureCard}>
            <Icon name="watch" size={20} color="#00F29D" style={styles.featureIcon} />
            <Text style={styles.featureTitle}>Wear OS Sync</Text>
            <Text style={styles.featureDesc}>Active watch companion sync</Text>
          </View>

          <View style={styles.featureCard}>
            <Icon name="bell" size={20} color="#00F29D" style={styles.featureIcon} />
            <Text style={styles.featureTitle}>Active Alerts</Text>
            <Text style={styles.featureDesc}>15m window dynamic sounds</Text>
          </View>

          <View style={styles.featureCard}>
            <Icon name="sliders" size={20} color="#00F29D" style={styles.featureIcon} />
            <Text style={styles.featureTitle}>OEM Branching</Text>
            <Text style={styles.featureDesc}>Specialized brand profiles</Text>
          </View>
        </View>

        {/* Credits Card */}
        <Text style={styles.sectionLabel}>Core Team</Text>
        <View style={styles.creditsCard}>
          <View style={styles.creditsHeader}>
            <Icon name="code" size={18} color="#00F29D" />
            <Text style={styles.creditsTitle}>Developer & Owner</Text>
          </View>
          <View style={styles.divider} />
          <Pressable
            style={({ pressed }) => [styles.creatorRow, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={handleOpenGitHub}
          >
            <View>
              <Text style={styles.creatorName}>Syed Arham Raza</Text>
              <Text style={styles.creatorRole}>Lead Software Architect & Engineer</Text>
            </View>
            <Icon name="github" size={20} color="#00F29D" />
          </Pressable>
        </View>

        {/* Update action */}
        <Pressable
          style={({ pressed }) => [styles.updateButton, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          onPress={handleCheckUpdates}
        >
          <Icon name="refresh-cw" size={16} color="#00F29D" />
          <Text style={styles.updateButtonText}>Check for Updates</Text>
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
  heroSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  logoOuterRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 242, 157, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
    marginBottom: 16,
  },
  logoInnerRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(0, 242, 157, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#00F29D',
    shadowColor: '#00F29D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  logoIcon: {
    shadowColor: '#00F29D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 12,
  },
  versionBadge: {
    backgroundColor: 'rgba(0, 242, 157, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.2)',
  },
  versionText: {
    color: '#00F29D',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 16,
    paddingLeft: 4,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 4,
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#111417',
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
  },
  featureIcon: {
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    lineHeight: 14,
  },
  creditsCard: {
    backgroundColor: '#111417',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  creditsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 16,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creatorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  creatorRole: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  updateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
    marginTop: 8,
  },
  updateButtonText: {
    color: '#00F29D',
    fontSize: 13,
    fontWeight: '700',
  },
});

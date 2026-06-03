import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { triggerHaptic, HeaderFadeOverlay } from '../../App';

interface DeveloperOptionsScreenProps {
  onBack: () => void;
  isSimulating: boolean;
  onSimulatePrayer: () => void;
  onClearSimulation: () => void;
  onTriggerImmediateAlert: () => void;
}

export function DeveloperOptionsScreen({
  onBack,
  isSimulating,
  onSimulatePrayer,
  onClearSimulation,
  onTriggerImmediateAlert,
}: DeveloperOptionsScreenProps) {
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
        <Text style={styles.title}>Developer Options</Text>
        <HeaderFadeOverlay />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.cardContainer}>
          {/* Section: Diagnostics */}
          <Text style={styles.sectionLabel}>Notification Diagnostics</Text>

          {/* Test Sound */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Audible Alert Sound Test</Text>
            <Text style={styles.cardDesc}>
              Directly triggers a high-importance system channel notification for a simulated prayer time. Use this to verify ringtone and vibration profiles.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { opacity: pressed ? 0.8 : 1 }
              ]}
              onPress={() => {
                triggerHaptic();
                onTriggerImmediateAlert();
              }}
            >
              <Icon name="bell" size={16} color="#00F29D" />
              <Text style={styles.actionButtonText}>Trigger Sound Check</Text>
            </Pressable>
          </View>

          {/* Section: Timeline Simulation */}
          <Text style={styles.sectionLabel}>Lifecycle Simulation</Text>

          {/* Simulation Card */}
          <View style={[styles.card, isSimulating && styles.activeSimCard]}>
            <View style={styles.rowHeader}>
              <Text style={styles.cardLabel}>Active State Simulation</Text>
              <View style={[styles.statusIndicator, isSimulating ? styles.statusSimulating : styles.statusIdle]}>
                <View style={[styles.statusDot, isSimulating ? styles.dotSimulating : styles.dotIdle]} />
                <Text style={[styles.statusText, { color: isSimulating ? '#00F29D' : 'rgba(255,255,255,0.4)' }]}>
                  {isSimulating ? 'SIMULATING' : 'IDLE'}
                </Text>
              </View>
            </View>
            <Text style={styles.cardDesc}>
              Schedules a mock prayer starting in exactly 1 second. Once reached, it immediately triggers the Active State transition, Adhan sound alert, golden dashboard UI theme, and active notification capsule.
            </Text>

            {isSimulating ? (
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.stopButton,
                  { opacity: pressed ? 0.8 : 1 }
                ]}
                onPress={() => {
                  triggerHaptic();
                  onClearSimulation();
                }}
              >
                <Icon name="x-circle" size={16} color="#FF6B6B" />
                <Text style={[styles.actionButtonText, styles.stopButtonText]}>Stop Simulation</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  { opacity: pressed ? 0.8 : 1 }
                ]}
                onPress={() => {
                  triggerHaptic();
                  onSimulatePrayer();
                }}
              >
                <Icon name="play" size={16} color="#00F29D" />
                <Text style={styles.actionButtonText}>Test Active State</Text>
              </Pressable>
            )}
          </View>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  cardContainer: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: '#121624',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  activeSimCard: {
    borderColor: 'rgba(0, 242, 157, 0.2)',
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    lineHeight: 18,
    marginBottom: 16,
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: 'rgba(0, 242, 157, 0.08)',
    borderRadius: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.2)',
  },
  actionButtonText: {
    color: '#00F29D',
    fontSize: 13,
    fontWeight: '700',
  },
  stopButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },
  stopButtonText: {
    color: '#FF6B6B',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  statusSimulating: {
    backgroundColor: 'rgba(0, 242, 157, 0.05)',
  },
  statusIdle: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotSimulating: {
    backgroundColor: '#00F29D',
  },
  dotIdle: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

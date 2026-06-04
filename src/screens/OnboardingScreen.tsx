import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { triggerHaptic } from '../../App';
import { detectDeviceCategory } from '../utils/deviceProfiles';

interface OnboardingScreenProps {
  onComplete: (brand: string) => void;
}



const BRANDS = [
  { id: 'oppo', name: 'OPPO', icon: 'smartphone', category: 1 },
  { id: 'vivo', name: 'Vivo', icon: 'smartphone', category: 2 },
  { id: 'oneplus', name: 'OnePlus', icon: 'smartphone', category: 1 },
  { id: 'realme', name: 'Realme', icon: 'smartphone', category: 1 },
  { id: 'samsung', name: 'Samsung', icon: 'smartphone', category: 3 },
  { id: 'xiaomi', name: 'Xiaomi', icon: 'smartphone', category: 3 },
  { id: 'pixel', name: 'Google / Pixel', icon: 'smartphone', category: 3 },
  { id: 'other', name: 'Other Brand', icon: 'help-circle', category: 3 },
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [selectedBrand, setSelectedBrand] = useState('other');
  const [detectedBrand, setDetectedBrand] = useState('other');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Auto-detect device brand
    const detected = detectDeviceCategory();
    setDetectedBrand(detected.brand);
    setSelectedBrand(detected.brand);
  }, []);

  useEffect(() => {
    if (step === 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [step, pulseAnim]);

  const transitionToStep = (nextStep: number) => {
    triggerHaptic();
    // Fade out and slide left
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(nextStep);
      // Reset slide to right, then slide in and fade in
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleFinish = () => {
    triggerHaptic();
    onComplete(selectedBrand);
  };

  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.heroContainer}>
        <Animated.View style={[styles.logoPulseRing, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/icons/icon.png')}
              style={styles.logoIcon}
              resizeMode="contain"
            />
          </View>
        </Animated.View>
        <Text style={styles.welcomeTitle}>DeenPulse</Text>
        <Text style={styles.welcomeSubtitle}>Live Prayer Tracking on your Device</Text>
      </View>

      <View style={styles.introCard}>
        <Icon name="check-circle" size={20} color="#00F29D" style={styles.introCardIcon} />
        <Text style={styles.introCardText}>
          Track remaining prayer times directly in your status bar pill, notification shade, and Wear OS smartwatch.
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.primaryButton, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        onPress={() => transitionToStep(1)}
      >
        <Text style={styles.primaryButtonText}>Get Started</Text>
        <Icon name="arrow-right" size={20} color="#000000" />
      </Pressable>
    </View>
  );

  const renderBrandSelectionStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Select Your Device Brand</Text>
      <Text style={styles.sectionSubtitle}>
        Different Android systems manage background tasks uniquely. We optimize notifications based on your manufacturer.
      </Text>

      <ScrollView
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        style={styles.gridScroll}
      >
        {BRANDS.map(brand => {
          const isSelected = selectedBrand === brand.id;
          const isDetected = detectedBrand === brand.id;
          return (
            <Pressable
              key={brand.id}
              style={[
                styles.gridCard,
                isSelected && styles.gridCardSelected,
                isDetected && styles.gridCardDetected,
              ]}
              onPress={() => {
                triggerHaptic();
                setSelectedBrand(brand.id);
              }}
            >
              <View style={styles.gridCardHeader}>
                <Icon name={brand.icon} size={24} color={isSelected ? '#00F29D' : 'rgba(255,255,255,0.6)'} />
                {isDetected && (
                  <View style={styles.detectedBadge}>
                    <Text style={styles.detectedBadgeText}>Detected</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.brandName, isSelected && styles.brandNameSelected]}>
                {brand.name}
              </Text>
              <Text style={styles.categoryLabel}>
                {brand.category === 1 ? 'Capsule Pill' : brand.category === 2 ? 'Origin Island' : 'Reminder Notification'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.navRow}>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          onPress={() => transitionToStep(0)}
        >
          <Icon name="arrow-left" size={18} color="#00F29D" />
          <Text style={styles.secondaryButtonText}>Back</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.primaryButton, { flex: 1, marginLeft: 12, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          onPress={() => transitionToStep(2)}
        >
          <Text style={styles.primaryButtonText}>Next</Text>
          <Icon name="arrow-right" size={20} color="#000000" />
        </Pressable>
      </View>
    </View>
  );

  const renderOptimizationExplanationStep = () => {
    const brandInfo = BRANDS.find(b => b.id === selectedBrand) || BRANDS[BRANDS.length - 1];
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.sectionTitle}>Ready to Configure</Text>
        <Text style={styles.sectionSubtitle}>
          Here is how DeenPulse will integrate with your {brandInfo.name} device.
        </Text>

        <View style={styles.explanationCard}>
          <View style={styles.explanationHeader}>
            <Icon
              name={brandInfo.category === 1 ? 'feather' : brandInfo.category === 2 ? 'aperture' : 'bell'}
              size={32}
              color="#00F29D"
            />
            <View style={styles.explanationTitleCol}>
              <Text style={styles.explanationTypeTitle}>
                {brandInfo.category === 1
                  ? 'Status Bar Capsule Pill'
                  : brandInfo.category === 2
                  ? 'Vivo Origin Island Support'
                  : 'High Priority Notification'}
              </Text>
              <Text style={styles.explanationCategorySub}>
                Category {brandInfo.category} profile enabled
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoPoint}>
            <Icon name="zap" size={16} color="#00F29D" style={styles.infoPointIcon} />
            <Text style={styles.infoPointText}>
              {brandInfo.category === 1
                ? 'Optimized to lock tracking elements inside the status bar pill using Android 14+ promoted system flags.'
                : brandInfo.category === 2
                ? 'Strips custom text wrappers and utilizes a pure native chronometer. Lets Vivo’s Origin Island UI handle rendering cleanly without displacement.'
                : 'Provides a standard ongoing status indicator, with a toggle option for experimental promoted system tracking.'}
            </Text>
          </View>

          <View style={styles.infoPoint}>
            <Icon name="battery" size={16} color="#00F29D" style={styles.infoPointIcon} />
            <Text style={styles.infoPointText}>
              Includes specialized battery optimizations. We recommend disabling battery restrictions in system settings for best performance.
            </Text>
          </View>
        </View>

        <View style={styles.navRow}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={() => transitionToStep(1)}
          >
            <Icon name="arrow-left" size={18} color="#00F29D" />
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.primaryButton, { flex: 1, marginLeft: 12, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={handleFinish}
          >
            <Text style={styles.primaryButtonText}>Finish Setup</Text>
            <Icon name="check" size={20} color="#000000" />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {step === 0 && renderWelcomeStep()}
        {step === 1 && renderBrandSelectionStep()}
        {step === 2 && renderOptimizationExplanationStep()}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F12',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  heroContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  logoPulseRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 242, 157, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoIcon: {
    width: 70,
    height: 70,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  introCard: {
    backgroundColor: '#111417',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
  },
  introCardIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  introCardText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
    marginBottom: 20,
  },
  gridScroll: {
    flex: 1,
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#111417',
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 242, 157, 0.15)',
  },
  gridCardSelected: {
    borderColor: '#00F29D',
    backgroundColor: 'rgba(0, 242, 157, 0.08)',
  },
  gridCardDetected: {
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 242, 157, 0.5)',
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detectedBadge: {
    backgroundColor: 'rgba(0, 242, 157, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  detectedBadgeText: {
    color: '#00F29D',
    fontSize: 9,
    fontWeight: '700',
  },
  brandName: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  brandNameSelected: {
    color: '#00F29D',
  },
  categoryLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  explanationCard: {
    backgroundColor: '#111417',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
    flex: 1,
    marginBottom: 30,
    maxHeight: 400,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  explanationTitleCol: {
    marginLeft: 16,
    flex: 1,
  },
  explanationTypeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  explanationCategorySub: {
    fontSize: 12,
    color: 'rgba(0, 242, 157, 0.8)',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  infoPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoPointIcon: {
    marginTop: 3,
    marginRight: 12,
  },
  infoPointText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    paddingVertical: 10,
  },
  primaryButton: {
    backgroundColor: '#00F29D',
    borderRadius: 14,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButtonText: {
    color: '#00F29D',
    fontSize: 15,
    fontWeight: '600',
  },
});

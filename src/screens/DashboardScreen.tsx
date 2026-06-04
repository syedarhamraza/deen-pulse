import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Animated, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { styles, triggerHaptic, HeaderFadeOverlay, Screen } from '../../App';
import { PrayerTime, NextPrayerInfo } from '../utils/prayerEngine';
import { CountdownDisplay } from '../components/CountdownDisplay';
import { PrayerCard } from '../components/PrayerCard';
import { useActiveWindowDetector } from '../hooks/useActiveWindowDetector';

// Shimmer card loading placeholders with detailed high-fidelity inner segments
function SkeletonCard() {
  const shimmerAnim = useRef(new Animated.Value(0.08)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.22,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.08,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  return (
    <Animated.View style={[styles.skeletonCard, { opacity: shimmerAnim }]}>
      {/* Muted circle indicator placeholder */}
      <View style={styles.skeletonCheck} />

      {/* Micro-icon container placeholder */}
      <View style={styles.skeletonIcon} />

      {/* Info text stack placeholder */}
      <View style={styles.skeletonInfo}>
        <View style={styles.skeletonTextName} />
        <View style={styles.skeletonTextTime} />
      </View>

      {/* Badge placeholder */}
      <View style={styles.skeletonBadge} />
    </Animated.View>
  );
}

// Circular countdown gauge placeholder
function SkeletonCountdown() {
  const shimmerAnim = useRef(new Animated.Value(0.08)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.22,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.08,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  return (
    <Animated.View style={[styles.skeletonCountdownWrapper, { opacity: shimmerAnim }]}>
      {/* Thick translucent outer accent ring */}
      <View style={styles.skeletonCountdownOuterRing} />

      {/* Central countdown circle placeholder */}
      <View style={styles.skeletonCountdownInnerCircle}>
        <View style={styles.skeletonCircleTextLarge} />
        <View style={styles.skeletonCircleTextSmall} />
      </View>
    </Animated.View>
  );
}

// Full skeleton loader
function SkeletonLoader() {
  return (
    <View style={styles.skeletonContainer}>
      <SkeletonCountdown />
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>TODAY'S PRAYERS</Text>
        <View style={styles.dividerLine} />
      </View>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}



interface DashboardScreenProps {
  onNavigate: (screen: Screen) => void;
  onRefresh: () => void;
  loading: boolean;
  error: string | null;
  prayerTimes: PrayerTime[];
  nextPrayer: NextPrayerInfo | null;
}

export function DashboardScreen({
  onNavigate,
  onRefresh,
  loading,
  error,
  prayerTimes,
  nextPrayer,
}: DashboardScreenProps) {
  const { isWindowActive } = useActiveWindowDetector(nextPrayer);
  return (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <View>
          <View style={styles.appNameContainer}>
            <Text style={styles.appName}>
              Deen<Text style={styles.appNameHighlight}>Pulse</Text>
            </Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          <Pressable
            style={({ pressed }) => [styles.headerButton, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
            onPress={() => {
              triggerHaptic();
              onRefresh();
            }}
          >
            <Icon name="refresh-cw" size={16} color="#00F29D" />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.headerButton, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
            onPress={() => {
              triggerHaptic();
              onNavigate('settings');
            }}
          >
            <Icon name="settings" size={16} color="#00F29D" />
          </Pressable>
        </View>
        <HeaderFadeOverlay />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>




        {/* Active loading state with Skeleton Animation */}
        {loading && <SkeletonLoader />}

        {/* Error States */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={40} color="rgba(255, 107, 107, 0.6)" />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={({ pressed }) => [styles.retryButton, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
              onPress={() => {
                triggerHaptic();
                onRefresh();
              }}
            >
              <Icon name="refresh-cw" size={14} color="#00F29D" />
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* Calendar Data Display */}
        {!loading && !error && (
          <View>
            <CountdownDisplay nextPrayer={nextPrayer} isWindowActive={isWindowActive} />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>TODAY'S PRAYERS</Text>
              <View style={styles.dividerLine} />
            </View>

            {(() => {
              const currentDate = new Date();
              return prayerTimes.map(prayer =>
                nextPrayer ? (
                  <PrayerCard key={prayer.name} prayer={prayer} nextPrayer={nextPrayer} currentDate={currentDate} />
                ) : null
              );
            })()}
          </View>
        )}

        {/* Bottom Status Banner */}
        {!loading && !error && nextPrayer && (
          <View style={styles.footerContainer}>
            <View style={styles.footerDivider} />
            <Pressable
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              onPress={() => {
                triggerHaptic();
                Linking.openURL('https://github.com/syedarhamraza').catch(err =>
                  console.warn('Failed to open URL:', err)
                );
              }}
            >
              <Text style={styles.footerText}>
                DeenPulse • Crafted by <Text style={styles.footerLink}>Syed Arham Raza</Text>
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

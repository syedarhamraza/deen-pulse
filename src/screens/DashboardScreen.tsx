import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Animated, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { styles, triggerHaptic, HeaderFadeOverlay } from '../../App';
import { RootStackParamList } from '../navigation/types';
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
  onRefresh: () => void;
  loading: boolean;
  error: string | null;
  prayerTimes: PrayerTime[];
  nextPrayer: NextPrayerInfo | null;
}

export function DashboardScreen({
  onRefresh,
  loading,
  error,
  prayerTimes,
  nextPrayer,
}: DashboardScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isWindowActive } = useActiveWindowDetector(nextPrayer);
  const scrollRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = useCallback((e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    setShowScrollTop(offsetY > 300);
  }, []);
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
              navigation.navigate('settings');
            }}
          >
            <Icon name="settings" size={16} color="#00F29D" />
          </Pressable>
        </View>
        <HeaderFadeOverlay />
      </View>

      <ScrollView ref={scrollRef} onScroll={handleScroll} scrollEventThrottle={16} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>




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
                Syed Arham Raza · DeenPulse © {new Date().getFullYear()}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      {showScrollTop && (
        <Pressable
          onPress={() => {
            triggerHaptic();
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          }}
          style={({ pressed }) => [{
            position: 'absolute',
            bottom: 24,
            right: 20,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: '#00F29D',
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 6,
            shadowColor: '#00F29D',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            opacity: pressed ? 0.7 : 0.9,
          }]}
        >
          <Icon name="chevron-up" size={22} color="#0B0F12" />
        </Pressable>
      )}
    </View>
  );
}

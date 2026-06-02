import React from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { styles, triggerHaptic, HeaderFadeOverlay } from '../../App';

interface NotificationGuideScreenProps {
  onBack: () => void;
  onComplete: () => void;
}

export function NotificationGuideScreen({ onBack, onComplete }: NotificationGuideScreenProps) {
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
        <Text style={styles.subTitle}>Notification Guide</Text>
        <HeaderFadeOverlay />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.guideContainer}>
          {/* Step 1 */}
          <View style={styles.guideStepCard}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.stepDesc}>
              Enable primary notifications and ensure the 'Show Live Updates on Live Alerts' toggle switch is fully activated to allow status bar capsule rendering.
            </Text>
            <Image
              source={require('../assets/image_c9314d.jpeg')}
              style={styles.guideImage}
            />
          </View>

          {/* Step 2 */}
          <View style={styles.guideStepCard}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={styles.stepDesc}>
              Verify that Lock Screen permission is completely checked.
            </Text>
            <Image
              source={require('../assets/image_c93169.jpeg')}
              style={styles.guideImage}
            />
          </View>

          {/* Step 3 */}
          <View style={styles.guideStepCard}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <Text style={styles.stepDesc}>
              Set audio/vibration preferences and consider allowing alerts inside Do Not Disturb profiles for critical countdown consistency.
            </Text>
            <Image
              source={require('../assets/image_c93183.jpeg')}
              style={styles.guideImage}
            />
          </View>

          {/* Baseline button */}
          <Pressable
            style={({ pressed }) => [
              styles.guideCompleteBtn,
              { transform: [{ scale: pressed ? 0.97 : 1 }] }
            ]}
            onPress={() => {
              triggerHaptic();
              onComplete();
            }}
          >
            <Text style={styles.guideCompleteText}>I have configured these settings</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

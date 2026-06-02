import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { styles, triggerHaptic, HeaderFadeOverlay } from '../../App';

interface PrayerRulesScreenProps {
  onBack: () => void;
  onJuristicMethodPress: () => void;
  onCalculationRulePress: () => void;
  juristicMethodLabel: string;
  calculationRuleLabel: string;
}

export function PrayerRulesScreen({
  onBack,
  onJuristicMethodPress,
  onCalculationRulePress,
  juristicMethodLabel,
  calculationRuleLabel,
}: PrayerRulesScreenProps) {
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
        <Text style={styles.subTitle}>Prayer Rules</Text>
        <HeaderFadeOverlay />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.cardContainer}>
          {/* Card 1: Juristic Method */}
          <Pressable
            style={({ pressed }) => [styles.menuDetailCard, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => {
              triggerHaptic();
              onJuristicMethodPress();
            }}
          >
            <Text style={styles.menuDetailLabel}>Juristic Method (Asr)</Text>
            <Text style={styles.menuDetailValue}>{juristicMethodLabel}</Text>
            <Text style={styles.menuDetailDesc}>Select Standard (Shafi'i, Maliki, Hanbali) or Hanafi school rules.</Text>
          </Pressable>

          {/* Card 2: Calculation Rule */}
          <Pressable
            style={({ pressed }) => [styles.menuDetailCard, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => {
              triggerHaptic();
              onCalculationRulePress();
            }}
          >
            <Text style={styles.menuDetailLabel}>Calculation Rule</Text>
            <Text style={styles.menuDetailValue}>{calculationRuleLabel}</Text>
            <Text style={styles.menuDetailDesc}>Choose calculation method rules for regional timing math offsets.</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

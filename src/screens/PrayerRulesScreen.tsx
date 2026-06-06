import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { styles, triggerHaptic, HeaderFadeOverlay } from '../../App';

interface PrayerRulesScreenProps {
  onJuristicMethodPress: () => void;
  onCalculationRulePress: () => void;
  juristicMethodLabel: string;
  calculationRuleLabel: string;
}

export function PrayerRulesScreen({
  onJuristicMethodPress,
  onCalculationRulePress,
  juristicMethodLabel,
  calculationRuleLabel,
}: PrayerRulesScreenProps) {
  const navigation = useNavigation();
  return (
    <View style={styles.screenContainer}>
      <View style={styles.subHeader}>
        <Pressable
          onPress={() => {
            triggerHaptic();
            navigation.goBack();
          }}
          style={({ pressed }) => [styles.backButton, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
        >
          <Icon name="arrow-left" size={20} color="#00F29D" />
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

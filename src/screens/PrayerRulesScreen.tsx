/*
 * Copyright (C) 2026 Syed Arham Raza
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
        <Text style={styles.subTitle}>Calculation Methods</Text>
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
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

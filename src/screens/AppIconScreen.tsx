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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { styles as globalStyles, triggerHaptic, HeaderFadeOverlay } from '../../App';
import { changeAppIcon, getCurrentAppIcon, AppIconType } from '../utils/appIconHelper';

interface IconOption {
  id: AppIconType;
  title: string;
  description: string;
  image: any;
}

export function AppIconScreen() {
  const navigation = useNavigation();
  const [activeIcon, setActiveIcon] = useState<AppIconType>('default');
  const [applying, setApplying] = useState<AppIconType | null>(null);

  useEffect(() => {
    if (Platform.OS === 'android') {
      getCurrentAppIcon().then(setActiveIcon);
    }
  }, []);

  const handleSelectIcon = async (iconId: AppIconType) => {
    if (iconId === activeIcon || applying) return;
    
    triggerHaptic();
    setApplying(iconId);
    
    try {
      const success = await changeAppIcon(iconId);
      if (success) {
        setActiveIcon(iconId);
      }
    } catch (err) {
      console.warn('Failed to switch app icon', err);
    } finally {
      setApplying(null);
    }
  };

  const options: IconOption[] = [
    {
      id: 'default',
      title: 'Obsidian Mint',
      description: 'Sleek dark obsidian backdrop with clean, high-contrast mint accents.',
      image: require('../assets/icons/app_icon_default.png'),
    },
    {
      id: 'emerald',
      title: 'Glass Dome',
      description: 'Vibrant emerald green with translucent overlay and layered glass depths.',
      image: require('../assets/icons/app_icon_emerald.png'),
    },
    {
      id: 'blue',
      title: 'Oasis Glow',
      description: 'Deep oceanic cyan and sand gold accents, radiating a warm dune ambiance.',
      image: require('../assets/icons/app_icon_blue.png'),
    },
  ];

  return (
    <View style={globalStyles.screenContainer}>
      {/* Screen Header */}
      <View style={globalStyles.subHeader}>
        <Pressable
          onPress={() => {
            triggerHaptic();
            navigation.goBack();
          }}
          style={({ pressed }) => [globalStyles.backButton, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
        >
          <Icon name="arrow-left" size={20} color="#00F29D" />
        </Pressable>
        <Text style={globalStyles.subTitle}>App Icon</Text>
        <HeaderFadeOverlay />
      </View>

      <ScrollView contentContainerStyle={localStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={localStyles.introSection}>
          <Text style={localStyles.introTitle}>Customize Launcher</Text>
          <Text style={localStyles.introText}>
            Select a theme styling to dynamically update the DeenPulse icon on your device launcher and home screen.
          </Text>
        </View>

        <View style={localStyles.optionsContainer}>
          {options.map((opt) => {
            const isSelected = activeIcon === opt.id;
            const isThisApplying = applying === opt.id;
            
            return (
              <Pressable
                key={opt.id}
                onPress={() => handleSelectIcon(opt.id)}
                style={({ pressed }) => [
                  localStyles.iconCard,
                  isSelected && localStyles.iconCardSelected,
                  {
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                    opacity: applying && !isThisApplying ? 0.6 : 1,
                  }
                ]}
              >
                {/* Glow Backdrop for selected state */}
                {isSelected && <View style={localStyles.selectedGlow} />}

                {/* Left: Preview Image */}
                <View style={localStyles.previewContainer}>
                  <Image source={opt.image} style={localStyles.appIconImage} />
                </View>

                {/* Right: Info */}
                <View style={localStyles.infoContainer}>
                  <View style={localStyles.cardHeaderRow}>
                    <Text style={localStyles.cardTitle}>{opt.title}</Text>
                    {isSelected && (
                      <View style={localStyles.currentBadge}>
                        <Text style={localStyles.currentBadgeText}>ACTIVE</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={localStyles.cardDescription}>{opt.description}</Text>
                </View>

                {/* Selected Checkmark Indicator */}
                <View style={localStyles.checkIndicator}>
                  {isSelected ? (
                    <View style={localStyles.checkDotActive}>
                      <Icon name="check" size={12} color="#0B0F12" />
                    </View>
                  ) : (
                    <View style={localStyles.checkDotInactive} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {Platform.OS !== 'android' && (
          <View style={localStyles.platformWarning}>
            <Icon name="info" size={14} color="rgba(255, 255, 255, 0.4)" />
            <Text style={localStyles.platformWarningText}>
              Dynamic launcher icon switching is supported on Android devices.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
  },
  introSection: {
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  introText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    lineHeight: 18,
  },
  optionsContainer: {
    gap: 16,
    width: '100%',
  },
  iconCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  iconCardSelected: {
    backgroundColor: 'rgba(0, 242, 157, 0.02)',
    borderColor: 'rgba(0, 242, 157, 0.25)',
  },
  selectedGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 242, 157, 0.01)',
  },
  previewContainer: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  appIconImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
    justifyContent: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  currentBadge: {
    backgroundColor: 'rgba(0, 242, 157, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  currentBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#00F29D',
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    lineHeight: 16,
  },
  checkIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  checkDotInactive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'transparent',
  },
  checkDotActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00F29D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00F29D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  platformWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
    paddingHorizontal: 8,
    opacity: 0.7,
  },
  platformWarningText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    flex: 1,
  },
});

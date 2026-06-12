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
  ScrollView,
  Pressable,
  Linking,
  StyleSheet,
  ImageBackground,
  NativeModules,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { triggerHaptic, HeaderFadeOverlay } from '../../App';

const { PrayerCapsuleModule } = NativeModules;

const FEATURES = [
  { icon: 'compass', title: 'Prayer Tracking', desc: 'Accurate times with live capsule overlay' },
  { icon: 'watch', title: 'Wear OS Sync', desc: 'Seamless smartwatch companion' },
  { icon: 'bell', title: 'Smart Reminders', desc: '15-min window dynamic alerts' },
  { icon: 'shield', title: 'Privacy First', desc: 'Fully offline, no data leaves your device' },
];

export function AboutScreen() {
  const navigation = useNavigation();
  const [appVersion, setAppVersion] = useState<string>('...');

  useEffect(() => {
    // Load app version from native module
    (async () => {
      try {
        const ver = await PrayerCapsuleModule.getAppVersion();
        setAppVersion(ver || '1.0.0');
      } catch {
        setAppVersion('1.0.0');
      }
    })();

  }, []);

  const handleOpenGitHub = () => {
    triggerHaptic();
    Linking.openURL('https://github.com/syedarhamraza/deen-pulse').catch(() => { });
  };

  const handleOpenDeveloper = () => {
    triggerHaptic();
    Linking.openURL('https://github.com/syedarhamraza').catch(() => { });
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable
          onPress={() => {
            triggerHaptic();
            navigation.goBack();
          }}
          style={({ pressed }) => [s.backButton, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
        >
          <Icon name="arrow-left" size={20} color="#00F29D" />
        </Pressable>
        <Text style={s.headerTitle}>About</Text>
        <HeaderFadeOverlay />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Hero Section ─────────────────────────────── */}
        <ImageBackground
          source={require('../assets/icons/about_hero_gradient.png')}
          style={s.heroBg}
          imageStyle={s.heroBgImage}
          resizeMode="cover"
        >
          <View style={s.heroOverlay}>
            <Text style={s.appName}>DeenPulse</Text>
            <Text style={s.appTagline}>Live tracking on your status bar</Text>
            <View style={s.versionBadge}>

              <Text style={s.versionText}>Version {appVersion}</Text>
            </View>
          </View>
        </ImageBackground>

        {/* ── Feature Cards ────────────────────────────── */}
        <Text style={s.sectionLabel}>Key Features</Text>
        <View style={s.featuresGrid}>
          {FEATURES.map((f) => (
            <View key={f.icon} style={s.featureCard}>
              <View style={s.featureIconWrap}>
                <Icon name={f.icon} size={20} color="#00F29D" />
              </View>
              <Text style={s.featureTitle}>{f.title}</Text>
              <Text style={s.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>




        {/* ── Credits & Links ─────────────────────────── */}
        <Text style={s.sectionLabel}>Credits</Text>
        <View style={s.creditsCard}>
          <View style={s.creditsHeader}>
            <Icon name="code" size={18} color="#00F29D" />
            <Text style={s.creditsTitle}>Developer & Owner</Text>
          </View>
          <View style={s.divider} />
          <Pressable
            style={({ pressed }) => [s.creatorRow, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={handleOpenDeveloper}
          >
            <View>
              <Text style={s.creatorName}>Syed Arham Raza</Text>
              <Text style={s.creatorRole}>Web Developer</Text>
            </View>
            <Icon name="github" size={20} color="#00F29D" />
          </Pressable>
        </View>

        {/* GitHub Repo Link */}
        <Pressable
          style={({ pressed }) => [s.linkCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          onPress={handleOpenGitHub}
        >
          <View style={s.linkIconWrap}>
            <Icon name="github" size={20} color="#00F29D" />
          </View>
          <View style={s.linkTextWrap}>
            <Text style={s.linkTitle}>Source Code</Text>
            <Text style={s.linkDesc}>View on GitHub</Text>
          </View>
          <Icon name="external-link" size={14} color="rgba(255,255,255,0.3)" />
        </Pressable>

        {/* License Card */}
        <Pressable
          style={({ pressed }) => [s.linkCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          onPress={() => {
            triggerHaptic();
            Linking.openURL('https://www.gnu.org/licenses/gpl-3.0.html').catch(() => { });
          }}
        >
          <View style={s.linkIconWrap}>
            <Icon name="file-text" size={20} color="#00F29D" />
          </View>
          <View style={s.linkTextWrap}>
            <Text style={s.linkTitle}>License</Text>
            <Text style={s.linkDesc}>GNU GPL v3.0 (Open Source)</Text>
          </View>
          <Icon name="external-link" size={14} color="rgba(255,255,255,0.3)" />
        </Pressable>

        {/* Footer */}
        <Text style={s.footer}>
          Made with purpose · DeenPulse © {new Date().getFullYear()}
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },

  /* ── Hero ─────────────────────────────────────────── */
  heroBg: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 8,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 242, 157, 0.25)',
  },
  heroBgImage: {
    borderRadius: 24,
    opacity: 0.95,
  },
  heroOverlay: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(11, 15, 18, 0.2)',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  appTagline: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(11, 15, 18, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.2)',
  },
  versionText: {
    color: '#00F29D',
    fontSize: 12,
    fontWeight: '700',
  },

  /* ── Section Label ───────────────────────────────── */
  sectionLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 20,
    paddingLeft: 4,
  },

  /* ── Feature Cards ───────────────────────────────── */
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#111417',
    borderRadius: 16,
    padding: 16,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 242, 157, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 15,
  },





  /* ── Credits ─────────────────────────────────────── */
  creditsCard: {
    backgroundColor: '#111417',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
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

  /* ── Link Card ───────────────────────────────────── */
  linkCard: {
    backgroundColor: '#111417',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
    marginBottom: 8,
  },
  linkIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 242, 157, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  linkTextWrap: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  linkDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },

  /* ── Footer ──────────────────────────────────────── */
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.2)',
    marginTop: 24,
    marginBottom: 8,
  },
});

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

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  NativeModules,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { styles as globalStyles, triggerHaptic, HeaderFadeOverlay } from '../../App';
import {
  checkForUpdate,
  markUpdateChecked,
  openDownloadUrl,
  UpdateInfo,
} from '../utils/UpdateChecker';

const { PrayerCapsuleModule } = NativeModules;

export function UpdateCheckScreen() {
  const navigation = useNavigation();
  const [appVersion, setAppVersion] = useState<string>('...');
  const [checking, setChecking] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateInfo | null>(null);
  const [isUpToDate, setIsUpToDate] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Run the check on mount
  useEffect(() => {
    (async () => {
      let ver = '1.0.0';
      try {
        const nativeVer = await PrayerCapsuleModule.getAppVersion();
        ver = nativeVer || '1.0.0';
        setAppVersion(ver);
      } catch {
        setAppVersion('1.0.0');
      }
      runCheck(ver);
    })();
  }, []);

  // Pulsing animation loop
  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;
    if (checking) {
      pulseAnim.setValue(0);
      pulseLoop = Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      );
      pulseLoop.start();
    } else {
      pulseAnim.setValue(0);
    }
    return () => {
      if (pulseLoop) {
        pulseLoop.stop();
      }
    };
  }, [checking]);

  // Rotation animation loop
  useEffect(() => {
    let rotateLoop: Animated.CompositeAnimation | null = null;
    if (checking) {
      rotateAnim.setValue(0);
      rotateLoop = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotateLoop.start();
    } else {
      rotateAnim.setValue(0);
    }
    return () => {
      if (rotateLoop) {
        rotateLoop.stop();
      }
    };
  }, [checking]);

  const runCheck = async (currentVer: string) => {
    triggerHaptic();
    setChecking(true);
    setIsUpToDate(false);
    setUpdateResult(null);
    setErrorMsg(null);

    const startTime = Date.now();

    try {
      const result = await checkForUpdate(currentVer);
      await markUpdateChecked();

      // Ensure the beautiful scan animation is visible for at least 1.2s
      const elapsed = Date.now() - startTime;
      const minPlayTime = 1200;
      if (elapsed < minPlayTime) {
        await new Promise((resolve) => setTimeout(resolve, minPlayTime - elapsed));
      }

      if (result) {
        setUpdateResult(result);
      } else {
        setIsUpToDate(true);
      }
    } catch (err) {
      const elapsed = Date.now() - startTime;
      const minPlayTime = 1200;
      if (elapsed < minPlayTime) {
        await new Promise((resolve) => setTimeout(resolve, minPlayTime - elapsed));
      }
      setErrorMsg('Failed to check for updates. Please check your internet connection.');
    } finally {
      setChecking(false);
    }
  };

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });
  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={globalStyles.screenContainer}>
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
        <Text style={globalStyles.subTitle}>Software Update</Text>
        <HeaderFadeOverlay />
      </View>

      <ScrollView contentContainerStyle={localStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={localStyles.container}>
          
          {/* Visual Animation / Status Area */}
          <View style={localStyles.visualArea}>
            {checking && (
              <Animated.View
                style={[
                  localStyles.pulseCircle,
                  {
                    transform: [{ scale }],
                    opacity,
                  },
                ]}
              />
            )}
            
            <View style={[
              localStyles.mainCircle,
              isUpToDate && localStyles.mainCircleSuccess,
              updateResult && localStyles.mainCircleAlert,
              errorMsg && localStyles.mainCircleError,
            ]}>
              {checking ? (
                <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                  <Icon name="loader" size={42} color="#00F29D" />
                </Animated.View>
              ) : isUpToDate ? (
                <Icon name="check" size={46} color="#00F29D" />
              ) : updateResult ? (
                <Icon name="download" size={44} color="#00F29D" />
              ) : (
                <Icon name="alert-triangle" size={44} color="#FF6B6B" />
              )}
            </View>
          </View>

          {/* Status Text Area */}
          <View style={localStyles.textSection}>
            {checking ? (
              <>
                <Text style={localStyles.statusTitle}>Checking for Updates</Text>
                <Text style={localStyles.statusSubtitle}>Connecting to DeenPulse server...</Text>
              </>
            ) : isUpToDate ? (
              <>
                <Text style={localStyles.statusTitle}>You're Up to Date</Text>
                <Text style={localStyles.statusSubtitle}>DeenPulse v{appVersion} is currently the latest version.</Text>
              </>
            ) : updateResult ? (
              <>
                <Text style={localStyles.statusTitle}>Update Available</Text>
                <Text style={localStyles.statusSubtitle}>Version v{updateResult.version} is now available (Installed: v{appVersion})</Text>
              </>
            ) : (
              <>
                <Text style={[localStyles.statusTitle, { color: '#FF6B6B' }]}>Connection Failed</Text>
                <Text style={localStyles.statusSubtitle}>{errorMsg || 'Unable to fetch updates from GitHub.'}</Text>
              </>
            )}
          </View>

          {/* Content Area - Release notes card, error card, etc. */}
          {!checking && (
            <View style={localStyles.contentArea}>
              {updateResult && (
                <View style={localStyles.releaseCard}>
                  <Text style={localStyles.releaseTitle}>Release Notes</Text>
                  {updateResult.publishedAt && (
                    <Text style={localStyles.releaseDate}>
                      Released: {new Date(updateResult.publishedAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Text>
                  )}
                  <ScrollView style={localStyles.notesScroll} nestedScrollEnabled>
                    <Text style={localStyles.notesText}>{updateResult.releaseNotes}</Text>
                  </ScrollView>
                </View>
              )}

              {/* Action Buttons */}
              <View style={localStyles.buttonArea}>
                {updateResult ? (
                  <>
                    <Pressable
                      style={({ pressed }) => [
                        localStyles.actionButton,
                        { transform: [{ scale: pressed ? 0.97 : 1 }] }
                      ]}
                      onPress={() => {
                        triggerHaptic();
                        openDownloadUrl(updateResult.downloadUrl!);
                      }}
                    >
                      <Icon name="external-link" size={16} color="#0B0F12" />
                      <Text style={localStyles.actionButtonText}>Download & Install</Text>
                    </Pressable>
                    
                    <Pressable
                      style={({ pressed }) => [
                        localStyles.secondaryButton,
                        { transform: [{ scale: pressed ? 0.97 : 1 }] }
                      ]}
                      onPress={() => runCheck(appVersion)}
                    >
                      <Text style={localStyles.secondaryButtonText}>Check Again</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    style={({ pressed }) => [
                      localStyles.actionButton,
                      { transform: [{ scale: pressed ? 0.97 : 1 }] }
                    ]}
                    onPress={() => runCheck(appVersion)}
                  >
                    <Icon name="refresh-cw" size={16} color="#0B0F12" />
                    <Text style={localStyles.actionButtonText}>Check Again</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  container: {
    alignItems: 'center',
    paddingTop: 40,
    width: '100%',
  },
  visualArea: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 242, 157, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 242, 157, 0.4)',
  },
  mainCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 2,
    borderColor: 'rgba(0, 242, 157, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00F29D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  mainCircleSuccess: {
    borderColor: '#00F29D',
    backgroundColor: 'rgba(0, 242, 157, 0.05)',
  },
  mainCircleAlert: {
    borderColor: '#00F29D',
    backgroundColor: 'rgba(0, 242, 157, 0.05)',
  },
  mainCircleError: {
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
    shadowColor: '#FF6B6B',
  },
  textSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
    paddingHorizontal: 16,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },
  contentArea: {
    width: '100%',
    alignItems: 'center',
  },
  releaseCard: {
    width: '100%',
    backgroundColor: '#111417',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
    padding: 20,
    marginBottom: 24,
  },
  releaseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  releaseDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 12,
  },
  notesScroll: {
    maxHeight: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  notesText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  buttonArea: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#00F29D',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#00F29D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: '#0B0F12',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 242, 157, 0.3)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#00F29D',
    fontSize: 15,
    fontWeight: '700',
  },
});

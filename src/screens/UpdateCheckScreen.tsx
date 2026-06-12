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
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import Icon from 'react-native-vector-icons/Feather';
import { styles as globalStyles, triggerHaptic, HeaderFadeOverlay } from '../../App';
import {
  checkForUpdate,
  markUpdateChecked,
  openDownloadUrl,
  UpdateInfo,
} from '../utils/UpdateChecker';

const { PrayerCapsuleModule } = NativeModules;

interface DeviceInfo {
  deviceModel: string;
  deviceBrand: string;
  androidVersion: string;
  sdkVersion: number;
  cpuAbi: string;
  hardware: string;
  ram: string;
}

type ScreenStatus = 'idle' | 'checking' | 'up-to-date' | 'update-available' | 'error';

export function UpdateCheckScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [appVersion, setAppVersion] = useState<string>('...');
  const [status, setStatus] = useState<ScreenStatus>('idle');
  const [updateResult, setUpdateResult] = useState<UpdateInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Load app version and device info on mount, but do NOT auto-scan
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

      try {
        if (PrayerCapsuleModule.getDeviceInfo) {
          const info = await PrayerCapsuleModule.getDeviceInfo();
          setDeviceInfo(info);
        }
      } catch (err) {
        console.warn('Failed to load device info', err);
      }
    })();
  }, []);

  // Pulsing animation loop
  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;
    if (status === 'checking') {
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
  }, [status]);

  // Rotation animation loop
  useEffect(() => {
    let rotateLoop: Animated.CompositeAnimation | null = null;
    if (status === 'checking') {
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
  }, [status]);

  const runCheck = async (currentVer: string) => {
    triggerHaptic();
    setStatus('checking');
    setUpdateResult(null);
    setErrorMsg(null);

    const startTime = Date.now();

    try {
      const result = await checkForUpdate(currentVer);
      await markUpdateChecked();

      // Ensure the scan animation plays for at least 1.5s for visual feedback
      const elapsed = Date.now() - startTime;
      const minPlayTime = 1500;
      if (elapsed < minPlayTime) {
        await new Promise<void>((resolve) => setTimeout(resolve, minPlayTime - elapsed));
      }

      if (result) {
        setUpdateResult(result);
        setStatus('update-available');
      } else {
        setStatus('up-to-date');
      }
    } catch (err) {
      const elapsed = Date.now() - startTime;
      const minPlayTime = 1500;
      if (elapsed < minPlayTime) {
        await new Promise<void>((resolve) => setTimeout(resolve, minPlayTime - elapsed));
      }
      setErrorMsg('Failed to check for updates. Please check your internet connection.');
      setStatus('error');
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

  const getDisplayBrandAndModel = (brand: string, model: string) => {
    if (!brand && !model) return 'Unknown Device';
    
    let displayBrand = brand ? brand.trim() : '';
    if (displayBrand) {
      displayBrand = displayBrand
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      if (displayBrand.toLowerCase() === 'oneplus') {
        displayBrand = 'OnePlus';
      }
    }
    
    let displayModel = model ? model.trim() : '';
    if (displayModel.toLowerCase().startsWith('sdk_gphone') || displayModel.toLowerCase().startsWith('gphone')) {
      displayModel = 'Android Emulator';
    }
    
    if (!displayBrand) return displayModel;
    if (!displayModel) return displayBrand;
    
    if (displayModel.toLowerCase().startsWith(displayBrand.toLowerCase())) {
      return displayModel;
    }
    
    return `${displayBrand} ${displayModel}`;
  };

  const getDisplayProcessor = (hardware: string, cpuAbi: string) => {
    const hw = hardware.toLowerCase().trim();
    let brand = hardware;
    
    if (hw.includes('qcom') || hw.includes('qualcomm')) {
      brand = 'Qualcomm';
    } else if (hw.includes('mt') || hw.includes('mediatek') || hw.includes('helio') || hw.includes('dimensity')) {
      brand = 'MediaTek';
    } else if (hw.includes('exynos') || hw.includes('s5e') || hw.includes('universal')) {
      brand = 'Samsung Exynos';
    } else if (hw.includes('tensor') || hw.includes('gs')) {
      brand = 'Google Tensor';
    } else if (hw.includes('kirin') || hw.includes('hi')) {
      brand = 'Huawei Kirin';
    } else if (hw.includes('goldfish') || hw.includes('ranchu') || hw.includes('gphone')) {
      brand = 'Virtual CPU';
    } else if (hardware) {
      brand = hardware.charAt(0).toUpperCase() + hardware.slice(1);
    } else {
      brand = 'Unknown';
    }
    
    return `${brand} (${cpuAbi})`;
  };

  const renderCurrentVersionCard = () => {
    return (
      <View style={localStyles.versionCard}>
        <View style={localStyles.versionRow}>
          <View style={localStyles.versionCol}>
            <Text style={localStyles.versionLabel}>CURRENT VERSION</Text>
            <Text style={localStyles.versionValue}>v{appVersion}</Text>
          </View>
          <View style={localStyles.versionCol}>
            <Text style={localStyles.versionLabel}>BUILD DATE</Text>
            <Text style={localStyles.versionValue}>June 12, 2026</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderChangelogCard = () => {
    if (!updateResult) return null;
    
    let displayDate = 'June 12, 2026';
    if (updateResult.publishedAt) {
      try {
        const d = new Date(updateResult.publishedAt);
        displayDate = d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch {
        // fallback
      }
    }

    const notes = updateResult.releaseNotes || '';
    const bulletLines = notes
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('###') && !l.startsWith('##'));

    return (
      <View style={localStyles.changelogContainer}>
        <View style={localStyles.changelogHeaderRow}>
          <Text style={localStyles.changelogLabel}>CHANGELOG</Text>
          <View style={localStyles.releaseBadge}>
            <Text style={localStyles.releaseBadgeText}>RELEASED: {displayDate.toUpperCase()}</Text>
          </View>
        </View>

        <View style={localStyles.changelogCard}>
          <View style={localStyles.changelogCardHeader}>
            <Icon name="check-circle" size={16} color="#00F29D" />
            <Text style={localStyles.changelogCardTitle}>What's New</Text>
          </View>

          <View style={localStyles.changelogList}>
            {bulletLines.map((line, idx) => {
              const cleanedLine = line.replace(/^[\s*\-•+]+/g, '').trim();
              return (
                <View key={idx} style={localStyles.changelogItem}>
                  <View style={localStyles.changelogBulletDot} />
                  <Text style={localStyles.changelogBulletText}>{cleanedLine}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  const renderSystemHealthHeader = () => {
    const isCompatible = deviceInfo ? deviceInfo.sdkVersion >= 24 : true;
    return (
      <View style={localStyles.healthHeaderRow}>
        <Text style={localStyles.healthLabel}>SYSTEM HEALTH</Text>
        <View style={localStyles.healthStatusRow}>
          <View style={[localStyles.healthStatusDot, { backgroundColor: isCompatible ? '#00F29D' : '#FF6B6B' }]} />
          <Text style={[localStyles.healthStatusText, { color: isCompatible ? '#00F29D' : '#FF6B6B' }]}>
            {isCompatible ? 'Compatible' : 'Unsupported'}
          </Text>
        </View>
      </View>
    );
  };

  const renderDiagnosticsGrid = () => {
    if (!deviceInfo) return null;
    return (
      <View style={localStyles.grid}>
        <View style={localStyles.gridRow}>
          {/* Block 1: Device */}
          <View style={localStyles.gridBlock}>
            <View style={localStyles.blockHeader}>
              <Icon name="smartphone" size={12} color="#00F29D" />
              <Text style={localStyles.blockLabel}>DEVICE</Text>
            </View>
            <Text style={localStyles.blockValue} numberOfLines={2}>
              {getDisplayBrandAndModel(deviceInfo.deviceBrand, deviceInfo.deviceModel)}
            </Text>
          </View>
          
          {/* Block 2: System OS */}
          <View style={localStyles.gridBlock}>
            <View style={localStyles.blockHeader}>
              <Icon name="layers" size={12} color="#00F29D" />
              <Text style={localStyles.blockLabel}>SYSTEM OS</Text>
            </View>
            <Text style={localStyles.blockValue} numberOfLines={2}>
              Android {deviceInfo.androidVersion} (API {deviceInfo.sdkVersion})
            </Text>
          </View>
        </View>
        
        <View style={localStyles.gridRow}>
          {/* Block 3: Processor */}
          <View style={localStyles.gridBlock}>
            <View style={localStyles.blockHeader}>
              <Icon name="cpu" size={12} color="#00F29D" />
              <Text style={localStyles.blockLabel}>PROCESSOR</Text>
            </View>
            <Text style={localStyles.blockValue} numberOfLines={2}>
              {getDisplayProcessor(deviceInfo.hardware, deviceInfo.cpuAbi)}
            </Text>
          </View>
          
          {/* Block 4: RAM */}
          <View style={localStyles.gridBlock}>
            <View style={localStyles.blockHeader}>
              <Icon name="database" size={12} color="#00F29D" />
              <Text style={localStyles.blockLabel}>SYSTEM RAM</Text>
            </View>
            <Text style={localStyles.blockValue} numberOfLines={2}>
              {deviceInfo.ram}
            </Text>
          </View>
        </View>
      </View>
    );
  };



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
        <Text style={globalStyles.subTitle}>Software Update</Text>
        <HeaderFadeOverlay />
      </View>

      <ScrollView contentContainerStyle={localStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={localStyles.container}>
          
          {/* Visual Holographic Scanner Area */}
          <View style={localStyles.visualArea}>
            {/* Concentric Pulsing Wave */}
            {status === 'checking' && (
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

            {/* Concentric Rotating Dashed Telemetry Track */}
            {status === 'checking' && (
              <Animated.View
                style={[
                  localStyles.telemetryTrack,
                  {
                    transform: [{ rotate: rotation }],
                  },
                ]}
              />
            )}
            
            {/* Core Icon Circle */}
            <View style={[
              localStyles.mainCircle,
              status === 'up-to-date' && localStyles.mainCircleSuccess,
              status === 'update-available' && localStyles.mainCircleAlert,
              status === 'error' && localStyles.mainCircleError,
            ]}>
              {status === 'checking' ? (
                <Icon name="pause" size={32} color="#00F29D" />
              ) : status === 'up-to-date' ? (
                <Icon name="check" size={44} color="#00F29D" />
              ) : status === 'update-available' ? (
                <Icon name="download" size={42} color="#00F29D" />
              ) : status === 'error' ? (
                <Icon name="alert-triangle" size={42} color="#FF6B6B" />
              ) : (
                <Icon name="refresh-cw" size={36} color="#00F29D" />
              )}
            </View>
          </View>

          {/* Status Text Area */}
          <View style={localStyles.textSection}>
            {status === 'checking' ? (
              <>
                <Text style={localStyles.statusTitle}>Checking for Updates</Text>
                <Text style={localStyles.statusSubtitle}>Scanning for delta packages...</Text>
                <Text style={localStyles.loaderDots}>•••</Text>
              </>
            ) : status === 'up-to-date' ? (
              <>
                <Text style={localStyles.statusTitle}>You're Up to Date</Text>
                <Text style={localStyles.statusSubtitle}>DeenPulse v{appVersion} is currently the latest version.</Text>
              </>
            ) : status === 'update-available' && updateResult ? (
              <>
                <Text style={localStyles.statusTitle}>Update Available</Text>
                <Text style={localStyles.statusSubtitle}>Version v{updateResult.version} is now available</Text>
                <Text style={localStyles.statusSubtitleMini}>(Currently on v{appVersion})</Text>
              </>
            ) : status === 'error' ? (
              <>
                <Text style={[localStyles.statusTitle, { color: '#FF6B6B' }]}>Connection Failed</Text>
                <Text style={localStyles.statusSubtitle}>{errorMsg || 'Unable to fetch updates from GitHub.'}</Text>
              </>
            ) : (
              <>
                <Text style={localStyles.statusTitle}>Software Update</Text>
                <Text style={localStyles.statusSubtitle}>Check for the latest version of DeenPulse.</Text>
              </>
            )}
          </View>

          {/* Content Area - Version Info, Changelogs, Diagnostics Grid, Buttons */}
          <View style={localStyles.contentArea}>
            
            {/* Checking: show version card only */}
            {status === 'checking' && (
              <>
                {renderCurrentVersionCard()}
              </>
            )}

            {/* Idle: show version card + grid */}
            {status === 'idle' && (
              <>
                {renderCurrentVersionCard()}
                {deviceInfo && (
                  <>
                    {renderSystemHealthHeader()}
                    {renderDiagnosticsGrid()}
                  </>
                )}
              </>
            )}

            {/* Up to Date: show version card + grid */}
            {status === 'up-to-date' && (
              <>
                {renderCurrentVersionCard()}
                {deviceInfo && (
                  <>
                    {renderSystemHealthHeader()}
                    {renderDiagnosticsGrid()}
                  </>
                )}
              </>
            )}

            {/* Error: show version card + grid */}
            {status === 'error' && (
              <>
                {renderCurrentVersionCard()}
                {deviceInfo && (
                  <>
                    {renderSystemHealthHeader()}
                    {renderDiagnosticsGrid()}
                  </>
                )}
              </>
            )}

            {/* Update Available: show changelog + grid */}
            {status === 'update-available' && (
              <>
                {renderChangelogCard()}
                {deviceInfo && (
                  <>
                    {renderSystemHealthHeader()}
                    {renderDiagnosticsGrid()}
                  </>
                )}
              </>
            )}

            {/* Action Buttons Area */}
            <View style={localStyles.buttonArea}>
              {status === 'checking' ? (
                <View style={localStyles.checkingButtonsRow}>
                  <Pressable
                    style={({ pressed }) => [
                      localStyles.cancelButton,
                      { transform: [{ scale: pressed ? 0.97 : 1 }] }
                    ]}
                    onPress={() => {
                      triggerHaptic();
                      setStatus('idle');
                    }}
                  >
                    <Text style={localStyles.cancelButtonText}>CANCEL CHECK</Text>
                  </Pressable>
                  
                  <Pressable
                    disabled
                    style={[localStyles.pauseButton, { opacity: 0.4 }]}
                  >
                    <Text style={localStyles.pauseButtonText}>PAUSE</Text>
                  </Pressable>
                </View>
              ) : status === 'update-available' && updateResult ? (
                <>
                  <Pressable
                    style={({ pressed }) => [
                      localStyles.actionButton,
                      { transform: [{ scale: pressed ? 0.97 : 1 }] }
                    ]}
                    onPress={() => {
                      triggerHaptic();
                      if (updateResult.downloadUrl) {
                        openDownloadUrl(updateResult.downloadUrl);
                      }
                    }}
                  >
                    <Icon name="download" size={16} color="#0B0F12" />
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
                  <Text style={localStyles.actionButtonText}>
                    {status === 'up-to-date' || status === 'error' ? 'Check Again' : 'CHECK FOR UPDATES'}
                  </Text>
                </Pressable>
              )}
            </View>

          </View>
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
    paddingTop: 10,
    width: '100%',
  },
  visualArea: {
    height: 156,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
    marginBottom: 5,
  },
  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 242, 157, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 242, 157, 0.3)',
  },
  telemetryTrack: {
    position: 'absolute',
    width: 146,
    height: 146,
    borderRadius: 73,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 242, 157, 0.2)',
  },
  mainCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(17, 20, 23, 0.8)',
    borderWidth: 2,
    borderColor: 'rgba(0, 242, 157, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00F29D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  mainCircleSuccess: {
    borderColor: '#00F29D',
    backgroundColor: 'rgba(0, 242, 157, 0.04)',
  },
  mainCircleAlert: {
    borderColor: '#00F29D',
    backgroundColor: 'rgba(0, 242, 157, 0.04)',
  },
  mainCircleError: {
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.04)',
    shadowColor: '#FF6B6B',
  },
  textSection: {
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  statusSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    lineHeight: 18,
  },
  statusSubtitleMini: {
    fontSize: 11,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 4,
  },
  loaderDots: {
    fontSize: 20,
    color: '#00F29D',
    marginTop: 4,
    letterSpacing: 2,
  },
  contentArea: {
    width: '100%',
    alignItems: 'center',
  },
  versionCard: {
    width: '100%',
    backgroundColor: '#111417',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
    padding: 20,
    marginBottom: 24,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  versionCol: {
    flex: 1,
  },
  versionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  versionValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  changelogContainer: {
    width: '100%',
    marginBottom: 24,
  },
  changelogHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  changelogLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 0.8,
  },
  releaseBadge: {
    backgroundColor: 'rgba(0, 242, 157, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  releaseBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00F29D',
    letterSpacing: 0.4,
  },
  changelogCard: {
    backgroundColor: '#111417',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
    padding: 20,
  },
  changelogCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  changelogCardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  changelogList: {
    gap: 12,
  },
  changelogItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  changelogBulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00F29D',
    marginTop: 6.5,
  },
  changelogBulletText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
    flex: 1,
  },
  healthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  healthLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 0.8,
  },
  healthStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  healthStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  healthStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  grid: {
    gap: 12,
    width: '100%',
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridBlock: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 157, 0.15)',
    padding: 16,
    minHeight: 86,
    justifyContent: 'flex-start',
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  blockLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 0.8,
  },
  blockValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  buttonArea: {
    width: '100%',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#00F29D',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#00F29D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonText: {
    color: '#0B0F12',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 242, 157, 0.25)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#00F29D',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  checkingButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 242, 157, 0.25)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#00F29D',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pauseButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseButtonText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

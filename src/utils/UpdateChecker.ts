import { NativeModules, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { PrayerCapsuleModule } = NativeModules;

export const UPDATE_CHECK_FREQUENCY_KEY = '@deenpulse_update_check_frequency';
export const LAST_UPDATE_CHECK_KEY = '@deenpulse_last_update_check';

export interface UpdateInfo {
  version: string;
  releaseNotes: string;
  downloadUrl: string | null;
  publishedAt: string;
}

// Default GitHub repo - user should change this
const GITHUB_REPO = 'syedarhamraza/DeenPulse';
const RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

function compareVersions(a: string, b: string): number {
  const partsA = a.replace(/^v/, '').split('.').map(Number);
  const partsB = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

export async function checkForUpdate(currentVersion: string): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(RELEASES_URL, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });
    if (!res.ok) return null;
    const release = await res.json();
    const latestVersion = (release.tag_name || '').replace(/^v/, '');
    
    if (compareVersions(latestVersion, currentVersion) > 0) {
      return {
        version: latestVersion,
        releaseNotes: release.body || 'No release notes available.',
        downloadUrl: release.assets?.[0]?.browser_download_url || release.html_url || null,
        publishedAt: release.published_at || '',
      };
    }
    return null;
  } catch (e) {
    console.warn('Update check failed:', e);
    return null;
  }
}

export async function shouldCheckForUpdate(): Promise<boolean> {
  try {
    const lastCheck = await AsyncStorage.getItem(LAST_UPDATE_CHECK_KEY);
    const frequency = await AsyncStorage.getItem(UPDATE_CHECK_FREQUENCY_KEY);
    
    if (!lastCheck) return true;
    
    const lastCheckDate = new Date(lastCheck).getTime();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    let intervalDays = 3; // default
    if (frequency === '1') intervalDays = 1;
    else if (frequency === '3') intervalDays = 3;
    else if (frequency === '7') intervalDays = 7;
    
    return (now - lastCheckDate) >= (intervalDays * dayMs);
  } catch {
    return true;
  }
}

export async function markUpdateChecked(): Promise<void> {
  await AsyncStorage.setItem(LAST_UPDATE_CHECK_KEY, new Date().toISOString());
}

export function openDownloadUrl(url: string): void {
  Linking.openURL(url).catch(() => {});
}

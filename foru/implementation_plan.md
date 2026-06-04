# DeenPulse v2 — Production-Grade Refactor & CI/CD Pipeline

Complete multi-phase engineering plan covering Copilot PR bug fixes, OEM notification overhaul, UI redesigns, WearOS modernization, version management, OTA updates, and a full CI/CD pipeline.

> [!IMPORTANT]
> **Preservation Guarantee**: All existing Category 1 (OPPO/OnePlus/Realme) and Category 2 (Vivo/iQOO) notification behavior is FROZEN. No changes will be made to the Cat1/Cat2 code paths in `PrayerCapsuleForegroundService.kt` beyond the targeted Vivo string-formatting fix. All new logic is additive or scoped to Cat3 only.

---

## User Review Required

### Choice 1: Qibla / Kaaba Locator Tile

> [!NOTE]
> This would be a Wear OS tile showing the direction to the Kaaba using the watch's compass sensor + GPS. Battery impact can be minimized by using one-shot sensor reads only when the tile is visible (not continuous polling).

- **Option A (Recommended)**: Include a battery-efficient Qibla Compass tile for Wear OS. Uses `SensorManager.getDefaultSensor(TYPE_ROTATION_VECTOR)` with `SENSOR_DELAY_UI` registered only during tile visibility, plus a one-shot `FusedLocationProviderClient.getLastLocation()`. No background drain.
- **Option B**: Skip the Qibla tile entirely for now — ship it as a v2.1 feature.

### Choice 2: Webhook Target for CI/CD Notifications

- **Option A**: Discord webhook (simpler, free, embed-rich cards)
- **Option B**: Slack webhook (Incoming Webhooks app)
- **Option C**: Both Discord and Slack

### Choice 3: Version Numbering Scheme

- **Option A (Recommended)**: Semantic Versioning `MAJOR.MINOR.PATCH` (e.g. `1.1.0`), with `versionCode` auto-incremented on every CI build using the GitHub Actions run number.
- **Option B**: CalVer `YYYY.MM.BUILD` (e.g. `2026.06.1`)

### Choice 4: Mosque Dome Asset for Onboarding

I need you to provide a monochrome mosque dome SVG/PNG icon, OR I can generate one using the image generation tool. The icon will be used as:
- Onboarding header visual anchor (approx 120×120dp)
- About screen branding icon

What format do you prefer?
- **Option A**: I generate a custom monochrome mosque dome silhouette icon using the image tool
- **Option B**: You provide your own SVG/PNG file and tell me where to find it

### Choice 5: Additional Features You Might Be Missing

Based on my analysis, these features are common in production prayer apps but are **not** present in DeenPulse:

| Feature | Effort | Value |
|---------|--------|-------|
| **Hijri Date Display** on dashboard | Low | High — Islamic calendar date under greeting |
| **Prayer Streak Tracker** | Medium | High — daily prayer completion tracking |
| **Widget** (Android home screen) | High | Very High — glanceable prayer info without opening app |
| **Jummah/Friday Reminder** | Low | Medium — special notification for Friday prayer |
| **Dark/Light Theme Toggle** | Medium | Medium — some users prefer light mode |
| **Multi-language Support** (Arabic, Urdu) | High | High — essential for global Islamic audience |

Would you like any of these included in the plan?

---

## Open Questions

> [!IMPORTANT]
> **Wear OS applicationId conflict**: Both `:app` and `:wear` modules currently use `applicationId 'com.deenpulse'`. For Google Play Store distribution, they MUST have different IDs (e.g., `com.deenpulse` for phone and `com.deenpulse.wear` for watch). Should I fix this now?

> [!WARNING]
> **Cat3 AlarmManager 15-min reminder**: When the foreground service is killed for Cat3 devices, users will lose the live notification countdown entirely. They will ONLY get a single notification 15 minutes before each prayer. Is this acceptable, or would you prefer an option to keep the standard ongoing notification (without capsule promotion) as a toggle?

---

## Proposed Changes

### Phase 1 — Copilot PR Bug Fixes (6 Issues)

> Surgical, line-level fixes to resolve all 6 Copilot code review findings. Zero risk to Cat1/Cat2 functionality.

---

#### [MODIFY] [prayerEngine.ts](file:///e:/New%20folder/deen-pulse/src/utils/prayerEngine.ts)

**Bug #1 — Premature "Active" Badge** (Line 127)

Current: `if (minutes <= 0 && seconds <= 0)` → shows "Active" up to 999ms early because `Math.floor` rounds down.

Fix: Change to strict less-than so countdown renders a clean `0s` state before transitioning:
```diff
-  if (minutes <= 0 && seconds <= 0) {
+  if (minutes < 0 || seconds < 0) {
     return 'Active';
   }
```

---

#### [MODIFY] [useActiveWindowDetector.ts](file:///e:/New%20folder/deen-pulse/src/hooks/useActiveWindowDetector.ts)

**Bug #2 — Broken Active Window State Trigger** (Line 31)

Current: `if (remainingMinutes === 0 && remainingSeconds === 0)` — exact match that can be skipped if a 1-second tick drifts past zero.

Fix: Use `<= 0` as a resilient catch-all:
```diff
-    if (remainingMinutes === 0 && remainingSeconds === 0) {
+    if (remainingMinutes <= 0 && remainingSeconds <= 0) {
```

---

#### [MODIFY] [NotificationsScreen.tsx](file:///e:/New%20folder/deen-pulse/src/screens/NotificationsScreen.tsx)

**Bug #3 — Unloaded Profile Layout Bleed** (Line 89)

Current: `deviceCategory !== 3` resolves to `true` when `deviceCategory` is `undefined` (profile not loaded yet), flashing the premium capsule option on Cat3 phones.

Fix: Explicitly check for supported categories:
```diff
-          {deviceCategory !== 3 && (
+          {(deviceCategory === 1 || deviceCategory === 2) && (
```

---

#### [MODIFY] [deviceProfiles.ts](file:///e:/New%20folder/deen-pulse/src/utils/deviceProfiles.ts)

**Bug #4 — Inconsistent Profile Debug Telemetry** (Line 77)

Current: `manufacturer: brandLower === detected.brand ? detected.manufacturer : selectedBrand` — overwrites hardware manufacturer with UI brand string when user manually selects a different brand.

Fix: Always preserve the real hardware manufacturer:
```diff
   return {
     brand: brandLower,
-    manufacturer: brandLower === detected.brand ? detected.manufacturer : selectedBrand,
+    manufacturer: detected.manufacturer,
     category,
   };
```

---

#### [MODIFY] [usePrayerCountdown.ts](file:///e:/New%20folder/deen-pulse/src/hooks/usePrayerCountdown.ts)

**Bug #6 — Non-Functional Auto-Sync Toggle** (Line 42-48)

Current: `syncToWear` is called unconditionally regardless of the auto-sync toggle setting.

Fix: Read the `@deenpulse_auto_sync_wear` key before syncing:
```diff
       // Sync to Wear OS watch if location coordinates are available
       if (location) {
-        PrayerCapsuleModule?.syncToWear(prayersJson, location.latitude, location.longitude);
-        AsyncStorage.setItem('@deenpulse_last_wear_sync', new Date().toISOString()).catch(() => {});
+        AsyncStorage.getItem('@deenpulse_auto_sync_wear').then(val => {
+          if (val === 'true' || val === null) { // Default on
+            PrayerCapsuleModule?.syncToWear(prayersJson, location.latitude, location.longitude);
+            AsyncStorage.setItem('@deenpulse_last_wear_sync', new Date().toISOString()).catch(() => {});
+          }
+        }).catch(() => {});
       }
```

---

#### [MODIFY] [useGestureNavigation.ts](file:///e:/New%20folder/deen-pulse/src/hooks/useGestureNavigation.ts)

**Navigation Logic Warning**: Currently the initial screen is always `'dashboard'`, but if the user is on the onboarding wizard, the back-press handler sees `'dashboard'` as the screen context until the app mounts.

Fix: Accept an `initialScreen` parameter and use it:
```diff
-export function useGestureNavigation() {
-  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
+export function useGestureNavigation(initialScreen: Screen = 'dashboard') {
+  const [currentScreen, setCurrentScreen] = useState<Screen>(initialScreen);
```

Then in `App.tsx`, pass `'onboarding'` when onboarding is not complete:
```typescript
const { currentScreen, navigateTo, goBack } = useGestureNavigation(
  isOnboardingComplete ? 'dashboard' : 'onboarding'
);
```

---

### Phase 2 — Vivo OriginOS Notification Animation Fix

> Strips the custom string sub-formatting that conflicts with Vivo's system UI layout parser, reverting to pure native chronometer rendering.

---

#### [MODIFY] [PrayerCapsuleForegroundService.kt](file:///e:/New%20folder/deen-pulse/android/app/src/main/java/com/deenpulse/PrayerCapsuleForegroundService.kt)

**Root Cause**: The `getNotificationTexts()` method (Lines 306-352) generates complex conditional string concatenation for Vivo (e.g., `"$currentPrayerName in $countdownStr"`) which Vivo's OriginOS notification parser cannot layout properly, causing animation displacement.

**Fix**: For Cat2 (Vivo), strip ALL custom text concatenation from `contentTitle` and `contentText`. Use only simple, separate strings and rely entirely on the native chronometer for countdown rendering:

```diff
  // In getNotificationTexts():
  if (activePrayerName != null) {
-     contentTitle = if (isVivo) "Active" else "Prayer Active: $activePrayerName"
-     contentText = if (isVivo) "Prayer Active: $activePrayerName" else "Active"
+     contentTitle = "Prayer Active: $activePrayerName"
+     contentText = "Active"
- } else if (isVivo) {
-     contentTitle = "Next Prayer:"
-     contentText = when (notificationStyle) {
-         "with_countdown" -> "$currentPrayerName in $countdownStr"
-         "with_time" -> "$currentPrayerName at $formattedTime"
-         else -> currentPrayerName
-     }
  } else {
      contentTitle = "Next Prayer: $currentPrayerName"
-     // ... existing Cat1/Cat3 logic
+     contentText = when (notificationStyle) {
+         "with_time" -> formattedTime
+         "with_countdown" -> countdownStr
+         else -> ""
+     }
  }
- val useChronometer = !isVivo && (notificationStyle != "with_countdown") && (activePrayerName == null)
+ val useChronometer = (notificationStyle != "with_countdown") && (activePrayerName == null)
```

This ensures Vivo gets the same clean `setContentTitle("Next Prayer: Asr")` + native chronometer approach that works on Cat1, instead of custom text layouts that OriginOS rejects.

---

### Phase 3 — Category 3 Device Notification Overhaul

> For Samsung, Xiaomi, Pixel, and all non-OPlus/Vivo devices: replace the continuous foreground service with scheduled AlarmManager reminders.

---

#### [MODIFY] [PrayerCapsuleForegroundService.kt](file:///e:/New%20folder/deen-pulse/android/app/src/main/java/com/deenpulse/PrayerCapsuleForegroundService.kt)

Add a Cat3 early-exit in `onStartCommand()` that schedules `AlarmManager` reminders instead of starting the foreground service:

- When `getDeviceCategory() == 3`:
  1. Parse the prayer schedule JSON
  2. For each prayer, schedule an `AlarmManager.setExactAndAllowWhileIdle()` alarm 15 minutes before the prayer time
  3. Return `START_NOT_STICKY` (do NOT start foreground)
  4. The alarm fires a `BroadcastReceiver` that posts a standard one-shot notification

#### [NEW] [PrayerReminderReceiver.kt](file:///e:/New%20folder/deen-pulse/android/app/src/main/java/com/deenpulse/PrayerReminderReceiver.kt)

New `BroadcastReceiver` that fires when AlarmManager triggers:
- Reads the prayer name from the intent extras
- Posts a standard notification: "Asr in 15 minutes"
- Auto-cancels after tap
- Uses the existing `deenpulse_prayer_alert` channel

#### [MODIFY] [AndroidManifest.xml](file:///e:/New%20folder/deen-pulse/android/app/src/main/AndroidManifest.xml)

Register the new receiver:
```xml
<receiver android:name=".PrayerReminderReceiver" android:exported="false" />
```

Add `SCHEDULE_EXACT_ALARM` permission for API 31+:
```xml
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
```

#### [MODIFY] [PrayerCapsuleModule.kt](file:///e:/New%20folder/deen-pulse/android/app/src/main/java/com/deenpulse/PrayerCapsuleModule.kt)

Add method `scheduleReminders(prayersJson)` that Cat3 devices call instead of `updateLiveCapsule()`.

#### [MODIFY] [usePrayerCountdown.ts](file:///e:/New%20folder/deen-pulse/src/hooks/usePrayerCountdown.ts)

Add device category awareness: if `deviceCategory === 3`, call `PrayerCapsuleModule?.scheduleReminders(prayersJson)` instead of `updateLiveCapsule()`.

#### [MODIFY] [NotificationsScreen.tsx](file:///e:/New%20folder/deen-pulse/src/screens/NotificationsScreen.tsx)

When `deviceCategory === 3`:
- Hide "Status Bar Capsule Style" picker (already done by Bug #3 fix)
- Hide ongoing notification style picker
- Show an "Athan Reminder (15m prior)" configuration card instead
- Add a toggle for enabling/disabling the 15-minute reminder

#### [MODIFY] [OnboardingScreen.tsx](file:///e:/New%20folder/deen-pulse/src/screens/OnboardingScreen.tsx)

Step 2 for Cat3 devices: update the explanation text to describe the reminder-based approach instead of "Ongoing Notification".

---

### Phase 4 — WearOS Control Screen Redesign (Obsidian Mint)

> Complete visual overhaul following the "Obsidian Mint" design language.

---

#### [MODIFY] [WearOSControlScreen.tsx](file:///e:/New%20folder/deen-pulse/src/screens/WearOSControlScreen.tsx)

Full redesign with:

1. **Circular Connection Status Badge**: Pulsing green/red ring with watch icon center, "Connected"/"Disconnected" label
2. **Last Synced Card**: Dark glass card (`#111417`, mint border) showing "Last Synced: X minutes ago" with live elapsed time counter
3. **Sync Now Button**: Large, centered, mint-green gradient button with press-scale animation and haptic feedback, loading spinner state, checkmark success state
4. **Auto-Sync & Settings Sync Toggles**: Clean `ColorOSSwitch` rows in a grouped card
5. **Troubleshooting Checklist**: Scrollable dark-glass card with expandable items, each with a numbered step badge

**Bug #5 Fix** (Artificial Latency): Remove the `setTimeout(1500)` after sync. Update state immediately, use a short independent 2s timeout only for clearing the success checkmark icon.

---

### Phase 5 — App-Wide UI Polish & Asset Integration

---

#### [MODIFY] [OnboardingScreen.tsx](file:///e:/New%20folder/deen-pulse/src/screens/OnboardingScreen.tsx)

- Embed the generated mosque dome silhouette as a prominent header visual on Step 0 (Welcome screen)
- Replace the current pulsing logo ring with the mosque icon inside a subtle glow ring

#### [MODIFY] [AboutScreen.tsx](file:///e:/New%20folder/deen-pulse/src/screens/AboutScreen.tsx)

Full redesign:
- Hero section with mosque dome icon + gradient backdrop
- Version badge pulling dynamic version from native module
- Feature cards with Feather icons (no emojis)
- Credits section with GitHub link
- Redesigned "Check for Updates" button → see Phase 8

#### [MODIFY] [DashboardScreen.tsx](file:///e:/New%20folder/deen-pulse/src/screens/DashboardScreen.tsx)

- Add a **scroll-to-top FAB** (floating action button): Small mint-green circular button with `chevron-up` icon that appears when scrolled past 200px, smoothly scrolls to top on tap with haptic feedback

#### [MODIFY] [App.tsx](file:///e:/New%20folder/deen-pulse/App.tsx)

- Remove unused `scrollLocationBar` and `locationText` styles (coordinate badge was removed)
- Ensure all screen transitions use consistent spring animations

---

### Phase 6 — Wear OS App Modernization

> Update the Wear OS app to match the phone app's Obsidian Mint design language, add a prayers list tile, and optionally add a Qibla compass tile.

---

#### [MODIFY] [DeenPulseWearApp.kt](file:///e:/New%20folder/deen-pulse/android/wear/src/main/java/com/deenpulse/wear/ui/DeenPulseWearApp.kt)

- Refine the prayer list cards with rounded corners, subtle mint borders for "next" prayer
- Add prayer status dots (green for next, amber for active, dim for passed)
- Improve the scroll-to-top button: replace triangle with a proper chevron icon
- Add a "Prayers List" tab/page accessible via swipe navigation using `SwipeDismissableNavHost`

#### [NEW] [PrayerListTileService.kt](file:///e:/New%20folder/deen-pulse/android/wear/src/main/java/com/deenpulse/wear/tile/PrayerListTileService.kt)

New ProtoLayout tile showing all 5 prayer times in a compact list format:
- Each row: prayer name + time + status indicator (dot color)
- "Next" prayer highlighted with mint green
- Tap launches the Wear app
- Refreshes every 60 seconds

#### [MODIFY] [AndroidManifest.xml (wear)](file:///e:/New%20folder/deen-pulse/android/wear/src/main/AndroidManifest.xml)

Register the new tile service.

#### [NEW] [QiblaTileService.kt](file:///e:/New%20folder/deen-pulse/android/wear/src/main/java/com/deenpulse/wear/tile/QiblaTileService.kt) *(if Choice 1 = Option A)*

Battery-efficient Qibla compass tile:
- Uses `SensorManager.getDefaultSensor(TYPE_ROTATION_VECTOR)` with `SENSOR_DELAY_UI`
- Registers sensor ONLY when tile is actively visible (in `onTileEnterEvent`)
- Unregisters sensor in `onTileLeaveEvent`
- Uses `FusedLocationProviderClient.getLastLocation()` — no continuous GPS
- Calculates bearing to Kaaba (21.4225°N, 39.8262°E) using the Haversine formula
- Renders a compass arrow pointing toward Mecca with distance in km

---

### Phase 7 — Version Management & Auto-Increment

---

#### [MODIFY] [build.gradle (app)](file:///e:/New%20folder/deen-pulse/android/app/build.gradle)

Replace hardcoded version with dynamic properties:
```groovy
def versionMajor = 1
def versionMinor = 1
def versionPatch = 0
def ciRunNumber = (System.getenv("GITHUB_RUN_NUMBER") ?: "0").toInteger()

android {
    defaultConfig {
        versionCode versionMajor * 10000 + versionMinor * 100 + versionPatch + ciRunNumber
        versionName "${versionMajor}.${versionMinor}.${versionPatch}"
        buildConfigField "String", "VERSION_DISPLAY", "\"${versionMajor}.${versionMinor}.${versionPatch}\""
    }
    buildFeatures {
        buildConfig true
    }
}
```

#### [MODIFY] [build.gradle (wear)](file:///e:/New%20folder/deen-pulse/android/wear/build.gradle)

Same dynamic versioning scheme, keeping versions in sync with the phone app.

Fix the `applicationId` conflict: change to `com.deenpulse.wear`.

#### [MODIFY] [PrayerCapsuleModule.kt](file:///e:/New%20folder/deen-pulse/android/app/src/main/java/com/deenpulse/PrayerCapsuleModule.kt)

Expose `getAppVersion()` method to React Native:
```kotlin
@ReactMethod
fun getAppVersion(promise: Promise) {
    promise.resolve(BuildConfig.VERSION_DISPLAY)
}
```

#### [MODIFY] [AboutScreen.tsx](file:///e:/New%20folder/deen-pulse/src/screens/AboutScreen.tsx)

Read version dynamically on mount:
```typescript
const [version, setVersion] = useState('...');
useEffect(() => {
    PrayerCapsuleModule?.getAppVersion().then(setVersion).catch(() => setVersion('1.1.0'));
}, []);
```

---

### Phase 8 — OTA Updates from GitHub Releases

> Redesigned "Check for Updates" flow using the GitHub Releases API.

---

#### [NEW] [UpdateChecker.ts](file:///e:/New%20folder/deen-pulse/src/utils/UpdateChecker.ts)

New utility module:
```typescript
const GITHUB_REPO = 'YourUsername/DeenPulse'; // You'll set this
const RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export async function checkForUpdate(currentVersion: string): Promise<UpdateInfo | null> {
    const res = await fetch(RELEASES_URL);
    const release = await res.json();
    const latestVersion = release.tag_name.replace('v', '');
    if (isNewerVersion(latestVersion, currentVersion)) {
        return {
            version: latestVersion,
            releaseNotes: release.body,
            downloadUrl: release.assets?.[0]?.browser_download_url,
            publishedAt: release.published_at,
        };
    }
    return null;
}
```

#### [MODIFY] [AboutScreen.tsx](file:///e:/New%20folder/deen-pulse/src/screens/AboutScreen.tsx)

Replace the mock `handleCheckUpdates` with real GitHub Releases API call:
- Shows a loading spinner while checking
- If update available: Shows a beautiful modal with version number, release notes, and "Download APK" button that opens the browser
- If up to date: Shows success feedback
- Background check: On app launch, silently check for updates. If found, show a subtle banner card on the dashboard

#### [MODIFY] [PrayerCapsuleForegroundService.kt](file:///e:/New%20folder/deen-pulse/android/app/src/main/java/com/deenpulse/PrayerCapsuleForegroundService.kt)

Add a daily background check for updates using `WorkManager` (preferred over AlarmManager for periodic work):
- Schedules a `PeriodicWorkRequest` every 24 hours
- If a new version is found, posts a notification: "DeenPulse v1.2.0 available — tap to update"
- Tapping opens the GitHub release page in browser

---

### Phase 9 — CI/CD Pipeline (GitHub Actions)

---

#### [NEW] [.github/workflows/ci.yml](file:///e:/New%20folder/deen-pulse/.github/workflows/ci.yml)

Complete pipeline with 4 strategic phases:

**Job 1: `lint-and-test`** (runs on ALL pushes/PRs to ANY branch)
```yaml
- ESLint: npx eslint . --ext .ts,.tsx
- TypeScript: npx tsc --noEmit
- Kotlin Lint: ./gradlew ktlintCheck (if ktlint is configured)
- Unit Tests: ./gradlew testDebugUnitTest
```

**Job 2: `android-mobile-build`** (runs ONLY on push/merge to `main`)
```yaml
- Needs: lint-and-test
- JDK 17, Node 22
- Decode signing secrets (KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD)
- ./gradlew :app:assembleRelease
- Upload artifact: DeenPulse-Mobile-v{version}.apk (14-day retention)
```

**Job 3: `wearos-companion-build`** (runs ONLY on push/merge to `main`)
```yaml
- Needs: lint-and-test
- JDK 17
- Decode signing secrets
- ./gradlew :wear:assembleRelease
- Upload artifact: DeenPulse-WearOS-v{version}.apk (14-day retention)
```

**Job 4: `notify`** (runs after mobile + wear builds succeed)
```yaml
- Needs: android-mobile-build, wearos-companion-build
- Sends rich notification card to Discord/Slack with:
  - Commit ID, message, author
  - Build status (✅ / ❌)
  - Direct link to GitHub Actions run page for APK download
```

**Fork Safety**: Signing secrets are only available in the main repo. Fork PRs can run `lint-and-test` but cannot access signing keys, so `android-mobile-build` and `wearos-companion-build` are gated behind `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`.

---

## Verification Plan

### Automated Tests
1. `npx tsc --noEmit` — TypeScript compilation check (zero errors)
2. `npx eslint . --ext .ts,.tsx` — Lint pass
3. `./gradlew :app:assembleDebug` — Phone app compiles
4. `./gradlew :wear:assembleDebug` — Wear app compiles
5. `./gradlew :app:assembleRelease` — Signed phone APK
6. `./gradlew :wear:assembleRelease` — Signed wear APK
7. `adb install` + `adb shell am start` — Install and launch on connected device

### Manual Verification
- Install release APK on a Cat1 device (OPPO/OnePlus) → verify capsule still works
- Install release APK on a Cat2 device (Vivo) → verify notification animation is smooth
- Install release APK on a Cat3 device (Samsung/Pixel) → verify AlarmManager reminders fire 15min before prayer
- Test all screen navigation + back button
- Verify WearOS sync and new tiles on a connected watch
- Verify "Check for Updates" flow against a GitHub release

---

## Execution Order

| Order | Phase | Risk | Est. Files |
|-------|-------|------|-----------|
| 1 | Copilot Bug Fixes (Phase 1) | 🟢 Low | 6 files |
| 2 | Vivo Notification Fix (Phase 2) | 🟡 Medium | 1 file |
| 3 | Navigation Fix (Phase 1 cont.) | 🟢 Low | 2 files |
| 4 | Cat3 AlarmManager Overhaul (Phase 3) | 🔴 High | 5 files |
| 5 | WearOS Control Screen Redesign (Phase 4) | 🟡 Medium | 1 file |
| 6 | UI Polish & Assets (Phase 5) | 🟢 Low | 4 files |
| 7 | Wear OS Modernization (Phase 6) | 🟡 Medium | 4-5 files |
| 8 | Version Management (Phase 7) | 🟢 Low | 4 files |
| 9 | OTA Updates (Phase 8) | 🟡 Medium | 3 files |
| 10 | CI/CD Pipeline (Phase 9) | 🟢 Low | 1 file |
| 11 | Testing & Verification | — | — |

**Total estimated files modified/created: ~30-35**

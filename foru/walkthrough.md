# DeenPulse v2 Production Refactor — Walkthrough

## Summary

This refactor addresses **6 Copilot PR bug fixes**, a **Vivo OriginOS notification regression**, a **Cat3 AlarmManager notification overhaul**, **version management**, **OTA update checking**, and a **CI/CD pipeline** — all from the `v2/production-refactor` branch.

---

## Phase 1: Copilot PR Bug Fixes (6 issues)

| Bug | File | Fix |
|-----|------|-----|
| Premature Active Badge | [prayerEngine.ts](file:///e:/New%20folder/deen-pulse/src/utils/prayerEngine.ts#L127) | `<= 0 && <= 0` → `< 0 \|\| < 0` — shows `0s` before "Active" |
| Broken Active Window | [useActiveWindowDetector.ts](file:///e:/New%20folder/deen-pulse/src/hooks/useActiveWindowDetector.ts#L31) | `=== 0 && === 0` → `<= 0 && <= 0` — resilient to timer drift |
| Layout Bleed | [NotificationsScreen.tsx](file:///e:/New%20folder/deen-pulse/src/screens/NotificationsScreen.tsx#L88) | Explicit `=== 1 \|\| === 2` checks instead of `!== 3` |
| Telemetry Bug | [deviceProfiles.ts](file:///e:/New%20folder/deen-pulse/src/utils/deviceProfiles.ts#L77) | Always use `detected.manufacturer` |
| Auto-Sync Toggle | [usePrayerCountdown.ts](file:///e:/New%20folder/deen-pulse/src/hooks/usePrayerCountdown.ts#L66) | AsyncStorage check before `syncToWear()` |
| Navigation (already fixed) | [useGestureNavigation.ts](file:///e:/New%20folder/deen-pulse/src/hooks/useGestureNavigation.ts#L5) | Already has `initialScreen` param |

---

## Phase 2: Vivo OriginOS Notification Animation Fix

**Root cause:** Commit `1a1b668` introduced complex string concatenation (`"$name in $countdown"`) in `getNotificationTexts()` that OriginOS's notification parser rejected, causing animation displacement.

**Fix in** [PrayerCapsuleForegroundService.kt](file:///e:/New%20folder/deen-pulse/android/app/src/main/java/com/deenpulse/PrayerCapsuleForegroundService.kt#L306-L352):
- Simplified Vivo `contentTitle` to `"Next Prayer: $currentPrayerName"` (clean, single value)
- Simplified `contentText` to plain `countdownStr` or `formattedTime` (no concatenation)
- Kept `useChronometer = false` for Vivo (confirmed to break alignment on OriginOS)
- Unified active prayer state across all OEMs

---

## Phase 3: Cat3 Device Notification Overhaul

### New Files
- [PrayerReminderReceiver.kt](file:///e:/New%20folder/deen-pulse/android/app/src/main/java/com/deenpulse/PrayerReminderReceiver.kt) — `BroadcastReceiver` for AlarmManager-triggered 15-minute-before prayer reminders
- [UpdateChecker.ts](file:///e:/New%20folder/deen-pulse/src/utils/UpdateChecker.ts) — GitHub Releases API client for OTA update checking

### Modified Files
- [PrayerCapsuleModule.kt](file:///e:/New%20folder/deen-pulse/android/app/src/main/java/com/deenpulse/PrayerCapsuleModule.kt#L205-L293) — Added `scheduleReminders()`, `cancelReminders()`, `getAppVersion()`
- [AndroidManifest.xml](file:///e:/New%20folder/deen-pulse/android/app/src/main/AndroidManifest.xml#L11-L12) — Added `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM` permissions + registered `PrayerReminderReceiver`
- [usePrayerCountdown.ts](file:///e:/New%20folder/deen-pulse/src/hooks/usePrayerCountdown.ts) — New `deviceCategory` and `cat3NotificationMode` params; Cat3 reminder mode routes to AlarmManager
- [NotificationsScreen.tsx](file:///e:/New%20folder/deen-pulse/src/screens/NotificationsScreen.tsx) — Added Cat3 "Background Notification Mode" toggle (15-min reminder vs ongoing notification)
- [OnboardingScreen.tsx](file:///e:/New%20folder/deen-pulse/src/screens/OnboardingScreen.tsx#L178) — Cat3 label: `'Ongoing Notification'` → `'Reminder Notification'`
- [App.tsx](file:///e:/New%20folder/deen-pulse/App.tsx#L131) — Added `cat3NotificationMode` state, AsyncStorage persistence, pass to `usePrayerCountdown` and `NotificationsScreen`

---

## Phase 4: WearOS Control Screen Fix

- [WearOSControlScreen.tsx](file:///e:/New%20folder/deen-pulse/src/screens/WearOSControlScreen.tsx#L83-L92) — Removed artificial 1.5s `setTimeout` delay after sync. State updates now immediate.

---

## Phase 5: About Screen Redesign

- [AboutScreen.tsx](file:///e:/New%20folder/deen-pulse/src/screens/AboutScreen.tsx) — Complete redesign with hero section (mosque dome icon + gradient bg), feature cards, update checker, frequency picker, credits

---

## Phase 7: Version Management

- [app/build.gradle](file:///e:/New%20folder/deen-pulse/android/app/build.gradle#L80-L93) — Dynamic SemVer: `1.1.0`, `versionCode = major*10000 + minor*100 + patch + GITHUB_RUN_NUMBER`
- [wear/build.gradle](file:///e:/New%20folder/deen-pulse/android/wear/build.gradle#L9-L20) — Matched versioning scheme

---

## Phase 8: OTA Update Checking

- [UpdateChecker.ts](file:///e:/New%20folder/deen-pulse/src/utils/UpdateChecker.ts) — `checkForUpdate()`, `shouldCheckForUpdate()`, `markUpdateChecked()`, `openDownloadUrl()`
- [AboutScreen.tsx](file:///e:/New%20folder/deen-pulse/src/screens/AboutScreen.tsx) — "Check for Updates" button with loading/success/update-available states, frequency picker (1/3/7 days)

---

## Phase 9: CI/CD Pipeline

### Pipeline File
[.github/workflows/ci.yml](file:///e:/New%20folder/deen-pulse/.github/workflows/ci.yml)

### Jobs

| Job | Trigger | What it does |
|-----|---------|-------------|
| `lint-and-test` | All pushes/PRs | Node 22, `tsc --noEmit`, ESLint, `npm test` |
| `android-mobile-build` | Push to `main` only | JDK 17, fork-safe keystore decode, `:app:assembleRelease`, artifact upload |
| `wearos-companion-build` | Push to `main` only | JDK 17, fork-safe keystore decode, `:wear:assembleRelease`, artifact upload |

---

### 🔐 CI/CD Secrets Setup Guide

To enable signed release builds in GitHub Actions, you need to configure **4 repository secrets**:

#### Step 1: Generate a Release Keystore

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore deenpulse-release.keystore \
  -alias deenpulse \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=DeenPulse, OU=Mobile, O=DeenPulse, L=Karachi, ST=Sindh, C=PK"
```

> [!WARNING]
> **Keep this keystore file safe.** If you lose it, you cannot update your app on the Play Store. Back it up securely.

#### Step 2: Encode the Keystore to Base64

```bash
# Linux/macOS:
base64 -i deenpulse-release.keystore | tr -d '\n' > keystore_base64.txt

# Windows PowerShell:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("deenpulse-release.keystore")) | Set-Content keystore_base64.txt -NoNewline
```

#### Step 3: Add GitHub Repository Secrets

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret Name | Value |
|-------------|-------|
| `KEYSTORE_BASE64` | Contents of `keystore_base64.txt` |
| `KEYSTORE_PASSWORD` | The store password from Step 1 |
| `KEY_ALIAS` | `deenpulse` (or whatever alias you used) |
| `KEY_PASSWORD` | The key password from Step 1 |

#### Step 4: Verify

Push to `main` and the CI pipeline will:
1. Decode the keystore from base64
2. Build signed APKs for both phone and wear modules
3. Upload them as build artifacts (downloadable for 14 days)

> [!TIP]
> If no secrets are configured, the pipeline falls back to debug builds automatically. This is fork-safe — forks won't fail CI.

---

## Tested

- ✅ TypeScript compilation: zero errors
- ⏳ Gradle debug build: in progress

## Files Changed (17 total)

### New Files (3)
1. `.github/workflows/ci.yml`
2. `android/app/src/main/java/com/deenpulse/PrayerReminderReceiver.kt`
3. `src/utils/UpdateChecker.ts`

### Modified Files (14)
1. `App.tsx` — Cat3 notification mode state + persistence
2. `android/app/build.gradle` — Dynamic SemVer versioning
3. `android/app/src/main/AndroidManifest.xml` — Alarm permissions + receiver
4. `android/app/src/main/java/com/deenpulse/PrayerCapsuleForegroundService.kt` — Vivo text fix
5. `android/app/src/main/java/com/deenpulse/PrayerCapsuleModule.kt` — scheduleReminders + getAppVersion
6. `android/wear/build.gradle` — Dynamic SemVer versioning
7. `src/hooks/useActiveWindowDetector.ts` — Timer drift resilience
8. `src/hooks/usePrayerCountdown.ts` — Cat3 routing + auto-sync toggle
9. `src/screens/AboutScreen.tsx` — Complete redesign
10. `src/screens/NotificationsScreen.tsx` — Cat3 notification mode toggle
11. `src/screens/OnboardingScreen.tsx` — Cat3 label text
12. `src/screens/WearOSControlScreen.tsx` — Removed artificial delay
13. `src/utils/deviceProfiles.ts` — Telemetry fix
14. `src/utils/prayerEngine.ts` — Premature active badge fix

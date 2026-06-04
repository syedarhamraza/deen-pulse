# DeenPulse v2 — Task Checklist

Branch: `v2/production-refactor`

## Phase 1: Copilot PR Bug Fixes
- [x] 1.1 Fix premature "Active" badge in `prayerEngine.ts` (L127)
- [x] 1.2 Fix broken active window state trigger in `useActiveWindowDetector.ts` (L31)
- [x] 1.3 Fix unloaded profile layout bleed in `NotificationsScreen.tsx` (L89, L104)
- [x] 1.4 Fix inconsistent profile debug telemetry in `deviceProfiles.ts` (L77)
- [x] 1.5 Fix non-functional auto-sync toggle in `usePrayerCountdown.ts` (L44-48)
- [x] 1.6 Fix navigation context in `useGestureNavigation.ts` + `App.tsx` (already applied)

## Phase 2: Vivo Notification Fix
- [x] 2.1 Simplify Cat2 string formatting in `PrayerCapsuleForegroundService.kt` (keep no-chronometer, fix text concatenation)

## Phase 3: Cat3 Device Notification Overhaul
- [x] 3.1 Create `PrayerReminderReceiver.kt` (BroadcastReceiver for AlarmManager)
- [x] 3.2 Add AlarmManager scheduling in `PrayerCapsuleForegroundService.kt` for Cat3
- [x] 3.3 Add `scheduleReminders()` + `cancelReminders()` + `getAppVersion()` to `PrayerCapsuleModule.kt`
- [x] 3.4 Update `AndroidManifest.xml` (receiver + SCHEDULE_EXACT_ALARM + USE_EXACT_ALARM)
- [x] 3.5 Update `usePrayerCountdown.ts` with device category awareness + Cat3 mode routing
- [x] 3.6 Update `NotificationsScreen.tsx` with Cat3 toggle (ongoing vs 15-min reminder)
- [x] 3.7 Update `OnboardingScreen.tsx` Cat3 label: 'Ongoing Notification' → 'Reminder Notification'

## Phase 4: WearOS Control Screen Fixes
- [x] 4.1 Fix Bug #5 (removed artificial 1.5s delay in sync handler)

## Phase 5: UI Polish & Asset Integration
- [x] 5.1 Mosque dome icon + gradient background used in AboutScreen hero
- [x] 5.2 Complete redesign of `AboutScreen.tsx` (hero, feature cards, update checker, frequency picker, credits)
- [ ] 5.3 Add scroll-to-top FAB to `DashboardScreen.tsx`
- [ ] 5.4 Clean up unused styles in `App.tsx`

## Phase 6: Wear OS Modernization
- [ ] 6.1 Refine `DeenPulseWearApp.kt` design
- [ ] 6.2 Create `PrayerListTileService.kt` (new prayers list tile)
- [ ] 6.3 Create `QiblaTileService.kt` (battery-efficient Qibla compass)
- [ ] 6.4 Register new tiles in Wear `AndroidManifest.xml`

## Phase 7: Version Management
- [x] 7.1 Dynamic SemVer versioning in `app/build.gradle` (1.1.0, auto-increment via GITHUB_RUN_NUMBER)
- [x] 7.2 Dynamic SemVer versioning in `wear/build.gradle` (matched)
- [x] 7.3 Exposed `getAppVersion()` in `PrayerCapsuleModule.kt` (reads from PackageManager)
- [x] 7.4 Dynamic version display in `AboutScreen.tsx` (reads from native module on mount)

## Phase 8: OTA Updates from GitHub
- [x] 8.1 Created `UpdateChecker.ts` utility (GitHub Releases API, version comparison, frequency logic)
- [x] 8.2 Redesigned "Check for Updates" in `AboutScreen.tsx` (loading, update available, up-to-date states)
- [x] 8.3 Added update check frequency setting (1 day / 3 days / 1 week radio buttons)
- [ ] 8.4 Add WorkManager periodic check in native module (deferred - manual check is primary)

## Phase 9: CI/CD Pipeline
- [x] 9.1 Created `.github/workflows/ci.yml` (3 jobs: lint-test, mobile-build, wear-build)
- [ ] 9.2 Write setup guide for secrets/keys

## Phase 10: Testing & Verification
- [/] 10.1 TypeScript compilation check (`tsc --noEmit`)
- [ ] 10.2 Gradle debug build (`:app:assembleDebug`)
- [ ] 10.3 Gradle wear build (`:wear:assembleDebug`)
- [ ] 10.4 Gradle release build (`:app:assembleRelease`)
- [ ] 10.5 Install and verify on device

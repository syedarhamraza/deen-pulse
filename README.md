# 🕌 DeenPulse
![img](src/assets/readmeHero.png)
[![DeenPulse CI/CD](https://github.com/syedarhamraza/deen-pulse/actions/workflows/ci.yml/badge.svg)](https://github.com/syedarhamraza/deen-pulse/actions/workflows/ci.yml)
[![Platform: Android & WearOS](https://img.shields.io/badge/Platform-Android%20%7C%20WearOS-00F29D?style=flat-square&logo=android)](https://developer.android.com/)
[![React Native](https://img.shields.io/badge/React%20Native-0.74+-61DAFB?style=flat-square&logo=react)](https://reactnative.dev/)
[![Node Version](https://img.shields.io/badge/Node-22%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**DeenPulse** is a premium, privacy-first React Native utility that brings real-time Islamic prayer times directly to your Android device's status bar via a high-fidelity **Live Capsule** overlay. It features a standalone/companion **Wear OS** module with native complications and tiles, dynamic OEM background battery optimizations, and an offline-first timing engine.

---

## 🚀 Key Features

* **⚡ Live Status Bar Capsule**: Real-time dynamic capsule (similar to Dynamic Island or ColorOS capsule pill) showing the next prayer name and a live ticking countdown or clock directly in the status bar/lock screen.
* **⌚ Wear OS Companion Module**: Includes a native Wear OS application with quick-swipe **Tiles**, watch face **Complications**, and automatic background setting/timetable synchronization via the Google Play Services Wearable Data Layer.
* **📱 Intelligent OEM Battery Optimizations**: Dynamic brand detection (OPPO, OnePlus, Realme, Vivo, Samsung, Xiaomi, Pixel, etc.) that customizes notification channels, UI guides, and background execution based on three OEM restriction tiers.
* **🔒 Privacy-Centric & Geolocation Caching**: Features a low-power "Fetch and Kill" GPS triangulation sequence that updates location coordinates, caches them locally, and performs all astronomical math locally. **No data ever leaves your device.**
* **🎛️ Juristic & Calculation Customization**: Support for major regional calculations (Karachi, ISNA, MWL, Makkah, Egypt, Shia, etc.) and juristic rules (Standard/Shafi'i/Maliki/Hanbali vs Hanafi Asr timing).
* **🛠️ Developer Diagnostics**: Integrated diagnostic suite to simulate instant transitions, trigger mock alerts, test notification formats, and flush local caching instantly.

---

## 📐 Architecture & Module Overview

The repository is modularized into three core Gradle projects:

```
├── android/
│   ├── app/                # React Native Android application module (Phone)
│   ├── wear/               # Standalone/Companion Wear OS Kotlin module (Watch)
│   └── shared/             # Shared Kotlin modules (Timetable math & configurations)
├── src/
│   ├── assets/             # Branding icons, images, and graphics
│   ├── components/         # Reusable high-fidelity custom RN elements (FluidModal, ColorOSSwitch)
│   ├── hooks/              # Custom React Hooks (usePrayerTimes, useWearConnection, useActiveWindowDetector)
│   ├── screens/            # Application screens (Dashboard, Settings, About, Onboarding, WearOSControl)
│   └── utils/              # Helper utilities (prayerEngine, deviceProfiles, UpdateChecker)
```

### OEM Optimization Tiers
To bypass aggressive OEM task killers on Android, DeenPulse implements a 3-category device profile matrix:
* **Category 1 (OPPO, OnePlus, Realme)**: ColorOS restrictions apply. Promotes the Live Status Bar Capsule via special notification parameters and provides in-app step-by-step notification channels enablement guides.
* **Category 2 (Vivo, iQOO)**: FuntouchOS configurations apply.
* **Category 3 (Samsung, Xiaomi, Pixel, others)**: Default background rules. Allows users to switch between a persistent Foreground Service Capsule or dynamic exact background reminders (`AlarmManager`) scheduled 15 minutes prior to prayer starts.

---

## 🛡️ License

DeenPulse is open-source software licensed under the [MIT License](LICENSE).

Developed with 💚 by [Syed Arham Raza](https://github.com/syedarhamraza).

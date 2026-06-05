# DeenPulse

![DeenPulse Banner](src/assets/readmeHero.png)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20WearOS-00F29D?style=flat-square)](https://developer.android.com/)
[![React Native](https://img.shields.io/badge/React%20Native-0.85+-61DAFB?style=flat-square)](https://reactnative.dev/)
[![Node Version](https://img.shields.io/badge/Node-22%2B-339933?style=flat-square)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

DeenPulse is a premium, privacy-focused utility built with React Native and Kotlin. It brings real-time Islamic prayer times directly to your Android device's status bar via a high-fidelity Live Capsule overlay, accompanied by a native Wear OS companion module.

---

## Key Features

* **Live Status Bar Capsule**: A real-time dynamic capsule overlay (similar to a ColorOS capsule pill or iOS Dynamic Island) displaying the next prayer name and a live-ticking countdown directly on your status bar and lock screen.
* **Wear OS Companion Module**: A native watch application featuring watch face complications, quick-swipe tiles, and automatic background settings/timetable synchronization via the Google Play Services Wearable Data Layer.
* **OEM Battery Optimization Handling**: Specialized device profiling to bypass aggressive system battery managers on popular manufacturers (OPPO, OnePlus, Vivo, Samsung, Xiaomi, and Google Pixel).
* **Local, Privacy-First Calculation**: Geolocation coordinates are retrieved via a low-power GPS triangulation sequence, cached locally, and used for local astronomical computations. No location data is sent to external servers.
* **Juristic & Calculation Configurations**: Complete customization of regional calculation methods (Karachi, ISNA, MWL, Makkah, Egypt, Shia, etc.) and juristic rules (Standard/Shafi'i/Maliki/Hanbali vs. Hanafi).
* **Developer Diagnostics Suite**: Built-in debugging dashboard to simulate instant time transitions, trigger mock alerts, verify notification layouts, and clear local caches immediately.

---

## Directory Structure

```
├── android/
│   ├── app/                # React Native Android application module (Phone)
│   ├── wear/               # Standalone/Companion Wear OS Kotlin module (Watch)
│   └── shared/             # Shared Kotlin modules (Timetable math & configurations)
├── src/
│   ├── assets/             # Branding icons, images, and graphics
│   ├── components/         # Reusable custom UI components (e.g., FluidModal, ColorOSSwitch)
│   ├── hooks/              # Custom React Hooks (e.g., usePrayerTimes, useWearConnection)
│   ├── screens/            # Screens (Dashboard, Settings, About, Onboarding, WearOSControl)
│   └── utils/              # Helper utilities (prayerEngine, deviceProfiles, UpdateChecker)
```

---

## OEM Optimization Tiers

To prevent aggressive background termination by OEM task killers, DeenPulse categorizes devices into three primary tiers:

| Tier | Target Manufacturers | Behavior & Mitigations |
| :--- | :--- | :--- |
| **Category 1** | OPPO, OnePlus, Realme | Applies ColorOS/RealmeUI specific configurations. Promotes the Live Status Bar Capsule through customized notification parameters and provides step-by-step in-app guides for system permission settings. |
| **Category 2** | Vivo, iQOO | Applies FuntouchOS specific constraints and permission wizards. |
| **Category 3** | Samsung, Xiaomi, Google Pixel, etc. | Uses default Android background rules. Users can choose between a persistent Foreground Service Capsule or dynamic exact background reminders (`AlarmManager`) scheduled 15 minutes prior to prayer onset. |

---

## Getting Started

### Prerequisites

* **Node.js**: Version 22.x or higher
* **Java Development Kit (JDK)**: JDK 17 (recommended for modern React Native)
* **Android SDK**: API Level 34+ configured with Android Virtual Device (AVD) or a physical debugging device
* **React Native CLI**: Installed globally or executed via `npx`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/syedarhamraza/deen-pulse.git
   cd deen-pulse
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install Android dependencies:**
   Ensure your Android environment variables are correctly set (e.g., `ANDROID_HOME`). Navigate to the `android/` directory to verify setup:
   ```bash
   cd android && ./gradlew clean && cd ..
   ```

### Running the Application

1. **Start the Metro Bundler:**
   ```bash
   npm start
   ```

2. **Run the Phone Application (Android):**
   In a separate terminal window, launch the React Native application:
   ```bash
   npm run android
   ```

3. **Build and Deploy the Wear OS Companion:**
   Open the `android/` project in Android Studio. Select the `wear` run configuration and target a Wear OS emulator or connected smartwatch.

---

## Technical Details

### Calculation Engine
The offline calculations are managed locally via `src/utils/prayerEngine.ts`. The calculation flow is:
1. Retrieve cached geolocation coordinates or request a single-point GPS update.
2. Formulate local timezone offsets and astronomical coordinates.
3. Apply selected regional settings and juristic rules to derive daily prayer schedules.

### Wear OS Synchronization
The React Native layer communicates with the native Android Wearable APIs. Configuration updates and schedules are serialized and pushed to the Wear OS device over the Wearable Data Layer (`DataClient`), ensuring that watch complications and tiles display real-time information with minimal battery consumption.

---

## License

DeenPulse is open-source software licensed under the [MIT License](LICENSE).

Developed by [Syed Arham Raza](https://github.com/syedarhamraza).

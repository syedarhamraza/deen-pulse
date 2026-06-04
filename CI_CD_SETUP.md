# DeenPulse CI/CD Setup Guide

## Overview

DeenPulse uses GitHub Actions for continuous integration and deployment. The pipeline is defined in `.github/workflows/ci.yml` and consists of 3 jobs:

| Job | Trigger | Purpose |
|-----|---------|---------|
| `lint-and-test` | All pushes & PRs | TypeScript, ESLint, unit tests |
| `android-mobile-build` | Push to `main` | Signed phone APK |
| `wearos-companion-build` | Push to `main` | Signed Wear OS APK |

## Prerequisites

- A GitHub repository for the project
- Android Studio (for generating the keystore)
- Node.js 22+ locally

## Step 1: Generate a Release Keystore

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

> **⚠️ IMPORTANT**: Keep this keystore file safe and backed up. If you lose it, you cannot push updates to the same app on the Play Store.

## Step 2: Encode the Keystore to Base64

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("deenpulse-release.keystore")) | Set-Content keystore_base64.txt -NoNewline
```

**Linux/macOS:**
```bash
base64 -i deenpulse-release.keystore | tr -d '\n' > keystore_base64.txt
```

## Step 3: Add GitHub Repository Secrets

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** for each:

| Secret Name | Value |
|-------------|-------|
| `KEYSTORE_BASE64` | Paste the entire contents of `keystore_base64.txt` |
| `KEYSTORE_PASSWORD` | The `storepass` you used in Step 1 |
| `KEY_ALIAS` | `deenpulse` (or whatever alias you chose) |
| `KEY_PASSWORD` | The `keypass` you used in Step 1 |

## Step 4: Push and Verify

```bash
git push origin main
```

The pipeline will automatically:
1. Run lint and type checks
2. Decode the keystore from base64
3. Build signed APKs for phone (`:app`) and watch (`:wear`)
4. Upload them as downloadable artifacts (retained for 14 days)

## Fork Safety

If secrets are not configured (e.g., in a fork), the pipeline automatically falls back to debug builds instead of failing. Forks will always pass CI.

## Downloading Build Artifacts

After a successful build on `main`:
1. Go to **Actions** tab → select the latest workflow run
2. Scroll to **Artifacts** at the bottom
3. Download `DeenPulse-Mobile-{run_number}` or `DeenPulse-WearOS-{run_number}`

## Version Management

Version numbers are managed in:
- `android/app/build.gradle` → `versionMajor`, `versionMinor`, `versionPatch`
- `android/wear/build.gradle` → Same variables (keep in sync)

The `versionCode` auto-increments using `GITHUB_RUN_NUMBER` in CI, so each build gets a unique code without manual bumping.

To bump the version (e.g., from 1.1.0 to 1.2.0):
1. Edit both `build.gradle` files
2. Change `versionMinor = 1` to `versionMinor = 2`
3. Commit and push to `main`

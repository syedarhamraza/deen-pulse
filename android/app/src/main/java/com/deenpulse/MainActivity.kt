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

package com.deenpulse

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme)
    super.onCreate(savedInstanceState)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "DeenPulse"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /**
   * Bug 2 Fix — ColorOS Stuck-Active Self-Healing.
   *
   * Every time the user opens or returns to the app, emit "onAppForegrounded" to the
   * React Native JS layer. The JS side listens for this event and calls
   * [PrayerCapsuleModule.verifyAndReconcileAlarms] to check whether AlarmManager
   * PendingIntents were wiped by the OEM process reaper (ColorOS, Funtouch OS, etc.)
   * and re-schedules them if so.
   *
   * This is also the self-healing trigger for the "Active" freeze: after reconciliation
   * the JS layer can refresh the countdown display without requiring the user to
   * manually tap the Refresh button.
   */
  override fun onResume() {
    super.onResume()
    PrayerCapsuleModule.sendEvent("onAppForegrounded", null)
  }
}

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

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Reschedules prayer alarms after a device reboot, system time change, or timezone change.
 *
 * Applies to Cat 2 (Vivo/iQOO) and Cat 3 (Samsung/Pixel/Xiaomi) devices,
 * and Cat 1 (OPPO/Realme/OnePlus) devices running in Mode B (prior-window).
 * It does NOT apply to Cat 1 Mode A (all-time foreground service) — that service
 * is managed entirely by the React Native layer.
 *
 * The receiver is kept DISABLED in AndroidManifest.xml (android:enabled="false")
 * and activated programmatically via [AlarmSchedulerHelper.setBootReceiverEnabled]
 * only when the user has active alarms. This prevents unnecessary startup overhead
 * for users who have no alarms scheduled.
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.d(TAG, "onReceive: $action")

        when (action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_TIME_CHANGED,
            "android.intent.action.TIMEZONE_CHANGED" -> rescheduleAlarms(context)
        }
    }

    private fun rescheduleAlarms(context: Context) {
        val prefs = context.getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
        val prayersJson = prefs.getString("last_prayer_list", null) ?: run {
            Log.w(TAG, "No saved prayer list — skipping reschedule")
            return
        }
        val category = prefs.getInt("device_category", 3)
        val mode = when (category) {
            1 -> prefs.getString("cat1_notification_mode", "alltime") ?: "alltime"
            2 -> prefs.getString("cat2_notification_mode", "alltime") ?: "alltime"
            else -> "alltime"
        }
        val leadMinutes = when (category) {
            1 -> prefs.getInt("prior_lead_time_minutes", 15)
            2 -> prefs.getInt("cat2_prior_lead_time_minutes", 15)
            else -> 15
        }

        // Cat 1 and Cat 2 Mode A/D use the always-on foreground service — React Native handles it.
        if ((category == 1 || category == 2) && (mode == "alltime" || mode == "nocapsule")) {
            Log.d(TAG, "Cat$category Mode $mode detected — foreground service managed by JS layer, skipping")
            return
        }

        Log.d(TAG, "Rescheduling alarms: cat=$category, mode=$mode, lead=${leadMinutes}min")
        AlarmSchedulerHelper.scheduleAll(context, prayersJson, category, mode, leadMinutes)
    }
}

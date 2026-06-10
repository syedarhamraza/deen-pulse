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
import android.os.PowerManager
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * Triggered by [AlarmManager.setAlarmClock] for Cat 1 (OPPO/Realme/OnePlus) devices
 * running in "Prior Live Notification" mode (Mode B).
 *
 * This receiver fires at the user-selected lead time before each prayer (5/10/15 min).
 * It acquires a short WakeLock to keep the CPU alive, then starts
 * [PrayerCapsuleForegroundService] with [ACTION_START_PRIOR_WINDOW] to display the
 * live countdown notification for the duration of the lead-time window.
 */
class PriorServiceStartReceiver : BroadcastReceiver() {

    companion object {
        const val EXTRA_PRAYER_NAME = "prior_prayer_name"
        const val EXTRA_PRAYER_TIMESTAMP = "prior_prayer_timestamp"
        const val EXTRA_SCHEDULED_TIME = "prior_scheduled_time"
        const val ACTION_START_PRIOR_WINDOW = "com.deenpulse.ACTION_START_PRIOR_WINDOW"
        private const val TAG = "PriorServiceStartReceiver"
        private const val WAKELOCK_TIMEOUT_MS = 15_000L
    }

    override fun onReceive(context: Context, intent: Intent) {
        val prayerName = intent.getStringExtra(EXTRA_PRAYER_NAME) ?: run {
            Log.e(TAG, "onReceive: missing prayer name — ignoring")
            return
        }
        val prayerTimestamp = intent.getLongExtra(EXTRA_PRAYER_TIMESTAMP, 0L)
        val scheduledTime = intent.getLongExtra(EXTRA_SCHEDULED_TIME, 0L)

        // Acquire a partial WakeLock to keep the CPU alive while we start the service.
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "DeenPulse::PriorServiceStartWakeLock"
        )
        wakeLock.acquire(WAKELOCK_TIMEOUT_MS)

        Log.d(TAG, "onReceive: starting prior-window service for $prayerName (prayer at $prayerTimestamp)")

        try {
            // Read the saved prayer list from SharedPrefs so the service can display
            // a full countdown including the specific prayer this window belongs to.
            val prefs = context.getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
            val savedPrayerList = prefs.getString("last_prayer_list", null)

            val serviceIntent = Intent(context, PrayerCapsuleForegroundService::class.java).apply {
                action = ACTION_START_PRIOR_WINDOW
                putExtra(EXTRA_PRAYER_NAME, prayerName)
                putExtra(EXTRA_PRAYER_TIMESTAMP, prayerTimestamp)
                // Provide the full prayer list so the service can navigate beyond this prayer
                if (savedPrayerList != null) {
                    putExtra("prayersJson", savedPrayerList)
                }
                // Restore last-used capsule format and style from prefs
                putExtra("capsuleFormat", prefs.getString("capsuleFormat", "name_countdown"))
                putExtra("notificationStyle", prefs.getString("notificationStyle", "with_countdown"))
                putExtra("isPriorWindowMode", true)
            }

            ContextCompat.startForegroundService(context, serviceIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start PrayerCapsuleForegroundService for prior window", e)
        } finally {
            if (wakeLock.isHeld) wakeLock.release()
        }
    }
}

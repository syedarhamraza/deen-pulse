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

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * BroadcastReceiver that fires when an AlarmManager-scheduled prayer reminder triggers.
 *
 * Used for:
 *  - Category 2 (Vivo/iQOO) — triggered by [AlarmManager.setAlarmClock], which forces
 *    the device to exit Doze mode and fires exactly on time, bypassing Funtouch OS
 *    deep-sleep deferral.
 *  - Category 3 (Samsung/Xiaomi/Pixel, etc.) — triggered by setExactAndAllowWhileIdle().
 *
 * Bug 1 Fix — Vivo stale-notification guard:
 *   Because Funtouch OS can still batch-deliver deferred alarms in edge cases, this
 *   receiver checks whether the alarm fired more than [STALE_THRESHOLD_MS] late.
 *   If so, the notification is silently discarded to avoid showing a prayer reminder
 *   after the prayer time has already passed.
 *
 * WakeLock:
 *   A short partial WakeLock is acquired immediately on [onReceive] to prevent the
 *   CPU from sleeping before the notification is posted, since [onReceive] runs on
 *   the main thread with no guaranteed CPU retention on restrictive OEMs.
 */
class PrayerReminderReceiver : BroadcastReceiver() {

    companion object {
        const val EXTRA_PRAYER_NAME = "prayer_name"
        const val EXTRA_PRAYER_TIME = "prayer_time"

        /**
         * The epoch-millisecond time at which this alarm was originally scheduled to fire.
         * Used to detect Funtouch OS stale-delivery (Bug 1 fix).
         */
        const val EXTRA_SCHEDULED_TIME = "scheduled_time"

        const val CHANNEL_ID = "deenpulse_prayer_reminder"
        const val CHANNEL_NAME = "Prayer Reminders"
        private const val NOTIFICATION_ID_BASE = 8000
        private const val TAG = "PrayerReminderReceiver"

        /** Alarms delayed more than 5 minutes are considered stale and are discarded. */
        private const val STALE_THRESHOLD_MS = 5 * 60 * 1000L

        /** WakeLock timeout — enough to post a notification; auto-releases as a safety net. */
        private const val WAKELOCK_TIMEOUT_MS = 15_000L
    }

    override fun onReceive(context: Context, intent: Intent) {
        // ── 1. Acquire WakeLock immediately to keep CPU alive ──────────────────
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "DeenPulse::ReminderNotificationWakeLock"
        )
        wakeLock.acquire(WAKELOCK_TIMEOUT_MS)

        try {
            val prayerName = intent.getStringExtra(EXTRA_PRAYER_NAME) ?: run {
                Log.e(TAG, "onReceive: missing prayer name — discarding")
                return
            }
            val prayerTime = intent.getStringExtra(EXTRA_PRAYER_TIME) ?: ""
            val scheduledTime = intent.getLongExtra(EXTRA_SCHEDULED_TIME, 0L)

            // ── 2. Stale-notification guard (Bug 1 — Funtouch OS / Vivo fix) ──
            if (scheduledTime > 0L) {
                val delayMs = System.currentTimeMillis() - scheduledTime
                if (delayMs > STALE_THRESHOLD_MS) {
                    Log.w(
                        TAG,
                        "Alarm for $prayerName delivered ${delayMs / 1000}s late " +
                            "(threshold=${STALE_THRESHOLD_MS / 1000}s). " +
                            "Discarding stale notification."
                    )
                    return
                }
            }

            // ── 3. Create channel and post notification ────────────────────────
            createNotificationChannel(context)
            showReminderNotification(context, prayerName, prayerTime)

        } finally {
            // Always release the WakeLock, even if we returned early
            if (wakeLock.isHeld) wakeLock.release()
        }
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Reminders 15 minutes before each prayer"
                enableVibration(true)
                setSound(
                    android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION),
                    android.media.AudioAttributes.Builder()
                        .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
            }
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun showReminderNotification(context: Context, prayerName: String, prayerTime: String) {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pendingIntent = PendingIntent.getActivity(
            context, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val contentText = if (prayerTime.isNotBlank()) {
            "$prayerName begins at $prayerTime. Prepare for prayer."
        } else {
            "$prayerName begins in 15 minutes. Prepare for prayer."
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle("$prayerName in 15 minutes")
            .setContentText(contentText)
            .setSmallIcon(R.drawable.ic_stat_prayer)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()

        // Use prayer-specific notification IDs so multiple reminders don't replace each other
        val notificationId = NOTIFICATION_ID_BASE + prayerName.hashCode().and(0xFF)
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(notificationId, notification)
    }
}

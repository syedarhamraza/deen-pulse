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
import androidx.core.app.NotificationCompat

/**
 * BroadcastReceiver that fires when an AlarmManager-scheduled prayer reminder triggers.
 * Used exclusively for Category 3 devices (Samsung, Xiaomi, Pixel, etc.) that opt out of
 * the continuous foreground service in favor of one-shot 15-minute-before reminders.
 */
class PrayerReminderReceiver : BroadcastReceiver() {

    companion object {
        const val EXTRA_PRAYER_NAME = "prayer_name"
        const val EXTRA_PRAYER_TIME = "prayer_time"
        const val CHANNEL_ID = "deenpulse_prayer_reminder"
        const val CHANNEL_NAME = "Prayer Reminders"
        private const val NOTIFICATION_ID_BASE = 8000
    }

    override fun onReceive(context: Context, intent: Intent) {
        val prayerName = intent.getStringExtra(EXTRA_PRAYER_NAME) ?: return
        val prayerTime = intent.getStringExtra(EXTRA_PRAYER_TIME) ?: ""

        createNotificationChannel(context)
        showReminderNotification(context, prayerName, prayerTime)
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

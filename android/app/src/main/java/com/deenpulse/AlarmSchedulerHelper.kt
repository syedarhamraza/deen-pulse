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

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Shared utility for scheduling and cancelling prayer alarms.
 * Used by both [PrayerCapsuleModule] (React Native call site) and [BootReceiver]
 * (native-only boot path) to eliminate code duplication.
 *
 * Category routing:
 *  - Cat 1 Mode B (OPPO/Realme/OnePlus, prior-window mode) → setAlarmClock()
 *    targeting [PriorServiceStartReceiver] (starts the live foreground service)
 *  - Cat 2 (Vivo/iQOO) → setAlarmClock() targeting [PrayerReminderReceiver]
 *  - Cat 3 (Samsung/Pixel/Xiaomi, etc.) → setExactAndAllowWhileIdle()
 *    targeting [PrayerReminderReceiver]
 */
object AlarmSchedulerHelper {

    private const val TAG = "AlarmSchedulerHelper"

    /** Request code base for [PrayerReminderReceiver] alarms (Cat 2 / Cat 3). */
    const val REMINDER_REQUEST_BASE = 9000

    /** Request code base for [PriorServiceStartReceiver] alarms (Cat 1 Mode B). */
    const val PRIOR_REQUEST_BASE = 9100

    /**
     * Schedule all upcoming prayer alarms from the provided JSON.
     *
     * @param context     Application context.
     * @param prayersJson JSON array string — each object must have "name" (String)
     *                    and "timestamp" (Long epoch ms of the prayer time).
     * @param category    Device OEM category (1, 2, or 3).
     * @param cat1Mode    "alltime" or "prior" — only relevant when category == 1.
     * @param leadMinutes Lead time in minutes before prayer to show prior notification.
     *                    Only used when category == 1 && cat1Mode == "prior".
     */
    fun scheduleAll(
        context: Context,
        prayersJson: String,
        category: Int,
        mode: String,
        leadMinutes: Int
    ) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val now = System.currentTimeMillis()
        val sdf = SimpleDateFormat("h:mm a", Locale.getDefault())

        try {
            val jsonArray = JSONArray(prayersJson)

            // Cancel any previous alarms before re-scheduling
            cancelAll(context, jsonArray.length())

            var scheduled = 0
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                val name = obj.getString("name")
                val prayerTimestamp = obj.getLong("timestamp")
                val formattedTime = sdf.format(Date(prayerTimestamp))

                when {
                    // ── Cat 1 & Cat 2 Mode B (Prior Live): prior window via PriorServiceStartReceiver ──────────
                    (category == 1 || category == 2) && mode == "prior" -> {
                        val triggerTime = prayerTimestamp - (leadMinutes * 60_000L)
                        if (triggerTime > now) {
                            val intent = Intent(context, PriorServiceStartReceiver::class.java).apply {
                                putExtra(PriorServiceStartReceiver.EXTRA_PRAYER_NAME, name)
                                putExtra(PriorServiceStartReceiver.EXTRA_PRAYER_TIMESTAMP, prayerTimestamp)
                                putExtra(PriorServiceStartReceiver.EXTRA_SCHEDULED_TIME, triggerTime)
                            }
                            val pi = PendingIntent.getBroadcast(
                                context,
                                PRIOR_REQUEST_BASE + i,
                                intent,
                                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                            )
                            val clockInfo = AlarmManager.AlarmClockInfo(triggerTime, pi)
                            alarmManager.setAlarmClock(clockInfo, pi)
                            scheduled++
                            Log.d(TAG, "Cat$category-Prior: Scheduled $name at $formattedTime (trigger in ${(triggerTime - now) / 60000} min)")
                        }
                    }

                    // ── Cat 2 Mode C (Simple Reminder): setAlarmClock to beat Funtouch deep sleep ──────
                    category == 2 && mode == "simple" -> {
                        val reminderTime = prayerTimestamp - (15 * 60_000L)
                        if (reminderTime > now) {
                            val intent = buildReminderIntent(context, name, formattedTime, reminderTime)
                            val pi = PendingIntent.getBroadcast(
                                context,
                                REMINDER_REQUEST_BASE + i,
                                intent,
                                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                            )
                            val clockInfo = AlarmManager.AlarmClockInfo(reminderTime, pi)
                            alarmManager.setAlarmClock(clockInfo, pi)
                            scheduled++
                            Log.d(TAG, "Cat2-Vivo (Simple): setAlarmClock for $name reminder at ${Date(reminderTime)}")
                        }
                    }

                    // ── Cat 3 (Samsung/Pixel/Xiaomi): setExactAndAllowWhileIdle ────────────
                    category == 3 -> {
                        val reminderTime = prayerTimestamp - (15 * 60_000L)
                        if (reminderTime > now) {
                            val intent = buildReminderIntent(context, name, formattedTime, reminderTime)
                            val pi = PendingIntent.getBroadcast(
                                context,
                                REMINDER_REQUEST_BASE + i,
                                intent,
                                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                            )
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                alarmManager.setExactAndAllowWhileIdle(
                                    AlarmManager.RTC_WAKEUP, reminderTime, pi
                                )
                            } else {
                                alarmManager.setExact(AlarmManager.RTC_WAKEUP, reminderTime, pi)
                            }
                            scheduled++
                            Log.d(TAG, "Cat3: setExactAndAllowWhileIdle for $name reminder at ${Date(reminderTime)}")
                        }
                    }
                }
            }

            // Persist count for later cancellation
            context.getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
                .edit()
                .putInt("scheduled_reminder_count", jsonArray.length())
                .apply()

            // Enable BootReceiver if device brand and mode require reboot alarm scheduling.
            // Cat 1 and Cat 2 Modes A/D (persistent foreground service) handle boot separately.
            val needsBootReceiver = category == 3 ||
                (category == 1 && mode == "prior") ||
                (category == 2 && (mode == "prior" || mode == "simple"))
            if (needsBootReceiver) {
                setBootReceiverEnabled(context, scheduled > 0)
            }

            Log.d(TAG, "scheduleAll: $scheduled alarms scheduled (cat=$category, mode=$mode)")
        } catch (e: Exception) {
            Log.e(TAG, "scheduleAll failed", e)
        }
    }

    /**
     * Verify that all PendingIntents registered by [scheduleAll] still exist in the OS.
     * Returns `true` if any was missing and alarms were re-scheduled.
     */
    fun verifyAndReconcile(
        context: Context,
        prayersJson: String,
        category: Int,
        mode: String,
        leadMinutes: Int
    ): Boolean {
        return try {
            val jsonArray = JSONArray(prayersJson)
            val now = System.currentTimeMillis()
            var anyMissing = false

            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                val name = obj.getString("name")
                val prayerTimestamp = obj.getLong("timestamp")

                // Only check alarms that haven't fired yet
                val triggerTime = when {
                    (category == 1 || category == 2) && mode == "prior" -> prayerTimestamp - (leadMinutes * 60_000L)
                    category == 2 && mode == "simple" -> prayerTimestamp - (15 * 60_000L)
                    else -> prayerTimestamp - (15 * 60_000L)
                }
                if (triggerTime <= now) continue

                val isPriorMode = (category == 1 || category == 2) && mode == "prior"
                val requestCode = if (isPriorMode) {
                    PRIOR_REQUEST_BASE + i
                } else {
                    REMINDER_REQUEST_BASE + i
                }

                val receiverClass = if (isPriorMode) {
                    PriorServiceStartReceiver::class.java
                } else {
                    PrayerReminderReceiver::class.java
                }

                val probeIntent = Intent(context, receiverClass)
                val probe = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    probeIntent,
                    PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
                )

                if (probe == null) {
                    Log.w(TAG, "verifyAndReconcile: PendingIntent missing for $name (index $i) — re-scheduling all")
                    anyMissing = true
                    break
                }
            }

            if (anyMissing) {
                scheduleAll(context, prayersJson, category, mode, leadMinutes)
            }
            anyMissing
        } catch (e: Exception) {
            Log.e(TAG, "verifyAndReconcile failed", e)
            false
        }
    }

    /**
     * Cancel all previously scheduled alarms (both reminder and prior-service receivers).
     */
    fun cancelAll(context: Context, count: Int) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        for (i in 0 until count) {
            cancelPendingIntent(context, alarmManager, PrayerReminderReceiver::class.java, REMINDER_REQUEST_BASE + i)
            cancelPendingIntent(context, alarmManager, PriorServiceStartReceiver::class.java, PRIOR_REQUEST_BASE + i)
        }
        setBootReceiverEnabled(context, false)
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private fun buildReminderIntent(
        context: Context,
        name: String,
        formattedTime: String,
        scheduledTime: Long
    ): Intent = Intent(context, PrayerReminderReceiver::class.java).apply {
        putExtra(PrayerReminderReceiver.EXTRA_PRAYER_NAME, name)
        putExtra(PrayerReminderReceiver.EXTRA_PRAYER_TIME, formattedTime)
        putExtra(PrayerReminderReceiver.EXTRA_SCHEDULED_TIME, scheduledTime)
    }

    private fun cancelPendingIntent(
        context: Context,
        alarmManager: AlarmManager,
        receiverClass: Class<*>,
        requestCode: Int
    ) {
        val intent = Intent(context, receiverClass)
        val pi = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        ) ?: return
        alarmManager.cancel(pi)
        pi.cancel()
    }

    private fun setBootReceiverEnabled(context: Context, enabled: Boolean) {
        val state = if (enabled) {
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED
        } else {
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED
        }
        try {
            context.packageManager.setComponentEnabledSetting(
                ComponentName(context, BootReceiver::class.java),
                state,
                PackageManager.DONT_KILL_APP
            )
        } catch (e: Exception) {
            Log.e(TAG, "setBootReceiverEnabled failed", e)
        }
    }
}

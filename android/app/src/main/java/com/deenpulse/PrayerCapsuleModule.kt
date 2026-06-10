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
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.AlarmClock
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.wearable.Wearable

class PrayerCapsuleModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "PrayerCapsuleModule"
        private var instanceContext: ReactContext? = null

        fun sendEvent(eventName: String, params: String?) {
            instanceContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, params)
        }
    }

    init {
        instanceContext = reactContext
    }

    override fun getName(): String = "PrayerCapsuleModule"

    // ── Foreground Service (Cat 1 Mode A — all-time live notification) ─────────

    @ReactMethod
    fun updateLiveCapsule(prayersJson: String, capsuleFormat: String, notificationStyle: String, activeMode: String) {
        val intent = Intent(reactApplicationContext, PrayerCapsuleForegroundService::class.java).apply {
            putExtra("prayersJson", prayersJson)
            putExtra("capsuleFormat", capsuleFormat)
            putExtra("notificationStyle", notificationStyle)
            putExtra("activeMode", activeMode)
        }
        ContextCompat.startForegroundService(reactApplicationContext, intent)
    }

    @ReactMethod
    fun stopCapsule() {
        val intent = Intent(reactApplicationContext, PrayerCapsuleForegroundService::class.java)
        reactApplicationContext.stopService(intent)
    }

    // ── Native OS Alarm / Timer ────────────────────────────────────────────────

    @ReactMethod
    fun setNativeOSAlarm(hour: Int, minute: Int, label: String) {
        val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
            putExtra(AlarmClock.EXTRA_HOUR, hour)
            putExtra(AlarmClock.EXTRA_MINUTES, minute)
            putExtra(AlarmClock.EXTRA_MESSAGE, label)
            putExtra(AlarmClock.EXTRA_SKIP_UI, false)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try {
            reactApplicationContext.startActivity(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun setNativeOSTimer(seconds: Int, label: String) {
        val intent = Intent(AlarmClock.ACTION_SET_TIMER).apply {
            putExtra(AlarmClock.EXTRA_LENGTH, seconds)
            putExtra(AlarmClock.EXTRA_MESSAGE, label)
            putExtra(AlarmClock.EXTRA_SKIP_UI, false)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try {
            reactApplicationContext.startActivity(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // ── Device Category & Notification Preferences ────────────────────────────

    @ReactMethod
    fun setDeviceCategory(category: Int) {
        val prefs = reactApplicationContext.getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
        prefs.edit().putInt("device_category", category).apply()
        Log.d(TAG, "setDeviceCategory: $category")
    }

    @ReactMethod
    fun setForcePromotedNotification(enabled: Boolean) {
        val prefs = reactApplicationContext.getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("isLiveNotificationForced", enabled).apply()
    }

    @ReactMethod
    fun setBackgroundInterval(intervalMs: Double) {
        val prefs = reactApplicationContext.getSharedPreferences("DeenPulsePrefs", android.content.Context.MODE_PRIVATE)
        prefs.edit().putLong("updateIntervalMs", intervalMs.toLong()).apply()
    }

    /**
     * Persist the Cat 1 notification mode selection.
     * @param mode "alltime" or "prior"
     */
    @ReactMethod
    fun setCat1NotificationMode(mode: String) {
        val prefs = reactApplicationContext.getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
        prefs.edit().putString("cat1_notification_mode", mode).apply()
        Log.d(TAG, "setCat1NotificationMode: $mode")
    }

    /**
     * Persist the prior-window lead time for Cat 1 Mode B.
     * @param minutes 5, 10, or 15
     */
    @ReactMethod
    fun setPriorNotificationLeadTime(minutes: Int) {
        val prefs = reactApplicationContext.getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
        prefs.edit().putInt("prior_lead_time_minutes", minutes).apply()
        Log.d(TAG, "setPriorNotificationLeadTime: $minutes min")
    }

    /**
     * Persist the Cat 2 notification mode selection.
     * @param mode "alltime", "prior", "simple", or "nocapsule"
     */
    @ReactMethod
    fun setCat2NotificationMode(mode: String) {
        val prefs = reactApplicationContext.getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
        prefs.edit().putString("cat2_notification_mode", mode).apply()
        Log.d(TAG, "setCat2NotificationMode: $mode")
    }

    /**
     * Persist the prior-window lead time for Cat 2 Mode B.
     * @param minutes 5, 10, or 15
     */
    @ReactMethod
    fun setCat2PriorLeadTime(minutes: Int) {
        val prefs = reactApplicationContext.getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
        prefs.edit().putInt("cat2_prior_lead_time_minutes", minutes).apply()
        Log.d(TAG, "setCat2PriorLeadTime: $minutes min")
    }

    // ── Alarm Scheduling (Bug 1 Fix + Cat 1 Mode B) ───────────────────────────

    /**
     * Schedule all prayer alarms from the provided JSON array.
     * Routing by device category is handled in [AlarmSchedulerHelper].
     *
     * JSON format: [{ "name": "Fajr", "timestamp": 1234567890000 }, ...]
     */
    @ReactMethod
    fun scheduleReminders(prayersJson: String) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)

        // Guard: exact alarm permission required on API 31+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
            if (!alarmManager.canScheduleExactAlarms()) {
                Log.e(TAG, "scheduleReminders: exact alarm permission not granted — aborting")
                return
            }
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

        AlarmSchedulerHelper.scheduleAll(context, prayersJson, category, mode, leadMinutes)
    }

    /**
     * Cancel all active prayer reminder alarms.
     */
    @ReactMethod
    fun cancelReminders() {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
        val count = prefs.getInt("scheduled_reminder_count", 10)
        AlarmSchedulerHelper.cancelAll(context, count)
    }

    // ── Bug 2 Fix — Self-Healing Alarm Reconciliation ─────────────────────────

    /**
     * Verify that all expected AlarmManager PendingIntents still exist in the OS.
     * If any are missing (e.g. wiped by ColorOS process reaper), re-schedules all.
     *
     * Called from the JS layer every time [MainActivity.onResume] fires via the
     * "onAppForegrounded" event. This is the core fix for Bug 2.
     *
     * Resolves with `true` if alarms were missing and re-scheduled, `false` if all intact.
     */
    @ReactMethod
    fun verifyAndReconcileAlarms(prayersJson: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
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

            // Cat 1 & Cat 2 Mode A/D use a persistent foreground service — no AlarmManager to verify
            if ((category == 1 || category == 2) && (mode == "alltime" || mode == "nocapsule")) {
                promise.resolve(false)
                return
            }

            val reconciled = AlarmSchedulerHelper.verifyAndReconcile(
                context, prayersJson, category, mode, leadMinutes
            )
            Log.d(TAG, "verifyAndReconcileAlarms: reconciled=$reconciled")
            promise.resolve(reconciled)
        } catch (e: Exception) {
            Log.e(TAG, "verifyAndReconcileAlarms failed", e)
            promise.reject("RECONCILE_ERROR", e.message, e)
        }
    }

    // ── OEM Settings Navigation ────────────────────────────────────────────────

    /**
     * Navigate directly to the OEM-specific autostart / background permission settings screen.
     * Falls back to battery optimization settings if the OEM-specific intent fails.
     */
    @ReactMethod
    fun navigateToOEMSettings() {
        val context = reactApplicationContext
        val manufacturer = Build.MANUFACTURER.lowercase()
        val brand = Build.BRAND.lowercase()

        val intent = Intent().apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }

        val launched = when {
            manufacturer.contains("vivo") || brand.contains("vivo") ||
            manufacturer.contains("iqoo") || brand.contains("iqoo") -> {
                // Vivo (Funtouch OS / OriginOS) — Autostart Manager
                tryLaunchComponent(
                    context, intent,
                    "com.vivo.permissionmanager",
                    "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"
                ) || tryLaunchComponent(
                    context, intent,
                    "com.iqoo.secure",
                    "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"
                )
            }
            manufacturer.contains("oppo") || brand.contains("oppo") ||
            manufacturer.contains("realme") || brand.contains("realme") ||
            manufacturer.contains("oneplus") || brand.contains("oneplus") -> {
                // ColorOS — Auto Launch settings
                tryLaunchComponent(
                    context, intent,
                    "com.coloros.safecenter",
                    "com.coloros.safecenter.permission.startup.StartupAppListActivity"
                ) || tryLaunchComponent(
                    context, intent,
                    "com.oplus.safecenter",
                    "com.oplus.safecenter.permission.startup.StartupAppListActivity"
                )
            }
            else -> false
        }

        if (!launched) {
            // Universal fallback — battery optimization list
            try {
                val fallback = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(fallback)
            } catch (e: Exception) {
                Log.e(TAG, "All OEM settings navigation attempts failed", e)
            }
        }
    }

    private fun tryLaunchComponent(
        context: Context,
        intent: Intent,
        pkg: String,
        cls: String
    ): Boolean {
        return try {
            intent.component = ComponentName(pkg, cls)
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            Log.w(TAG, "Could not launch $pkg/$cls: ${e.message}")
            false
        }
    }

    // ── Wear OS ───────────────────────────────────────────────────────────────

    @ReactMethod
    fun syncToWear(prayersJson: String, lat: Double, lng: Double) {
        WearDataSyncService.pushTimetableToWear(reactApplicationContext, prayersJson, lat, lng)
    }

    @ReactMethod
    fun getWearConnectionStatus(promise: Promise) {
        try {
            val nodeClient = Wearable.getNodeClient(reactApplicationContext)
            nodeClient.connectedNodes.addOnSuccessListener { nodes ->
                val result = Arguments.createMap()
                if (nodes.isEmpty()) {
                    result.putBoolean("connected", false)
                    result.putString("nodeName", "")
                } else {
                    val node = nodes[0]
                    result.putBoolean("connected", true)
                    result.putString("nodeName", node.displayName)
                }
                promise.resolve(result)
            }.addOnFailureListener { exception ->
                promise.reject("WEAR_CONN_ERROR", exception.message, exception)
            }
        } catch (e: Exception) {
            promise.reject("WEAR_CONN_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun syncSettingsToWear(juristicMethod: String, calculationRule: String) {
        val prefs = reactApplicationContext.getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
        val category = prefs.getInt("device_category", 3)
        WearDataSyncService.pushSettingsToWear(reactApplicationContext, juristicMethod, calculationRule, category)
    }

    // ── Prayer Alert ──────────────────────────────────────────────────────────

    @ReactMethod
    fun playPrayerAlert(prayerName: String) {
        val context = reactApplicationContext
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val channelId = "deenpulse_prayer_alert"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Prayer Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Audible alerts when a prayer time starts"
                enableVibration(true)
                setSound(
                    android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION),
                    android.media.AudioAttributes.Builder()
                        .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
            }
            notificationManager.createNotificationChannel(channel)
        }

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pendingIntent = PendingIntent.getActivity(
            context, 9, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, channelId)
            .setContentTitle("It's time for $prayerName")
            .setContentText("Tap to open DeenPulse and view timings.")
            .setSmallIcon(R.drawable.ic_stat_prayer)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .build()

        notificationManager.notify(7002, notification)
    }

    // ── App Settings ──────────────────────────────────────────────────────────

    @ReactMethod
    fun openAppSettings() {
        val intent = Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = android.net.Uri.fromParts("package", reactApplicationContext.packageName, null)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try {
            reactApplicationContext.startActivity(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    @ReactMethod
    fun getAppVersion(promise: Promise) {
        try {
            val pInfo = reactApplicationContext.packageManager.getPackageInfo(reactApplicationContext.packageName, 0)
            promise.resolve(pInfo.versionName ?: "1.0.0")
        } catch (e: Exception) {
            promise.resolve("1.0.0")
        }
    }
}

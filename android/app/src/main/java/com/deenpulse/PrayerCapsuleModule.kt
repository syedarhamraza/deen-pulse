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
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.AlarmClock
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

    @ReactMethod
    fun updateLiveCapsule(prayersJson: String, capsuleFormat: String, notificationStyle: String) {
        val intent = Intent(reactApplicationContext, PrayerCapsuleForegroundService::class.java).apply {
            putExtra("prayersJson", prayersJson)
            putExtra("capsuleFormat", capsuleFormat)
            putExtra("notificationStyle", notificationStyle)
        }
        ContextCompat.startForegroundService(reactApplicationContext, intent)
    }

    @ReactMethod
    fun stopCapsule() {
        val intent = Intent(reactApplicationContext, PrayerCapsuleForegroundService::class.java)
        reactApplicationContext.stopService(intent)
    }

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

    @ReactMethod
    fun setBackgroundInterval(intervalMs: Double) {
        val prefs = reactApplicationContext.getSharedPreferences("DeenPulsePrefs", android.content.Context.MODE_PRIVATE)
        prefs.edit().putLong("updateIntervalMs", intervalMs.toLong()).apply()
    }

    /**
     * Push prayer timetable + coordinates to connected Wear OS watch.
     * Called from React Native after prayer times are loaded/refreshed.
     */
    @ReactMethod
    fun syncToWear(prayersJson: String, lat: Double, lng: Double) {
        WearDataSyncService.pushTimetableToWear(reactApplicationContext, prayersJson, lat, lng)
    }

    @ReactMethod
    fun setDeviceCategory(category: Int) {
        val prefs = reactApplicationContext.getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
        prefs.edit().putInt("device_category", category).apply()
    }

    @ReactMethod
    fun setForcePromotedNotification(enabled: Boolean) {
        val prefs = reactApplicationContext.getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("isLiveNotificationForced", enabled).apply()
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

    @ReactMethod
    fun syncSettingsToWear(juristicMethod: String, calculationRule: String) {
        val prefs = reactApplicationContext.getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
        val category = prefs.getInt("device_category", 3)
        WearDataSyncService.pushSettingsToWear(reactApplicationContext, juristicMethod, calculationRule, category)
    }

    /**
     * Schedule AlarmManager reminders for Cat3 devices.
     * Each prayer gets a reminder 15 minutes before its scheduled time.
     * Called from React Native when device is Category 3 and user prefers reminders over ongoing notification.
     */
    @ReactMethod
    fun scheduleReminders(prayersJson: String) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
            val jsonArray = org.json.JSONArray(prayersJson)
            val now = System.currentTimeMillis()
            val fifteenMinMs = 15L * 60L * 1000L
            val sdf = java.text.SimpleDateFormat("h:mm a", java.util.Locale.getDefault())

            // Cancel existing alarms first
            cancelAllReminders(context, jsonArray.length())

            var scheduledCount = 0
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                val name = obj.getString("name")
                val timestamp = obj.getLong("timestamp")
                val reminderTime = timestamp - fifteenMinMs

                // Only schedule future reminders
                if (reminderTime > now) {
                    val formattedTime = sdf.format(java.util.Date(timestamp))
                    val intent = Intent(context, PrayerReminderReceiver::class.java).apply {
                        putExtra(PrayerReminderReceiver.EXTRA_PRAYER_NAME, name)
                        putExtra(PrayerReminderReceiver.EXTRA_PRAYER_TIME, formattedTime)
                    }
                    val pendingIntent = PendingIntent.getBroadcast(
                        context, 9000 + i, intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarmManager.setExactAndAllowWhileIdle(
                            android.app.AlarmManager.RTC_WAKEUP, reminderTime, pendingIntent
                        )
                    } else {
                        alarmManager.setExact(
                            android.app.AlarmManager.RTC_WAKEUP, reminderTime, pendingIntent
                        )
                    }
                    scheduledCount++
                }
            }

            // Store the scheduled count for cleanup
            val prefs = context.getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
            prefs.edit().putInt("scheduled_reminder_count", jsonArray.length()).apply()

            android.util.Log.d("PrayerCapsuleModule", "Scheduled $scheduledCount prayer reminders for Cat3 device")
        } catch (e: Exception) {
            android.util.Log.e("PrayerCapsuleModule", "Failed to schedule reminders", e)
        }
    }

    @ReactMethod
    fun cancelReminders() {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
        val count = prefs.getInt("scheduled_reminder_count", 10)
        cancelAllReminders(context, count)
    }

    private fun cancelAllReminders(context: Context, count: Int) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
        for (i in 0 until count) {
            val intent = Intent(context, PrayerReminderReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context, 9000 + i, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager.cancel(pendingIntent)
        }
    }

    /**
     * Returns the app version string from BuildConfig.
     */
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

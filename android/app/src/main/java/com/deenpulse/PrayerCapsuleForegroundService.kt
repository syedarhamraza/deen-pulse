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

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class PrayerScheduleItem(val name: String, val timestamp: Long)

data class NotificationTexts(
    val contentTitle: String,
    val contentText: String,
    val shortText: String,
    val useChronometer: Boolean
)

class PrayerCapsuleForegroundService : Service() {

    private var prayerList: List<PrayerScheduleItem> = emptyList()
    private var currentPrayerName: String = ""
    private var currentTargetTimestamp: Long = 0L
    private val handler = Handler(Looper.getMainLooper())
    private var isTimerRunning = false
    private var capsuleFormat: String = "name"
    private var notificationStyle: String = "standard"
    private var isCountdownRunning = false

    /**
     * True when this service was started by [PriorServiceStartReceiver] (Cat 1 Mode B).
     * In prior-window mode the service auto-stops once the prayer time passes plus a
     * short grace window, instead of running all day.
     */
    private var isPriorWindowMode: Boolean = false

    /**
     * The epoch-ms timestamp of the prayer that triggered this prior window.
     * Used to decide when to auto-stop in prior-window mode.
     */
    private var priorWindowPrayerTimestamp: Long = 0L

    /** Grace period after prayer time before the prior-window service shuts down (5 min). */
    private val PRIOR_WINDOW_GRACE_MS = 5 * 60 * 1000L

    private var lastPostedTitle: String? = null
    private var lastPostedContentText: String? = null
    private var lastPostedShortText: String? = null
    private var lastPostedStyle: String? = null
    private var lastPostedUseChronometer: Boolean? = null

    private fun formatCountdown(remainingMs: Long): String {
        if (remainingMs <= 0L) return "00s"
        val totalSecs = remainingMs / 1000L
        val seconds = totalSecs % 60L
        val minutes = (totalSecs / 60L) % 60L
        val hours = totalSecs / 3600L
        return if (hours > 0L) {
            String.format(Locale.getDefault(), "%02dh %02dm %02ds", hours, minutes, seconds)
        } else if (minutes > 0L) {
            String.format(Locale.getDefault(), "%02dm %02ds", minutes, seconds)
        } else {
            String.format(Locale.getDefault(), "%02ds", seconds)
        }
    }

    private fun getDeviceCategory(): Int {
        val prefs = getSharedPreferences("DeenPulsePrefs", MODE_PRIVATE)
        val deviceCategory = prefs.getInt("device_category", -1)
        if (deviceCategory != -1) return deviceCategory
        val manufacturer = Build.MANUFACTURER?.lowercase() ?: ""
        val brand = Build.BRAND?.lowercase() ?: ""
        return if (manufacturer.contains("oppo") || manufacturer.contains("oneplus") || manufacturer.contains("realme") ||
            brand.contains("oppo") || brand.contains("oneplus") || brand.contains("realme")) {
            1
        } else if (manufacturer.contains("vivo") || manufacturer.contains("iqoo") ||
                   brand.contains("vivo") || brand.contains("iqoo")) {
            2
        } else {
            3
        }
    }

    private val countdownRunnable = object : Runnable {
        override fun run() {
            if (isCountdownRunning) {
                val isCountdownActive = (capsuleFormat == "name_countdown" || notificationStyle == "with_countdown") && getActivePrayerName() == null
                if (isCountdownActive) {
                    updateNotification()
                }
                handler.postDelayed(this, 1000L)
            }
        }
    }

    private fun formatTime(timestamp: Long): String {
        if (timestamp == 0L) return ""
        val sdf = SimpleDateFormat("h:mm a", Locale.getDefault())
        return sdf.format(Date(timestamp))
    }

    private val checkRunnable = object : Runnable {
        override fun run() {
            val now = System.currentTimeMillis()

            // ── Prior-window auto-stop (Cat 1 Mode B) ────────────────────────
            // Stop the service automatically once the prayer time has passed plus grace.
            if (isPriorWindowMode && priorWindowPrayerTimestamp > 0L) {
                val windowEnd = priorWindowPrayerTimestamp + PRIOR_WINDOW_GRACE_MS
                if (now >= windowEnd) {
                    Log.d("PrayerCapsuleService", "Prior-window mode: grace period expired for prayer at $priorWindowPrayerTimestamp. Stopping service.")
                    stopSelf()
                    return
                }
            }

            // Immediate transition at prayer arrival
            if (currentTargetTimestamp > 0L && currentTargetTimestamp <= now) {
                Log.d("PrayerCapsuleService", "Prayer $currentPrayerName time reached ($currentTargetTimestamp <= $now). Advancing.")
                fireActiveNotification(currentPrayerName)
                
                // Immediately transition to next prayer
                val next = findNextPrayer()
                if (next != null && next.timestamp > now) {
                    currentPrayerName = next.name
                    currentTargetTimestamp = next.timestamp
                    updateNotification()
                    Log.d("PrayerCapsuleService", "Transitioned to: ${next.name} at ${next.timestamp}")
                }
            }

            val next = findNextPrayer()
            if (next != null) {
                if (next.name != currentPrayerName || next.timestamp != currentTargetTimestamp) {
                    // Verify the target is actually in the future before setting
                    if (next.timestamp > now) {
                        currentPrayerName = next.name
                        currentTargetTimestamp = next.timestamp
                        updateNotification()
                        Log.d("PrayerCapsuleService", "Updated target to: ${next.name} at ${next.timestamp}")
                    }
                }
                // Schedule next check
                val timeToNext = if (currentTargetTimestamp > now) currentTargetTimestamp - now else 60000L
                val delay = timeToNext.coerceIn(1000L, 60000L)
                handler.postDelayed(this, delay)
            } else {
                if (getActivePrayerName() != null) {
                    updateNotification()
                    handler.postDelayed(this, 5000L)
                } else {
                    Log.d("PrayerCapsuleService", "All prayers exhausted. Showing Schedule Complete notification.")
                    showScheduleCompleteNotification()
                }
            }
        }
    }

    companion object {
        private const val CHANNEL_ID = "deenpulse_capsule"
        private const val CHANNEL_NAME = "Prayer Countdown"
        private const val NOTIFICATION_ID = 7001
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val format = intent?.getStringExtra("capsuleFormat")
        val style = intent?.getStringExtra("notificationStyle")
        
        val prefs = getSharedPreferences("DeenPulsePrefs", MODE_PRIVATE)
        if (format != null) {
            capsuleFormat = format
            prefs.edit().putString("capsuleFormat", format).apply()
        } else {
            capsuleFormat = prefs.getString("capsuleFormat", "name") ?: "name"
        }
        if (style != null) {
            notificationStyle = style
            prefs.edit().putString("notificationStyle", style).apply()
        } else {
            notificationStyle = prefs.getString("notificationStyle", "standard") ?: "standard"
        }

        val action = intent?.action
        if (action != null) {
            when (action) {
                "ACTION_REFRESH" -> {
                    PrayerCapsuleModule.sendEvent("onRefreshRequested", null)
                }
                "ACTION_CLOSE" -> {
                    stopSelf()
                    System.exit(0)
                }
                PriorServiceStartReceiver.ACTION_START_PRIOR_WINDOW -> {
                    // Cat 1 Mode B: started by PriorServiceStartReceiver at lead time.
                    // Mark this as a prior-window session so the service auto-stops
                    // once the prayer time passes.
                    isPriorWindowMode = true
                    priorWindowPrayerTimestamp = intent.getLongExtra(
                        PriorServiceStartReceiver.EXTRA_PRAYER_TIMESTAMP, 0L
                    )
                    Log.d("PrayerCapsuleService", "Prior-window mode activated for prayer at $priorWindowPrayerTimestamp")
                    // Fall through — the prayersJson / startForeground logic below will handle the rest
                }
            }
            // Only return early for non-data actions; let prior-window fall through to load data
            if (action == "ACTION_REFRESH" || action == "ACTION_CLOSE") {
                return START_NOT_STICKY
            }
        }

        val newPrayersJson = intent?.getStringExtra("prayersJson")
        if (newPrayersJson != null) {
            try {
                val jsonArray = JSONArray(newPrayersJson)
                val list = mutableListOf<PrayerScheduleItem>()
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    val name = obj.getString("name")
                    val timestamp = obj.getLong("timestamp")
                    list.add(PrayerScheduleItem(name, timestamp))
                }
                prayerList = list
                
                // Persist the updated prayer list
                prefs.edit().putString("last_prayer_list", newPrayersJson).apply()

                val next = findNextPrayer()
                if (next != null) {
                    currentPrayerName = next.name
                    currentTargetTimestamp = next.timestamp
                    
                    val notification = buildCapsuleNotification()
                    startForeground(NOTIFICATION_ID, notification)
                    syncLastPostedFields()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        } else {
            // Null intent fallback (e.g. service restart by OS)
            val savedJson = prefs.getString("last_prayer_list", null)
            if (savedJson != null) {
                try {
                    val jsonArray = JSONArray(savedJson)
                    val list = mutableListOf<PrayerScheduleItem>()
                    for (i in 0 until jsonArray.length()) {
                        val obj = jsonArray.getJSONObject(i)
                        val name = obj.getString("name")
                        val timestamp = obj.getLong("timestamp")
                        list.add(PrayerScheduleItem(name, timestamp))
                    }
                    prayerList = list

                    val next = findNextPrayer()
                    if (next != null) {
                        currentPrayerName = next.name
                        currentTargetTimestamp = next.timestamp
                        val notification = buildCapsuleNotification()
                        startForeground(NOTIFICATION_ID, notification)
                        syncLastPostedFields()
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        if (!isTimerRunning) {
            isTimerRunning = true
            handler.post(checkRunnable)
        }

        if (!isCountdownRunning) {
            isCountdownRunning = true
            handler.post(countdownRunnable)
        }

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(checkRunnable)
        isTimerRunning = false
        handler.removeCallbacks(countdownRunnable)
        isCountdownRunning = false
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        Log.d("PrayerCapsuleService", "App task removed. Service remains sticky.")
    }

    private fun findNextPrayer(): PrayerScheduleItem? {
        val now = System.currentTimeMillis()
        return prayerList.sortedBy { it.timestamp }.firstOrNull { it.timestamp > now }
    }

    private fun getActivePrayerName(): String? {
        val now = System.currentTimeMillis()
        val passedPrayers = prayerList.sortedBy { it.timestamp }.filter { it.timestamp <= now }
        if (passedPrayers.isEmpty()) return null
        val lastPassed = passedPrayers.last()
        val fifteenMinutesMs = 15 * 60 * 1000L
        if (now - lastPassed.timestamp < fifteenMinutesMs) {
            return lastPassed.name
        }
        return null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Live prayer countdown capsule"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun getNotificationTexts(
        activePrayerName: String?,
        formattedTime: String,
        countdownStr: String,
        isVivo: Boolean
    ): NotificationTexts {
        val contentTitle: String
        val contentText: String
        val shortText: String

        // shortText for status bar capsule — always computed from capsuleFormat
        shortText = if (activePrayerName != null) {
            "Active"
        } else {
            when (capsuleFormat) {
                "name_countdown" -> "$currentPrayerName ($countdownStr)"
                "name_time" -> "$currentPrayerName ($formattedTime)"
                "time" -> formattedTime
                else -> currentPrayerName
            }
        }

        if (activePrayerName != null) {
            // Active prayer state — same for all devices
            contentTitle = "Prayer Active: $activePrayerName"
            contentText = "Active"
        } else if (isVivo) {
            // Vivo/iQOO: Use simple, clean title. No string concatenation in contentText.
            // OriginOS rejects complex text layouts and breaks animation transitions.
            contentTitle = "Next Prayer: $currentPrayerName"
            contentText = when (notificationStyle) {
                "with_countdown" -> countdownStr
                "with_time" -> formattedTime
                else -> ""
            }
        } else {
            // Cat1 (OPPO/OnePlus/Realme) and Cat3 (Samsung/Xiaomi/Pixel)
            contentTitle = when (notificationStyle) {
                "with_time" -> "Next Prayer: $currentPrayerName ($formattedTime)"
                "with_countdown" -> "Next Prayer: $currentPrayerName ($countdownStr)"
                else -> "Next Prayer: $currentPrayerName"
            }
            contentText = shortText
        }

        // Chronometer disabled for Vivo (breaks alignment on OriginOS)
        val useChronometer = !isVivo && (notificationStyle != "with_countdown") && (activePrayerName == null)

        return NotificationTexts(contentTitle, contentText, shortText, useChronometer)
    }

    private fun syncLastPostedFields() {
        val activePrayerName = getActivePrayerName()
        val formattedTime = formatTime(currentTargetTimestamp)
        val remainingMs = currentTargetTimestamp - System.currentTimeMillis()
        val countdownStr = formatCountdown(remainingMs)
        val category = getDeviceCategory()
        val isVivo = (category == 2)

        val texts = getNotificationTexts(activePrayerName, formattedTime, countdownStr, isVivo)

        lastPostedTitle = texts.contentTitle
        lastPostedContentText = texts.contentText
        lastPostedShortText = texts.shortText
        lastPostedStyle = notificationStyle
        lastPostedUseChronometer = texts.useChronometer
    }

    private fun updateNotification() {
        val activePrayerName = getActivePrayerName()
        val formattedTime = formatTime(currentTargetTimestamp)
        val remainingMs = currentTargetTimestamp - System.currentTimeMillis()
        val countdownStr = formatCountdown(remainingMs)
        val category = getDeviceCategory()
        val isVivo = (category == 2)

        val texts = getNotificationTexts(activePrayerName, formattedTime, countdownStr, isVivo)

        if (texts.contentTitle == lastPostedTitle && 
            texts.contentText == lastPostedContentText &&
            texts.shortText == lastPostedShortText && 
            notificationStyle == lastPostedStyle && 
            texts.useChronometer == lastPostedUseChronometer) {
            return
        }

        lastPostedTitle = texts.contentTitle
        lastPostedContentText = texts.contentText
        lastPostedShortText = texts.shortText
        lastPostedStyle = notificationStyle
        lastPostedUseChronometer = texts.useChronometer

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        val notification = buildCapsuleNotification()
        manager?.notify(NOTIFICATION_ID, notification)
    }

    private fun buildCapsuleNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val refreshIntent = Intent(this, PrayerCapsuleForegroundService::class.java).apply {
            setAction("ACTION_REFRESH")
        }
        val refreshPendingIntent = PendingIntent.getService(
            this, 1, refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val closeIntent = Intent(this, PrayerCapsuleForegroundService::class.java).apply {
            setAction("ACTION_CLOSE")
        }
        val closePendingIntent = PendingIntent.getService(
            this, 2, closeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val formattedTime = formatTime(currentTargetTimestamp)
        val remainingMs = currentTargetTimestamp - System.currentTimeMillis()
        val countdownStr = formatCountdown(remainingMs)

        val category = getDeviceCategory()
        val isVivo = (category == 2)
        val activePrayerName = getActivePrayerName()

        val texts = getNotificationTexts(activePrayerName, formattedTime, countdownStr, isVivo)

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(texts.contentTitle)
            .setContentText(texts.contentText)
            .setSmallIcon(R.drawable.ic_stat_prayer)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_NAVIGATION)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setUsesChronometer(texts.useChronometer)
            .setChronometerCountDown(texts.useChronometer)
            .addAction(0, "Refresh", refreshPendingIntent)
            .addAction(0, "Close App", closePendingIntent)

        if (texts.useChronometer) {
            builder.setWhen(currentTargetTimestamp)
        }

        if (category == 1 || category == 2) {
            // Category 1 & 2: OPPO/OnePlus/Realme and Vivo/iQOO - Promoted Ongoing Status Bar Capsule Enabled
            try {
                builder.setRequestPromotedOngoing(true)
                builder.setShortCriticalText(texts.shortText)
            } catch (e: NoSuchMethodError) {
                builder.extras.putBoolean("android.requestPromotedOngoing", true)
                builder.extras.putString("android.shortCriticalText", texts.shortText)
            }
            val notification = builder.build()
            notification.flags = notification.flags or 0x40000000 or 0x02000000
            return notification
        } else {
            // Category 3: Samsung, Xiaomi, Pixel, etc. (High Priority Standard Ongoing)
            val prefs = getSharedPreferences("DeenPulsePrefs", MODE_PRIVATE)
            val forceEnabled = prefs.getBoolean("isLiveNotificationForced", false)
            if (forceEnabled) {
                try {
                    builder.setRequestPromotedOngoing(true)
                    builder.setShortCriticalText(texts.shortText)
                } catch (e: NoSuchMethodError) {
                    builder.extras.putBoolean("android.requestPromotedOngoing", true)
                    builder.extras.putString("android.shortCriticalText", texts.shortText)
                }
                val notification = builder.build()
                notification.flags = notification.flags or 0x40000000 or 0x02000000
                return notification
            }
            return builder.build()
        }
    }

    private fun showScheduleCompleteNotification() {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val refreshIntent = Intent(this, PrayerCapsuleForegroundService::class.java).apply {
            setAction("ACTION_REFRESH")
        }
        val refreshPendingIntent = PendingIntent.getService(
            this, 1, refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Schedule Completed")
            .setContentText("Open app or tap refresh to update timings.")
            .setSmallIcon(R.drawable.ic_stat_prayer)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(0, "Refresh", refreshPendingIntent)

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        manager?.notify(NOTIFICATION_ID, builder.build())
    }

    private fun fireActiveNotification(prayerName: String) {
        val channelId = "deenpulse_prayer_alert"
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
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
            manager?.createNotificationChannel(channel)
        }

        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 9, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("It's time for $prayerName")
            .setContentText("Tap to open DeenPulse and view timings.")
            .setSmallIcon(R.drawable.ic_stat_prayer)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .build()

        manager?.notify(7002, notification)
    }
}

// Extension functions to support standard Android 15/16 NotificationCompat.Builder properties on older compile-time libraries
fun NotificationCompat.Builder.setRequestPromotedOngoing(enabled: Boolean): NotificationCompat.Builder {
    try {
        val method = this.javaClass.getMethod("setRequestPromotedOngoing", Boolean::class.javaPrimitiveType)
        method.invoke(this, enabled)
    } catch (e: Exception) {
        this.extras.putBoolean("android.requestPromotedOngoing", enabled)
    }
    return this
}

fun NotificationCompat.Builder.setShortCriticalText(text: CharSequence): NotificationCompat.Builder {
    try {
        val method = this.javaClass.getMethod("setShortCriticalText", CharSequence::class.java)
        method.invoke(this, text)
    } catch (e: Exception) {
        this.extras.putString("android.shortCriticalText", text.toString())
    }
    return this
}

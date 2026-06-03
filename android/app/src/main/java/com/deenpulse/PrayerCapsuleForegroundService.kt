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

class PrayerCapsuleForegroundService : Service() {

    private var prayerList: List<PrayerScheduleItem> = emptyList()
    private var currentPrayerName: String = ""
    private var currentTargetTimestamp: Long = 0L
    private val handler = Handler(Looper.getMainLooper())
    private var isTimerRunning = false
    private var capsuleFormat: String = "name"
    private var notificationStyle: String = "standard"

    private fun formatTime(timestamp: Long): String {
        if (timestamp == 0L) return ""
        val sdf = SimpleDateFormat("h:mm a", Locale.getDefault())
        return sdf.format(Date(timestamp))
    }

    private val checkRunnable = object : Runnable {
        override fun run() {
            val now = System.currentTimeMillis()
            
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
                Log.d("PrayerCapsuleService", "All prayers exhausted. Showing Schedule Complete notification.")
                showScheduleCompleteNotification()
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
            }
            return START_NOT_STICKY
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

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(checkRunnable)
        isTimerRunning = false
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

    private fun updateNotification() {
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
        
        val contentTitle = if (notificationStyle == "with_time") {
            "Next Prayer: $currentPrayerName ($formattedTime)"
        } else {
            "Next Prayer: $currentPrayerName"
        }

        val shortText = when (capsuleFormat) {
            "name_time" -> "$currentPrayerName ($formattedTime)"
            "time" -> formattedTime
            else -> currentPrayerName
        }

        val prefs = getSharedPreferences("DeenPulsePrefs", MODE_PRIVATE)
        val deviceCategory = prefs.getInt("device_category", -1)
        val category = if (deviceCategory != -1) {
            deviceCategory
        } else {
            val manufacturer = Build.MANUFACTURER?.lowercase() ?: ""
            val brand = Build.BRAND?.lowercase() ?: ""
            if (manufacturer.contains("oppo") || manufacturer.contains("oneplus") || manufacturer.contains("realme") ||
                brand.contains("oppo") || brand.contains("oneplus") || brand.contains("realme")) {
                1
            } else if (manufacturer.contains("vivo") || manufacturer.contains("iqoo") ||
                       brand.contains("vivo") || brand.contains("iqoo")) {
                2
            } else {
                3
            }
        }

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(contentTitle)
            .setSmallIcon(R.drawable.ic_stat_prayer)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_NAVIGATION)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setWhen(currentTargetTimestamp)
            .addAction(0, "Refresh", refreshPendingIntent)
            .addAction(0, "Close App", closePendingIntent)

        if (category == 1) {
            // Category 1: OPPO / OnePlus / Realme
            try {
                builder.setRequestPromotedOngoing(true)
                builder.setShortCriticalText(shortText)
            } catch (e: NoSuchMethodError) {
                builder.extras.putBoolean("android.requestPromotedOngoing", true)
                builder.extras.putString("android.shortCriticalText", shortText)
            }
            val notification = builder.build()
            notification.flags = notification.flags or 0x40000000 or 0x02000000
            return notification
        } else if (category == 2) {
            // Category 2: Vivo / iQOO - Bypasses promoted ongoing capsule flags to prevent displacement inside Origin Island
            return builder.build()
        } else {
            // Category 3: Samsung, Xiaomi, Pixel, etc. (High Priority Standard Ongoing)
            val forceEnabled = prefs.getBoolean("isLiveNotificationForced", false)
            if (forceEnabled) {
                try {
                    builder.setRequestPromotedOngoing(true)
                    builder.setShortCriticalText(shortText)
                } catch (e: NoSuchMethodError) {
                    builder.extras.putBoolean("android.requestPromotedOngoing", true)
                    builder.extras.putString("android.shortCriticalText", shortText)
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

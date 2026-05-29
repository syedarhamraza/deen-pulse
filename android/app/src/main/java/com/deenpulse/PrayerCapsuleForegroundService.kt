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
import androidx.core.app.NotificationCompat
import org.json.JSONArray
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
            val next = findNextPrayer()
            if (next != null) {
                // If the next prayer has changed, update the notification chronometer immediately
                if (next.name != currentPrayerName || next.timestamp != currentTargetTimestamp) {
                    currentPrayerName = next.name
                    currentTargetTimestamp = next.timestamp
                    updateNotification()
                }
            }
            handler.postDelayed(this, 5000) // Check every 5 seconds to ensure zero-lag transition
        }
    }

    companion object {
        private const val CHANNEL_ID = "deenpulse_capsule"
        private const val CHANNEL_NAME = "Prayer Countdown"
        private const val NOTIFICATION_ID = 7001
        private const val FLAG_PROMOTED_ONGOING = 0x40000000
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val format = intent?.getStringExtra("capsuleFormat")
        val style = intent?.getStringExtra("notificationStyle")
        if (format != null) capsuleFormat = format
        if (style != null) notificationStyle = style

        val action = intent?.action
        if (action != null) {
            when (action) {
                "ACTION_REFRESH" -> {
                    // Emit event to React Native JS thread to trigger location & timings refresh
                    PrayerCapsuleModule.sendEvent("onRefreshRequested", null)
                }
                "ACTION_CLOSE" -> {
                    // Close the foreground service and exit the application process
                    stopSelf()
                    System.exit(0)
                }
            }
            return START_STICKY
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

                // Immediately determine next prayer and start/update foreground to prevent ANR
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

            // Start background ticker check if it is not already running
            if (!isTimerRunning) {
                isTimerRunning = true
                handler.post(checkRunnable)
            }
        }

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(checkRunnable)
        isTimerRunning = false
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    private fun findNextPrayer(): PrayerScheduleItem? {
        val now = System.currentTimeMillis()
        // Sort and find the first prayer that is scheduled in the future
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
        // Create pending intent to open the app when notification is tapped
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Notification Action Buttons
        val refreshIntent = Intent(this, PrayerCapsuleForegroundService::class.java).apply {
            action = "ACTION_REFRESH"
        }
        val refreshPendingIntent = PendingIntent.getService(
            this, 1, refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val closeIntent = Intent(this, PrayerCapsuleForegroundService::class.java).apply {
            action = "ACTION_CLOSE"
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

        // Enforce methods for standard Android 15/16 base system compliance
        try {
            builder.setRequestPromotedOngoing(true)
            builder.setShortCriticalText(shortText)
        } catch (e: NoSuchMethodError) {
            // Fallback for older compile environments if any
            builder.extras.putBoolean("android.requestPromotedOngoing", true)
            builder.extras.putString("android.shortCriticalText", shortText)
        }

        val notification = builder.build()

        // Inject both '0x40000000' and '0x02000000' bitmask flags to preserve native capsule promotion
        notification.flags = notification.flags or 0x40000000 or 0x02000000

        return notification
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

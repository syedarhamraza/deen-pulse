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

data class PrayerScheduleItem(val name: String, val timestamp: Long)

class PrayerCapsuleForegroundService : Service() {

    private var prayerList: List<PrayerScheduleItem> = emptyList()
    private var currentPrayerName: String = ""
    private var currentTargetTimestamp: Long = 0L
    private val handler = Handler(Looper.getMainLooper())
    private var isTimerRunning = false

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
        // Collapsed status bar pill/capsule outputs ONLY the raw prayer name string
        val chipText = currentPrayerName

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

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Next Prayer: $currentPrayerName")
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

        // Set short critical text and request promoted ongoing (Live Alert status bar capsule) via bundle extras
        builder.extras.putBoolean("android.requestPromotedOngoing", true)
        builder.extras.putString("android.shortCriticalText", chipText)

        val notification = builder.build()

        // ColorOS FLAG_PROMOTED_ONGOING - forces capsule promotion on ColorOS 16.1
        notification.flags = notification.flags or FLAG_PROMOTED_ONGOING

        return notification
    }
}

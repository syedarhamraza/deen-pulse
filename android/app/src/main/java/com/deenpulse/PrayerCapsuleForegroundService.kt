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

class PrayerCapsuleForegroundService : Service() {

    private var prayerName: String = ""
    private var targetTimestamp: Long = 0L
    private val handler = Handler(Looper.getMainLooper())
    private var isTimerRunning = false

    private val updateRunnable = object : Runnable {
        override fun run() {
            if (targetTimestamp > 0L) {
                updateNotification()
                handler.postDelayed(this, 1000) // Update every second to ensure timer accuracy
            }
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
        val newPrayerName = intent?.getStringExtra("prayerName")
        val newTargetTimestamp = intent?.getLongExtra("targetTimestamp", 0L) ?: 0L

        if (newPrayerName != null) {
            prayerName = newPrayerName
            targetTimestamp = newTargetTimestamp
            
            // Immediately build and start foreground to satisfy Android requirements and prevent ANR
            val notification = buildCapsuleNotification()
            startForeground(NOTIFICATION_ID, notification)

            // Start ticking timer if it's not already running
            if (!isTimerRunning) {
                isTimerRunning = true
                handler.post(updateRunnable)
            }
        }

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(updateRunnable)
        isTimerRunning = false
        stopForeground(STOP_FOREGROUND_REMOVE)
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
        val remainingMs = targetTimestamp - System.currentTimeMillis()
        val remainingMins = Math.max(0, (remainingMs + 999) / 60000).toInt() // Round up minutes
        val hours = remainingMins / 60
        val mins = remainingMins % 60

        // Expanded dropdown body content text: "[PrayerName] in [X]h [Y]m" or "[PrayerName] in [X]m"
        val contentText = if (hours > 0) {
            "$prayerName in ${hours}h ${mins}m"
        } else {
            "$prayerName in ${mins}m"
        }

        // Collapsed status bar pill/capsule outputs ONLY the raw prayer name string
        val chipText = prayerName

        // Create pending intent to open the app when notification is tapped
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Next Prayer:")
            .setContentText(contentText)
            .setSmallIcon(R.drawable.ic_stat_prayer)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_NAVIGATION)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

        // Set short critical text and request promoted ongoing (Live Alert status bar capsule) via bundle extras
        builder.extras.putBoolean("android.requestPromotedOngoing", true)
        builder.extras.putString("android.shortCriticalText", chipText)

        val notification = builder.build()

        // ColorOS FLAG_PROMOTED_ONGOING - forces capsule promotion on ColorOS 16.1
        notification.flags = notification.flags or FLAG_PROMOTED_ONGOING

        return notification
    }
}

package com.deenpulse

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat

class PrayerCapsuleForegroundService : Service() {

    companion object {
        private const val CHANNEL_ID = "deenpulse_capsule"
        private const val CHANNEL_NAME = "Prayer Countdown"
        private const val NOTIFICATION_ID = 7001
        private const val FLAG_PROMOTED_ONGOING = 0x40000000
    }

    private val handler = Handler(Looper.getMainLooper())
    private var prayerName = "Next Prayer"
    private var targetTimestamp = 0L
    private var isLoopRunning = false

    private val updateRunnable = object : Runnable {
        override fun run() {
            updateNotification()
            val prefs = getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
            val intervalMs = prefs.getLong("updateIntervalMs", 60000L)
            handler.postDelayed(this, intervalMs)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val name = intent?.getStringExtra("prayerName")
        val timestamp = intent?.getLongExtra("targetTimestamp", 0L) ?: 0L

        if (name != null) {
            prayerName = name
            targetTimestamp = timestamp
        }

        // Immediately start foreground with initial notification to prevent ANR
        val notification = buildCapsuleNotification(prayerName, targetTimestamp)
        startForeground(NOTIFICATION_ID, notification)

        if (!isLoopRunning) {
            isLoopRunning = true
            val prefs = getSharedPreferences("DeenPulsePrefs", Context.MODE_PRIVATE)
            val intervalMs = prefs.getLong("updateIntervalMs", 60000L)
            handler.postDelayed(updateRunnable, intervalMs)
        }

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(updateRunnable)
        isLoopRunning = false
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
        val notification = buildCapsuleNotification(prayerName, targetTimestamp)
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        manager?.notify(NOTIFICATION_ID, notification)
    }

    private fun buildCapsuleNotification(prayerName: String, targetTimestamp: Long): Notification {
        val remainingMs = targetTimestamp - System.currentTimeMillis()
        val remainingSeconds = (remainingMs / 1000).toInt()
        val remainingMinutes = Math.ceil(remainingMs.toDouble() / 60000.0).toInt()

        val text: String
        val chipText: String

        if (remainingMinutes <= 0) {
            text = "$prayerName Active"
            chipText = "$prayerName Active"
        } else {
            text = "$prayerName in ${remainingMinutes}m"
            chipText = "$prayerName: ${remainingMinutes}m Left"
        }

        // Create pending intent to open the app when notification is tapped
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Add Timer action intent
        val actionIntent = Intent(this, NotificationActionReceiver::class.java).apply {
            putExtra("remaining_seconds", remainingSeconds)
            putExtra("prayer_name", prayerName)
        }
        val actionPendingIntent = PendingIntent.getBroadcast(
            this, 1002, actionIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val action = NotificationCompat.Action.Builder(
            android.R.drawable.ic_lock_idle_alarm,
            "Add Timer",
            actionPendingIntent
        ).build()

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("DeenPulse Countdown")
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_stat_prayer)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_NAVIGATION)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(action)

        // Android 16+ official Live Update APIs set via Bundle extras to bypass compile-time dependency limitations
        builder.extras.putBoolean("android.requestPromotedOngoing", true)
        builder.extras.putString("android.shortCriticalText", chipText)

        val notification = builder.build()

        // ColorOS FLAG_PROMOTED_ONGOING - forces capsule promotion on ColorOS 16.1
        notification.flags = notification.flags or FLAG_PROMOTED_ONGOING

        return notification
    }
}

package com.deenpulse

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class PrayerCapsuleForegroundService : Service() {

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
        val prayerName = intent?.getStringExtra("prayerName") ?: "Next Prayer"
        val targetTimestamp = intent?.getLongExtra("targetTimestamp", 0L) ?: 0L

        // Immediately build and start/update foreground with the chronometer-driven notification
        val notification = buildCapsuleNotification(prayerName, targetTimestamp)
        startForeground(NOTIFICATION_ID, notification)

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
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

    private fun buildCapsuleNotification(prayerName: String, targetTimestamp: Long): Notification {
        // Collapsed status bar pill/capsule outputs ONLY the raw prayer name string
        val chipText = prayerName

        // Create pending intent to open the app when notification is tapped
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Next Prayer: $prayerName")
            .setSmallIcon(R.drawable.ic_stat_prayer)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_NAVIGATION)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setWhen(targetTimestamp)

        // Set short critical text and request promoted ongoing (Live Alert status bar capsule) via bundle extras
        builder.extras.putBoolean("android.requestPromotedOngoing", true)
        builder.extras.putString("android.shortCriticalText", chipText)

        val notification = builder.build()

        // ColorOS FLAG_PROMOTED_ONGOING - forces capsule promotion on ColorOS 16.1
        notification.flags = notification.flags or FLAG_PROMOTED_ONGOING

        return notification
    }
}

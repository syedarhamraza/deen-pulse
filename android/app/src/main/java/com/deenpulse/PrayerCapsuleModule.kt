package com.deenpulse

import android.content.Intent
import android.provider.AlarmClock
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

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
    fun updateLiveCapsule(prayersJson: String) {
        val intent = Intent(reactApplicationContext, PrayerCapsuleForegroundService::class.java).apply {
            putExtra("prayersJson", prayersJson)
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
}

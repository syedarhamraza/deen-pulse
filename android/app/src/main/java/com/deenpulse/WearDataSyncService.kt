package com.deenpulse

import android.content.Context
import android.util.Log
import com.deenpulse.shared.DataLayerConstants
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * Phone-side Wearable Data Layer service.
 *
 * Responsibilities:
 * 1. Listens for sync-request messages from the watch (when it boots with no data)
 * 2. Exposes a static `pushTimetableToWear()` to push prayer data over Bluetooth
 *
 * Battery-conscious design:
 * - Uses DataClient (not MessageClient) so data is synced once and cached on both sides
 * - Only pushes when prayer data actually changes (timestamp forces DataItem change detection)
 * - Zero ongoing Bluetooth traffic — the watch reads from its local DataItem cache
 */
class WearDataSyncService : WearableListenerService() {

    private val serviceJob = SupervisorJob()
    private val serviceExceptionHandler = CoroutineExceptionHandler { _, exception ->
        Log.e(TAG, "Unhandled exception in service scope: ${exception.localizedMessage}", exception)
    }
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob + serviceExceptionHandler)

    override fun onDestroy() {
        super.onDestroy()
        serviceJob.cancel()
    }

    companion object {
        private const val TAG = "WearDataSync"
        private const val PREFS_NAME = "DeenPulseWearSync"

        private val companionJob = SupervisorJob()
        private val companionExceptionHandler = CoroutineExceptionHandler { _, exception ->
            Log.e(TAG, "Unhandled exception in companion scope: ${exception.localizedMessage}", exception)
        }
        private val companionScope = CoroutineScope(Dispatchers.IO + companionJob + companionExceptionHandler)

        private suspend fun <T> retryWithBackoff(
            times: Int = 3,
            initialDelay: Long = 1000L,
            maxDelay: Long = 6000L,
            factor: Double = 2.0,
            block: suspend () -> T
        ): T {
            var currentDelay = initialDelay
            repeat(times - 1) { attempt ->
                try {
                    return block()
                } catch (e: Exception) {
                    Log.w(TAG, "Attempt ${attempt + 1} failed: ${e.message}. Retrying in ${currentDelay}ms...")
                }
                delay(currentDelay)
                currentDelay = (currentDelay * factor).toLong().coerceAtMost(maxDelay)
            }
            return block() // Last attempt
        }

        /**
         * Push prayer timetable to all connected Wear OS devices.
         *
         * @param prayersJson JSON array of {name, timestamp} objects (same format as foreground service)
         * @param lat         Device latitude
         * @param lng         Device longitude
         * @param scope       CoroutineScope to launch the sync task
         */
        fun pushTimetableToWear(
            context: Context,
            prayersJson: String,
            lat: Double,
            lng: Double,
            scope: CoroutineScope = companionScope
        ) {
            scope.launch {
                // Cache locally for future sync requests from the watch
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                prefs.edit()
                    .putString("cached_prayers_json", prayersJson)
                    .putFloat("cached_lat", lat.toFloat())
                    .putFloat("cached_lng", lng.toFloat())
                    .apply()
                try {
                    val dataClient = Wearable.getDataClient(context)
                    val putDataReq = PutDataMapRequest.create(DataLayerConstants.TIMETABLE_DATA_PATH).apply {
                        dataMap.putString(DataLayerConstants.KEY_PRAYERS_JSON, prayersJson)
                        dataMap.putDouble(DataLayerConstants.KEY_LATITUDE, lat)
                        dataMap.putDouble(DataLayerConstants.KEY_LONGITUDE, lng)
                        dataMap.putInt(DataLayerConstants.KEY_SCHEMA_VERSION, DataLayerConstants.CURRENT_SCHEMA_VERSION)
                        // Epoch timestamp forces DataItem change detection even if prayer data is identical
                        dataMap.putLong(DataLayerConstants.KEY_TIMESTAMP, System.currentTimeMillis())
                    }.asPutDataRequest().setUrgent()

                    retryWithBackoff(times = 3, initialDelay = 1000L) {
                        dataClient.putDataItem(putDataReq).await()
                    }
                    Log.d(TAG, "Timetable pushed to Wear OS (${prayersJson.length} bytes)")
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to push timetable to Wear after retries", e)
                }
            }
        }
    }

    /**
     * Handles messages from the watch.
     * Currently only responds to sync requests (watch booted with no cached data).
     */
    override fun onMessageReceived(messageEvent: MessageEvent) {
        when (messageEvent.path) {
            DataLayerConstants.SYNC_REQUEST_MSG_PATH -> {
                Log.d(TAG, "Watch requested sync — pushing cached timetable...")
                serviceScope.launch {
                    pushCachedDataToWear()
                }
            }
        }
    }

    /**
     * Re-push the last known prayer data from SharedPreferences.
     * Called when the watch sends a sync request after boot.
     */
    private fun pushCachedDataToWear() {
        val prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val prayersJson = prefs.getString("cached_prayers_json", null)
        val lat = prefs.getFloat("cached_lat", 0f).toDouble()
        val lng = prefs.getFloat("cached_lng", 0f).toDouble()

        if (prayersJson != null && prayersJson.isNotEmpty()) {
            pushTimetableToWear(applicationContext, prayersJson, lat, lng, serviceScope)
        } else {
            Log.w(TAG, "No cached prayer data available to push to watch")
        }
    }
}

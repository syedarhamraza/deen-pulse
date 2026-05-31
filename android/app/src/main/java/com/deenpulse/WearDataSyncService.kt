package com.deenpulse

import android.content.Context
import android.util.Log
import com.deenpulse.shared.DataLayerConstants
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
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

    companion object {
        private const val TAG = "WearDataSync"
        private const val PREFS_NAME = "DeenPulseWearSync"

        /**
         * Push prayer timetable to all connected Wear OS devices.
         *
         * @param prayersJson JSON array of {name, timestamp} objects (same format as foreground service)
         * @param lat         Device latitude
         * @param lng         Device longitude
         */
        fun pushTimetableToWear(context: Context, prayersJson: String, lat: Double, lng: Double) {
            // Cache locally for future sync requests from the watch
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putString("cached_prayers_json", prayersJson)
                .putFloat("cached_lat", lat.toFloat())
                .putFloat("cached_lng", lng.toFloat())
                .apply()

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val dataClient = Wearable.getDataClient(context)
                    val putDataReq = PutDataMapRequest.create(DataLayerConstants.TIMETABLE_DATA_PATH).apply {
                        dataMap.putString(DataLayerConstants.KEY_PRAYERS_JSON, prayersJson)
                        dataMap.putDouble(DataLayerConstants.KEY_LATITUDE, lat)
                        dataMap.putDouble(DataLayerConstants.KEY_LONGITUDE, lng)
                        // Epoch timestamp forces DataItem change detection even if prayer data is identical
                        dataMap.putLong(DataLayerConstants.KEY_TIMESTAMP, System.currentTimeMillis())
                    }.asPutDataRequest().setUrgent()

                    dataClient.putDataItem(putDataReq).await()
                    Log.d(TAG, "Timetable pushed to Wear OS (${prayersJson.length} bytes)")
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to push timetable to Wear — device may not be connected", e)
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
                pushCachedDataToWear()
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
            pushTimetableToWear(applicationContext, prayersJson, lat, lng)
        } else {
            Log.w(TAG, "No cached prayer data available to push to watch")
        }
    }
}

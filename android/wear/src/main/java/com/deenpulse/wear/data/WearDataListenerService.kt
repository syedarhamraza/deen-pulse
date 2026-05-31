package com.deenpulse.wear.data

import android.content.Context
import android.content.ComponentName
import android.util.Log
import com.deenpulse.shared.DataLayerConstants
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import com.deenpulse.wear.complication.PrayerComplicationService
import com.deenpulse.wear.tile.DeenPulseTileService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class WearDataListenerService : WearableListenerService() {

    companion object {
        private const val TAG = "WearDataListener"

        /**
         * Send a sync-request message to ALL connected nodes (phones).
         * Call this when the watch has no cached data and needs the phone
         * to push fresh timetable information.
         */
        fun requestSyncFromPhone(context: Context) {
            val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
            scope.launch {
                try {
                    val nodeClient = Wearable.getNodeClient(context)
                    val nodes = nodeClient.connectedNodes.await()
                    val messageClient = Wearable.getMessageClient(context)

                    for (node in nodes) {
                        messageClient.sendMessage(
                            node.id,
                            DataLayerConstants.SYNC_REQUEST_MSG_PATH,
                            ByteArray(0)
                        ).await()
                        Log.d(TAG, "Sync request sent to node: ${node.displayName}")
                    }

                    if (nodes.isEmpty()) {
                        Log.w(TAG, "No connected nodes found for sync request")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to send sync request", e)
                }
            }
        }
    }

    private lateinit var repository: PrayerRepository

    override fun onCreate() {
        super.onCreate()
        repository = PrayerRepository(applicationContext)
    }

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        super.onDataChanged(dataEvents)

        for (event in dataEvents) {
            val uri = event.dataItem.uri
            val path = uri.path ?: continue

            if (path == DataLayerConstants.TIMETABLE_DATA_PATH) {
                try {
                    val dataMap = DataMapItem.fromDataItem(event.dataItem).dataMap

                    val prayersJson = dataMap.getString(DataLayerConstants.KEY_PRAYERS_JSON, "")
                    val latitude = dataMap.getDouble(DataLayerConstants.KEY_LATITUDE, 0.0)
                    val longitude = dataMap.getDouble(DataLayerConstants.KEY_LONGITUDE, 0.0)
                    val phoneTimestamp = dataMap.getLong(DataLayerConstants.KEY_TIMESTAMP, 0L)

                    if (prayersJson.isNotBlank()) {
                        if (phoneTimestamp > 0L) {
                            val offset = phoneTimestamp - System.currentTimeMillis()
                            repository.saveClockOffset(offset)
                            Log.d(TAG, "Clock offset computed: ${offset}ms (phone=$phoneTimestamp, watch=${System.currentTimeMillis()})")
                        }
                        repository.savePrayers(prayersJson, latitude, longitude)
                        Log.d(TAG, "Prayer data synced and saved (lat=$latitude, lng=$longitude)")

                        // Instantly update active complications and tiles on sync
                        try {
                            val componentName = ComponentName(applicationContext, PrayerComplicationService::class.java)
                            val requester = ComplicationDataSourceUpdateRequester.create(applicationContext, componentName)
                            requester.requestUpdateAll()

                            androidx.wear.tiles.TileService.getUpdater(applicationContext)
                                .requestUpdate(DeenPulseTileService::class.java)
                            Log.d(TAG, "Triggered instant complication and tile update on sync")
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to update complications/tiles on sync", e)
                        }
                    } else {
                        Log.w(TAG, "Received empty prayers JSON from data layer")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error processing data change event", e)
                }
            }
        }
    }
}

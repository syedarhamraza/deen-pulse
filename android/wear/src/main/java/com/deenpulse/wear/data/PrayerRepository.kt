package com.deenpulse.wear.data

import android.content.Context
import android.content.SharedPreferences
import com.deenpulse.shared.PrayerSerializer
import com.deenpulse.shared.PrayerTime
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Calendar

class PrayerRepository(context: Context) {

    companion object {
        private const val PREFS_NAME = "deenpulse_wear"
        private const val KEY_PRAYERS_JSON = "prayers_json"
        private const val KEY_LATITUDE = "latitude"
        private const val KEY_LONGITUDE = "longitude"
        private const val KEY_TIMESTAMP = "sync_timestamp"
    }

    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun saveClockOffset(offset: Long) {
        prefs.edit().putLong("clock_offset", offset).apply()
    }

    suspend fun getClockOffset(): Long = withContext(Dispatchers.IO) {
        prefs.getLong("clock_offset", 0L)
    }

    /**
     * Persist serialized prayer data along with location metadata.
     */
    fun savePrayers(prayersJson: String, lat: Double, lng: Double) {
        prefs.edit()
            .putString(KEY_PRAYERS_JSON, prayersJson)
            .putFloat(KEY_LATITUDE, lat.toFloat())
            .putFloat(KEY_LONGITUDE, lng.toFloat())
            .putLong(KEY_TIMESTAMP, System.currentTimeMillis())
            .apply()
    }

    /**
     * Deserialize prayers and filter to only today's entries.
     * A prayer belongs to "today" when its epochMs falls between
     * the start and end of the current calendar day.
     */
    suspend fun getTodaysPrayers(): List<PrayerTime> = withContext(Dispatchers.IO) {
        val json = prefs.getString(KEY_PRAYERS_JSON, null) ?: return@withContext emptyList<PrayerTime>()
        val allPrayers = PrayerSerializer.fromJson(json)

        val cal = Calendar.getInstance()

        // Start of today: midnight 00:00:00.000
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        val startOfDay = cal.timeInMillis

        // End of today: 23:59:59.999
        cal.set(Calendar.HOUR_OF_DAY, 23)
        cal.set(Calendar.MINUTE, 59)
        cal.set(Calendar.SECOND, 59)
        cal.set(Calendar.MILLISECOND, 999)
        val endOfDay = cal.timeInMillis

        allPrayers.filter { it.epochMs in startOfDay..endOfDay }
    }

    /**
     * Quick check for whether any prayer data has been synced from the phone.
     */
    suspend fun hasData(): Boolean = withContext(Dispatchers.IO) {
        prefs.contains(KEY_PRAYERS_JSON) &&
                !prefs.getString(KEY_PRAYERS_JSON, null).isNullOrBlank()
    }

    /**
     * A Flow that emits the current day's prayer list whenever the
     * underlying SharedPreferences change (e.g. after a Data Layer sync).
     */
    val prayerTimesFlow: Flow<List<PrayerTime>> = callbackFlow {
        // Emit current data immediately
        launch {
            trySend(getTodaysPrayers())
        }

        val listener = SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
            if (key == KEY_PRAYERS_JSON) {
                launch {
                    trySend(getTodaysPrayers())
                }
            }
        }

        prefs.registerOnSharedPreferenceChangeListener(listener)

        awaitClose {
            prefs.unregisterOnSharedPreferenceChangeListener(listener)
        }
    }.flowOn(Dispatchers.IO)

    fun saveSettings(juristicMethod: String, calculationRule: String, deviceCategory: Int) {
        prefs.edit()
            .putString("juristic_method", juristicMethod)
            .putString("calculation_rule", calculationRule)
            .putInt("device_category", deviceCategory)
            .apply()
    }

    fun getSettings(): Triple<String, String, Int> {
        val juristic = prefs.getString("juristic_method", "standard") ?: "standard"
        val rule = prefs.getString("calculation_rule", "auto") ?: "auto"
        val category = prefs.getInt("device_category", 3)
        return Triple(juristic, rule, category)
    }
}

package com.deenpulse.shared

import org.json.JSONArray
import org.json.JSONObject

/**
 * A single prayer time entry.
 *
 * @param name    Prayer name: Fajr, Dhuhr, Asr, Maghrib, or Isha
 * @param timeStr Formatted 12-hour string (e.g., "5:12 AM")
 * @param epochMs Epoch milliseconds for this prayer on its target date
 */
data class PrayerTime(
    val name: String,
    val timeStr: String,
    val epochMs: Long
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("name", name)
        put("timeStr", timeStr)
        put("epochMs", epochMs)
    }

    companion object {
        fun fromJson(json: JSONObject): PrayerTime = PrayerTime(
            name = json.getString("name"),
            timeStr = json.optString("timeStr", ""),
            epochMs = json.getLong("epochMs")
        )

        /**
         * Parse from the phone's foreground service format: { "name": "Fajr", "timestamp": 123456 }
         * Derives timeStr from the epoch timestamp.
         */
        fun fromServiceFormat(json: JSONObject): PrayerTime {
            val epochMs = json.getLong("timestamp")
            return PrayerTime(
                name = json.getString("name"),
                timeStr = PrayerEngine.formatEpochTo12Hour(epochMs),
                epochMs = epochMs
            )
        }
    }
}

/**
 * Information about the next upcoming prayer with countdown data.
 */
data class NextPrayerInfo(
    val name: String,
    val timeStr: String,
    val remainingMs: Long
)

/**
 * Serialization helpers for Data Layer transport of prayer arrays.
 */
object PrayerSerializer {

    /**
     * Serialize a list of PrayerTime objects to JSON string.
     */
    fun toJson(prayers: List<PrayerTime>): String {
        val arr = JSONArray()
        prayers.forEach { arr.put(it.toJson()) }
        return arr.toString()
    }

    /**
     * Deserialize a JSON string into a list of PrayerTime objects.
     * Supports both the full format (name/timeStr/epochMs) and
     * the phone service format (name/timestamp).
     */
    fun fromJson(jsonStr: String): List<PrayerTime> {
        return try {
            val arr = JSONArray(jsonStr)
            val list = mutableListOf<PrayerTime>()
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val prayer = if (obj.has("epochMs")) {
                    PrayerTime.fromJson(obj)
                } else {
                    PrayerTime.fromServiceFormat(obj)
                }
                list.add(prayer)
            }
            list
        } catch (e: Exception) {
            emptyList()
        }
    }
}

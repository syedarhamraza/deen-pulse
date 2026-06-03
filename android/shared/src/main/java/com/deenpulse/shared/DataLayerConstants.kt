package com.deenpulse.shared

/**
 * Shared constants for Wearable Data Layer API communication.
 * Used by both the phone (:app) and watch (:wear) modules.
 */
object DataLayerConstants {

    /** DataItem path — phone pushes prayer timetable here */
    const val TIMETABLE_DATA_PATH = "/deenpulse/timetable"

    /** DataItem path — phone pushes user settings here */
    const val SETTINGS_DATA_PATH = "/deenpulse/settings"

    /** Message path — watch sends this to request a fresh sync from phone */
    const val SYNC_REQUEST_MSG_PATH = "/deenpulse/sync-request"

    // ── DataMap keys ─────────────────────────────────────────────────────
    const val KEY_PRAYERS_JSON = "prayers_json"
    const val KEY_LATITUDE = "latitude"
    const val KEY_LONGITUDE = "longitude"
    const val KEY_MONTH = "month"
    const val KEY_YEAR = "year"
    const val KEY_JURISTIC_METHOD = "juristic_method"
    const val KEY_CALCULATION_RULE = "calculation_rule"

    /** Epoch timestamp — forces DataItem change detection on every push */
    const val KEY_TIMESTAMP = "timestamp"

    const val KEY_SCHEMA_VERSION = "schema_version"
    const val KEY_DEVICE_CATEGORY = "device_category"
    const val CURRENT_SCHEMA_VERSION = 1
}

/*
 * Copyright (C) 2026 Syed Arham Raza
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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

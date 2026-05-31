package com.deenpulse.shared

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * Prayer time calculation and formatting engine.
 *
 * All algorithms are identical to the TypeScript implementation in
 * src/utils/prayerEngine.ts — ported to Kotlin for native use by
 * both the phone foreground service and the Wear OS module.
 */
object PrayerEngine {

    val PRAYER_NAMES = listOf("Fajr", "Dhuhr", "Asr", "Maghrib", "Isha")

    // ── Time Parsing ─────────────────────────────────────────────────────

    /**
     * Parse a 24-hour "HH:mm" time string into epoch milliseconds for today.
     * Strips any trailing text (e.g., timezone abbreviation "(PKT)").
     *
     * Identical to TypeScript `parseTimeString()`.
     */
    fun parseTimeString(timeStr: String): Long {
        val clean = timeStr.split(" ")[0]
        val parts = clean.split(":")
        if (parts.size < 2) return 0L
        val hours = parts[0].toIntOrNull() ?: return 0L
        val minutes = parts[1].toIntOrNull() ?: return 0L
        val cal = Calendar.getInstance()
        cal.set(Calendar.HOUR_OF_DAY, hours)
        cal.set(Calendar.MINUTE, minutes)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        return cal.timeInMillis
    }

    // ── Time Formatting ──────────────────────────────────────────────────

    /**
     * Convert a 24-hour "HH:mm" time string to 12-hour "h:mm AM/PM" format.
     *
     * Identical to TypeScript `formatTo12Hour()`.
     */
    fun formatTo12Hour(timeStr: String): String {
        if (timeStr.isBlank()) return ""
        val parts = timeStr.trim().split("\\s+".toRegex())
        val rawTime = parts[0]
        val timeParts = rawTime.split(":")
        if (timeParts.size < 2) return timeStr
        var hours = timeParts[0].toIntOrNull() ?: return timeStr
        val minutes = timeParts[1]
        val ampm = if (hours >= 12) "PM" else "AM"
        hours %= 12
        if (hours == 0) hours = 12
        return "$hours:$minutes $ampm"
    }

    /**
     * Format an epoch timestamp into a 12-hour time string.
     */
    fun formatEpochTo12Hour(epochMs: Long): String {
        if (epochMs == 0L) return ""
        val sdf = SimpleDateFormat("h:mm a", Locale.getDefault())
        return sdf.format(Date(epochMs))
    }

    // ── Next Prayer Computation ──────────────────────────────────────────

    /**
     * Find the next upcoming prayer from the list.
     * If all prayers have passed today, returns tomorrow's Fajr.
     *
     * Identical to TypeScript `getNextPrayer()`.
     */
    fun getNextPrayer(
        prayers: List<PrayerTime>,
        nowMs: Long = System.currentTimeMillis()
    ): NextPrayerInfo? {
        if (prayers.isEmpty()) return null

        for (prayer in prayers) {
            if (prayer.epochMs > nowMs) {
                return NextPrayerInfo(
                    name = prayer.name,
                    timeStr = prayer.timeStr,
                    remainingMs = prayer.epochMs - nowMs,
                    isActive = false
                )
            }
        }

        // All prayers passed today — next is Fajr tomorrow
        val fajr = prayers[0]
        val tomorrowFajrMs = fajr.epochMs + 24 * 60 * 60 * 1000
        return NextPrayerInfo(
            name = fajr.name,
            timeStr = fajr.timeStr,
            remainingMs = tomorrowFajrMs - nowMs,
            isActive = false
        )
    }

    // ── Countdown Formatting ─────────────────────────────────────────────

    /**
     * Format remaining milliseconds into human-readable countdown.
     * Returns "Xh Ym", "Xm Ys", or "Xs".
     *
     * Identical to TypeScript `formatCountdown()`.
     */
    fun formatCountdown(remainingMs: Long): String {
        if (remainingMs <= 0) return "0s"
        val totalSeconds = remainingMs / 1000
        val hours = totalSeconds / 3600
        val minutes = (totalSeconds % 3600) / 60
        val seconds = totalSeconds % 60
        return when {
            hours > 0 -> "${hours}h ${minutes}m"
            minutes > 0 -> "${minutes}m ${seconds}s"
            else -> "${seconds}s"
        }
    }

    /**
     * Short format for complications and tiles (no seconds, battery-friendly).
     * Returns "Xh Ym" or "Xm".
     */
    fun formatCountdownShort(remainingMs: Long): String {
        if (remainingMs <= 0) return "now"
        val totalMinutes = remainingMs / 60000
        val hours = totalMinutes / 60
        val minutes = totalMinutes % 60
        return when {
            hours > 0 -> "${hours}h ${minutes}m"
            else -> "${minutes}m"
        }
    }

    // ── Prayer Status ────────────────────────────────────────────────────

    /**
     * Determine a prayer's display status relative to the current time.
     * Returns "next", "active" (within 15-min window), "passed", or "upcoming".
     *
     * Identical to TypeScript `getPrayerStatus()`.
     */
    fun getPrayerStatus(
        prayer: PrayerTime,
        nextPrayer: NextPrayerInfo?,
        nowMs: Long = System.currentTimeMillis()
    ): String {
        if (nextPrayer != null && prayer.name == nextPrayer.name) return "next"
        if (prayer.epochMs <= nowMs) {
            val diff = nowMs - prayer.epochMs
            if (diff <= 15 * 60 * 1000) return "active"
            return "passed"
        }
        return "upcoming"
    }

    // ── Progress Ratio ───────────────────────────────────────────────────

    /**
     * Calculate progress ratio (0.0–1.0) between the previous and next prayer.
     * Used for circular progress indicators on the watch.
     */
    fun getProgressRatio(
        prayers: List<PrayerTime>,
        nowMs: Long = System.currentTimeMillis()
    ): Float {
        val next = getNextPrayer(prayers, nowMs) ?: return 0f
        val nextIndex = prayers.indexOfFirst { it.name == next.name }

        val prevMs: Long
        val nextMs: Long

        if (nextIndex > 0) {
            prevMs = prayers[nextIndex - 1].epochMs
            nextMs = prayers[nextIndex].epochMs
        } else if (nextIndex == 0) {
            // Before Fajr — previous was Isha yesterday
            prevMs = prayers.last().epochMs - 24 * 60 * 60 * 1000
            nextMs = prayers[0].epochMs
        } else {
            // After all prayers — next is Fajr tomorrow
            prevMs = prayers.last().epochMs
            nextMs = prayers[0].epochMs + 24 * 60 * 60 * 1000
        }

        val totalInterval = nextMs - prevMs
        if (totalInterval <= 0) return 0f
        val elapsed = nowMs - prevMs
        return (elapsed.toFloat() / totalInterval.toFloat()).coerceIn(0f, 1f)
    }
}

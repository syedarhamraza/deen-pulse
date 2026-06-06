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

package com.deenpulse.wear.complication

import android.app.PendingIntent
import android.content.Intent
import androidx.wear.watchface.complications.data.*
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService
import com.deenpulse.shared.PrayerEngine
import com.deenpulse.wear.WearMainActivity
import com.deenpulse.wear.data.PrayerRepository
import java.util.concurrent.TimeUnit

class PrayerComplicationService : SuspendingComplicationDataSourceService() {

    private fun createTapAction(): PendingIntent {
        val intent = Intent(this, WearMainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        return PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    override fun getPreviewData(type: ComplicationType): ComplicationData? {
        val nextPrayerName = "Fajr"
        val targetTime = java.time.Instant.now().plusSeconds(2 * 3600 + 15 * 60) // 2h 15m from now
        val progressRatio = 0.4f
        val tapAction = createTapAction()

        val countdownText = TimeDifferenceComplicationText.Builder(
            TimeDifferenceStyle.SHORT_DUAL_UNIT,
            CountDownTimeReference(targetTime)
        ).build()

        return when (type) {
            ComplicationType.SHORT_TEXT -> {
                ShortTextComplicationData.Builder(
                    text = countdownText,
                    contentDescription = PlainComplicationText.Builder("Next prayer countdown").build()
                )
                    .setTitle(PlainComplicationText.Builder(nextPrayerName).build())
                    .setTapAction(tapAction)
                    .build()
            }
            ComplicationType.RANGED_VALUE -> {
                RangedValueComplicationData.Builder(
                    value = progressRatio,
                    min = 0f,
                    max = 1f,
                    contentDescription = PlainComplicationText.Builder("Next prayer countdown progress").build()
                )
                    .setText(countdownText)
                    .setTitle(PlainComplicationText.Builder(nextPrayerName).build())
                    .setTapAction(tapAction)
                    .build()
            }
            else -> null
        }
    }

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        val repository = PrayerRepository(this)
        if (!repository.hasData()) {
            return buildNoDataComplication(request.complicationType)
        }

        val prayers = repository.getTodaysPrayers()
        val clockOffset = repository.getClockOffset()
        val nowMs = System.currentTimeMillis() + clockOffset
        val nextPrayer = PrayerEngine.getNextPrayer(prayers, nowMs)
        val progressRatio = PrayerEngine.getProgressRatio(prayers, nowMs)

        if (nextPrayer == null) {
            return buildNoDataComplication(request.complicationType)
        }

        val targetEpochMs = if (nextPrayer.remainingMs > 60000L) {
            System.currentTimeMillis() + nextPrayer.remainingMs - 60000L
        } else {
            System.currentTimeMillis() + nextPrayer.remainingMs
        }
        val targetTime = java.time.Instant.ofEpochMilli(targetEpochMs)
        val tapAction = createTapAction()

        val countdownText = TimeDifferenceComplicationText.Builder(
            TimeDifferenceStyle.SHORT_DUAL_UNIT,
            CountDownTimeReference(targetTime)
        ).build()

        return when (request.complicationType) {
            ComplicationType.SHORT_TEXT -> {
                ShortTextComplicationData.Builder(
                    text = countdownText,
                    contentDescription = PlainComplicationText.Builder("Next prayer countdown: ${nextPrayer.name}").build()
                )
                    .setTitle(PlainComplicationText.Builder(nextPrayer.name).build())
                    .setTapAction(tapAction)
                    .build()
            }
            ComplicationType.RANGED_VALUE -> {
                RangedValueComplicationData.Builder(
                    value = progressRatio,
                    min = 0f,
                    max = 1f,
                    contentDescription = PlainComplicationText.Builder("Next prayer progress: ${nextPrayer.name}").build()
                )
                    .setText(countdownText)
                    .setTitle(PlainComplicationText.Builder(nextPrayer.name).build())
                    .setTapAction(tapAction)
                    .build()
            }
            else -> null
        }
    }

    private fun buildNoDataComplication(type: ComplicationType): ComplicationData? {
        val tapAction = createTapAction()

        return when (type) {
            ComplicationType.SHORT_TEXT -> {
                ShortTextComplicationData.Builder(
                    text = PlainComplicationText.Builder("Sync").build(),
                    contentDescription = PlainComplicationText.Builder("Sync required").build()
                )
                    .setTitle(PlainComplicationText.Builder("Deen").build())
                    .setTapAction(tapAction)
                    .build()
            }
            ComplicationType.RANGED_VALUE -> {
                RangedValueComplicationData.Builder(
                    value = 0f,
                    min = 0f,
                    max = 1f,
                    contentDescription = PlainComplicationText.Builder("Sync required").build()
                )
                    .setText(PlainComplicationText.Builder("Sync").build())
                    .setTitle(PlainComplicationText.Builder("Deen").build())
                    .setTapAction(tapAction)
                    .build()
            }
            else -> null
        }
    }
}

package com.deenpulse.wear.tile

import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.TileService
import androidx.wear.protolayout.ColorBuilders
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.TimelineBuilders
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.ModifiersBuilders
import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.DimensionBuilders
import androidx.wear.protolayout.DeviceParametersBuilders.DeviceParameters
import androidx.wear.protolayout.material.layouts.PrimaryLayout
import androidx.wear.protolayout.material.Text
import androidx.wear.protolayout.material.Typography
import com.deenpulse.shared.PrayerEngine
import com.deenpulse.wear.data.PrayerRepository
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.guava.future

class PrayerListTileService : TileService() {

    private val serviceScope = CoroutineScope(Dispatchers.IO)

    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> {
        return serviceScope.future {
            val deviceParams = requestParams.deviceConfiguration ?: throw IllegalArgumentException("No device configuration")
            val repository = PrayerRepository(this@PrayerListTileService)

            if (!repository.hasData()) {
                buildNoDataTile(deviceParams)
            } else {
                buildPrayerListTile(deviceParams, repository)
            }
        }
    }

    override fun onTileResourcesRequest(requestParams: RequestBuilders.ResourcesRequest): ListenableFuture<ResourceBuilders.Resources> {
        return Futures.immediateFuture(
            ResourceBuilders.Resources.Builder()
                .setVersion("1")
                .build()
        )
    }

    private fun wrapWithClickable(layoutElement: LayoutElementBuilders.LayoutElement): LayoutElementBuilders.LayoutElement {
        val clickable = ModifiersBuilders.Clickable.Builder()
            .setId("launch_app")
            .setOnClick(
                ActionBuilders.LaunchAction.Builder()
                    .setAndroidActivity(
                        ActionBuilders.AndroidActivity.Builder()
                            .setPackageName(packageName)
                            .setClassName("com.deenpulse.wear.WearMainActivity")
                            .build()
                    )
                    .build()
            )
            .build()

        return LayoutElementBuilders.Box.Builder()
            .setWidth(DimensionBuilders.expand())
            .setHeight(DimensionBuilders.expand())
            .addContent(layoutElement)
            .setModifiers(
                ModifiersBuilders.Modifiers.Builder()
                    .setClickable(clickable)
                    .build()
            )
            .build()
    }

    private suspend fun buildPrayerListTile(deviceParams: DeviceParameters, repository: PrayerRepository): TileBuilders.Tile {
        val prayers = repository.getTodaysPrayers()
        val clockOffset = repository.getClockOffset()
        val nowMs = System.currentTimeMillis() + clockOffset
        val nextPrayer = PrayerEngine.getNextPrayer(prayers, nowMs)

        val accentColor = 0xFF00F29D.toInt()
        val textColorPrimary = 0xFFFFFFFF.toInt()
        val textColorMuted = 0x99FFFFFF.toInt()
        val passedColor = 0x66FFFFFF.toInt()

        val column = LayoutElementBuilders.Column.Builder()

        for (prayer in prayers) {
            val status = PrayerEngine.getPrayerStatus(prayer, nextPrayer, nowMs)
            val nameColor = when (status) {
                "next" -> accentColor
                "passed" -> passedColor
                else -> textColorPrimary
            }
            val timeColor = when (status) {
                "next" -> accentColor
                "passed" -> passedColor
                else -> textColorMuted
            }

            val row = LayoutElementBuilders.Row.Builder()
                .setWidth(DimensionBuilders.expand())
                .addContent(
                    Text.Builder(this, prayer.name)
                        .setTypography(Typography.TYPOGRAPHY_BODY1)
                        .setColor(ColorBuilders.argb(nameColor))
                        .build()
                )
                .addContent(
                    LayoutElementBuilders.Spacer.Builder()
                        .setWidth(DimensionBuilders.expand())
                        .build()
                )
                .addContent(
                    Text.Builder(this, PrayerEngine.formatEpochTo12Hour(prayer.epochMs))
                        .setTypography(Typography.TYPOGRAPHY_BODY1)
                        .setColor(ColorBuilders.argb(timeColor))
                        .build()
                )
                .build()

            column.addContent(row)
        }

        val layout = PrimaryLayout.Builder(deviceParams)
            .setPrimaryLabelTextContent(
                Text.Builder(this, "Today's Prayers")
                    .setTypography(Typography.TYPOGRAPHY_CAPTION1)
                    .setColor(ColorBuilders.argb(textColorMuted))
                    .build()
            )
            .setContent(column.build())
            .build()

        val clickableLayout = wrapWithClickable(layout)

        val timeline = TimelineBuilders.Timeline.Builder()
            .addTimelineEntry(
                TimelineBuilders.TimelineEntry.Builder()
                    .setLayout(
                        LayoutElementBuilders.Layout.Builder()
                            .setRoot(clickableLayout)
                            .build()
                    )
                    .build()
            )
            .build()

        return TileBuilders.Tile.Builder()
            .setResourcesVersion("1")
            .setFreshnessIntervalMillis(60_000)
            .setTileTimeline(timeline)
            .build()
    }

    private fun buildNoDataTile(deviceParams: DeviceParameters): TileBuilders.Tile {
        val textColorPrimary = 0xFFFFFFFF.toInt()
        val textColorMuted = 0x99FFFFFF.toInt()

        val layout = PrimaryLayout.Builder(deviceParams)
            .setContent(
                Text.Builder(this, "Sync Required")
                    .setTypography(Typography.TYPOGRAPHY_TITLE1)
                    .setColor(ColorBuilders.argb(textColorPrimary))
                    .build()
            )
            .setSecondaryLabelTextContent(
                Text.Builder(this, "Open phone app")
                    .setTypography(Typography.TYPOGRAPHY_CAPTION2)
                    .setColor(ColorBuilders.argb(textColorMuted))
                    .build()
            )
            .build()

        val clickableLayout = wrapWithClickable(layout)

        val timeline = TimelineBuilders.Timeline.Builder()
            .addTimelineEntry(
                TimelineBuilders.TimelineEntry.Builder()
                    .setLayout(
                        LayoutElementBuilders.Layout.Builder()
                            .setRoot(clickableLayout)
                            .build()
                    )
                    .build()
            )
            .build()

        return TileBuilders.Tile.Builder()
            .setResourcesVersion("1")
            .setFreshnessIntervalMillis(60_000)
            .setTileTimeline(timeline)
            .build()
    }
}

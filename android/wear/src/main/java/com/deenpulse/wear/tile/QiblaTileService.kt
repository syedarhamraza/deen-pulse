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
import com.deenpulse.wear.data.PrayerRepository
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.guava.future
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

class QiblaTileService : TileService() {

    private val serviceScope = CoroutineScope(Dispatchers.IO)

    companion object {
        private const val KAABA_LAT = 21.4225
        private const val KAABA_LNG = 39.8262
    }

    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> {
        return serviceScope.future {
            val deviceParams = requestParams.deviceConfiguration ?: throw IllegalArgumentException("No device configuration")
            val repository = PrayerRepository(this@QiblaTileService)
            val location = repository.getLocation()

            if (location == null) {
                buildNoLocationTile(deviceParams)
            } else {
                buildQiblaTile(deviceParams, location.first, location.second)
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

    /**
     * Calculate Qibla bearing from user location to the Kaaba.
     * Uses the standard forward azimuth formula for great-circle navigation.
     *
     * @return bearing in degrees (0–360)
     */
    private fun calculateQiblaBearing(userLat: Double, userLng: Double): Double {
        val userLatRad = Math.toRadians(userLat)
        val userLngRad = Math.toRadians(userLng)
        val kaabaLatRad = Math.toRadians(KAABA_LAT)
        val kaabaLngRad = Math.toRadians(KAABA_LNG)
        val dLng = kaabaLngRad - userLngRad

        val x = sin(dLng) * cos(kaabaLatRad)
        val y = cos(userLatRad) * sin(kaabaLatRad) - sin(userLatRad) * cos(kaabaLatRad) * cos(dLng)

        val bearingRad = atan2(x, y)
        val bearingDeg = Math.toDegrees(bearingRad)

        return (bearingDeg + 360) % 360
    }

    /**
     * Convert a bearing in degrees to a cardinal/intercardinal direction string.
     */
    private fun bearingToCardinal(bearing: Double): String {
        val directions = arrayOf("N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW")
        val index = ((bearing + 11.25) / 22.5).toInt() % 16
        return directions[index]
    }

    private fun buildQiblaTile(deviceParams: DeviceParameters, userLat: Double, userLng: Double): TileBuilders.Tile {
        val accentColor = 0xFF00F29D.toInt()
        val textColorMuted = 0x99FFFFFF.toInt()

        val bearing = calculateQiblaBearing(userLat, userLng)
        val bearingText = "${bearing.toInt()}°"
        val cardinalText = bearingToCardinal(bearing)

        val layout = PrimaryLayout.Builder(deviceParams)
            .setPrimaryLabelTextContent(
                Text.Builder(this, "QIBLA DIRECTION")
                    .setTypography(Typography.TYPOGRAPHY_CAPTION1)
                    .setColor(ColorBuilders.argb(textColorMuted))
                    .build()
            )
            .setContent(
                Text.Builder(this, bearingText)
                    .setTypography(Typography.TYPOGRAPHY_DISPLAY2)
                    .setColor(ColorBuilders.argb(accentColor))
                    .build()
            )
            .setSecondaryLabelTextContent(
                Text.Builder(this, cardinalText)
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
            .setFreshnessIntervalMillis(3_600_000)
            .setTileTimeline(timeline)
            .build()
    }

    private fun buildNoLocationTile(deviceParams: DeviceParameters): TileBuilders.Tile {
        val textColorPrimary = 0xFFFFFFFF.toInt()
        val textColorMuted = 0x99FFFFFF.toInt()

        val layout = PrimaryLayout.Builder(deviceParams)
            .setContent(
                Text.Builder(this, "Location Required")
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
            .setFreshnessIntervalMillis(3_600_000)
            .setTileTimeline(timeline)
            .build()
    }
}

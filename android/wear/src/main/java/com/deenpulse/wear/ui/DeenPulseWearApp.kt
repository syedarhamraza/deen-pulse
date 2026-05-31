package com.deenpulse.wear.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.*
import com.deenpulse.shared.PrayerEngine
import com.deenpulse.shared.PrayerTime
import com.deenpulse.wear.data.PrayerRepository
import com.deenpulse.wear.data.WearDataListenerService
import com.deenpulse.wear.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Random

@Composable
fun DeenPulseWearApp(isAmbient: Boolean) {
    val context = LocalContext.current
    val repository = remember { PrayerRepository(context) }
    val prayersState = repository.prayerTimesFlow.collectAsState(initial = emptyList())
    val prayers = prayersState.value

    val listState = rememberScalingLazyListState()
    val coroutineScope = rememberCoroutineScope()
    val clockOffset = remember { repository.getClockOffset() }
    var nowMs by remember { mutableStateOf(System.currentTimeMillis() + clockOffset) }

    LaunchedEffect(isAmbient) {
        while (true) {
            nowMs = System.currentTimeMillis() + clockOffset
            delay(if (isAmbient) 60_000L else 1_000L)
        }
    }

    Scaffold(
        timeText = {
            if (!isAmbient) {
                TimeText()
            }
        },
        positionIndicator = {
            if (!isAmbient) {
                PositionIndicator(scalingLazyListState = listState)
            }
        },
        modifier = Modifier.fillMaxSize().background(Color.Black)
    ) {
        if (prayers.isEmpty()) {
            // No data synced yet
            ScalingLazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 20.dp)
            ) {
                item {
                    Text(
                        text = "Waiting for Sync",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )
                }
                item {
                    Spacer(modifier = Modifier.height(8.dp))
                }
                item {
                    Text(
                        text = "Open DeenPulse on your phone to sync prayer times",
                        color = DeenPulseTextSecondary,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center
                    )
                }
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                }
                item {
                    Chip(
                        onClick = {
                            WearDataListenerService.requestSyncFromPhone(context)
                        },
                        label = {
                            Text(
                                text = "Sync Now",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        },
                        colors = ChipDefaults.primaryChipColors(
                            backgroundColor = DeenPulseAccent,
                            contentColor = Color.Black
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                    )
                }
            }

            // Request sync on start
            LaunchedEffect(Unit) {
                WearDataListenerService.requestSyncFromPhone(context)
            }
        } else {
            val nextPrayer = remember(prayers, nowMs) {
                PrayerEngine.getNextPrayer(prayers, nowMs)
            }
            val progress = remember(prayers, nowMs) {
                PrayerEngine.getProgressRatio(prayers, nowMs)
            }

            // Burn-in protection: random offset in ambient mode
            val ambientOffset = remember(isAmbient, nowMs) {
                if (isAmbient) {
                    val rand = Random(nowMs)
                    val dx = (rand.nextInt(5) - 2).dp // -2dp to 2dp shift
                    val dy = (rand.nextInt(5) - 2).dp
                    Pair(dx, dy)
                } else {
                    Pair(0.dp, 0.dp)
                }
            }

            val screenHeight = LocalConfiguration.current.screenHeightDp.dp
            val topSpacerHeight = remember(screenHeight) {
                val height = (screenHeight - 150.dp) / 2
                if (height > 0.dp) height else 0.dp
            }

            ScalingLazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black),
                state = listState,
                autoCentering = null,
                contentPadding = PaddingValues(
                    start = 8.dp,
                    end = 8.dp,
                    top = 0.dp,
                    bottom = 40.dp
                ),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Top Spacer to dynamically center the progress circle initially
                item {
                    Spacer(modifier = Modifier.height(topSpacerHeight))
                }

                // Custom Circular Progress Ring
                item {
                    Box(
                        modifier = Modifier
                            .size(150.dp)
                            .offset(x = ambientOffset.first, y = ambientOffset.second),
                        contentAlignment = Alignment.Center
                    ) {
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            val strokeWidth = if (isAmbient) 2.dp.toPx() else 4.dp.toPx()
                            val trackColor = if (isAmbient) AmbientTrack else DeenPulseTrack
                            val accentColor = if (isAmbient) Color.White else DeenPulseAccent

                            // Draw Track
                            drawArc(
                                color = trackColor,
                                startAngle = 0f,
                                sweepAngle = 360f,
                                useCenter = false,
                                style = Stroke(width = strokeWidth)
                            )

                            if (!isAmbient) {
                                // Subtle glow arc behind the progress line
                                drawArc(
                                    color = DeenPulseAccent.copy(alpha = 0.25f),
                                    startAngle = -90f,
                                    sweepAngle = progress * 360f,
                                    useCenter = false,
                                    style = Stroke(width = 8.dp.toPx(), cap = StrokeCap.Round)
                                )
                            }

                            // Draw Progress
                            drawArc(
                                color = accentColor,
                                startAngle = -90f,
                                sweepAngle = progress * 360f,
                                useCenter = false,
                                style = Stroke(
                                    width = strokeWidth,
                                    cap = if (isAmbient) StrokeCap.Butt else StrokeCap.Round
                                )
                            )
                        }

                        // Center Countdown Metadata
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            if (nextPrayer != null) {
                                Text(
                                    text = nextPrayer.name.uppercase(),
                                    color = Color.White,
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = if (isAmbient) {
                                        PrayerEngine.formatCountdownShort(nextPrayer.remainingMs)
                                    } else {
                                        PrayerEngine.formatCountdown(nextPrayer.remainingMs)
                                    },
                                    color = if (isAmbient) Color.White else DeenPulseAccent,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = nextPrayer.timeStr,
                                    color = DeenPulseTextSecondary,
                                    fontSize = 12.sp
                                )
                            } else {
                                Text(
                                    text = "SYNCING...",
                                    color = Color.White,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(12.dp))
                }

                // List of today's prayers
                items(
                    count = prayers.size,
                    key = { index -> prayers[index].name }
                ) { index ->
                    val prayer = prayers[index]
                    val status = remember(prayer, nextPrayer, nowMs) {
                        PrayerEngine.getPrayerStatus(prayer, nextPrayer, nowMs)
                    }

                    val isNext = status == "next"
                    val isActive = status == "active"

                    val backgroundColor = if (isAmbient) {
                        Color.Black
                    } else {
                        if (isNext) DeenPulseSurface else Color(0xFF070B14)
                    }

                    val borderColor = if (isAmbient) {
                        if (isNext) Color.White else Color.Transparent
                    } else {
                        if (isNext) DeenPulseAccent else Color.Transparent
                    }

                    val nameColor = if (isAmbient) {
                        Color.White
                    } else {
                        when (status) {
                            "active" -> Color.White
                            "next" -> DeenPulseAccent
                            "passed" -> DeenPulseTextMuted
                            else -> DeenPulseTextPrimary
                        }
                    }

                    val timeColor = if (isAmbient) {
                        Color.White
                    } else {
                        when (status) {
                            "passed" -> DeenPulseTextMuted
                            else -> DeenPulseTextSecondary
                        }
                    }

                    val cardShape = RoundedCornerShape(24.dp)
                    val cardModifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 2.dp)
                        .let {
                            if (borderColor != Color.Transparent) {
                                it.border(BorderStroke(1.dp, borderColor), cardShape)
                            } else {
                                it
                            }
                        }

                    Card(
                        onClick = { /* No-op */ },
                        modifier = cardModifier,
                        backgroundPainter = CardDefaults.cardBackgroundPainter(
                            startBackgroundColor = backgroundColor,
                            endBackgroundColor = backgroundColor
                        ),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                if (!isAmbient) {
                                    val dotColor = when (status) {
                                        "active" -> Color.White
                                        "next" -> DeenPulseAccent
                                        "passed" -> DeenPulseTextMuted
                                        else -> Color(0xFF3B4D6B)
                                    }
                                    Box(
                                        modifier = Modifier
                                            .size(6.dp)
                                            .background(color = dotColor, shape = CircleShape)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                }
                                Text(
                                    text = prayer.name,
                                    color = nameColor,
                                    fontSize = 14.sp,
                                    fontWeight = if (isNext || isActive) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                            Text(
                                text = prayer.timeStr,
                                color = timeColor,
                                fontSize = 14.sp
                            )
                        }
                    }
                }

                // Scroll to top upward arrow button
                item {
                    Spacer(modifier = Modifier.height(8.dp))
                }

                item {
                    Button(
                        onClick = {
                            coroutineScope.launch {
                                listState.animateScrollToItem(0)
                            }
                        },
                        modifier = Modifier.size(40.dp),
                        colors = ButtonDefaults.buttonColors(
                            backgroundColor = DeenPulseSurface,
                            contentColor = DeenPulseAccent
                        )
                    ) {
                        Canvas(modifier = Modifier.size(16.dp)) {
                            val path = Path().apply {
                                moveTo(size.width / 2f, 0f)
                                lineTo(size.width, size.height)
                                lineTo(0f, size.height)
                                close()
                            }
                            drawPath(
                                path = path,
                                color = DeenPulseAccent
                            )
                        }
                    }
                }
            }
        }
    }
}

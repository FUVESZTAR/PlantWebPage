package com.plantnfc.presentation.common

import android.Manifest
import android.app.Activity
import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.Ndef
import android.os.Build
import androidx.annotation.RequiresPermission
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberPermissionState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.nio.charset.Charset

// ──────────────────────────────────────────────────────────────────────────────
//  Expandable card (mirrors the web's collapsible panel)
// ──────────────────────────────────────────────────────────────────────────────

@Composable
fun ExpandableCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    defaultExpanded: Boolean = false,
    toggle: Boolean? = null,             // null = no toggle switch
    onToggle: ((Boolean) -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    var expanded by remember { mutableStateOf(defaultExpanded) }
    val chevronRotation by animateFloatAsState(if (expanded) 180f else 0f, label = "chevron")

    Card(
        modifier = modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        // Header row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { expanded = !expanded }
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(icon, contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.primary)
                Text(subtitle, style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (toggle != null && onToggle != null) {
                Switch(
                    checked = toggle,
                    onCheckedChange = onToggle,
                    modifier = Modifier.padding(end = 8.dp),
                )
            }
            Icon(
                Icons.Default.ExpandMore,
                contentDescription = if (expanded) "Collapse" else "Expand",
                modifier = Modifier.rotate(chevronRotation),
                tint = MaterialTheme.colorScheme.primary,
            )
        }

        AnimatedVisibility(
            visible = expanded,
            enter = expandVertically(),
            exit = shrinkVertically(),
        ) {
            HorizontalDivider()
            Column(Modifier.padding(16.dp)) { content() }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
//  Monospace preview box
// ──────────────────────────────────────────────────────────────────────────────

@Composable
fun MonoBox(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
        modifier = modifier
            .fillMaxWidth()
            .background(
                MaterialTheme.colorScheme.surfaceVariant,
                RoundedCornerShape(8.dp),
            )
            .padding(10.dp),
    )
}

// ──────────────────────────────────────────────────────────────────────────────
//  Read-only field
// ──────────────────────────────────────────────────────────────────────────────

@Composable
fun ReadOnlyField(label: String, value: String, modifier: Modifier = Modifier) {
    OutlinedTextField(
        value = value,
        onValueChange = {},
        readOnly = true,
        label = { Text(label) },
        modifier = modifier.fillMaxWidth(),
        singleLine = true,
        colors = OutlinedTextFieldDefaults.colors(
            disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant,
        ),
    )
}

// ──────────────────────────────────────────────────────────────────────────────
//  GPS data display rows
// ──────────────────────────────────────────────────────────────────────────────

@Composable
fun GpsDataDisplay(lat: String, lon: String, alt: String, acc: String) {
    Column {
        GpsRow("Latitude",  lat)
        GpsRow("Longitude", lon)
        GpsRow("Altitude",  alt)
        GpsRow("Accuracy",  acc)
    }
}

@Composable
private fun GpsRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Text(label, Modifier.weight(1f), style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface)
    }
    HorizontalDivider(thickness = 0.5.dp, color = MaterialTheme.colorScheme.outlineVariant)
}

// ──────────────────────────────────────────────────────────────────────────────
//  Size chip / badge
// ──────────────────────────────────────────────────────────────────────────────

@Composable
fun SizeChip(bytes: Int) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = MaterialTheme.colorScheme.secondaryContainer,
    ) {
        Text(
            text = formatSize(bytes),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSecondaryContainer,
        )
    }
}

@Composable
fun SizeBadge(label: String, text: String, sizeBytes: Int) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(label, Modifier.weight(1f), style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
        SizeChip(sizeBytes)
    }
    Spacer(Modifier.height(4.dp))
    MonoBox(text)
}

private fun formatSize(bytes: Int) = when {
    bytes == 0        -> "0 B"
    bytes < 1024      -> "$bytes B"
    bytes < 1048576   -> "${"%.1f".format(bytes / 1024.0)} KB"
    else              -> "${"%.2f".format(bytes / 1048576.0)} MB"
}

// ──────────────────────────────────────────────────────────────────────────────
//  GPS Tracker composable (handles Android location permission + updates)
// ──────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun GpsTracker(
    isTracking: Boolean,
    onLocationUpdate: (android.location.Location) -> Unit,
) {
    val context = LocalContext.current
    val locationPermission = rememberPermissionState(Manifest.permission.ACCESS_FINE_LOCATION)

    LaunchedEffect(isTracking) {
        if (!isTracking) return@LaunchedEffect
        if (!locationPermission.status.isGranted) {
            locationPermission.launchPermissionRequest()
            return@LaunchedEffect
        }
        val lm = context.getSystemService(android.location.LocationManager::class.java)
        // Use a simple one-shot location; for continuous updates use a coroutine-based approach
        val listener = object : android.location.LocationListener {
            override fun onLocationChanged(loc: android.location.Location) { onLocationUpdate(loc) }
        }
        try {
            lm.requestLocationUpdates(
                android.location.LocationManager.GPS_PROVIDER,
                1000L,
                1f,
                listener,
            )
        } catch (_: SecurityException) {}
    }
}

// ──────────────────────────────────────────────────────────────────────────────
//  NFC Write button (handles enabling foreground dispatch + writing)
// ──────────────────────────────────────────────────────────────────────────────

@Composable
fun NfcWriteButton(
    nfcText: String,
    nfcLink: String,
    enabled: Boolean,
    onSerialDetected: (String) -> Unit,
    onSuccess: () -> Unit,
    onError: (String) -> Unit,
    onNotSupported: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var isWaiting by remember { mutableStateOf(false) }

    Button(
        onClick = {
            val nfcAdapter = NfcAdapter.getDefaultAdapter(context)
            if (nfcAdapter == null || !nfcAdapter.isEnabled) {
                onNotSupported(); return@Button
            }
            isWaiting = true
            // NFC write happens in MainActivity.onNewIntent; we register a pending write
            NfcWriteQueue.enqueue(nfcText, nfcLink, onSerialDetected, onSuccess, onError) { isWaiting = false }
        },
        modifier = modifier,
        enabled = enabled && !isWaiting,
    ) {
        if (isWaiting) {
            CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp,
                color = MaterialTheme.colorScheme.onPrimary)
            Spacer(Modifier.width(6.dp))
            Text("Tap tag…")
        } else {
            Icon(Icons.Default.Nfc, null, Modifier.size(16.dp))
            Spacer(Modifier.width(4.dp))
            Text("Write NFC")
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
//  NFC Foreground Dispatch composable (for Reader screen)
// ──────────────────────────────────────────────────────────────────────────────

@Composable
fun NfcForegroundDispatch(
    onTagScanned: (tagId: String, textRecords: List<String>, urlRecords: List<String>) -> Unit,
) {
    // MainActivity calls this callback when it receives onNewIntent
    NfcWriteQueue.setReadCallback(onTagScanned)
}

// ──────────────────────────────────────────────────────────────────────────────
//  NfcWriteQueue – singleton that bridges MainActivity ↔ Compose
// ──────────────────────────────────────────────────────────────────────────────

object NfcWriteQueue {
    data class PendingWrite(
        val text: String,
        val link: String,
        val onSerialDetected: (String) -> Unit,
        val onSuccess: () -> Unit,
        val onError: (String) -> Unit,
        val onDone: () -> Unit,
    )

    @Volatile var pendingWrite: PendingWrite? = null
    @Volatile private var readCallback: ((String, List<String>, List<String>) -> Unit)? = null

    fun enqueue(
        text: String,
        link: String,
        onSerialDetected: (String) -> Unit,
        onSuccess: () -> Unit,
        onError: (String) -> Unit,
        onDone: () -> Unit,
    ) {
        pendingWrite = PendingWrite(text, link, onSerialDetected, onSuccess, onError, onDone)
    }

    fun setReadCallback(cb: (String, List<String>, List<String>) -> Unit) { readCallback = cb }

    /** Called from MainActivity.onNewIntent. */
    fun handleTag(tag: Tag) {
        val serial = bytesToHex(tag.id)
        val pending = pendingWrite

        if (pending != null) {
            // Write mode
            pendingWrite = null
            pending.onSerialDetected(serial)
            try {
                val ndef = Ndef.get(tag) ?: run { pending.onError("Tag is not NDEF-capable"); pending.onDone(); return }
                ndef.connect()
                val textRecord = NdefRecord.createTextRecord("en", pending.text)
                val urlRecord  = NdefRecord.createUri(android.net.Uri.parse(pending.link))
                val msg = NdefMessage(arrayOf(textRecord, urlRecord))
                ndef.writeNdefMessage(msg)
                ndef.close()
                pending.onSuccess()
            } catch (e: Exception) {
                pending.onError(e.message ?: "Unknown error")
            } finally {
                pending.onDone()
            }
        } else {
            // Read mode
            val ndef = Ndef.get(tag) ?: return
            try {
                ndef.connect()
                val msg = ndef.ndefMessage ?: run { ndef.close(); return }
                ndef.close()
                val textRecords = mutableListOf<String>()
                val urlRecords  = mutableListOf<String>()
                msg.records.forEach { r ->
                    when {
                        r.tnf == NdefRecord.TNF_WELL_KNOWN && r.type.contentEquals(NdefRecord.RTD_TEXT) -> {
                            val payload = r.payload
                            val langLen = payload[0].toInt() and 0x3F
                            textRecords.add(String(payload, 1 + langLen, payload.size - 1 - langLen, Charset.forName("UTF-8")))
                        }
                        r.tnf == NdefRecord.TNF_WELL_KNOWN && r.type.contentEquals(NdefRecord.RTD_URI) -> {
                            val uriPrefix = uriPrefixes[r.payload[0].toInt() and 0xFF] ?: ""
                            urlRecords.add(uriPrefix + String(r.payload, 1, r.payload.size - 1, Charsets.UTF_8))
                        }
                    }
                }
                readCallback?.invoke(serial, textRecords, urlRecords)
            } catch (_: Exception) { runCatching { ndef.close() } }
        }
    }

    private fun bytesToHex(bytes: ByteArray) =
        bytes.joinToString(":") { "%02X".format(it) }

    private val uriPrefixes = mapOf(
        0x00 to "", 0x01 to "http://www.", 0x02 to "https://www.",
        0x03 to "http://", 0x04 to "https://", 0x05 to "tel:",
        0x06 to "mailto:", 0x07 to "ftp://anonymous:anonymous@",
    )
}

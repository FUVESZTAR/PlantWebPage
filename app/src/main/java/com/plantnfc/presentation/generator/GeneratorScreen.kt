package com.plantnfc.presentation.generator

import android.app.Activity
import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.Ndef
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.plantnfc.domain.model.NfcType
import com.plantnfc.presentation.common.*
import com.plantnfc.util.NfcTextCodec
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.nio.charset.Charset

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GeneratorScreen(
    onNavigateToReader: () -> Unit,
    onNavigateToList: () -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: GeneratorViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    // Status message → Snackbar
    LaunchedEffect(uiState.statusMessage) {
        uiState.statusMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg.text, duration = SnackbarDuration.Short)
            viewModel.dismissStatus()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("🌱 NFC Generator") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateToReader) {
                        Icon(Icons.Default.DocumentScanner, "Reader")
                    }
                    IconButton(onClick = onNavigateToList) {
                        Icon(Icons.Default.List, "NFC List")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .padding(paddingValues)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // ── Plant selection card ──────────────────────────────────────────
            ExpandableCard(
                title = "Selection",
                subtitle = "Choose a plant and variety",
                icon = Icons.Default.LocalFlorist,
                defaultExpanded = true,
            ) {
                PlantSelectionContent(uiState = uiState, viewModel = viewModel)
            }

            // ── Data card ────────────────────────────────────────────────────
            ExpandableCard(
                title = "Data",
                subtitle = "Data stored in NFC",
                icon = Icons.Default.Assignment,
                defaultExpanded = true,
            ) {
                DataFieldsContent(uiState = uiState, viewModel = viewModel)
            }

            // ── GPS card ─────────────────────────────────────────────────────
            ExpandableCard(
                title = "GPS Data",
                subtitle = "Record position in NFC",
                icon = Icons.Default.GpsFixed,
                toggle = uiState.gpsEnabled,
                onToggle = viewModel::setGpsEnabled,
                defaultExpanded = uiState.gpsEnabled,
            ) {
                if (uiState.gpsEnabled) {
                    GpsContent(uiState = uiState, viewModel = viewModel)
                }
            }

            // ── Notes card ───────────────────────────────────────────────────
            ExpandableCard(
                title = "Other Info",
                subtitle = "Optional extra notes",
                icon = Icons.Default.Notes,
                toggle = uiState.notesEnabled,
                onToggle = viewModel::setNotesEnabled,
                defaultExpanded = uiState.notesEnabled,
            ) {
                if (uiState.notesEnabled) {
                    OutlinedTextField(
                        value = uiState.notes,
                        onValueChange = viewModel::setNotes,
                        label = { Text("Notes") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3,
                    )
                }
            }

            // ── Preview card ─────────────────────────────────────────────────
            ExpandableCard(
                title = "NFC Preview",
                subtitle = "Generated data and link",
                icon = Icons.Default.Preview,
                defaultExpanded = true,
            ) {
                PreviewContent(uiState = uiState)
            }

            // ── Actions card ─────────────────────────────────────────────────
            ExpandableCard(
                title = "Actions",
                subtitle = "Write, save, copy",
                icon = Icons.Default.BoltOutlined,
                defaultExpanded = true,
            ) {
                ActionsContent(
                    uiState      = uiState,
                    viewModel    = viewModel,
                    scope        = scope,
                    snackbar     = snackbarHostState,
                )
            }

            Spacer(Modifier.height(32.dp))
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
//  Sub-sections
// ──────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PlantSelectionContent(uiState: GeneratorUiState, viewModel: GeneratorViewModel) {
    val plants = uiState.plants

    // Plant dropdown
    var plantQuery by remember { mutableStateOf("") }
    val filtered = plants
        .distinctBy { it.nameEn }
        .filter { it.nameEn.contains(plantQuery, ignoreCase = true) || it.nameHu.contains(plantQuery, ignoreCase = true) }

    var plantExpanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = plantExpanded, onExpandedChange = { plantExpanded = it }) {
        OutlinedTextField(
            value = uiState.selectedPlant?.nameEn ?: "",
            onValueChange = { plantQuery = it; plantExpanded = true },
            label = { Text("Plant Name") },
            modifier = Modifier.fillMaxWidth().menuAnchor(),
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(plantExpanded) },
            singleLine = true,
        )
        ExposedDropdownMenu(expanded = plantExpanded, onDismissRequest = { plantExpanded = false }) {
            filtered.take(50).forEach { plant ->
                DropdownMenuItem(
                    text = { Text(plant.nameEn) },
                    onClick = { viewModel.selectPlant(plant); plantExpanded = false; plantQuery = "" },
                )
            }
        }
    }

    Spacer(Modifier.height(8.dp))

    // Variety dropdown
    if (uiState.selectedPlant != null) {
        var varExpanded by remember { mutableStateOf(false) }
        val varieties = uiState.varieties + listOf("— Custom —")
        ExposedDropdownMenuBox(expanded = varExpanded, onExpandedChange = { varExpanded = it }) {
            OutlinedTextField(
                value = if (uiState.isCustomVariety) "— Custom —" else uiState.selectedVariety,
                onValueChange = {},
                readOnly = true,
                label = { Text("Variety") },
                modifier = Modifier.fillMaxWidth().menuAnchor(),
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(varExpanded) },
            )
            ExposedDropdownMenu(expanded = varExpanded, onDismissRequest = { varExpanded = false }) {
                varieties.forEach { v ->
                    DropdownMenuItem(
                        text = { Text(v) },
                        onClick = {
                            if (v == "— Custom —") viewModel.selectVariety("__custom__")
                            else viewModel.selectVariety(v)
                            varExpanded = false
                        },
                    )
                }
            }
        }

        // Custom variety text input
        AnimatedVisibility(visible = uiState.isCustomVariety) {
            OutlinedTextField(
                value = uiState.customVariety,
                onValueChange = viewModel::setCustomVariety,
                label = { Text("Enter custom variety") },
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                singleLine = true,
            )
        }
    }
}

@Composable
private fun DataFieldsContent(uiState: GeneratorUiState, viewModel: GeneratorViewModel) {
    ReadOnlyField("Plant ID", uiState.plantId)
    Spacer(Modifier.height(6.dp))

    OutlinedTextField(
        value = uiState.nfcId.toString(),
        onValueChange = { viewModel.setNfcId(it.toIntOrNull() ?: 0) },
        label = { Text("NFC ID") },
        modifier = Modifier.fillMaxWidth(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        singleLine = true,
    )
    Spacer(Modifier.height(6.dp))

    OutlinedTextField(
        value = uiState.latinName,
        onValueChange = viewModel::setLatinName,
        label = { Text("Latin Name") },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
    )
    Spacer(Modifier.height(6.dp))

    OutlinedTextField(
        value = uiState.datum,
        onValueChange = viewModel::setDatum,
        label = { Text("Date (YYYY-MM-DD)") },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
    )
    Spacer(Modifier.height(6.dp))

    // NFC Type selector
    var typeExpanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = typeExpanded, onExpandedChange = { typeExpanded = it }) {
        OutlinedTextField(
            value = uiState.nfcType.labelEn,
            onValueChange = {},
            readOnly = true,
            label = { Text("NFC Type") },
            modifier = Modifier.fillMaxWidth().menuAnchor(),
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(typeExpanded) },
        )
        ExposedDropdownMenu(expanded = typeExpanded, onDismissRequest = { typeExpanded = false }) {
            NfcType.entries.forEach { t ->
                DropdownMenuItem(
                    text = { Text(t.labelEn) },
                    onClick = { viewModel.setNfcType(t); typeExpanded = false },
                )
            }
        }
    }
}

@Composable
private fun GpsContent(uiState: GeneratorUiState, viewModel: GeneratorViewModel) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    // GPS tracking
    GpsTracker(
        isTracking = uiState.gpsState is GpsState.Tracking,
        onLocationUpdate = viewModel::onLocationUpdate,
    )

    val gps = uiState.gpsData
    GpsDataDisplay(
        lat = gps?.latitude?.toString() ?: "–",
        lon = gps?.longitude?.toString() ?: "–",
        alt = gps?.altitudeM?.let { "${it}m" } ?: "–",
        acc = gps?.accuracyM?.let { "±${it}m" } ?: "–",
    )

    Spacer(Modifier.height(8.dp))

    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        when (uiState.gpsState) {
            GpsState.Idle, is GpsState.Locked -> {
                Button(
                    onClick = { /* GpsTracker composable handles this via side-effect */ },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                ) {
                    Icon(Icons.Default.GpsFixed, null, Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Start Tracking")
                }
            }
            GpsState.Tracking -> {
                Button(
                    onClick = { viewModel.lockGpsData() },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                ) {
                    Icon(Icons.Default.Lock, null, Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Stop & Lock")
                }
            }
        }
    }

    if (uiState.gpsPacket != null) {
        Spacer(Modifier.height(6.dp))
        SizeBadge(label = "Packet", text = uiState.gpsPacket, sizeBytes = GpsPacketCodec.packetSizeBytes(uiState.gpsPacket))
    }
}

@Composable
private fun PreviewContent(uiState: GeneratorUiState) {
    Text("NFC Data", style = MaterialTheme.typography.labelMedium)
    Row(verticalAlignment = Alignment.CenterVertically) {
        Spacer(Modifier.weight(1f))
        SizeChip(bytes = uiState.nfcTextSizeBytes)
    }
    MonoBox(uiState.nfcText.ifEmpty { "NFC data will appear here…" })

    Spacer(Modifier.height(8.dp))
    Text("Link", style = MaterialTheme.typography.labelMedium)
    Row(verticalAlignment = Alignment.CenterVertically) {
        Spacer(Modifier.weight(1f))
        SizeChip(bytes = uiState.nfcLinkSizeBytes)
    }
    MonoBox(uiState.nfcLink.ifEmpty { "Link will appear here…" })

    Spacer(Modifier.height(4.dp))
    Text(
        text = "Total: ${NfcTextCodec.formatSize(uiState.nfcTextSizeBytes + uiState.nfcLinkSizeBytes)}",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.align(Alignment.End),
    )

    Spacer(Modifier.height(8.dp))
    OutlinedTextField(
        value = uiState.serialNumber,
        onValueChange = {},
        readOnly = true,
        label = { Text("NFC HW ID (auto-filled on write)") },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
    )
}

@Composable
private fun ActionsContent(
    uiState: GeneratorUiState,
    viewModel: GeneratorViewModel,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState,
) {
    val context = LocalContext.current

    // Primary actions
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(
            onClick = { viewModel.generateAndRefreshId() },
            modifier = Modifier.weight(1f),
        ) { Text("Generate") }

        NfcWriteButton(
            nfcText = uiState.nfcText,
            nfcLink = uiState.nfcLink,
            enabled = uiState.selectedPlant != null && uiState.nfcText.isNotBlank(),
            onSerialDetected = viewModel::onNfcTagDetected,
            onSuccess = viewModel::onNfcWriteSuccess,
            onError = viewModel::onNfcWriteError,
            onNotSupported = viewModel::onNfcNotSupported,
            modifier = Modifier.weight(1f),
        )

        Button(
            onClick = { viewModel.saveRecord() },
            modifier = Modifier.weight(1f),
            enabled = !uiState.isSaving,
        ) { Text(if (uiState.isSaving) "Saving…" else "Save") }
    }

    Spacer(Modifier.height(8.dp))

    // Secondary: copy
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedButton(
            onClick = { scope.launch { copyToClipboard(context, uiState.nfcText, snackbar, "NFC data copied!") } },
            modifier = Modifier.weight(1f),
        ) { Text("Copy NFC") }

        OutlinedButton(
            onClick = { scope.launch { copyToClipboard(context, uiState.nfcLink, snackbar, "Link copied!") } },
            modifier = Modifier.weight(1f),
        ) { Text("Copy Link") }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────────────────────

private suspend fun copyToClipboard(
    context: android.content.Context,
    text: String,
    snackbar: SnackbarHostState,
    msg: String,
) {
    if (text.isBlank()) { snackbar.showSnackbar("Nothing to copy"); return }
    val cm = context.getSystemService(android.content.ClipboardManager::class.java)
    cm.setPrimaryClip(android.content.ClipData.newPlainText("PlantNFC", text))
    snackbar.showSnackbar(msg)
}

private fun GpsPacketCodec.packetSizeBytes(packet: String) =
    packet.toByteArray(Charsets.UTF_8).size

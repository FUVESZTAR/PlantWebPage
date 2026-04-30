package com.plantnfc.presentation.reader

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.plantnfc.presentation.common.*
import com.plantnfc.util.NfcTextCodec
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReaderScreen(
    onNavigateToGenerator: () -> Unit,
    onNavigateToList: () -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: ReaderViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    // Show status as snackbar
    LaunchedEffect(uiState.statusMessage) {
        uiState.statusMessage?.let {
            snackbarHostState.showSnackbar(it, duration = SnackbarDuration.Short)
            viewModel.dismissStatus()
        }
    }

    // Handle NFC dispatch intent (passed from MainActivity via side-effect)
    NfcForegroundDispatch(
        onTagScanned = { tagId, textRecords, urlRecords ->
            viewModel.onNfcTagScanned(tagId, textRecords, urlRecords)
        }
    )

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("📖 NFC Reader") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateToGenerator) {
                        Icon(Icons.Default.Edit, "Generator")
                    }
                    IconButton(onClick = onNavigateToList) {
                        Icon(Icons.Default.List, "NFC List")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {

            // ── Actions card ─────────────────────────────────────────────────
            ExpandableCard(
                title = "Actions",
                subtitle = "Read, copy",
                icon = Icons.Default.BoltOutlined,
                defaultExpanded = true,
            ) {
                // Primary row
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = {
                            viewModel.setScanning(true)
                            scope.launch {
                                snackbarHostState.showSnackbar(
                                    "Approach NFC tag to phone…",
                                    duration = SnackbarDuration.Short,
                                )
                            }
                        },
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Default.Nfc, null, Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Read NFC")
                    }

                    Button(
                        onClick = { viewModel.clearFields() },
                        modifier = Modifier.weight(1f),
                    ) {
                        Text("Clear Fields")
                    }

                    Button(
                        onClick = {
                            val link = uiState.nfcLink.trim()
                            if (link.isNotBlank()) runCatching {
                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(link)))
                            }
                        },
                        modifier = Modifier.weight(1f),
                        enabled = uiState.nfcLink.isNotBlank(),
                    ) {
                        Text("Open Link")
                    }
                }

                Spacer(Modifier.height(6.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = {
                            copyToClipboard(context, uiState.nfcText)
                            scope.launch { snackbarHostState.showSnackbar("NFC data copied!") }
                        },
                        modifier = Modifier.weight(1f),
                        enabled = uiState.nfcText.isNotBlank(),
                    ) { Text("Copy NFC") }

                    OutlinedButton(
                        onClick = {
                            copyToClipboard(context, uiState.nfcLink)
                            scope.launch { snackbarHostState.showSnackbar("Link copied!") }
                        },
                        modifier = Modifier.weight(1f),
                        enabled = uiState.nfcLink.isNotBlank(),
                    ) { Text("Copy Link") }
                }
            }

            // ── Preview card ─────────────────────────────────────────────────
            ExpandableCard(
                title = "NFC Preview",
                subtitle = "Read data and link",
                icon = Icons.Default.Preview,
                defaultExpanded = true,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("NFC Data", style = MaterialTheme.typography.labelMedium)
                    Spacer(Modifier.weight(1f))
                    SizeChip(bytes = uiState.nfcTextSizeBytes)
                }
                MonoBox(uiState.nfcText.ifEmpty { "NFC data will appear here…" })

                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Link", style = MaterialTheme.typography.labelMedium)
                    Spacer(Modifier.weight(1f))
                    SizeChip(bytes = uiState.nfcLinkSizeBytes)
                }
                MonoBox(uiState.nfcLink.ifEmpty { "Link will appear here…" })

                Spacer(Modifier.height(4.dp))
                Text(
                    text = "Total: ${NfcTextCodec.formatSize(uiState.nfcTextSizeBytes + uiState.nfcLinkSizeBytes)}",
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.align(Alignment.End),
                )

                Spacer(Modifier.height(8.dp))
                ReadOnlyField("NFC Serial Number", uiState.serialNumber)
            }

            // ── Plant selection (read-only display) ──────────────────────────
            ExpandableCard(
                title = "Selection",
                subtitle = "Plant info from tag",
                icon = Icons.Default.LocalFlorist,
                defaultExpanded = true,
            ) {
                ReadOnlyField("Plant Name", uiState.plantName)
                Spacer(Modifier.height(6.dp))
                ReadOnlyField("Variety", uiState.variety)
            }

            // ── Data panel ───────────────────────────────────────────────────
            ExpandableCard(
                title = "Data",
                subtitle = "Data stored in NFC",
                icon = Icons.Default.Assignment,
                defaultExpanded = true,
            ) {
                ReadOnlyField("Plant ID",   uiState.plantId)
                Spacer(Modifier.height(6.dp))
                ReadOnlyField("NFC ID",     uiState.nfcId)
                Spacer(Modifier.height(6.dp))
                ReadOnlyField("Latin Name", uiState.latinName)
                Spacer(Modifier.height(6.dp))
                ReadOnlyField("Date",       uiState.datum)
                Spacer(Modifier.height(6.dp))
                ReadOnlyField("NFC Type",   uiState.nfcType)
            }

            // ── GPS panel ────────────────────────────────────────────────────
            ExpandableCard(
                title = "GPS Data",
                subtitle = "Position locked in NFC",
                icon = Icons.Default.GpsFixed,
                defaultExpanded = false,
            ) {
                val gps = uiState.gpsData
                GpsDataDisplay(
                    lat = gps?.latitude?.toString() ?: "–",
                    lon = gps?.longitude?.toString() ?: "–",
                    alt = gps?.altitudeM?.let { "${it}m" } ?: "–",
                    acc = gps?.accuracyM?.let { "±${it}m" } ?: "–",
                )
                if (uiState.gpsPacketRaw.isNotBlank()) {
                    Spacer(Modifier.height(6.dp))
                    SizeBadge(
                        label = "Compressed packet",
                        text = uiState.gpsPacketRaw,
                        sizeBytes = uiState.gpsPacketSizeBytes,
                    )
                }
            }

            // ── Other panel ──────────────────────────────────────────────────
            if (uiState.other.isNotBlank()) {
                ExpandableCard(
                    title = "Other Info",
                    subtitle = "Extra notes from tag",
                    icon = Icons.Default.Notes,
                    defaultExpanded = true,
                ) {
                    ReadOnlyField("Notes", uiState.other)
                }
            }

            Spacer(Modifier.height(32.dp))
        }
    }
}

private fun copyToClipboard(context: android.content.Context, text: String) {
    val cm = context.getSystemService(android.content.ClipboardManager::class.java)
    cm.setPrimaryClip(android.content.ClipData.newPlainText("PlantNFC", text))
}

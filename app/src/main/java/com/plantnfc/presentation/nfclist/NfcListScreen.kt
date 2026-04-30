package com.plantnfc.presentation.nfclist

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.plantnfc.domain.model.NfcRecord
import com.plantnfc.domain.repository.NfcRecordRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NfcListUiState(
    val records: List<NfcRecord> = emptyList(),
    val query: String = "",
    val isSyncing: Boolean = false,
    val syncMessage: String? = null,
)

@HiltViewModel
class NfcListViewModel @Inject constructor(
    private val repository: NfcRecordRepository,
) : ViewModel() {

    private val _query = MutableStateFlow("")
    private val _isSyncing = MutableStateFlow(false)
    private val _syncMessage = MutableStateFlow<String?>(null)

    val uiState: StateFlow<NfcListUiState> = combine(
        repository.getAllRecords(),
        _query,
        _isSyncing,
        _syncMessage,
    ) { records, query, syncing, msg ->
        val filtered = if (query.isBlank()) records
        else records.filter { r ->
            r.plantName.contains(query, ignoreCase = true) ||
            r.variety.contains(query, ignoreCase = true) ||
            r.latinName.contains(query, ignoreCase = true) ||
            r.plantId.contains(query, ignoreCase = true) ||
            r.nfcId.toString().contains(query)
        }
        NfcListUiState(filtered, query, syncing, msg)
    }.stateIn(viewModelScope, SharingStarted.Lazily, NfcListUiState())

    fun setQuery(q: String) = _query.update { q }

    fun deleteRecord(id: Long) = viewModelScope.launch { repository.delete(id) }

    fun syncToRemote() = viewModelScope.launch {
        _isSyncing.value = true
        val result = repository.syncToRemote()
        _syncMessage.value = if (result.isSuccess) "Sync complete!" else "Sync failed: ${result.exceptionOrNull()?.message}"
        _isSyncing.value = false
    }

    fun syncFromRemote() = viewModelScope.launch {
        _isSyncing.value = true
        val result = repository.syncFromRemote()
        _syncMessage.value = if (result.isSuccess) "Imported from Drive!" else "Import failed: ${result.exceptionOrNull()?.message}"
        _isSyncing.value = false
    }

    fun dismissMessage() = _syncMessage.update { null }
}

// ── Screen ────────────────────────────────────────────────────────────────────

package com.plantnfc.presentation.nfclist

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.plantnfc.domain.model.NfcRecord
import com.plantnfc.domain.model.SyncStatus

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NfcListScreen(
    onNavigateBack: () -> Unit,
    viewModel: NfcListViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.syncMessage) {
        uiState.syncMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.dismissMessage()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("📋 NFC List") },
                navigationIcon = { IconButton(onClick = onNavigateBack) { Icon(Icons.Default.ArrowBack, "Back") } },
                actions = {
                    if (uiState.isSyncing) {
                        CircularProgressIndicator(Modifier.size(24.dp).padding(end = 8.dp), strokeWidth = 2.dp)
                    } else {
                        IconButton(onClick = viewModel::syncToRemote) {
                            Icon(Icons.Default.CloudUpload, "Sync to Drive")
                        }
                        IconButton(onClick = viewModel::syncFromRemote) {
                            Icon(Icons.Default.CloudDownload, "Sync from Drive")
                        }
                    }
                },
            )
        },
    ) { padding ->
        Column(Modifier.padding(padding)) {
            // Search bar
            OutlinedTextField(
                value = uiState.query,
                onValueChange = viewModel::setQuery,
                label = { Text("Search NFC records…") },
                leadingIcon = { Icon(Icons.Default.Search, null) },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                singleLine = true,
            )

            if (uiState.records.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        if (uiState.query.isBlank()) "No NFC records yet" else "No results for '${uiState.query}'",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(uiState.records, key = { it.id }) { record ->
                        NfcRecordCard(record = record, onDelete = { viewModel.deleteRecord(record.id) })
                    }
                    item { Spacer(Modifier.height(24.dp)) }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NfcRecordCard(record: NfcRecord, onDelete: () -> Unit) {
    var showDeleteDialog by remember { mutableStateOf(false) }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete record?") },
            text = { Text("NFC #${record.nfcId} – ${record.plantName} will be deleted.") },
            confirmButton = {
                TextButton(onClick = { onDelete(); showDeleteDialog = false }) { Text("Delete") }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text("Cancel") }
            },
        )
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Row(
            Modifier.padding(16.dp),
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "#${record.nfcId} • ${record.plantName}",
                        style = MaterialTheme.typography.titleSmall,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Spacer(Modifier.width(6.dp))
                    SyncBadge(record.syncStatus)
                }
                if (record.variety.isNotBlank()) {
                    Text(record.variety, style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text(record.latinName, style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)
                Spacer(Modifier.height(4.dp))
                Text("${record.nfcType.labelEn} • ${record.datum}",
                    style = MaterialTheme.typography.bodySmall)
                if (!record.serialNumber.isNullOrBlank()) {
                    Text("SN: ${record.serialNumber}", style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline)
                }
            }
            IconButton(onClick = { showDeleteDialog = true }) {
                Icon(Icons.Default.DeleteOutline, "Delete", tint = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@Composable
private fun SyncBadge(status: SyncStatus) {
    val (label, color) = when (status) {
        SyncStatus.SYNCED   -> "✓" to MaterialTheme.colorScheme.primary
        SyncStatus.PENDING  -> "↑" to MaterialTheme.colorScheme.tertiary
        SyncStatus.CONFLICT -> "!" to MaterialTheme.colorScheme.error
    }
    Surface(
        shape = MaterialTheme.shapes.small,
        color = color.copy(alpha = 0.12f),
    ) {
        Text(label, Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
            style = MaterialTheme.typography.labelSmall, color = color)
    }
}

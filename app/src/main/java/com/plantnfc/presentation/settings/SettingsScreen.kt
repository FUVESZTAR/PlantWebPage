package com.plantnfc.presentation.settings

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.Scope
import com.google.api.services.drive.DriveScopes
import com.plantnfc.data.local.AppPreferences
import com.plantnfc.data.sync.SyncWorker
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject
import android.content.Context

data class SettingsUiState(
    val language: String = "hu",
    val sheetId: String  = "",
    val baseUrl: String  = "",
    val isSignedIn: Boolean = false,
    val accountEmail: String? = null,
    val message: String? = null,
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val prefs: AppPreferences,
    @ApplicationContext private val context: Context,
) : ViewModel() {

    val uiState: StateFlow<SettingsUiState> = prefs.language.map { lang ->
        val account = GoogleSignIn.getLastSignedInAccount(context)
        SettingsUiState(
            language    = lang,
            isSignedIn  = account != null,
            accountEmail = account?.email,
        )
    }.stateIn(viewModelScope, SharingStarted.Lazily, SettingsUiState())

    fun setLanguage(lang: String) = viewModelScope.launch { prefs.setLanguage(lang) }
    fun setSheetId(id: String)    = viewModelScope.launch { prefs.setSheetId(id) }
    fun setBaseUrl(url: String)   = viewModelScope.launch { prefs.setBaseUrl(url) }

    fun onSignInSuccess() = viewModelScope.launch {
        // Trigger an immediate sync after sign-in
        SyncWorker.scheduleOneShot(context)
        SyncWorker.schedule(context)           // also schedule periodic
    }

    fun signOut() = viewModelScope.launch {
        val client = GoogleSignIn.getClient(context, GoogleSignInOptions.DEFAULT_SIGN_IN)
        client.signOut()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // Google Sign-In launcher
    val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
        .requestEmail()
        .requestScopes(Scope(DriveScopes.DRIVE_FILE))
        .build()
    val signInClient = remember { GoogleSignIn.getClient(context, gso) }

    val signInLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            viewModel.onSignInSuccess()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = { IconButton(onClick = onNavigateBack) { Icon(Icons.Default.ArrowBack, "Back") } },
            )
        }
    ) { padding ->
        Column(
            Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {

            // ── Google Account ────────────────────────────────────────────────
            SectionCard(title = "Google Account", icon = Icons.Default.AccountCircle) {
                if (uiState.isSignedIn) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CheckCircle, null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Signed in", style = MaterialTheme.typography.labelMedium)
                            Text(uiState.accountEmail ?: "", style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        OutlinedButton(onClick = { viewModel.signOut() }) { Text("Sign out") }
                    }
                } else {
                    Button(
                        onClick = { signInLauncher.launch(signInClient.signInIntent) },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.Default.Login, null, Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Sign in with Google")
                    }
                    Text(
                        "Required for Google Drive sync",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            // ── Language ─────────────────────────────────────────────────────
            SectionCard(title = "Language", icon = Icons.Default.Language) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("en" to "English", "hu" to "Magyar").forEach { (code, label) ->
                        FilterChip(
                            selected = uiState.language == code,
                            onClick  = { viewModel.setLanguage(code) },
                            label    = { Text(label) },
                        )
                    }
                }
            }

            // ── Data source ───────────────────────────────────────────────────
            SectionCard(title = "Data Source", icon = Icons.Default.TableChart) {
                var sheetId by remember { mutableStateOf(uiState.sheetId) }
                OutlinedTextField(
                    value = sheetId,
                    onValueChange = { sheetId = it },
                    label = { Text("Google Sheet ID") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    trailingIcon = {
                        IconButton(onClick = { viewModel.setSheetId(sheetId) }) {
                            Icon(Icons.Default.Save, "Save")
                        }
                    },
                )
                Spacer(Modifier.height(8.dp))
                var baseUrl by remember { mutableStateOf(uiState.baseUrl) }
                OutlinedTextField(
                    value = baseUrl,
                    onValueChange = { baseUrl = it },
                    label = { Text("Plant page base URL") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    trailingIcon = {
                        IconButton(onClick = { viewModel.setBaseUrl(baseUrl) }) {
                            Icon(Icons.Default.Save, "Save")
                        }
                    },
                )
            }

            // ── Sync ──────────────────────────────────────────────────────────
            SectionCard(title = "Sync", icon = Icons.Default.Sync) {
                Button(
                    onClick = { SyncWorker.scheduleOneShot(context) },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Icon(Icons.Default.CloudSync, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Sync Now")
                }
                Text(
                    "Background sync runs automatically every 6 hours when connected.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun SectionCard(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text(title, style = MaterialTheme.typography.titleSmall)
            }
            Spacer(Modifier.height(12.dp))
            content()
        }
    }
}

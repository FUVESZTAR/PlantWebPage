package com.plantnfc.presentation

import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.plantnfc.presentation.common.NfcWriteQueue
import com.plantnfc.presentation.generator.GeneratorScreen
import com.plantnfc.presentation.nfclist.NfcListScreen
import com.plantnfc.presentation.reader.ReaderScreen
import com.plantnfc.presentation.theme.PlantNfcTheme
import dagger.hilt.android.AndroidEntryPoint

// ──────────────────────────────────────────────────────────────────────────────
//  Navigation routes
// ──────────────────────────────────────────────────────────────────────────────

sealed class Screen(val route: String) {
    data object Generator : Screen("generator")
    data object Reader    : Screen("reader")
    data object NfcList   : Screen("nfc_list")
}

// ──────────────────────────────────────────────────────────────────────────────
//  MainActivity – NFC dispatch entry point
// ──────────────────────────────────────────────────────────────────────────────

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private var nfcAdapter: NfcAdapter? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)

        setContent {
            PlantNfcTheme {
                Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    val navController = rememberNavController()
                    AppNavHost(navController)
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // Enable foreground NFC dispatch so we intercept tags while app is in foreground
        nfcAdapter?.enableReaderMode(
            this,
            { tag: Tag -> runOnUiThread { NfcWriteQueue.handleTag(tag) } },
            NfcAdapter.FLAG_READER_NFC_A or
            NfcAdapter.FLAG_READER_NFC_B or
            NfcAdapter.FLAG_READER_NFC_F or
            NfcAdapter.FLAG_READER_NFC_V or
            NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
            null,
        )
    }

    override fun onPause() {
        super.onPause()
        nfcAdapter?.disableReaderMode(this)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Handle NFC intents from system (when app is in background)
        val tag = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
        }
        tag?.let { NfcWriteQueue.handleTag(it) }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
//  Navigation host
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun AppNavHost(navController: NavHostController) {
    NavHost(
        navController = navController,
        startDestination = Screen.Generator.route,
    ) {
        composable(Screen.Generator.route) {
            GeneratorScreen(
                onNavigateToReader = { navController.navigate(Screen.Reader.route) },
                onNavigateToList   = { navController.navigate(Screen.NfcList.route) },
                onNavigateBack     = { navController.popBackStack() },
            )
        }
        composable(Screen.Reader.route) {
            ReaderScreen(
                onNavigateToGenerator = { navController.navigate(Screen.Generator.route) },
                onNavigateToList      = { navController.navigate(Screen.NfcList.route) },
                onNavigateBack        = { navController.popBackStack() },
            )
        }
        composable(Screen.NfcList.route) {
            NfcListScreen(
                onNavigateBack = { navController.popBackStack() },
            )
        }
    }
}

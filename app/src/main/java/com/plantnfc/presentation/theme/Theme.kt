package com.plantnfc.presentation.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// ── Brand palette (mirrors the web app's green design tokens) ─────────────────
private val Green10  = Color(0xFF002201)
private val Green20  = Color(0xFF003A01)
private val Green30  = Color(0xFF00530A)
private val Green40  = Color(0xFF2F7D32)   // --green
private val Green50  = Color(0xFF388E3C)   // --green-mid
private val Green60  = Color(0xFF4CAF50)   // --green-light
private val Green80  = Color(0xFFA5D6A7)
private val Green90  = Color(0xFFC8E6C9)   // --green-pale2
private val Green95  = Color(0xFFE8F5E9)   // --green-pale
private val Green99  = Color(0xFFF5F8F3)   // --bg

private val Charcoal = Color(0xFF172217)   // --charcoal
private val Muted    = Color(0xFF546354)   // --muted
private val WarmGray = Color(0xFF637263)   // --warm-gray

// ── Light color scheme ────────────────────────────────────────────────────────
private val LightColorScheme = lightColorScheme(
    primary            = Green40,
    onPrimary          = Color.White,
    primaryContainer   = Green90,
    onPrimaryContainer = Green10,

    secondary          = Green50,
    onSecondary        = Color.White,
    secondaryContainer = Green95,
    onSecondaryContainer = Green20,

    tertiary           = Color(0xFF795548),
    onTertiary         = Color.White,
    tertiaryContainer  = Color(0xFFD7CCC8),
    onTertiaryContainer = Color(0xFF3E2723),

    error              = Color(0xFFC62828),
    onError            = Color.White,
    errorContainer     = Color(0xFFFFCDD2),
    onErrorContainer   = Color(0xFFB71C1C),

    background         = Green99,
    onBackground       = Charcoal,
    surface            = Color.White,
    onSurface          = Charcoal,
    surfaceVariant     = Green95,
    onSurfaceVariant   = Muted,
    outline            = Color(0xFFB0BEC5),
    outlineVariant     = Green90,
)

// ── Dark color scheme ─────────────────────────────────────────────────────────
private val DarkColorScheme = darkColorScheme(
    primary            = Green80,
    onPrimary          = Green20,
    primaryContainer   = Green30,
    onPrimaryContainer = Green90,

    secondary          = Green80,
    onSecondary        = Green20,
    secondaryContainer = Color(0xFF1B5E20),
    onSecondaryContainer = Green90,

    tertiary           = Color(0xFFBCAAA4),
    onTertiary         = Color(0xFF3E2723),
    tertiaryContainer  = Color(0xFF4E342E),
    onTertiaryContainer = Color(0xFFD7CCC8),

    error              = Color(0xFFEF9A9A),
    onError            = Color(0xFF7F0000),
    errorContainer     = Color(0xFFC62828),
    onErrorContainer   = Color(0xFFFFCDD2),

    background         = Color(0xFF0D1A0D),
    onBackground       = Green90,
    surface            = Color(0xFF121E12),
    onSurface          = Green90,
    surfaceVariant     = Color(0xFF1E2E1E),
    onSurfaceVariant   = Green80,
    outline            = Color(0xFF4A5E4A),
    outlineVariant     = Color(0xFF2E3E2E),
)

// ── Theme entry point ─────────────────────────────────────────────────────────
@Composable
fun PlantNfcTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,        // Material You on Android 12+
    content: @Composable () -> Unit,
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else      -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography  = PlantNfcTypography,
        shapes      = PlantNfcShapes,
        content     = content,
    )
}

package com.dochub.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
    primary = DocHubBluePrimary,
    onPrimary = Color.White,
    primaryContainer = DocHubBlueLight,
    onPrimaryContainer = DocHubBlueSecondary,
    secondary = DocHubBlueSecondary,
    onSecondary = Color.White,
    background = DocHubBackground,
    onBackground = DocHubTextPrimary,
    surface = DocHubCardBackground,
    onSurface = DocHubTextPrimary,
    surfaceVariant = Color(0xFFF1F5F9),
    onSurfaceVariant = DocHubTextSecondary,
    outline = DocHubBorder
)

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF64B5F6),
    onPrimary = Color(0xFF0D47A1),
    primaryContainer = Color(0xFF1E3A8A),
    onPrimaryContainer = Color(0xFFDBEAFE),
    secondary = Color(0xFF90CAF9),
    onSecondary = Color(0xFF0F172A),
    background = Color(0xFF0F172A),
    onBackground = Color(0xFFF8FAFC),
    surface = Color(0xFF1E293B),
    onSurface = Color(0xFFF8FAFC),
    surfaceVariant = Color(0xFF334155),
    onSurfaceVariant = Color(0xFFCBD5E1),
    outline = Color(0xFF475569)
)

@Composable
fun DocHubTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}

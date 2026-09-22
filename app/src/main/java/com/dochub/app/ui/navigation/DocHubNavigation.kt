package com.dochub.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    object Home : Screen("home", "Home", Icons.Default.Home)
    object Documents : Screen("documents", "Documents", Icons.Default.Folder)
    object Prepare : Screen("prepare", "Prepare", Icons.Default.AutoFixHigh)
    object History : Screen("history", "History", Icons.Default.History)
    object Settings : Screen("settings", "Settings", Icons.Default.Settings)
}

val bottomNavItems = listOf(
    Screen.Home,
    Screen.Documents,
    Screen.Prepare,
    Screen.History,
    Screen.Settings
)

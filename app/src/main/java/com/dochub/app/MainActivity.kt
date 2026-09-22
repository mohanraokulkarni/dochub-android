package com.dochub.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.dochub.app.ui.navigation.Screen
import com.dochub.app.ui.navigation.bottomNavItems
import com.dochub.app.ui.screens.*
import com.dochub.app.ui.theme.DocHubTheme
import com.dochub.app.ui.viewmodel.DocHubViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: DocHubViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            DocHubTheme {
                val isUnlocked by viewModel.isUnlocked.collectAsState()

                if (!isUnlocked) {
                    LockScreen(viewModel = viewModel)
                } else {
                    var currentScreen by remember { mutableStateOf<Screen>(Screen.Home) }

                    Scaffold(
                        modifier = Modifier.fillMaxSize(),
                        bottomBar = {
                            NavigationBar {
                                bottomNavItems.forEach { screen ->
                                    NavigationBarItem(
                                        selected = currentScreen == screen,
                                        onClick = { currentScreen = screen },
                                        icon = { Icon(screen.icon, contentDescription = screen.title) },
                                        label = { Text(screen.title) }
                                    )
                                }
                            }
                        }
                    ) { innerPadding ->
                        Surface(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(innerPadding)
                        ) {
                            when (currentScreen) {
                                Screen.Home -> HomeScreen(
                                    viewModel = viewModel,
                                    onNavigateToDocuments = { currentScreen = Screen.Documents },
                                    onNavigateToPrepare = { currentScreen = Screen.Prepare },
                                    onOpenDocument = { doc ->
                                        viewModel.selectedDocument.value = doc
                                    }
                                )
                                Screen.Documents -> DocumentsScreen(
                                    viewModel = viewModel,
                                    onPrepareDocument = { doc ->
                                        viewModel.selectedDocument.value = doc
                                        currentScreen = Screen.Prepare
                                    }
                                )
                                Screen.Prepare -> PrepareScreen(viewModel = viewModel)
                                Screen.Settings -> SettingsScreen(viewModel = viewModel)
                            }
                        }
                    }
                }
            }
        }
    }
}

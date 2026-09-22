package com.dochub.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dochub.app.security.AppLockManager
import com.dochub.app.ui.viewmodel.DocHubViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(viewModel: DocHubViewModel) {
    val storageBytes by viewModel.storageUsageBytes.collectAsState()
    val documents by viewModel.documents.collectAsState()
    val isGridView by viewModel.isGridView.collectAsState()
    val defaultCategory by viewModel.defaultCategory.collectAsState()
    val lockMode by viewModel.lockMode.collectAsState()
    val statusMessage by viewModel.statusMessage.collectAsState()

    var showPinDialog by remember { mutableStateOf(false) }
    var pinInputValue by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings", fontWeight = FontWeight.Bold) }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Status banner if present
            statusMessage?.let { msg ->
                item {
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = msg,
                            modifier = Modifier.padding(12.dp),
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }
            }

            // 1. Documents Preferences
            item {
                Text("Documents", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Default View", fontWeight = FontWeight.SemiBold)
                                Text("Preferred layout for document browser", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Row {
                                FilterChip(
                                    selected = isGridView,
                                    onClick = { viewModel.setGridView(true) },
                                    label = { Text("Grid") }
                                )
                                Spacer(Modifier.width(6.dp))
                                FilterChip(
                                    selected = !isGridView,
                                    onClick = { viewModel.setGridView(false) },
                                    label = { Text("List") }
                                )
                            }
                        }

                        Divider()

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Default Category", fontWeight = FontWeight.SemiBold)
                                Text("Assigned when importing new items", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text(defaultCategory, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }

            // 2. Privacy & Security
            item {
                Text("Privacy & Security", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Encryption at Rest", fontWeight = FontWeight.SemiBold)
                                Text("Hardware Keystore AES-256-GCM", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Surface(
                                color = MaterialTheme.colorScheme.primaryContainer,
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(
                                    "Active",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }

                        Divider()

                        Column {
                            Text("App Lock", fontWeight = FontWeight.SemiBold)
                            Text("Protect sensitive documents upon opening", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                FilterChip(
                                    selected = lockMode == AppLockManager.MODE_OFF,
                                    onClick = { viewModel.setLockOff() },
                                    label = { Text("Off") }
                                )
                                FilterChip(
                                    selected = lockMode == AppLockManager.MODE_PIN,
                                    onClick = { showPinDialog = true },
                                    label = { Text("PIN") }
                                )
                                FilterChip(
                                    selected = lockMode == AppLockManager.MODE_BIOMETRIC,
                                    onClick = { viewModel.setBiometricLock() },
                                    label = { Text("Biometric") }
                                )
                            }
                        }
                    }
                }
            }

            // 3. Storage Information
            item {
                Text("Storage", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        val mb = storageBytes / (1024.0 * 1024.0)
                        val displaySize = if (mb >= 1.0) String.format("%.2f MB", mb) else String.format("%.1f KB", storageBytes / 1024.0)

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Documents Stored", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("${documents.size}", fontWeight = FontWeight.Bold)
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Device Storage Used", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(displaySize, fontWeight = FontWeight.Bold)
                        }

                        Spacer(Modifier.height(4.dp))

                        OutlinedButton(
                            onClick = { viewModel.clearTemporaryFiles() },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.CleaningServices, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Clear Temporary Files")
                        }
                    }
                }
            }

            // 4. About & Privacy Statement
            item {
                Text("About", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("DocHub", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Text("Version 1.0.0 (Offline Edition)", fontSize = 13.sp)
                        Text(
                            "DocHub is an offline personal document manager. Your files never leave your device. Zero analytics, zero advertising, zero remote storage.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            item { Spacer(Modifier.height(24.dp)) }
        }
    }

    // PIN Setup Dialog
    if (showPinDialog) {
        AlertDialog(
            onDismissRequest = { showPinDialog = false },
            title = { Text("Set 4-6 Digit PIN") },
            text = {
                OutlinedTextField(
                    value = pinInputValue,
                    onValueChange = { if (it.length <= 6) pinInputValue = it },
                    label = { Text("PIN") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (pinInputValue.length >= 4) {
                            viewModel.setPinLock(pinInputValue)
                            showPinDialog = false
                            pinInputValue = ""
                        }
                    },
                    enabled = pinInputValue.length >= 4
                ) {
                    Text("Save PIN")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPinDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

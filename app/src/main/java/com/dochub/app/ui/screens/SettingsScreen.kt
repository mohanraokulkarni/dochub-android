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
import com.dochub.app.ui.viewmodel.DocHubViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(viewModel: DocHubViewModel) {
    val storageBytes by viewModel.storageUsageBytes.collectAsState()
    val presets by viewModel.allPresets.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings & Storage", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
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
            // Storage Information Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Storage, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            Spacer(Modifier.width(12.dp))
                            Text("Local Device Storage", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }

                        Spacer(Modifier.height(12.dp))
                        val kb = storageBytes / 1024.0
                        val mb = kb / 1024.0
                        val displaySize = if (mb >= 1.0) String.format("%.2f MB", mb) else String.format("%.1f KB", kb)

                        Text("Total DocHub Storage Used: $displaySize", fontWeight = FontWeight.SemiBold)
                        Text(
                            "Includes private documents, conversions, and thumbnails.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Spacer(Modifier.height(12.dp))
                        OutlinedButton(
                            onClick = { viewModel.clearTemporaryFiles() },
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(Icons.Default.CleaningServices, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Clear Temporary Cache")
                        }
                    }
                }
            }

            // Presets Summary Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Tune, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            Spacer(Modifier.width(12.dp))
                            Text("Configured Presets (${presets.size})", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                        Spacer(Modifier.height(8.dp))
                        presets.forEach { p ->
                            Text(
                                "• ${p.name}: ${p.outputFormat}, ${p.width}x${p.height}${p.widthUnit}, max ${p.maxFileSizeBytes / 1024} KB",
                                fontSize = 13.sp,
                                modifier = Modifier.padding(vertical = 2.dp)
                            )
                        }
                    }
                }
            }

            // Absolute Offline & Privacy Guarantee Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Security,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                            Spacer(Modifier.width(12.dp))
                            Text(
                                "Privacy & Offline Guarantee",
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "\"Your documents stay on this device.\"\n\nDocHub operates with zero internet requirement, zero cloud storage, zero tracking, and zero remote APIs. All image decoding, resizing, compression, and PDF generation execute strictly inside the Android app private sandbox.",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }
            }

            // About & Architecture
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("About DocHub", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Spacer(Modifier.height(4.dp))
                        Text("Version 1.0.0 (Native Android)", fontSize = 13.sp)
                        Text("Architecture: Jetpack Compose + Room + Coroutines + Android SAF", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("Target SDK: 35 (Android 15+ compatible)", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            item { Spacer(Modifier.height(16.dp)) }
        }
    }
}

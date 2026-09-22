package com.dochub.app.ui.screens

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import com.dochub.app.data.local.entity.PresetEntity
import com.dochub.app.ui.viewmodel.DocHubViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrepareScreen(viewModel: DocHubViewModel) {
    val documents by viewModel.documents.collectAsState()
    val presets by viewModel.allPresets.collectAsState()
    val selectedDoc by viewModel.selectedDocument.collectAsState()
    val selectedPreset by viewModel.selectedPreset.collectAsState()
    val isProcessing by viewModel.isProcessing.collectAsState()
    val prepResult by viewModel.preparationResult.collectAsState()
    val context = LocalContext.current

    // Auto-select first preset if none selected
    LaunchedEffect(presets) {
        if (selectedPreset == null && presets.isNotEmpty()) {
            viewModel.selectedPreset.value = presets.first()
        }
    }

    var showDocSelector by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Prepare Document", fontWeight = FontWeight.Bold) },
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
            // Document Selection Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("1. Select Source Document", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Spacer(Modifier.height(8.dp))

                        if (selectedDoc != null) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp))
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Description, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                                Spacer(Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(selectedDoc!!.displayName, fontWeight = FontWeight.SemiBold, maxLines = 1)
                                    Text(
                                        "${selectedDoc!!.sizeBytes / 1024} KB • .${selectedDoc!!.extension.uppercase()}",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                TextButton(onClick = { showDocSelector = true }) {
                                    Text("Change")
                                }
                            }
                        } else {
                            OutlinedButton(
                                onClick = { showDocSelector = true },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Default.FolderOpen, contentDescription = null)
                                Spacer(Modifier.width(8.dp))
                                Text("Choose from Stored Documents")
                            }
                        }
                    }
                }
            }

            // Preset Selection Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("2. Target Requirement / Preset", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Spacer(Modifier.height(8.dp))

                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            presets.forEach { preset ->
                                val isSelected = selectedPreset?.id == preset.id
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { viewModel.selectedPreset.value = preset },
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
                                    ),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        RadioButton(
                                            selected = isSelected,
                                            onClick = { viewModel.selectedPreset.value = preset }
                                        )
                                        Spacer(Modifier.width(8.dp))
                                        Column {
                                            Text(preset.name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                            Text(
                                                "Target: ${preset.outputFormat} • ${preset.width}x${preset.height}${preset.widthUnit} • Max: ${preset.maxFileSizeBytes / 1024} KB",
                                                fontSize = 12.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Action Button: GET REQUIRED FORMAT
            item {
                Button(
                    onClick = { viewModel.executePreparation() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(12.dp),
                    enabled = selectedDoc != null && selectedPreset != null && !isProcessing
                ) {
                    if (isProcessing) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                        Spacer(Modifier.width(12.dp))
                        Text("Processing locally...")
                    } else {
                        Icon(Icons.Default.AutoFixHigh, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("GET REQUIRED FORMAT", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                }
            }

            // Preparation Result & Pipeline Details (Section 17 specification)
            prepResult?.let { res ->
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = if (res.isSuccess) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.errorContainer
                        ),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    if (res.isSuccess) "✓ PREPARATION COMPLETED" else "FAILED",
                                    fontWeight = FontWeight.Bold,
                                    color = if (res.isSuccess) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                                )
                                if (res.isSuccess) {
                                    Text(
                                        "${res.outputSizeBytes / 1024} KB",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 18.sp
                                    )
                                }
                            }

                            Spacer(Modifier.height(12.dp))

                            // Pipeline Steps
                            res.steps.forEach { step ->
                                Row(
                                    modifier = Modifier.padding(vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        if (step.isCompleted) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                                        contentDescription = null,
                                        tint = if (step.isCompleted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(Modifier.width(8.dp))
                                    Column {
                                        Text(step.name, fontWeight = FontWeight.Medium, fontSize = 13.sp)
                                        Text(
                                            step.description,
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            }

                            if (res.isSuccess && res.outputFile != null) {
                                Spacer(Modifier.height(16.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Button(
                                        onClick = {
                                            val uri = FileProvider.getUriForFile(
                                                context,
                                                "${context.packageName}.fileprovider",
                                                res.outputFile
                                            )
                                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                                type = "*/*"
                                                putExtra(Intent.EXTRA_STREAM, uri)
                                                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                            }
                                            context.startActivity(Intent.createChooser(shareIntent, "Share Prepared Document"))
                                        },
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Icon(Icons.Default.Share, contentDescription = null)
                                        Spacer(Modifier.width(6.dp))
                                        Text("Share")
                                    }
                                }
                            }
                        }
                    }
                }
            }

            item { Spacer(Modifier.height(24.dp)) }
        }
    }

    // Modal Document Picker Dialog
    if (showDocSelector) {
        AlertDialog(
            onDismissRequest = { showDocSelector = false },
            title = { Text("Select Document") },
            text = {
                if (documents.isEmpty()) {
                    Text("No documents stored yet. Import documents from the Documents tab.")
                } else {
                    LazyColumn(modifier = Modifier.heightIn(max = 300.dp)) {
                        items(documents) { doc ->
                            ListItem(
                                headlineContent = { Text(doc.displayName) },
                                supportingContent = { Text("${doc.sizeBytes / 1024} KB • ${doc.category}") },
                                modifier = Modifier.clickable {
                                    viewModel.selectedDocument.value = doc
                                    showDocSelector = false
                                }
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showDocSelector = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

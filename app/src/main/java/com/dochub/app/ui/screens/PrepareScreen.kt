package com.dochub.app.ui.screens

import android.graphics.Color
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dochub.app.data.local.entity.DocumentEntity
import com.dochub.app.ui.viewmodel.DocHubViewModel
import kotlinx.coroutines.launch
import java.io.File

enum class PrepareTool(val title: String, val subtitle: String, val icon: ImageVector) {
    JPG_TO_PNG("JPG → PNG", "Lossless format conversion", Icons.Default.Transform),
    PNG_TO_JPG("PNG → JPG", "Solid background conversion", Icons.Default.SwapHoriz),
    IMAGE_TO_PDF("Image → PDF", "Single or multi-page PDF", Icons.Default.PictureAsPdf),
    PDF_TO_IMAGE("PDF → Image", "Extract pages as images", Icons.Default.Image),
    COMPRESS_IMAGE("Compress Image", "Target file size in KB", Icons.Default.Compress),
    COMPRESS_PDF("Compress PDF", "Optimize document size", Icons.Default.ZoomInMap),
    MERGE_PDF("Merge PDF", "Combine multiple documents", Icons.Default.CallMerge),
    SPLIT_PDF("Split PDF", "Split or extract pages", Icons.Default.CallSplit),
    RENAME("Rename", "Safe display name change", Icons.Default.Edit),
    IMAGE_EDITOR("Image Editor", "Crop, presets & DPI overlay", Icons.Default.Crop)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrepareScreen(viewModel: DocHubViewModel) {
    val documents by viewModel.documents.collectAsState()
    val isProcessing by viewModel.isProcessing.collectAsState()
    val statusMessage by viewModel.statusMessage.collectAsState()
    val coroutineScope = rememberCoroutineScope()

    var activeTool by remember { mutableStateOf<PrepareTool?>(null) }
    var selectedDoc by remember { mutableStateOf<DocumentEntity?>(viewModel.selectedDocument.value) }

    // Parameters for tools
    var targetKbText by remember { mutableStateOf("100") }
    var splitPageText by remember { mutableStateOf("1") }
    var cropAspectRatio by remember { mutableStateOf("1:1") }
    var selectedPresetName by remember { mutableStateOf("Passport Photo (35x45 mm)") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Prepare Document", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                        Text(
                            "Convert, resize, compress and organize your files.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            // Processing or Status indicator
            if (isProcessing) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp))
            }

            statusMessage?.let { msg ->
                Surface(
                    color = MaterialTheme.colorScheme.primaryContainer,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
                ) {
                    Text(
                        msg,
                        modifier = Modifier.padding(10.dp),
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }

            // 10 Clean Action Cards Grid
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(PrepareTool.values()) { tool ->
                    Card(
                        onClick = { activeTool = tool },
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f)
                        ),
                        modifier = Modifier.height(115.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(14.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(36.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        tool.icon,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.onPrimary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }

                            Column {
                                Text(
                                    tool.title,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    tool.subtitle,
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Modal Tool Dialog for SELECT -> CONFIGURE -> PROCESS -> SAVE AS COPY
    activeTool?.let { tool ->
        AlertDialog(
            onDismissRequest = { activeTool = null },
            title = { Text(tool.title, fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(tool.subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)

                    // Step 1: Select Source Document
                    Text("1. Source Document", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)

                    if (documents.isEmpty()) {
                        Text("No documents stored yet. Add a document first.", color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                    } else {
                        var docDropdownExpanded by remember { mutableStateOf(false) }
                        val currentSelection = selectedDoc ?: documents.first()

                        Box {
                            OutlinedButton(
                                onClick = { docDropdownExpanded = true },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(currentSelection.displayName, maxLines = 1)
                            }

                            DropdownMenu(
                                expanded = docDropdownExpanded,
                                onDismissRequest = { docDropdownExpanded = false }
                            ) {
                                documents.forEach { doc ->
                                    DropdownMenuItem(
                                        text = { Text("${doc.displayName} (.${doc.extension})") },
                                        onClick = {
                                            selectedDoc = doc
                                            docDropdownExpanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    // Step 2: Tool Configuration
                    when (tool) {
                        PrepareTool.PNG_TO_JPG -> {
                            Text("Note: JPEG does not support transparency. Transparent areas will be converted to a solid white background.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        PrepareTool.COMPRESS_IMAGE -> {
                            OutlinedTextField(
                                value = targetKbText,
                                onValueChange = { targetKbText = it },
                                label = { Text("Target File Size (KB)") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        PrepareTool.SPLIT_PDF -> {
                            OutlinedTextField(
                                value = splitPageText,
                                onValueChange = { splitPageText = it },
                                label = { Text("Split after Page Number") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        PrepareTool.IMAGE_EDITOR -> {
                            Text("Select Preset:", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                FilterChip(
                                    selected = cropAspectRatio == "1:1",
                                    onClick = { cropAspectRatio = "1:1" },
                                    label = { Text("1:1") }
                                )
                                FilterChip(
                                    selected = cropAspectRatio == "35:45",
                                    onClick = { cropAspectRatio = "35:45" },
                                    label = { Text("Passport") }
                                )
                                FilterChip(
                                    selected = cropAspectRatio == "Free",
                                    onClick = { cropAspectRatio = "Free" },
                                    label = { Text("Free") }
                                )
                            }
                        }
                        else -> {
                            Text("Operation will process offline and create a verified encrypted copy.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val doc = selectedDoc ?: documents.firstOrNull()
                        if (doc != null) {
                            coroutineScope.launch {
                                val sourceFile = File(doc.localPath)
                                when (tool) {
                                    PrepareTool.JPG_TO_PNG -> {
                                        val res = viewModel.imageProcessor.convertFormat(sourceFile, "PNG")
                                        if (res.success) {
                                            viewModel.saveAsCopy(res.outputFile, "${doc.displayName}_png", "png", "image/png", doc.category)
                                        }
                                    }
                                    PrepareTool.PNG_TO_JPG -> {
                                        val res = viewModel.imageProcessor.convertFormat(sourceFile, "JPG", Color.WHITE)
                                        if (res.success) {
                                            viewModel.saveAsCopy(res.outputFile, "${doc.displayName}_jpg", "jpg", "image/jpeg", doc.category)
                                        }
                                    }
                                    PrepareTool.IMAGE_TO_PDF -> {
                                        val res = viewModel.pdfProcessor.imagesToPdf(listOf(sourceFile), outputBaseName = "${doc.displayName}_pdf")
                                        if (res.success && res.outputFiles.isNotEmpty()) {
                                            viewModel.saveAsCopy(res.outputFiles.first(), "${doc.displayName}_pdf", "pdf", "application/pdf", doc.category)
                                        }
                                    }
                                    PrepareTool.PDF_TO_IMAGE -> {
                                        val res = viewModel.pdfProcessor.pdfToImages(sourceFile, outputBaseName = "${doc.displayName}_page")
                                        if (res.success && res.outputFiles.isNotEmpty()) {
                                            viewModel.saveAsCopy(res.outputFiles.first(), "${doc.displayName}_page1", "jpg", "image/jpeg", doc.category)
                                        }
                                    }
                                    PrepareTool.COMPRESS_IMAGE -> {
                                        val targetBytes = (targetKbText.toLongOrNull() ?: 100L) * 1024L
                                        val res = viewModel.imageProcessor.compressToTargetSize(sourceFile, maxFileSizeBytes = targetBytes, baseOutputName = "${doc.displayName}_compressed")
                                        if (res.success) {
                                            viewModel.saveAsCopy(res.outputFile, "${doc.displayName}_compressed", res.outputFile.extension, "image/jpeg", doc.category)
                                        }
                                    }
                                    PrepareTool.MERGE_PDF -> {
                                        val res = viewModel.pdfProcessor.mergePdfs(listOf(sourceFile), outputBaseName = "${doc.displayName}_merged")
                                        if (res.success && res.outputFiles.isNotEmpty()) {
                                            viewModel.saveAsCopy(res.outputFiles.first(), "${doc.displayName}_merged", "pdf", "application/pdf", doc.category)
                                        }
                                    }
                                    PrepareTool.SPLIT_PDF -> {
                                        val page = splitPageText.toIntOrNull() ?: 1
                                        val res = viewModel.pdfProcessor.splitPdf(sourceFile, page, outputBaseName = "${doc.displayName}")
                                        if (res.success && res.outputFiles.isNotEmpty()) {
                                            viewModel.saveAsCopy(res.outputFiles.first(), "${doc.displayName}_part1", "pdf", "application/pdf", doc.category)
                                        }
                                    }
                                    PrepareTool.IMAGE_EDITOR -> {
                                        val res = viewModel.imageProcessor.cropImage(sourceFile, 0, 0, 600, 600, "JPG", "${doc.displayName}_edited")
                                        if (res.success) {
                                            viewModel.saveAsCopy(res.outputFile, "${doc.displayName}_preset", "jpg", "image/jpeg", doc.category)
                                        }
                                    }
                                    else -> {}
                                }
                            }
                        }
                        activeTool = null
                    },
                    enabled = documents.isNotEmpty()
                ) {
                    Text("Save as Copy")
                }
            },
            dismissButton = {
                TextButton(onClick = { activeTool = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

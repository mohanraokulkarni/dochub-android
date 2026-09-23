package com.dochub.app.ui.screens

import android.graphics.Color
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import com.dochub.app.data.local.entity.PresetEntity
import com.dochub.app.engine.PdfProcessor
import com.dochub.app.engine.SmartPreparer
import com.dochub.app.ui.viewmodel.DocHubViewModel
import kotlinx.coroutines.launch
import java.io.File

enum class PrepareTool(val title: String, val subtitle: String, val icon: ImageVector) {
    SMART_PRESET("Application Presets", "Govt/Passport/Exam auto-formatter", Icons.Default.AutoFixHigh),
    JPG_TO_PNG("JPG → PNG", "Lossless format conversion", Icons.Default.Transform),
    PNG_TO_JPG("PNG → JPG", "Solid background conversion", Icons.Default.SwapHoriz),
    IMAGE_TO_PDF("Image → PDF", "Single or multi-page PDF", Icons.Default.PictureAsPdf),
    PDF_TO_IMAGE("PDF → Image", "Extract pages as images", Icons.Default.Image),
    COMPRESS_IMAGE("Compress Image", "Target file size in KB", Icons.Default.Compress),
    COMPRESS_PDF("Compress PDF", "Optimize document size", Icons.Default.ZoomInMap),
    MERGE_PDF("Merge PDF", "Combine multiple documents", Icons.Default.CallMerge),
    SPLIT_PDF("Split PDF", "Split or extract pages", Icons.Default.CallSplit),
    ROTATE_IMAGE("Rotate Image", "90°, 180°, or 270° orientation", Icons.Default.RotateRight),
    RESIZE_IMAGE("Resize Image", "Custom width & height in px", Icons.Default.AspectRatio),
    IMAGE_CROP("Crop Image", "Passport & standard aspect ratios", Icons.Default.Crop)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrepareScreen(viewModel: DocHubViewModel) {
    val documents by viewModel.documents.collectAsState()
    val isProcessing by viewModel.isProcessing.collectAsState()
    val statusMessage by viewModel.statusMessage.collectAsState()
    val presets by viewModel.presets.collectAsState()
    val coroutineScope = rememberCoroutineScope()

    var activeTool by remember { mutableStateOf<PrepareTool?>(null) }
    var selectedDoc by remember { mutableStateOf<DocumentEntity?>(viewModel.selectedDocument.value) }

    // Parameters for tools
    var targetKbText by remember { mutableStateOf("100") }
    var splitPageText by remember { mutableStateOf("1") }
    var rotateDegrees by remember { mutableStateOf(90f) }
    var resizeWidthText by remember { mutableStateOf("800") }
    var resizeHeightText by remember { mutableStateOf("600") }
    var cropAspectRatio by remember { mutableStateOf("1:1") }
    var selectedPreset by remember { mutableStateOf<PresetEntity?>(null) }
    var selectedPdfStandard by remember { mutableStateOf(PdfProcessor.PageStandard.A4) }
    var selectedMergeDocIds by remember { mutableStateOf(setOf<Long>()) }
    var smartResultDialog by remember { mutableStateOf<SmartPreparer.PreparationResult?>(null) }

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

            // 12 Tools Grid
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(PrepareTool.values()) { tool ->
                    Card(
                        onClick = {
                            activeTool = tool
                            // Initialize preset selection if opening smart presets
                            if (tool == PrepareTool.SMART_PRESET && presets.isNotEmpty() && selectedPreset == null) {
                                selectedPreset = presets.first()
                            }
                            // Initialize merge selection
                            if (tool == PrepareTool.MERGE_PDF) {
                                val currentDoc = selectedDoc ?: documents.firstOrNull { it.extension.equals("pdf", true) }
                                selectedMergeDocIds = if (currentDoc != null) setOf(currentDoc.id) else emptySet()
                            }
                        },
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f)
                        ),
                        modifier = Modifier.height(118.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(14.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = if (tool == PrepareTool.SMART_PRESET) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(36.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        tool.icon,
                                        contentDescription = null,
                                        tint = if (tool == PrepareTool.SMART_PRESET) MaterialTheme.colorScheme.onTertiary else MaterialTheme.colorScheme.onPrimary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }

                            Column {
                                Text(
                                    tool.title,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    maxLines = 1
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
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(tool.subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)

                    if (documents.isEmpty()) {
                        Text("No documents stored yet. Add a document first.", color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                    } else if (tool == PrepareTool.MERGE_PDF) {
                        // Multi-selection for Merge PDF
                        Text("Select PDFs to Merge (at least 2):", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        val pdfDocs = documents.filter { it.extension.equals("pdf", true) }
                        if (pdfDocs.isEmpty()) {
                            Text("No PDF documents found in library.", color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                        } else {
                            pdfDocs.forEach { pdfDoc ->
                                val isChecked = selectedMergeDocIds.contains(pdfDoc.id)
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            selectedMergeDocIds = if (isChecked) {
                                                selectedMergeDocIds - pdfDoc.id
                                            } else {
                                                selectedMergeDocIds + pdfDoc.id
                                            }
                                        }
                                        .padding(vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Checkbox(
                                        checked = isChecked,
                                        onCheckedChange = { checked ->
                                            selectedMergeDocIds = if (checked) {
                                                selectedMergeDocIds + pdfDoc.id
                                            } else {
                                                selectedMergeDocIds - pdfDoc.id
                                            }
                                        }
                                    )
                                    Spacer(Modifier.width(8.dp))
                                    Column {
                                        Text(pdfDoc.displayName, fontWeight = FontWeight.Medium, fontSize = 13.sp)
                                        Text("${pdfDoc.sizeBytes / 1024} KB", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                        }
                    } else {
                        // Step 1: Select Source Document
                        Text("1. Source Document", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
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

                    // Step 2: Tool Specific Configuration
                    when (tool) {
                        PrepareTool.SMART_PRESET -> {
                            Text("2. Target Requirement Preset", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            presets.forEach { preset ->
                                val isSelected = selectedPreset?.id == preset.id
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { selectedPreset = preset }
                                        .padding(vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    RadioButton(
                                        selected = isSelected,
                                        onClick = { selectedPreset = preset }
                                    )
                                    Spacer(Modifier.width(8.dp))
                                    Column {
                                        Text(preset.name, fontWeight = FontWeight.Medium, fontSize = 13.sp)
                                        Text(
                                            "${preset.width}x${preset.height} ${preset.widthUnit} • Max ${preset.maxFileSizeBytes / 1024} KB • ${preset.outputFormat}",
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            }
                        }

                        PrepareTool.PNG_TO_JPG -> {
                            Text(
                                "Note: JPEG does not support transparency. Transparent areas will be converted to a solid white background.",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        PrepareTool.IMAGE_TO_PDF -> {
                            Text("Page Size Standard:", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                FilterChip(
                                    selected = selectedPdfStandard == PdfProcessor.PageStandard.A4,
                                    onClick = { selectedPdfStandard = PdfProcessor.PageStandard.A4 },
                                    label = { Text("A4") }
                                )
                                FilterChip(
                                    selected = selectedPdfStandard == PdfProcessor.PageStandard.LETTER,
                                    onClick = { selectedPdfStandard = PdfProcessor.PageStandard.LETTER },
                                    label = { Text("Letter") }
                                )
                                FilterChip(
                                    selected = selectedPdfStandard == PdfProcessor.PageStandard.A3,
                                    onClick = { selectedPdfStandard = PdfProcessor.PageStandard.A3 },
                                    label = { Text("A3") }
                                )
                            }
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

                        PrepareTool.COMPRESS_PDF -> {
                            Text(
                                "Re-renders PDF pages with optimized quality and DPI to reduce file footprint.",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
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

                        PrepareTool.ROTATE_IMAGE -> {
                            Text("Rotation Angle:", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                FilterChip(
                                    selected = rotateDegrees == 90f,
                                    onClick = { rotateDegrees = 90f },
                                    label = { Text("90° CW") }
                                )
                                FilterChip(
                                    selected = rotateDegrees == 180f,
                                    onClick = { rotateDegrees = 180f },
                                    label = { Text("180°") }
                                )
                                FilterChip(
                                    selected = rotateDegrees == 270f,
                                    onClick = { rotateDegrees = 270f },
                                    label = { Text("270° CW") }
                                )
                            }
                        }

                        PrepareTool.RESIZE_IMAGE -> {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                OutlinedTextField(
                                    value = resizeWidthText,
                                    onValueChange = { resizeWidthText = it },
                                    label = { Text("Width (px)") },
                                    singleLine = true,
                                    modifier = Modifier.weight(1f)
                                )
                                OutlinedTextField(
                                    value = resizeHeightText,
                                    onValueChange = { resizeHeightText = it },
                                    label = { Text("Height (px)") },
                                    singleLine = true,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }

                        PrepareTool.IMAGE_CROP -> {
                            Text("Crop Aspect Ratio:", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                FilterChip(
                                    selected = cropAspectRatio == "1:1",
                                    onClick = { cropAspectRatio = "1:1" },
                                    label = { Text("1:1") }
                                )
                                FilterChip(
                                    selected = cropAspectRatio == "35:45",
                                    onClick = { cropAspectRatio = "35:45" },
                                    label = { Text("Passport (35:45)") }
                                )
                                FilterChip(
                                    selected = cropAspectRatio == "4:3",
                                    onClick = { cropAspectRatio = "4:3" },
                                    label = { Text("4:3") }
                                )
                            }
                        }

                        else -> {
                            Text(
                                "Operation will process offline and create a verified encrypted copy.",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val currentTool = tool
                        val doc = selectedDoc ?: documents.firstOrNull()
                        activeTool = null

                        coroutineScope.launch {
                            if (currentTool == PrepareTool.MERGE_PDF) {
                                val selectedPdfFiles = documents
                                    .filter { selectedMergeDocIds.contains(it.id) }
                                    .map { File(it.localPath) }

                                if (selectedPdfFiles.size >= 2) {
                                    val res = viewModel.pdfProcessor.mergePdfs(
                                        selectedPdfFiles,
                                        outputBaseName = "Merged_Document"
                                    )
                                    if (res.success && res.outputFiles.isNotEmpty()) {
                                        viewModel.saveAsCopy(
                                            res.outputFiles.first(),
                                            "Merged_Document",
                                            "pdf",
                                            "application/pdf",
                                            "Personal"
                                        )
                                        viewModel.recordConversion(
                                            sourcePath = selectedPdfFiles.first().absolutePath,
                                            outputPath = res.outputFiles.first().absolutePath,
                                            operation = "MERGE PDF",
                                            parameters = "Combined ${selectedPdfFiles.size} PDFs",
                                            status = "SUCCESS",
                                            originalSizeBytes = selectedPdfFiles.sumOf { it.length() },
                                            outputSizeBytes = res.outputFiles.first().length()
                                        )
                                    }
                                }
                                return@launch
                            }

                            if (doc != null) {
                                val sourceFile = File(doc.localPath)
                                when (currentTool) {
                                    PrepareTool.SMART_PRESET -> {
                                        val targetPreset = selectedPreset ?: presets.firstOrNull()
                                        if (targetPreset != null) {
                                            val result = viewModel.smartPreparer.prepareDocumentWithPreset(sourceFile, targetPreset)
                                            smartResultDialog = result
                                            if (result.isSuccess && result.outputFile != null) {
                                                viewModel.saveAsCopy(
                                                    result.outputFile,
                                                    "${doc.displayName}_${targetPreset.name.replace(" ", "_")}",
                                                    result.outputFile.extension,
                                                    if (result.outputFile.extension.equals("pdf", true)) "application/pdf" else "image/jpeg",
                                                    doc.category
                                                )
                                            }
                                        }
                                    }

                                    PrepareTool.JPG_TO_PNG -> {
                                        val res = viewModel.imageProcessor.convertFormat(sourceFile, "PNG")
                                        if (res.success) {
                                            viewModel.saveAsCopy(res.outputFile, "${doc.displayName}_png", "png", "image/png", doc.category)
                                            viewModel.recordConversion(
                                                sourcePath = sourceFile.absolutePath,
                                                outputPath = res.outputFile.absolutePath,
                                                operation = "JPG -> PNG",
                                                parameters = "Format: PNG",
                                                status = "SUCCESS",
                                                originalSizeBytes = sourceFile.length(),
                                                outputSizeBytes = res.outputSizeBytes
                                            )
                                        }
                                    }

                                    PrepareTool.PNG_TO_JPG -> {
                                        val res = viewModel.imageProcessor.convertFormat(sourceFile, "JPG", Color.WHITE)
                                        if (res.success) {
                                            viewModel.saveAsCopy(res.outputFile, "${doc.displayName}_jpg", "jpg", "image/jpeg", doc.category)
                                            viewModel.recordConversion(
                                                sourcePath = sourceFile.absolutePath,
                                                outputPath = res.outputFile.absolutePath,
                                                operation = "PNG -> JPG",
                                                parameters = "Format: JPG (White background)",
                                                status = "SUCCESS",
                                                originalSizeBytes = sourceFile.length(),
                                                outputSizeBytes = res.outputSizeBytes
                                            )
                                        }
                                    }

                                    PrepareTool.IMAGE_TO_PDF -> {
                                        val res = viewModel.pdfProcessor.imagesToPdf(
                                            listOf(sourceFile),
                                            pageStandard = selectedPdfStandard,
                                            outputBaseName = "${doc.displayName}_pdf"
                                        )
                                        if (res.success && res.outputFiles.isNotEmpty()) {
                                            viewModel.saveAsCopy(res.outputFiles.first(), "${doc.displayName}_pdf", "pdf", "application/pdf", doc.category)
                                            viewModel.recordConversion(
                                                sourcePath = sourceFile.absolutePath,
                                                outputPath = res.outputFiles.first().absolutePath,
                                                operation = "IMAGE -> PDF",
                                                parameters = "Page Standard: ${selectedPdfStandard.name}",
                                                status = "SUCCESS",
                                                originalSizeBytes = sourceFile.length(),
                                                outputSizeBytes = res.outputFiles.first().length()
                                            )
                                        }
                                    }

                                    PrepareTool.PDF_TO_IMAGE -> {
                                        val res = viewModel.pdfProcessor.pdfToImages(sourceFile, outputBaseName = "${doc.displayName}_page")
                                        if (res.success && res.outputFiles.isNotEmpty()) {
                                            res.outputFiles.forEachIndexed { idx, outImg ->
                                                viewModel.saveAsCopy(outImg, "${doc.displayName}_page${idx + 1}", "jpg", "image/jpeg", doc.category)
                                            }
                                            viewModel.recordConversion(
                                                sourcePath = sourceFile.absolutePath,
                                                outputPath = res.outputFiles.first().absolutePath,
                                                operation = "PDF -> IMAGE",
                                                parameters = "Extracted ${res.outputFiles.size} pages",
                                                status = "SUCCESS",
                                                originalSizeBytes = sourceFile.length(),
                                                outputSizeBytes = res.totalSizeBytes
                                            )
                                        }
                                    }

                                    PrepareTool.COMPRESS_IMAGE -> {
                                        val targetBytes = (targetKbText.toLongOrNull() ?: 100L) * 1024L
                                        val res = viewModel.imageProcessor.compressToTargetSize(
                                            sourceFile = sourceFile,
                                            maxFileSizeBytes = targetBytes,
                                            baseOutputName = "${doc.displayName}_compressed"
                                        )
                                        if (res.success) {
                                            viewModel.saveAsCopy(res.outputFile, "${doc.displayName}_compressed", res.outputFile.extension, "image/jpeg", doc.category)
                                            viewModel.recordConversion(
                                                sourcePath = sourceFile.absolutePath,
                                                outputPath = res.outputFile.absolutePath,
                                                operation = "COMPRESS IMAGE",
                                                parameters = "Target: ${targetKbText} KB, Output: ${res.outputSizeBytes / 1024} KB",
                                                status = "SUCCESS",
                                                originalSizeBytes = sourceFile.length(),
                                                outputSizeBytes = res.outputSizeBytes
                                            )
                                        }
                                    }

                                    PrepareTool.COMPRESS_PDF -> {
                                        val res = viewModel.pdfProcessor.compressPdf(sourceFile, scaleFactor = 0.85f, quality = 75, outputBaseName = "${doc.displayName}_compressed")
                                        if (res.success && res.outputFiles.isNotEmpty()) {
                                            viewModel.saveAsCopy(res.outputFiles.first(), "${doc.displayName}_compressed", "pdf", "application/pdf", doc.category)
                                            viewModel.recordConversion(
                                                sourcePath = sourceFile.absolutePath,
                                                outputPath = res.outputFiles.first().absolutePath,
                                                operation = "COMPRESS PDF",
                                                parameters = "Quality: 75%",
                                                status = "SUCCESS",
                                                originalSizeBytes = sourceFile.length(),
                                                outputSizeBytes = res.outputFiles.first().length()
                                            )
                                        }
                                    }

                                    PrepareTool.SPLIT_PDF -> {
                                        val page = splitPageText.toIntOrNull() ?: 1
                                        val res = viewModel.pdfProcessor.splitPdf(sourceFile, page, outputBaseName = "${doc.displayName}")
                                        if (res.success && res.outputFiles.isNotEmpty()) {
                                            res.outputFiles.forEachIndexed { i, f ->
                                                viewModel.saveAsCopy(f, "${doc.displayName}_part${i + 1}", "pdf", "application/pdf", doc.category)
                                            }
                                            viewModel.recordConversion(
                                                sourcePath = sourceFile.absolutePath,
                                                outputPath = res.outputFiles.first().absolutePath,
                                                operation = "SPLIT PDF",
                                                parameters = "Split after page $page",
                                                status = "SUCCESS",
                                                originalSizeBytes = sourceFile.length(),
                                                outputSizeBytes = res.totalSizeBytes
                                            )
                                        }
                                    }

                                    PrepareTool.ROTATE_IMAGE -> {
                                        val res = viewModel.imageProcessor.rotateImage(sourceFile, rotateDegrees, "${doc.displayName}_rotated")
                                        if (res.success) {
                                            viewModel.saveAsCopy(res.outputFile, "${doc.displayName}_rotated", res.outputFile.extension, "image/jpeg", doc.category)
                                            viewModel.recordConversion(
                                                sourcePath = sourceFile.absolutePath,
                                                outputPath = res.outputFile.absolutePath,
                                                operation = "ROTATE IMAGE",
                                                parameters = "Degrees: ${rotateDegrees.toInt()}°",
                                                status = "SUCCESS",
                                                originalSizeBytes = sourceFile.length(),
                                                outputSizeBytes = res.outputSizeBytes
                                            )
                                        }
                                    }

                                    PrepareTool.RESIZE_IMAGE -> {
                                        val w = resizeWidthText.toIntOrNull() ?: 800
                                        val h = resizeHeightText.toIntOrNull() ?: 600
                                        val res = viewModel.imageProcessor.resizeImage(sourceFile, w, h, baseOutputName = "${doc.displayName}_resized")
                                        if (res.success) {
                                            viewModel.saveAsCopy(res.outputFile, "${doc.displayName}_resized", res.outputFile.extension, "image/jpeg", doc.category)
                                            viewModel.recordConversion(
                                                sourcePath = sourceFile.absolutePath,
                                                outputPath = res.outputFile.absolutePath,
                                                operation = "RESIZE IMAGE",
                                                parameters = "Dimensions: ${w}x${h}px",
                                                status = "SUCCESS",
                                                originalSizeBytes = sourceFile.length(),
                                                outputSizeBytes = res.outputSizeBytes
                                            )
                                        }
                                    }

                                    PrepareTool.IMAGE_CROP -> {
                                        val dims = viewModel.imageProcessor.getImageDimensions(sourceFile)
                                        val srcW = dims?.width ?: 1000
                                        val srcH = dims?.height ?: 1000

                                        val (targetW, targetH) = when (cropAspectRatio) {
                                            "1:1" -> {
                                                val side = minOf(srcW, srcH)
                                                Pair(side, side)
                                            }
                                            "35:45" -> {
                                                // 35:45 ratio
                                                val unit = minOf(srcW / 35, srcH / 45)
                                                Pair(unit * 35, unit * 45)
                                            }
                                            else -> {
                                                // 4:3 ratio
                                                val unit = minOf(srcW / 4, srcH / 3)
                                                Pair(unit * 4, unit * 3)
                                            }
                                        }

                                        val left = (srcW - targetW) / 2
                                        val top = (srcH - targetH) / 2

                                        val res = viewModel.imageProcessor.cropImage(
                                            sourceFile = sourceFile,
                                            cropLeft = left,
                                            cropTop = top,
                                            cropWidth = targetW,
                                            cropHeight = targetH,
                                            baseOutputName = "${doc.displayName}_cropped"
                                        )
                                        if (res.success) {
                                            viewModel.saveAsCopy(res.outputFile, "${doc.displayName}_cropped", res.outputFile.extension, "image/jpeg", doc.category)
                                            viewModel.recordConversion(
                                                sourcePath = sourceFile.absolutePath,
                                                outputPath = res.outputFile.absolutePath,
                                                operation = "CROP IMAGE",
                                                parameters = "Aspect: $cropAspectRatio (${targetW}x${targetH}px)",
                                                status = "SUCCESS",
                                                originalSizeBytes = sourceFile.length(),
                                                outputSizeBytes = res.outputSizeBytes
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    },
                    enabled = (tool != PrepareTool.MERGE_PDF && documents.isNotEmpty()) ||
                            (tool == PrepareTool.MERGE_PDF && selectedMergeDocIds.size >= 2)
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

    // Smart Preset Preparation Step-by-Step Result Dialog
    smartResultDialog?.let { result ->
        AlertDialog(
            onDismissRequest = { smartResultDialog = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        if (result.isSuccess) Icons.Default.CheckCircle else Icons.Default.Error,
                        contentDescription = null,
                        tint = if (result.isSuccess) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(if (result.isSuccess) "Preset Preparation Complete" else "Preset Preparation Incomplete")
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(result.summary, fontSize = 13.sp)
                    Divider(modifier = Modifier.padding(vertical = 4.dp))
                    Text("Executed Steps:", fontWeight = FontWeight.SemiBold, fontSize = 12.sp)

                    result.steps.forEach { step ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(vertical = 2.dp)
                        ) {
                            Icon(
                                if (step.isCompleted) Icons.Default.Check else Icons.Default.Close,
                                contentDescription = null,
                                tint = if (step.isCompleted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(Modifier.width(6.dp))
                            Column {
                                Text(step.name, fontWeight = FontWeight.Medium, fontSize = 12.sp)
                                Text(
                                    step.error ?: step.description,
                                    fontSize = 11.sp,
                                    color = if (step.error != null) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(onClick = { smartResultDialog = null }) {
                    Text("OK")
                }
            }
        )
    }
}

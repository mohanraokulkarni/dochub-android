package com.dochub.app.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.StarOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import com.dochub.app.data.local.entity.DocumentEntity
import com.dochub.app.ui.viewmodel.DocHubViewModel
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentsScreen(
    viewModel: DocHubViewModel,
    onPrepareDocument: (DocumentEntity) -> Unit
) {
    val documents by viewModel.documents.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val selectedCategory by viewModel.selectedCategory.collectAsState()
    val onlyFavorites by viewModel.onlyFavorites.collectAsState()
    val isGridView by viewModel.isGridView.collectAsState()
    val sortBy by viewModel.sortBy.collectAsState()
    val context = LocalContext.current

    var activeDetailDoc by remember { mutableStateOf<DocumentEntity?>(null) }
    var renameDoc by remember { mutableStateOf<DocumentEntity?>(null) }
    var newRenameText by remember { mutableStateOf("") }
    var deleteConfirmDoc by remember { mutableStateOf<DocumentEntity?>(null) }
    var sortMenuExpanded by remember { mutableStateOf(false) }

    // SAF Import Picker
    val importPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri ->
        uri?.let { viewModel.importDocument(it, category = if (selectedCategory == "All") null else selectedCategory) }
    }

    // SAF Export Launcher (ACTION_CREATE_DOCUMENT)
    var docToExport by remember { mutableStateOf<DocumentEntity?>(null) }
    val exportLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("*/*")
    ) { targetUri ->
        targetUri?.let { uri ->
            docToExport?.let { doc ->
                viewModel.exportDocument(doc, uri)
            }
        }
        docToExport = null
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Documents", fontWeight = FontWeight.Bold) },
                actions = {
                    // Grid / List toggle
                    IconButton(onClick = { viewModel.setGridView(!isGridView) }) {
                        Icon(
                            if (isGridView) Icons.Default.ViewList else Icons.Default.GridView,
                            contentDescription = if (isGridView) "Switch to List" else "Switch to Grid"
                        )
                    }

                    // Sort menu
                    Box {
                        IconButton(onClick = { sortMenuExpanded = true }) {
                            Icon(Icons.Default.Sort, contentDescription = "Sort")
                        }
                        DropdownMenu(
                            expanded = sortMenuExpanded,
                            onDismissRequest = { sortMenuExpanded = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Newest first") },
                                onClick = {
                                    viewModel.setSortOption(DocHubViewModel.SortOption.NEWEST)
                                    sortMenuExpanded = false
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Oldest first") },
                                onClick = {
                                    viewModel.setSortOption(DocHubViewModel.SortOption.OLDEST)
                                    sortMenuExpanded = false
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Name (A-Z)") },
                                onClick = {
                                    viewModel.setSortOption(DocHubViewModel.SortOption.NAME)
                                    sortMenuExpanded = false
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Largest size") },
                                onClick = {
                                    viewModel.setSortOption(DocHubViewModel.SortOption.LARGEST)
                                    sortMenuExpanded = false
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Smallest size") },
                                onClick = {
                                    viewModel.setSortOption(DocHubViewModel.SortOption.SMALLEST)
                                    sortMenuExpanded = false
                                }
                            )
                        }
                    }

                    // Add Document
                    IconButton(onClick = { importPickerLauncher.launch(arrayOf("*/*")) }) {
                        Icon(Icons.Default.Add, contentDescription = "Add Document")
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
            // Search Input
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { viewModel.searchQuery.value = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Search by name, category, or tag...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { viewModel.searchQuery.value = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear")
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(Modifier.height(10.dp))

            // Categories & Favorites Filter Row
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                item {
                    FilterChip(
                        selected = onlyFavorites,
                        onClick = { viewModel.onlyFavorites.value = !onlyFavorites },
                        label = { Text("Favorites") },
                        leadingIcon = {
                            Icon(
                                if (onlyFavorites) Icons.Default.Star else Icons.Outlined.StarOutline,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    )
                }

                items(viewModel.categories) { cat ->
                    FilterChip(
                        selected = selectedCategory == cat,
                        onClick = { viewModel.selectedCategory.value = cat },
                        label = { Text(cat) }
                    )
                }
            }

            Spacer(Modifier.height(8.dp))

            // Count summary
            Text(
                "${documents.size} stored documents",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(Modifier.height(8.dp))

            // Empty state
            if (documents.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(bottom = 60.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.FolderOpen,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.outline,
                            modifier = Modifier.size(56.dp)
                        )
                        Spacer(Modifier.height(12.dp))
                        Text(
                            "No documents yet",
                            fontWeight = FontWeight.Bold,
                            fontSize = 17.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "Add your important documents and keep them organized in one place.",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 32.dp),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        Spacer(Modifier.height(16.dp))
                        Button(
                            onClick = { importPickerLauncher.launch(arrayOf("*/*")) },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null)
                            Spacer(Modifier.width(6.dp))
                            Text("Add Document")
                        }
                    }
                }
            } else {
                if (isGridView) {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(documents, key = { it.id }) { doc ->
                            DocumentGridCard(
                                document = doc,
                                onClick = { activeDetailDoc = doc },
                                onToggleFavorite = { viewModel.toggleFavorite(doc) }
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(documents, key = { it.id }) { doc ->
                            DocumentListRow(
                                document = doc,
                                onClick = { activeDetailDoc = doc },
                                onToggleFavorite = { viewModel.toggleFavorite(doc) }
                            )
                        }
                    }
                }
            }
        }
    }

    // Detail Dialog
    activeDetailDoc?.let { doc ->
        AlertDialog(
            onDismissRequest = { activeDetailDoc = null },
            title = {
                Text(
                    doc.displayName,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Preview indicator
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(120.dp),
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    if (doc.extension.equals("pdf", true)) Icons.Default.PictureAsPdf else Icons.Default.Image,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(48.dp)
                                )
                                Spacer(Modifier.height(6.dp))
                                Text(
                                    if (doc.extension.equals("pdf", true) || doc.extension in listOf("jpg", "jpeg", "png", "webp"))
                                        "Stored in Encrypted Vault"
                                    else
                                        "This file cannot be previewed inside DocHub",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    Spacer(Modifier.height(4.dp))
                    Text("Category: ${doc.category}", fontSize = 13.sp)
                    Text("Format: .${doc.extension.uppercase()} (${doc.mimeType})", fontSize = 13.sp)
                    Text("File Size: ${doc.sizeBytes / 1024} KB", fontSize = 13.sp)
                    val dateStr = SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.getDefault()).format(Date(doc.updatedAt))
                    Text("Modified: $dateStr", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            },
            confirmButton = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    TextButton(
                        onClick = {
                            activeDetailDoc = null
                            deleteConfirmDoc = doc
                        },
                        colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)
                    ) {
                        Text("Delete")
                    }

                    Row {
                        TextButton(onClick = {
                            activeDetailDoc = null
                            newRenameText = doc.displayName
                            renameDoc = doc
                        }) {
                            Text("Rename")
                        }

                        TextButton(onClick = {
                            activeDetailDoc = null
                            docToExport = doc
                            exportLauncher.launch("${doc.displayName}.${doc.extension}")
                        }) {
                            Text("Export")
                        }

                        Button(onClick = {
                            activeDetailDoc = null
                            onPrepareDocument(doc)
                        }) {
                            Text("Prepare")
                        }
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { activeDetailDoc = null }) {
                    Text("Close")
                }
            }
        )
    }

    // Rename Dialog
    renameDoc?.let { doc ->
        AlertDialog(
            onDismissRequest = { renameDoc = null },
            title = { Text("Rename Document") },
            text = {
                Column {
                    OutlinedTextField(
                        value = newRenameText,
                        onValueChange = { newRenameText = it },
                        label = { Text("Display Name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(6.dp))
                    Text("Extension: .${doc.extension}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (newRenameText.isNotBlank()) {
                        viewModel.renameDocument(doc, newRenameText)
                    }
                    renameDoc = null
                }) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { renameDoc = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Delete Confirmation Dialog
    deleteConfirmDoc?.let { doc ->
        AlertDialog(
            onDismissRequest = { deleteConfirmDoc = null },
            title = { Text("Delete Document?") },
            text = { Text("Are you sure you want to permanently delete \"${doc.displayName}\"? This action cannot be undone.") },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteDocument(doc)
                        deleteConfirmDoc = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { deleteConfirmDoc = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun DocumentGridCard(
    document: DocumentEntity,
    onClick: () -> Unit,
    onToggleFavorite: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (document.extension.equals("pdf", true)) {
                        MaterialTheme.colorScheme.errorContainer
                    } else {
                        MaterialTheme.colorScheme.primaryContainer
                    },
                    modifier = Modifier.size(36.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            if (document.extension.equals("pdf", true)) Icons.Default.PictureAsPdf else Icons.Default.Image,
                            contentDescription = null,
                            tint = if (document.extension.equals("pdf", true)) {
                                MaterialTheme.colorScheme.onErrorContainer
                            } else {
                                MaterialTheme.colorScheme.onPrimaryContainer
                            },
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                IconButton(
                    onClick = onToggleFavorite,
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        if (document.favorite) Icons.Default.Star else Icons.Outlined.StarOutline,
                        contentDescription = "Favorite",
                        tint = if (document.favorite) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(Modifier.height(10.dp))

            Text(
                document.displayName,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(Modifier.height(2.dp))

            Text(
                ".${document.extension.uppercase()} • ${document.sizeBytes / 1024} KB",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(Modifier.height(2.dp))

            Text(
                document.category,
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}

@Composable
fun DocumentListRow(
    document: DocumentEntity,
    onClick: () -> Unit,
    onToggleFavorite: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = if (document.extension.equals("pdf", true)) {
                    MaterialTheme.colorScheme.errorContainer
                } else {
                    MaterialTheme.colorScheme.primaryContainer
                },
                modifier = Modifier.size(40.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        if (document.extension.equals("pdf", true)) Icons.Default.PictureAsPdf else Icons.Default.Image,
                        contentDescription = null,
                        tint = if (document.extension.equals("pdf", true)) {
                            MaterialTheme.colorScheme.onErrorContainer
                        } else {
                            MaterialTheme.colorScheme.onPrimaryContainer
                        },
                        modifier = Modifier.size(22.dp)
                    )
                }
            }

            Spacer(Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    document.displayName,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    "${document.category} • .${document.extension.uppercase()} • ${document.sizeBytes / 1024} KB",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            IconButton(onClick = onToggleFavorite) {
                Icon(
                    if (document.favorite) Icons.Default.Star else Icons.Outlined.StarOutline,
                    contentDescription = "Favorite",
                    tint = if (document.favorite) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

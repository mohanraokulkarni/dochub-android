package com.dochub.app.ui.screens

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import com.dochub.app.data.local.entity.DocumentEntity
import com.dochub.app.ui.viewmodel.DocHubViewModel
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentsScreen(
    viewModel: DocHubViewModel,
    onPrepareDocument: (DocumentEntity) -> Unit
) {
    val documents by viewModel.documents.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val selectedCategory by viewModel.selectedCategory.collectAsState()
    val context = LocalContext.current

    val documentPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri ->
        uri?.let { viewModel.importDocument(it, category = if (selectedCategory == "All") "Personal" else selectedCategory) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Documents Store", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { documentPickerLauncher.launch(arrayOf("*/*")) }) {
                        Icon(Icons.Default.Add, contentDescription = "Import Document")
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
            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { viewModel.searchQuery.value = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Search by name, category, tag or extension...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { viewModel.searchQuery.value = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = null)
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(Modifier.height(12.dp))

            // Category Chips Row
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(viewModel.categories) { cat ->
                    FilterChip(
                        selected = selectedCategory == cat,
                        onClick = { viewModel.selectedCategory.value = cat },
                        label = { Text(cat) }
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            // Results count
            Text(
                "${documents.size} documents found",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(Modifier.height(8.dp))

            if (documents.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.FolderOpen,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.outline
                        )
                        Spacer(Modifier.height(8.dp))
                        Text("No matching documents found", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(8.dp))
                        Button(onClick = { documentPickerLauncher.launch(arrayOf("*/*")) }) {
                            Text("Import Document")
                        }
                    }
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(documents, key = { it.id }) { doc ->
                        DocumentItemCard(
                            document = doc,
                            onToggleFavorite = { viewModel.toggleFavorite(doc) },
                            onPrepare = { onPrepareDocument(doc) },
                            onDelete = { viewModel.deleteDocument(doc) },
                            onShare = {
                                val file = File(doc.localPath)
                                if (file.exists()) {
                                    val uri = FileProvider.getUriForFile(
                                        context,
                                        "${context.packageName}.fileprovider",
                                        file
                                    )
                                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                        type = doc.mimeType
                                        putExtra(Intent.EXTRA_STREAM, uri)
                                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                    }
                                    context.startActivity(Intent.createChooser(shareIntent, "Share Document"))
                                }
                            }
                        )
                    }
                    item { Spacer(Modifier.height(16.dp)) }
                }
            }
        }
    }
}

@Composable
fun DocumentItemCard(
    document: DocumentEntity,
    onToggleFavorite: () -> Unit,
    onPrepare: () -> Unit,
    onDelete: () -> Unit,
    onShare: () -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                if (document.extension.equals("pdf", true)) Icons.Default.PictureAsPdf else Icons.Default.Image,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(36.dp)
            )

            Spacer(Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(document.displayName, fontWeight = FontWeight.SemiBold, maxLines = 1)
                Spacer(Modifier.height(2.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    SuggestionChip(
                        onClick = {},
                        label = { Text(document.category, fontSize = 10.sp) },
                        modifier = Modifier.height(24.dp)
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        "${document.sizeBytes / 1024} KB • .${document.extension.uppercase()}",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            IconButton(onClick = onToggleFavorite) {
                Icon(
                    if (document.favorite) Icons.Default.Star else Icons.Default.StarBorder,
                    contentDescription = "Favorite",
                    tint = if (document.favorite) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                )
            }

            Box {
                IconButton(onClick = { showMenu = true }) {
                    Icon(Icons.Default.MoreVert, contentDescription = "Options")
                }
                DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                    DropdownMenuItem(
                        text = { Text("Prepare / Convert") },
                        leadingIcon = { Icon(Icons.Default.AutoFixHigh, contentDescription = null) },
                        onClick = { showMenu = false; onPrepare() }
                    )
                    DropdownMenuItem(
                        text = { Text("Share") },
                        leadingIcon = { Icon(Icons.Default.Share, contentDescription = null) },
                        onClick = { showMenu = false; onShare() }
                    )
                    Divider()
                    DropdownMenuItem(
                        text = { Text("Delete", color = MaterialTheme.colorScheme.error) },
                        leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error) },
                        onClick = { showMenu = false; onDelete() }
                    )
                }
            }
        }
    }
}

package com.dochub.app.ui.viewmodel

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.dochub.app.DocHubApplication
import com.dochub.app.data.local.entity.ConversionHistoryEntity
import com.dochub.app.data.local.entity.DocumentEntity
import com.dochub.app.data.local.entity.PresetEntity
import com.dochub.app.engine.SmartPreparer
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.io.File

class DocHubViewModel(application: Application) : AndroidViewModel(application) {

    private val app = application as DocHubApplication
    private val docRepo = app.documentRepository
    private val historyRepo = app.historyRepository
    private val presetRepo = app.presetRepository
    private val fileManager = app.fileManager
    private val smartPreparer = app.smartPreparer
    private val imageProcessor = app.imageProcessor
    private val pdfProcessor = app.pdfProcessor

    // State: Search & Filters
    val searchQuery = MutableStateFlow("")
    val selectedCategory = MutableStateFlow("All")

    val categories = listOf(
        "All", "Identity", "Education", "Employment",
        "Finance", "Government", "Travel", "Personal", "Other"
    )

    // Flow: Documents filtered by search & category
    val documents: StateFlow<List<DocumentEntity>> = combine(
        docRepo.allDocuments,
        searchQuery,
        selectedCategory
    ) { allDocs, query, category ->
        var list = allDocs
        if (category != "All") {
            list = list.filter { it.category.equals(category, ignoreCase = true) }
        }
        if (query.isNotBlank()) {
            val q = query.trim().lowercase()
            list = list.filter {
                it.displayName.lowercase().contains(q) ||
                it.originalName.lowercase().contains(q) ||
                it.tags.lowercase().contains(q) ||
                it.extension.lowercase().contains(q) ||
                it.mimeType.lowercase().contains(q)
            }
        }
        list
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val recentDocuments = docRepo.recentDocuments.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val recentHistory = historyRepo.recentHistory.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val allHistory = historyRepo.allHistory.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val allPresets = presetRepo.allPresets.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Prepare state
    val selectedDocument = MutableStateFlow<DocumentEntity?>(null)
    val selectedPreset = MutableStateFlow<PresetEntity?>(null)
    val preparationResult = MutableStateFlow<SmartPreparer.PreparationResult?>(null)
    val isProcessing = MutableStateFlow(false)
    val statusMessage = MutableStateFlow<String?>(null)

    // Storage stats
    val storageUsageBytes = MutableStateFlow(0L)

    init {
        refreshStorageUsage()
    }

    fun refreshStorageUsage() {
        viewModelScope.launch {
            storageUsageBytes.value = fileManager.getTotalStorageUsage()
        }
    }

    /**
     * Imports document from SAF content:// URI safely
     */
    fun importDocument(uri: Uri, category: String = "Personal", tags: String = "") {
        viewModelScope.launch {
            try {
                isProcessing.value = true
                statusMessage.value = "Importing document safely..."

                val imported = fileManager.importFromUri(app.contentResolver, uri)
                val entity = DocumentEntity(
                    originalName = imported.originalName,
                    displayName = imported.displayName,
                    localPath = imported.localPath,
                    mimeType = imported.mimeType,
                    extension = imported.extension,
                    sizeBytes = imported.sizeBytes,
                    category = category,
                    tags = tags
                )
                docRepo.insertDocument(entity)
                refreshStorageUsage()
                statusMessage.value = "Imported: ${imported.displayName}"
            } catch (e: Exception) {
                statusMessage.value = "Import failed: ${e.message}"
            } finally {
                isProcessing.value = false
            }
        }
    }

    fun executePreparation() {
        val doc = selectedDocument.value ?: return
        val preset = selectedPreset.value ?: return

        viewModelScope.launch {
            try {
                isProcessing.value = true
                statusMessage.value = "Executing ${preset.name} preparation..."
                val file = File(doc.localPath)
                if (!file.exists()) {
                    statusMessage.value = "Error: Original document file not found at ${doc.localPath}"
                    return@launch
                }

                val result = smartPreparer.prepareDocumentWithPreset(file, preset)
                preparationResult.value = result
                refreshStorageUsage()
                statusMessage.value = if (result.isSuccess) "Preparation complete!" else "Preparation failed"
            } catch (e: Exception) {
                statusMessage.value = "Process error: ${e.message}"
            } finally {
                isProcessing.value = false
            }
        }
    }

    fun toggleFavorite(document: DocumentEntity) {
        viewModelScope.launch {
            docRepo.toggleFavorite(document)
        }
    }

    fun deleteDocument(document: DocumentEntity) {
        viewModelScope.launch {
            docRepo.deleteDocument(document)
            refreshStorageUsage()
        }
    }

    fun clearHistory() {
        viewModelScope.launch {
            historyRepo.clearHistory()
        }
    }

    fun clearTemporaryFiles() {
        viewModelScope.launch {
            val freed = fileManager.clearTemporaryFiles()
            refreshStorageUsage()
            statusMessage.value = "Freed ${freed / 1024} KB temporary cache"
        }
    }
}

package com.dochub.app.ui.viewmodel

import android.app.Application
import android.content.Context
import android.graphics.Color
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.dochub.app.DocHubApplication
import com.dochub.app.data.local.entity.ConversionHistoryEntity
import com.dochub.app.data.local.entity.DocumentEntity
import com.dochub.app.data.local.entity.PresetEntity
import com.dochub.app.engine.ImageProcessor
import com.dochub.app.engine.PdfProcessor
import com.dochub.app.engine.SmartPreparer
import com.dochub.app.security.AppLockManager
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.io.File

class DocHubViewModel(application: Application) : AndroidViewModel(application) {

    private val app = application as DocHubApplication
    private val docRepo = app.documentRepository
    private val historyRepo = app.historyRepository
    private val presetRepo = app.presetRepository
    val fileManager = app.fileManager
    val appLockManager = app.appLockManager
    val imageProcessor = app.imageProcessor
    val pdfProcessor = app.pdfProcessor
    private val smartPreparer = app.smartPreparer

    private val prefs = application.getSharedPreferences("dochub_ui_prefs", Context.MODE_PRIVATE)

    // View Preferences
    val isGridView = MutableStateFlow(prefs.getBoolean("is_grid_view", true))
    val defaultCategory = MutableStateFlow(prefs.getString("default_category", "Personal") ?: "Personal")

    // Sort Options
    enum class SortOption {
        NEWEST, OLDEST, NAME, LARGEST, SMALLEST
    }
    val sortBy = MutableStateFlow(
        try {
            SortOption.valueOf(prefs.getString("sort_by", SortOption.NEWEST.name) ?: SortOption.NEWEST.name)
        } catch (_: Exception) {
            SortOption.NEWEST
        }
    )

    // App Lock State
    val lockMode = MutableStateFlow(appLockManager.getLockMode())
    val isUnlocked = MutableStateFlow(!appLockManager.isLockEnabled() || appLockManager.isUnlocked)

    // Search & Filters
    val searchQuery = MutableStateFlow("")
    val selectedCategory = MutableStateFlow("All")
    val onlyFavorites = MutableStateFlow(false)

    val categories = listOf(
        "All", "Identity", "Education", "Employment",
        "Finance", "Government", "Travel", "Insurance",
        "Personal", "Photos", "Certificates", "Uncategorized", "Other"
    )

    // Flow: Documents filtered & sorted
    val documents: StateFlow<List<DocumentEntity>> = combine(
        docRepo.allDocuments,
        searchQuery,
        selectedCategory,
        onlyFavorites,
        sortBy
    ) { allDocs, query, category, favoritesOnly, sort ->
        var list = allDocs

        if (favoritesOnly) {
            list = list.filter { it.favorite }
        }

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
                it.category.lowercase().contains(q)
            }
        }

        when (sort) {
            SortOption.NEWEST -> list.sortedByDescending { it.createdAt }
            SortOption.OLDEST -> list.sortedBy { it.createdAt }
            SortOption.NAME -> list.sortedBy { it.displayName.lowercase() }
            SortOption.LARGEST -> list.sortedByDescending { it.sizeBytes }
            SortOption.SMALLEST -> list.sortedBy { it.sizeBytes }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val recentDocuments = docRepo.recentDocuments.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val allPresets = presetRepo.allPresets.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val allHistory: StateFlow<List<ConversionHistoryEntity>> = historyRepo.allHistory
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Prepare & Selection State
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

    fun setGridView(grid: Boolean) {
        isGridView.value = grid
        prefs.edit().putBoolean("is_grid_view", grid).apply()
    }

    fun setSortOption(sort: SortOption) {
        sortBy.value = sort
        prefs.edit().putString("sort_by", sort.name).apply()
    }

    fun setDefaultCategoryPref(cat: String) {
        defaultCategory.value = cat
        prefs.edit().putString("default_category", cat).apply()
    }

    fun refreshStorageUsage() {
        viewModelScope.launch {
            storageUsageBytes.value = fileManager.getTotalStorageUsage()
        }
    }

    // App Lock Actions
    fun unlockWithPin(pin: String): Boolean {
        val success = appLockManager.verifyPin(pin)
        if (success) {
            isUnlocked.value = true
        }
        return success
    }

    fun unlockWithBiometric() {
        appLockManager.isUnlocked = true
        isUnlocked.value = true
    }

    fun setLockOff() {
        appLockManager.setLockModeOff()
        lockMode.value = AppLockManager.MODE_OFF
        isUnlocked.value = true
    }

    fun setPinLock(pin: String) {
        appLockManager.setPin(pin)
        lockMode.value = AppLockManager.MODE_PIN
        isUnlocked.value = true
    }

    fun setBiometricLock() {
        appLockManager.setBiometricMode()
        lockMode.value = AppLockManager.MODE_BIOMETRIC
        isUnlocked.value = true
    }

    /**
     * Imports document from SAF content:// URI with hardware-backed AES-256-GCM encryption.
     */
    fun importDocument(uri: Uri, category: String? = null, tags: String = "") {
        viewModelScope.launch {
            try {
                isProcessing.value = true
                statusMessage.value = "Importing & encrypting document..."

                val targetCategory = category ?: defaultCategory.value
                val imported = fileManager.importFromUri(app.contentResolver, uri)
                val entity = DocumentEntity(
                    originalName = imported.originalName,
                    displayName = imported.displayName,
                    localPath = imported.localPath,
                    mimeType = imported.mimeType,
                    extension = imported.extension,
                    sizeBytes = imported.sizeBytes,
                    category = targetCategory,
                    tags = tags,
                    encrypted = imported.encrypted
                )
                docRepo.insertDocument(entity)
                refreshStorageUsage()
                statusMessage.value = "Safely saved: ${imported.displayName}"
            } catch (e: Exception) {
                statusMessage.value = "Import failed: ${e.message}"
            } finally {
                isProcessing.value = false
            }
        }
    }

    /**
     * Safely renames document, updating both disk reference and Room database.
     */
    fun renameDocument(document: DocumentEntity, newDisplayName: String) {
        viewModelScope.launch {
            try {
                if (newDisplayName.isBlank()) return@launch
                val file = File(document.localPath)
                if (file.exists()) {
                    val renamedFile = fileManager.renameDocumentFile(file, newDisplayName.trim())
                    val updated = document.copy(
                        displayName = newDisplayName.trim(),
                        localPath = renamedFile.absolutePath,
                        updatedAt = System.currentTimeMillis()
                    )
                    docRepo.updateDocument(updated)
                    statusMessage.value = "Renamed to ${newDisplayName.trim()}"
                }
            } catch (e: Exception) {
                statusMessage.value = "Rename failed: ${e.message}"
            }
        }
    }

    /**
     * Updates document category and tags.
     */
    fun updateCategoryAndTags(document: DocumentEntity, newCategory: String, newTags: String) {
        viewModelScope.launch {
            try {
                val updated = document.copy(
                    category = newCategory.trim(),
                    tags = newTags.trim(),
                    updatedAt = System.currentTimeMillis()
                )
                docRepo.updateDocument(updated)
                statusMessage.value = "Updated document details"
            } catch (e: Exception) {
                statusMessage.value = "Update failed: ${e.message}"
            }
        }
    }

    /**
     * Exports an encrypted document to user-selected SAF Uri.
     */
    fun exportDocument(document: DocumentEntity, targetUri: Uri) {
        viewModelScope.launch {
            try {
                isProcessing.value = true
                statusMessage.value = "Exporting document..."
                val file = File(document.localPath)
                if (!file.exists()) {
                    statusMessage.value = "Error: File does not exist"
                    return@launch
                }
                fileManager.exportToUri(app.contentResolver, file, targetUri)
                statusMessage.value = "Exported successfully"
            } catch (e: Exception) {
                statusMessage.value = "Export failed: ${e.message}"
            } finally {
                isProcessing.value = false
            }
        }
    }

    /**
     * Saves a generated copy into encrypted storage and adds to Room DB.
     */
    fun saveAsCopy(sourceFile: File, displayName: String, extension: String, mimeType: String, category: String = "Personal") {
        viewModelScope.launch {
            try {
                isProcessing.value = true
                val imported = fileManager.importLocalFileAsEncrypted(
                    sourceFile = sourceFile,
                    displayName = displayName,
                    extension = extension,
                    mimeType = mimeType
                )
                val entity = DocumentEntity(
                    originalName = imported.originalName,
                    displayName = imported.displayName,
                    localPath = imported.localPath,
                    mimeType = imported.mimeType,
                    extension = imported.extension,
                    sizeBytes = imported.sizeBytes,
                    category = category,
                    encrypted = true
                )
                docRepo.insertDocument(entity)
                refreshStorageUsage()
                statusMessage.value = "Saved as copy: ${imported.displayName}"
                // Clean temporary source file
                sourceFile.delete()
            } catch (e: Exception) {
                statusMessage.value = "Save as copy failed: ${e.message}"
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
            fileManager.deleteFile(document.localPath)
            docRepo.deleteDocument(document)
            refreshStorageUsage()
            statusMessage.value = "Document deleted"
        }
    }

    fun clearTemporaryFiles() {
        viewModelScope.launch {
            val freed = fileManager.clearTemporaryFiles()
            refreshStorageUsage()
            statusMessage.value = "Freed ${freed / 1024} KB temporary files"
        }
    }

    fun clearHistory() {
        viewModelScope.launch {
            historyRepo.clearHistory()
            statusMessage.value = "Conversion history cleared"
        }
    }

    fun recordConversion(
        sourcePath: String,
        outputPath: String,
        operation: String,
        parameters: String,
        status: String,
        originalSizeBytes: Long,
        outputSizeBytes: Long
    ) {
        viewModelScope.launch {
            historyRepo.recordConversion(
                ConversionHistoryEntity(
                    sourcePath = sourcePath,
                    outputPath = outputPath,
                    operation = operation,
                    parameters = parameters,
                    status = status,
                    originalSizeBytes = originalSizeBytes,
                    outputSizeBytes = outputSizeBytes
                )
            )
        }
    }

    fun deleteHistory(item: ConversionHistoryEntity) {
        viewModelScope.launch {
            historyRepo.deleteHistory(item)
        }
    }
}

package com.dochub.app

import android.app.Application
import com.dochub.app.data.local.DocHubDatabase
import com.dochub.app.data.repository.DocumentRepository
import com.dochub.app.data.repository.HistoryRepository
import com.dochub.app.data.repository.PresetRepository
import com.dochub.app.data.storage.FileManager
import com.dochub.app.engine.ImageProcessor
import com.dochub.app.engine.PdfProcessor
import com.dochub.app.engine.SmartPreparer
import com.dochub.app.security.AppLockManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob

class DocHubApplication : Application() {

    val applicationScope = CoroutineScope(SupervisorJob())

    val database by lazy { DocHubDatabase.getDatabase(this, applicationScope) }
    val fileManager by lazy { FileManager(this) }
    val appLockManager by lazy { AppLockManager(this) }

    val documentRepository by lazy { DocumentRepository(database.documentDao()) }
    val historyRepository by lazy { HistoryRepository(database.conversionHistoryDao()) }
    val presetRepository by lazy { PresetRepository(database.presetDao()) }

    val imageProcessor by lazy { ImageProcessor(fileManager) }
    val pdfProcessor by lazy { PdfProcessor(fileManager) }
    val smartPreparer by lazy {
        SmartPreparer(imageProcessor, pdfProcessor, historyRepository, fileManager)
    }

    override fun onCreate() {
        super.onCreate()
        // Ensure app private directories are created
        fileManager
    }
}

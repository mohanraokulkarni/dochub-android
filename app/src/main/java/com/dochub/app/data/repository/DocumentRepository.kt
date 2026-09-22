package com.dochub.app.data.repository

import com.dochub.app.data.local.dao.DocumentDao
import com.dochub.app.data.local.entity.DocumentEntity
import kotlinx.coroutines.flow.Flow
import java.io.File

class DocumentRepository(private val documentDao: DocumentDao) {

    val allDocuments: Flow<List<DocumentEntity>> = documentDao.getAllDocuments()
    val favoriteDocuments: Flow<List<DocumentEntity>> = documentDao.getFavoriteDocuments()
    val recentDocuments: Flow<List<DocumentEntity>> = documentDao.getRecentDocuments(6)

    fun searchDocuments(query: String): Flow<List<DocumentEntity>> {
        return documentDao.searchDocuments(query.trim())
    }

    fun getDocumentsByCategory(category: String): Flow<List<DocumentEntity>> {
        return documentDao.getDocumentsByCategory(category)
    }

    suspend fun getDocumentById(id: Long): DocumentEntity? {
        return documentDao.getDocumentById(id)
    }

    suspend fun insertDocument(document: DocumentEntity): Long {
        return documentDao.insertDocument(document)
    }

    suspend fun updateDocument(document: DocumentEntity) {
        documentDao.updateDocument(document.copy(updatedAt = System.currentTimeMillis()))
    }

    suspend fun deleteDocument(document: DocumentEntity) {
        // Delete actual local file
        try {
            val file = File(document.localPath)
            if (file.exists()) {
                file.delete()
            }
        } catch (_: Exception) {}
        documentDao.deleteDocument(document)
    }

    suspend fun toggleFavorite(document: DocumentEntity) {
        documentDao.updateDocument(document.copy(favorite = !document.favorite, updatedAt = System.currentTimeMillis()))
    }
}

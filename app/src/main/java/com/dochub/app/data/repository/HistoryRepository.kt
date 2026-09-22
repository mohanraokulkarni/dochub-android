package com.dochub.app.data.repository

import com.dochub.app.data.local.dao.ConversionHistoryDao
import com.dochub.app.data.local.entity.ConversionHistoryEntity
import kotlinx.coroutines.flow.Flow
import java.io.File

class HistoryRepository(private val historyDao: ConversionHistoryDao) {

    val allHistory: Flow<List<ConversionHistoryEntity>> = historyDao.getAllHistory()
    val recentHistory: Flow<List<ConversionHistoryEntity>> = historyDao.getRecentHistory(5)

    suspend fun recordConversion(history: ConversionHistoryEntity): Long {
        return historyDao.insertHistory(history)
    }

    suspend fun deleteHistory(history: ConversionHistoryEntity) {
        historyDao.deleteHistory(history)
    }

    suspend fun clearHistory(deleteFiles: Boolean = false) {
        if (deleteFiles) {
            // Can optionally remove output files if desired
        }
        historyDao.clearAllHistory()
    }
}

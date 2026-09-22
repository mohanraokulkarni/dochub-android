package com.dochub.app.data.local.dao

import androidx.room.*
import com.dochub.app.data.local.entity.ConversionHistoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ConversionHistoryDao {
    @Query("SELECT * FROM conversion_history ORDER BY createdAt DESC")
    fun getAllHistory(): Flow<List<ConversionHistoryEntity>>

    @Query("SELECT * FROM conversion_history ORDER BY createdAt DESC LIMIT :limit")
    fun getRecentHistory(limit: Int = 5): Flow<List<ConversionHistoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHistory(history: ConversionHistoryEntity): Long

    @Delete
    suspend fun deleteHistory(history: ConversionHistoryEntity)

    @Query("DELETE FROM conversion_history")
    suspend fun clearAllHistory()
}

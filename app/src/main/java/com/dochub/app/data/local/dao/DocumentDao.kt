package com.dochub.app.data.local.dao

import androidx.room.*
import com.dochub.app.data.local.entity.DocumentEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DocumentDao {
    @Query("SELECT * FROM documents ORDER BY createdAt DESC")
    fun getAllDocuments(): Flow<List<DocumentEntity>>

    @Query("SELECT * FROM documents WHERE id = :id")
    suspend fun getDocumentById(id: Long): DocumentEntity?

    @Query("SELECT * FROM documents WHERE category = :category ORDER BY createdAt DESC")
    fun getDocumentsByCategory(category: String): Flow<List<DocumentEntity>>

    @Query("""
        SELECT * FROM documents 
        WHERE displayName LIKE '%' || :query || '%' 
           OR originalName LIKE '%' || :query || '%' 
           OR tags LIKE '%' || :query || '%' 
           OR category LIKE '%' || :query || '%' 
           OR extension LIKE '%' || :query || '%' 
           OR mimeType LIKE '%' || :query || '%'
        ORDER BY createdAt DESC
    """)
    fun searchDocuments(query: String): Flow<List<DocumentEntity>>

    @Query("SELECT * FROM documents WHERE favorite = 1 ORDER BY createdAt DESC")
    fun getFavoriteDocuments(): Flow<List<DocumentEntity>>

    @Query("SELECT * FROM documents ORDER BY createdAt DESC LIMIT :limit")
    fun getRecentDocuments(limit: Int = 5): Flow<List<DocumentEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDocument(document: DocumentEntity): Long

    @Update
    suspend fun updateDocument(document: DocumentEntity)

    @Delete
    suspend fun deleteDocument(document: DocumentEntity)

    @Query("DELETE FROM documents WHERE id = :id")
    suspend fun deleteById(id: Long)
}

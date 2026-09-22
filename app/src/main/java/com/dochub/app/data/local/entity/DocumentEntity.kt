package com.dochub.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "documents")
data class DocumentEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val originalName: String,
    val displayName: String,
    val localPath: String,
    val mimeType: String,
    val extension: String,
    val sizeBytes: Long,
    val category: String = "Personal",
    val tags: String = "", // Comma-separated
    val favorite: Boolean = false,
    val encrypted: Boolean = true,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

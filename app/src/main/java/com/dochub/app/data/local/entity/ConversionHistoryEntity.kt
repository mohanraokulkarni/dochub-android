package com.dochub.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "conversion_history")
data class ConversionHistoryEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val sourcePath: String,
    val outputPath: String,
    val operation: String,
    val parameters: String, // JSON or descriptive string
    val status: String,    // "SUCCESS" or "FAILED"
    val originalSizeBytes: Long = 0,
    val outputSizeBytes: Long = 0,
    val createdAt: Long = System.currentTimeMillis()
)

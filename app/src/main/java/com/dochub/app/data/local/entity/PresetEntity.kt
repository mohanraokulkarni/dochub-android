package com.dochub.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "presets")
data class PresetEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val documentType: String = "Photo", // Photo, Signature, Document, Certificate
    val outputFormat: String = "JPG",   // JPG, PNG, PDF
    val width: Int = 600,
    val height: Int = 800,
    val widthUnit: String = "px",       // px, mm, cm, in
    val heightUnit: String = "px",
    val dpi: Int = 300,
    val maxFileSizeBytes: Long = 100 * 1024L, // 100 KB
    val quality: Int = 85,
    val notes: String = "",
    val isSystemPreset: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

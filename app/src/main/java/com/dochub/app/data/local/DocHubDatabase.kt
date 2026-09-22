package com.dochub.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import com.dochub.app.data.local.dao.ConversionHistoryDao
import com.dochub.app.data.local.dao.DocumentDao
import com.dochub.app.data.local.dao.PresetDao
import com.dochub.app.data.local.entity.ConversionHistoryEntity
import com.dochub.app.data.local.entity.DocumentEntity
import com.dochub.app.data.local.entity.PresetEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [
        DocumentEntity::class,
        ConversionHistoryEntity::class,
        PresetEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class DocHubDatabase : RoomDatabase() {
    abstract fun documentDao(): DocumentDao
    abstract fun conversionHistoryDao(): ConversionHistoryDao
    abstract fun presetDao(): PresetDao

    companion object {
        @Volatile
        private var INSTANCE: DocHubDatabase? = null

        fun getDatabase(context: Context, scope: CoroutineScope): DocHubDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    DocHubDatabase::class.java,
                    "dochub_database.db"
                )
                .addCallback(DatabaseCallback(scope))
                .build()
                INSTANCE = instance
                instance
            }
        }

        private class DatabaseCallback(
            private val scope: CoroutineScope
        ) : RoomDatabase.Callback() {
            override fun onCreate(db: SupportSQLiteDatabase) {
                super.onCreate(db)
                INSTANCE?.let { database ->
                    scope.launch(Dispatchers.IO) {
                        seedPresets(database.presetDao())
                    }
                }
            }

            suspend fun seedPresets(dao: PresetDao) {
                val initialPresets = listOf(
                    PresetEntity(
                        name = "Passport Photo",
                        documentType = "Photo",
                        outputFormat = "JPG",
                        width = 600,
                        height = 800,
                        widthUnit = "px",
                        heightUnit = "px",
                        dpi = 300,
                        maxFileSizeBytes = 100 * 1024L, // 100 KB
                        quality = 85,
                        notes = "Standard passport size specification: JPG, 600x800, max 100KB",
                        isSystemPreset = true
                    ),
                    PresetEntity(
                        name = "Signature Spec",
                        documentType = "Signature",
                        outputFormat = "JPG",
                        width = 400,
                        height = 200,
                        widthUnit = "px",
                        heightUnit = "px",
                        dpi = 200,
                        maxFileSizeBytes = 50 * 1024L, // 50 KB
                        quality = 90,
                        notes = "Exam & portal digital signature upload: max 50KB",
                        isSystemPreset = true
                    ),
                    PresetEntity(
                        name = "Exam Photo ID",
                        documentType = "Photo",
                        outputFormat = "JPG",
                        width = 450,
                        height = 600,
                        widthUnit = "px",
                        heightUnit = "px",
                        dpi = 200,
                        maxFileSizeBytes = 200 * 1024L, // 200 KB
                        quality = 80,
                        notes = "Competitive exam portal photo format",
                        isSystemPreset = true
                    ),
                    PresetEntity(
                        name = "Resume / CV (Compact PDF)",
                        documentType = "Document",
                        outputFormat = "PDF",
                        width = 595,
                        height = 842,
                        widthUnit = "px",
                        heightUnit = "px",
                        dpi = 150,
                        maxFileSizeBytes = 500 * 1024L, // 500 KB
                        quality = 80,
                        notes = "Standard A4 compressed PDF for job applications",
                        isSystemPreset = true
                    )
                )
                dao.insertAll(initialPresets)
            }
        }
    }
}

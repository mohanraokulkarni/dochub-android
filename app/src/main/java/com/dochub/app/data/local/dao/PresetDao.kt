package com.dochub.app.data.local.dao

import androidx.room.*
import com.dochub.app.data.local.entity.PresetEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PresetDao {
    @Query("SELECT * FROM presets ORDER BY isSystemPreset DESC, name ASC")
    fun getAllPresets(): Flow<List<PresetEntity>>

    @Query("SELECT * FROM presets WHERE id = :id")
    suspend fun getPresetById(id: Long): PresetEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPreset(preset: PresetEntity): Long

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAll(presets: List<PresetEntity>)

    @Update
    suspend fun updatePreset(preset: PresetEntity)

    @Delete
    suspend fun deletePreset(preset: PresetEntity)
}

package com.dochub.app.data.repository

import com.dochub.app.data.local.dao.PresetDao
import com.dochub.app.data.local.entity.PresetEntity
import kotlinx.coroutines.flow.Flow

class PresetRepository(private val presetDao: PresetDao) {

    val allPresets: Flow<List<PresetEntity>> = presetDao.getAllPresets()

    suspend fun getPresetById(id: Long): PresetEntity? {
        return presetDao.getPresetById(id)
    }

    suspend fun insertPreset(preset: PresetEntity): Long {
        return presetDao.insertPreset(preset)
    }

    suspend fun updatePreset(preset: PresetEntity) {
        presetDao.updatePreset(preset.copy(updatedAt = System.currentTimeMillis()))
    }

    suspend fun deletePreset(preset: PresetEntity) {
        presetDao.deletePreset(preset)
    }
}

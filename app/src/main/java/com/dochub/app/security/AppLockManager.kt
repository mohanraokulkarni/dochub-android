package com.dochub.app.security

import android.content.Context
import android.content.SharedPreferences
import java.security.MessageDigest

/**
 * Manages Optional Privacy App Lock (Off, PIN, Biometric).
 * Non-mandatory, strictly local, zero remote verification.
 */
class AppLockManager(private val context: Context) {

    companion object {
        private const val PREFS_NAME = "dochub_privacy_lock_prefs"
        private const val KEY_LOCK_MODE = "key_lock_mode"
        private const val KEY_PIN_HASH = "key_pin_hash"
        private const val KEY_PIN_SALT = "key_pin_salt"

        const val MODE_OFF = "OFF"
        const val MODE_PIN = "PIN"
        const val MODE_BIOMETRIC = "BIOMETRIC"
    }

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // In-memory unlocked state for the current session
    var isUnlocked: Boolean = false

    fun getLockMode(): String {
        return prefs.getString(KEY_LOCK_MODE, MODE_OFF) ?: MODE_OFF
    }

    fun isLockEnabled(): Boolean {
        return getLockMode() != MODE_OFF
    }

    fun setLockModeOff() {
        prefs.edit().putString(KEY_LOCK_MODE, MODE_OFF).apply()
        isUnlocked = true
    }

    fun setPin(pin: String) {
        val salt = java.util.UUID.randomUUID().toString()
        val hash = hashPin(pin, salt)
        prefs.edit()
            .putString(KEY_LOCK_MODE, MODE_PIN)
            .putString(KEY_PIN_HASH, hash)
            .putString(KEY_PIN_SALT, salt)
            .apply()
        isUnlocked = true
    }

    fun setBiometricMode() {
        prefs.edit().putString(KEY_LOCK_MODE, MODE_BIOMETRIC).apply()
        isUnlocked = true
    }

    fun verifyPin(pin: String): Boolean {
        val storedHash = prefs.getString(KEY_PIN_HASH, null) ?: return false
        val storedSalt = prefs.getString(KEY_PIN_SALT, "") ?: ""
        val inputHash = hashPin(pin, storedSalt)
        val matches = storedHash == inputHash
        if (matches) {
            isUnlocked = true
        }
        return matches
    }

    private fun hashPin(pin: String, salt: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val input = "$salt:$pin".toByteArray(Charsets.UTF_8)
        val hash = digest.digest(input)
        return hash.joinToString("") { "%02x".format(it) }
    }
}

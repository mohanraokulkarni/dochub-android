package com.dochub.app.security

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.io.OutputStream
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.CipherInputStream
import javax.crypto.CipherOutputStream
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Privacy-first Hardware-backed Encrypted-At-Rest Document Storage
 * Uses standard Android Keystore with AES-256-GCM authenticated encryption.
 * Streaming chunks are used to handle large files without memory exhaustion.
 */
class CryptoManager {

    companion object {
        private const val KEY_ALIAS = "DocHubMasterEncryptionKey_v1"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val GCM_TAG_LENGTH = 128
        private const val IV_LENGTH = 12 // 96-bit IV recommended for GCM
        private val MAGIC_HEADER = "DOCHUB_ENC_V1".toByteArray(Charsets.UTF_8)
        private const val BUFFER_SIZE = 64 * 1024 // 64 KB streaming buffer
    }

    private val keyStore: KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply {
        load(null)
    }

    @Synchronized
    private fun getOrCreateSecretKey(): SecretKey {
        val existingKey = keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry
        if (existingKey != null) {
            return existingKey.secretKey
        }

        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            ANDROID_KEYSTORE
        )

        val keyGenSpec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setRandomizedEncryptionRequired(true)
            .build()

        keyGenerator.init(keyGenSpec)
        return keyGenerator.generateKey()
    }

    /**
     * Encrypts a source file into an encrypted destination file using AES-256-GCM.
     * Layout: [MAGIC_HEADER (13 bytes)] + [IV (12 bytes)] + [Encrypted Payload + Auth Tag]
     */
    fun encryptFile(sourceFile: File, encryptedDestination: File) {
        val secretKey = getOrCreateSecretKey()
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey)
        val iv = cipher.iv ?: throw IllegalStateException("Cipher failed to generate IV")

        FileOutputStream(encryptedDestination).use { rawOut ->
            // 1. Write Header & IV
            rawOut.write(MAGIC_HEADER)
            rawOut.write(iv)

            // 2. Stream through CipherOutputStream
            CipherOutputStream(rawOut, cipher).use { cipherOut ->
                FileInputStream(sourceFile).use { fileIn ->
                    val buffer = ByteArray(BUFFER_SIZE)
                    var bytesRead: Int
                    while (fileIn.read(buffer).also { bytesRead = it } != -1) {
                        cipherOut.write(buffer, 0, bytesRead)
                    }
                }
            }
        }
    }

    /**
     * Encrypts an input stream directly into an encrypted destination file.
     */
    fun encryptStream(inputStream: InputStream, encryptedDestination: File) {
        val secretKey = getOrCreateSecretKey()
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey)
        val iv = cipher.iv ?: throw IllegalStateException("Cipher failed to generate IV")

        FileOutputStream(encryptedDestination).use { rawOut ->
            rawOut.write(MAGIC_HEADER)
            rawOut.write(iv)

            CipherOutputStream(rawOut, cipher).use { cipherOut ->
                val buffer = ByteArray(BUFFER_SIZE)
                var bytesRead: Int
                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                    cipherOut.write(buffer, 0, bytesRead)
                }
            }
        }
    }

    /**
     * Checks if a given file has the DocHub AES-256-GCM encryption header.
     */
    fun isFileEncrypted(file: File): Boolean {
        if (!file.exists() || file.length() < (MAGIC_HEADER.size + IV_LENGTH)) {
            return false
        }
        return try {
            FileInputStream(file).use { input ->
                val header = ByteArray(MAGIC_HEADER.size)
                val read = input.read(header)
                read == MAGIC_HEADER.size && header.contentEquals(MAGIC_HEADER)
            }
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Decrypts an encrypted file into a temporary or output destination.
     * If the file is not encrypted (e.g. legacy pre-update file), it is copied directly as fallback.
     */
    fun decryptFile(encryptedFile: File, decryptedDestination: File) {
        if (!isFileEncrypted(encryptedFile)) {
            // Backward compatibility fallback for legacy unencrypted files
            encryptedFile.copyTo(decryptedDestination, overwrite = true)
            return
        }

        FileInputStream(encryptedFile).use { rawIn ->
            // Skip Magic Header
            val header = ByteArray(MAGIC_HEADER.size)
            rawIn.read(header)

            // Read IV
            val iv = ByteArray(IV_LENGTH)
            val ivRead = rawIn.read(iv)
            if (ivRead != IV_LENGTH) {
                throw IllegalStateException("Invalid encryption IV header in file")
            }

            val secretKey = getOrCreateSecretKey()
            val cipher = Cipher.getInstance(TRANSFORMATION)
            val spec = GCMParameterSpec(GCM_TAG_LENGTH, iv)
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec)

            CipherInputStream(rawIn, cipher).use { cipherIn ->
                FileOutputStream(decryptedDestination).use { fileOut ->
                    val buffer = ByteArray(BUFFER_SIZE)
                    var bytesRead: Int
                    while (cipherIn.read(buffer).also { bytesRead = it } != -1) {
                        fileOut.write(buffer, 0, bytesRead)
                    }
                }
            }
        }
    }

    /**
     * Provides an auto-closing InputStream for viewing or processing without keeping temporary disk files.
     */
    fun openDecryptedStream(file: File): InputStream {
        if (!isFileEncrypted(file)) {
            return FileInputStream(file)
        }

        val rawIn = FileInputStream(file)
        // Skip header
        val header = ByteArray(MAGIC_HEADER.size)
        rawIn.read(header)

        val iv = ByteArray(IV_LENGTH)
        rawIn.read(iv)

        val secretKey = getOrCreateSecretKey()
        val cipher = Cipher.getInstance(TRANSFORMATION)
        val spec = GCMParameterSpec(GCM_TAG_LENGTH, iv)
        cipher.init(Cipher.DECRYPT_MODE, secretKey, spec)

        return CipherInputStream(rawIn, cipher)
    }
}

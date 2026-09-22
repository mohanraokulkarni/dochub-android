package com.dochub.app.data.storage

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import com.dochub.app.security.CryptoManager
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.io.OutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class FileManager(private val context: Context) {

    val cryptoManager = CryptoManager()

    private val baseDir: File = File(context.filesDir, "DocHub")
    val documentsDir: File = File(baseDir, "documents")
    val conversionsDir: File = File(baseDir, "conversions")
    val temporaryDir: File = File(baseDir, "temporary")
    val thumbnailsDir: File = File(baseDir, "thumbnails")
    val exportsDir: File = File(baseDir, "exports")

    init {
        documentsDir.mkdirs()
        conversionsDir.mkdirs()
        temporaryDir.mkdirs()
        thumbnailsDir.mkdirs()
        exportsDir.mkdirs()
    }

    data class ImportedFileInfo(
        val originalName: String,
        val displayName: String,
        val localPath: String,
        val mimeType: String,
        val extension: String,
        val sizeBytes: Long,
        val encrypted: Boolean = true
    )

    /**
     * Safely imports a document from a content:// URI into DocHub private storage
     * with hardware-backed AES-256-GCM encryption at rest.
     */
    fun importFromUri(contentResolver: ContentResolver, uri: Uri): ImportedFileInfo {
        var originalName = "document"
        var size: Long = -1

        // 1. Query display name and size from ContentResolver
        contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
            if (cursor.moveToFirst()) {
                if (nameIndex != -1) {
                    originalName = cursor.getString(nameIndex) ?: "document"
                }
                if (sizeIndex != -1) {
                    size = cursor.getLong(sizeIndex)
                }
            }
        }

        // Clean file name to prevent path traversal
        val safeName = sanitizeFileName(originalName)
        val extension = getExtension(safeName, contentResolver, uri)
        val mimeType = getMimeType(contentResolver, uri, extension)

        // Generate collision-free destination file in DocHub/documents
        val destinationFile = getUniqueFile(documentsDir, safeName)

        // Encrypt input stream directly to destination file using AES-256-GCM
        val inputStream: InputStream = contentResolver.openInputStream(uri)
            ?: throw IllegalStateException("Cannot open input stream for URI: $uri")

        inputStream.use { input ->
            cryptoManager.encryptStream(input, destinationFile)
        }

        // Verify destination exists and has bytes
        if (!destinationFile.exists() || destinationFile.length() <= 0L) {
            destinationFile.delete()
            throw IllegalStateException("File import verification failed: destination is empty or does not exist")
        }

        val finalSize = destinationFile.length()
        val displayName = destinationFile.nameWithoutExtension

        return ImportedFileInfo(
            originalName = safeName,
            displayName = displayName,
            localPath = destinationFile.absolutePath,
            mimeType = mimeType,
            extension = extension.lowercase(Locale.ROOT),
            sizeBytes = finalSize,
            encrypted = true
        )
    }

    /**
     * Imports a generated file (e.g. from conversion or image editor) into encrypted storage.
     */
    fun importLocalFileAsEncrypted(sourceFile: File, displayName: String, extension: String, mimeType: String): ImportedFileInfo {
        val safeName = sanitizeFileName("$displayName.$extension")
        val destinationFile = getUniqueFile(documentsDir, safeName)

        cryptoManager.encryptFile(sourceFile, destinationFile)

        if (!destinationFile.exists() || destinationFile.length() <= 0L) {
            destinationFile.delete()
            throw IllegalStateException("Saving copy failed: destination file is empty")
        }

        return ImportedFileInfo(
            originalName = safeName,
            displayName = displayName,
            localPath = destinationFile.absolutePath,
            mimeType = mimeType,
            extension = extension.lowercase(Locale.ROOT),
            sizeBytes = destinationFile.length(),
            encrypted = true
        )
    }

    /**
     * Creates a temporary decrypted copy for operations that require a seekable local File
     * (e.g. Android's native PdfRenderer which requires ParcelFileDescriptor).
     * Must be deleted immediately after use.
     */
    fun createTempDecryptedCopy(file: File): File {
        val tempFile = createTempFile("decrypted_view", ".${file.extension}")
        cryptoManager.decryptFile(file, tempFile)
        return tempFile
    }

    /**
     * Opens an InputStream, automatically decrypting in memory if the file is encrypted.
     */
    fun openDecryptedStream(file: File): InputStream {
        return cryptoManager.openDecryptedStream(file)
    }

    /**
     * Exports an encrypted document to a user-selected SAF Uri.
     * Decrypts directly into the target output stream without creating unneeded disk files.
     */
    fun exportToUri(contentResolver: ContentResolver, sourceFile: File, targetUri: Uri) {
        val outputStream = contentResolver.openOutputStream(targetUri)
            ?: throw IllegalStateException("Cannot open output stream for export target")

        outputStream.use { out ->
            cryptoManager.openDecryptedStream(sourceFile).use { inStream ->
                inStream.copyTo(out)
            }
        }
    }

    /**
     * Safely renames a document file on disk preserving extension and encryption state.
     */
    fun renameDocumentFile(file: File, newDisplayName: String): File {
        val safeBase = sanitizeFileName(newDisplayName)
        val ext = file.extension
        val newFileName = if (ext.isNotEmpty()) "$safeBase.$ext" else safeBase
        val targetFile = getUniqueFile(documentsDir, newFileName)
        val success = file.renameTo(targetFile)
        if (!success) {
            // Fallback copy + delete
            file.copyTo(targetFile, overwrite = true)
            file.delete()
        }
        return targetFile
    }

    /**
     * Safely deletes a document file from storage.
     */
    fun deleteFile(path: String): Boolean {
        return try {
            val file = File(path)
            if (file.exists()) {
                file.delete()
            } else {
                true
            }
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Creates a unique temporary file for processing operations.
     */
    fun createTempFile(prefix: String, suffix: String): File {
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss_SSS", Locale.US).format(Date())
        val cleanSuffix = if (suffix.startsWith(".")) suffix else ".$suffix"
        return File(temporaryDir, "${prefix}_$timeStamp$cleanSuffix")
    }

    /**
     * Generates a unique output file in DocHub/conversions preventing overwrites.
     */
    fun createOutputFile(baseName: String, extension: String): File {
        val cleanExt = if (extension.startsWith(".")) extension else ".$extension"
        val cleanBase = sanitizeFileName(baseName.substringBeforeLast('.'))
        return getUniqueFile(conversionsDir, "$cleanBase$cleanExt")
    }

    fun clearTemporaryFiles(): Long {
        var freedBytes = 0L
        temporaryDir.listFiles()?.forEach { file ->
            freedBytes += file.length()
            file.delete()
        }
        return freedBytes
    }

    fun getTotalStorageUsage(): Long {
        return calculateDirSize(baseDir)
    }

    private fun calculateDirSize(dir: File): Long {
        var size = 0L
        dir.listFiles()?.forEach { file ->
            size += if (file.isDirectory) calculateDirSize(file) else file.length()
        }
        return size
    }

    private fun sanitizeFileName(name: String): String {
        return File(name).name.replace("[^a-zA-Z0-9._-]".toRegex(), "_")
    }

    private fun getUniqueFile(directory: File, fileName: String): File {
        var file = File(directory, fileName)
        if (!file.exists()) return file

        val nameWithoutExt = fileName.substringBeforeLast('.')
        val ext = if (fileName.contains('.')) ".${fileName.substringAfterLast('.')}" else ""

        var counter = 1
        while (file.exists()) {
            file = File(directory, "${nameWithoutExt}_$counter$ext")
            counter++
        }
        return file
    }

    private fun getExtension(fileName: String, contentResolver: ContentResolver, uri: Uri): String {
        if (fileName.contains('.')) {
            val ext = fileName.substringAfterLast('.', "")
            if (ext.isNotEmpty()) return ext
        }
        val type = contentResolver.getType(uri) ?: return "bin"
        return MimeTypeMap.getSingleton().getExtensionFromMimeType(type) ?: "bin"
    }

    private fun getMimeType(contentResolver: ContentResolver, uri: Uri, extension: String): String {
        val type = contentResolver.getType(uri)
        if (!type.isNullOrEmpty()) return type

        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension.lowercase(Locale.ROOT))
            ?: when (extension.lowercase(Locale.ROOT)) {
                "jpg", "jpeg" -> "image/jpeg"
                "png" -> "image/png"
                "webp" -> "image/webp"
                "pdf" -> "application/pdf"
                else -> "application/octet-stream"
            }
    }
}

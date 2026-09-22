package com.dochub.app.data.storage

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.io.OutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class FileManager(private val context: Context) {

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
        val sizeBytes: Long
    )

    /**
     * Safely imports a document from a content:// URI into DocHub private storage.
     * Guarantees destination existence, >0 bytes verification, and anti-path-traversal.
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

        // Copy streams safely
        val inputStream: InputStream = contentResolver.openInputStream(uri)
            ?: throw IllegalStateException("Cannot open input stream for URI: $uri")

        inputStream.use { input ->
            FileOutputStream(destinationFile).use { output ->
                input.copyTo(output)
            }
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
            sizeBytes = finalSize
        )
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
                "pdf" -> "application/pdf"
                else -> "application/octet-stream"
            }
    }
}

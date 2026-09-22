package com.dochub.app.engine

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import com.dochub.app.data.storage.FileManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import kotlin.math.roundToInt

class ImageProcessor(private val fileManager: FileManager) {

    data class ImageProcessResult(
        val success: Boolean,
        val outputFile: File,
        val outputWidth: Int,
        val outputHeight: Int,
        val originalSizeBytes: Long,
        val outputSizeBytes: Long,
        val compressionRatio: Float,
        val errorMessage: String? = null
    )

    data class Dimensions(val width: Int, val height: Int)

    /**
     * Converts dimensions from units (mm, cm, in) to pixels using DPI.
     */
    fun convertToPixels(value: Float, unit: String, dpi: Int): Int {
        return when (unit.lowercase()) {
            "mm" -> ((value / 25.4f) * dpi).roundToInt()
            "cm" -> ((value / 2.54f) * dpi).roundToInt()
            "in" -> (value * dpi).roundToInt()
            else -> value.roundToInt() // default px
        }
    }

    /**
     * Real Smart Progressive Target-Size Compression (Section 10 specification)
     * 1. Decode bitmap safely
     * 2. Resize to requested dimensions if provided
     * 3. Progressively reduce JPEG quality (95 -> 10)
     * 4. If still above target size, downscale dimensions slightly (0.9x, 0.8x)
     * 5. Stop when target is achieved
     * 6. Strictly verify actual output file
     */
    suspend fun compressToTargetSize(
        sourceFile: File,
        targetFormat: String = "JPG", // JPG or PNG
        targetWidth: Int? = null,
        targetHeight: Int? = null,
        maxFileSizeBytes: Long, // e.g. 100 * 1024L
        baseOutputName: String = "processed_image"
    ): ImageProcessResult = withContext(Dispatchers.IO) {
        val originalSize = sourceFile.length()
        if (!sourceFile.exists() || originalSize <= 0) {
            return@withContext ImageProcessResult(
                success = false,
                outputFile = sourceFile,
                outputWidth = 0,
                outputHeight = 0,
                originalSizeBytes = originalSize,
                outputSizeBytes = 0,
                compressionRatio = 0f,
                errorMessage = "Source file does not exist or is empty"
            )
        }

        // Decode source bitmap
        var bitmap = BitmapFactory.decodeFile(sourceFile.absolutePath)
            ?: return@withContext ImageProcessResult(
                success = false,
                outputFile = sourceFile,
                outputWidth = 0,
                outputHeight = 0,
                originalSizeBytes = originalSize,
                outputSizeBytes = 0,
                compressionRatio = 0f,
                errorMessage = "Unable to decode image file. File may be corrupted or in an unsupported format."
            )

        // 1. Initial Resize if requested
        if (targetWidth != null && targetHeight != null && targetWidth > 0 && targetHeight > 0) {
            bitmap = Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true)
        }

        val compressFormat = if (targetFormat.equals("PNG", ignoreCase = true)) {
            Bitmap.CompressFormat.PNG
        } else {
            Bitmap.CompressFormat.JPEG
        }

        val outputFile = fileManager.createOutputFile(
            baseOutputName,
            if (targetFormat.equals("PNG", ignoreCase = true)) "png" else "jpg"
        )

        var quality = 95
        var currentBitmap = bitmap
        var achieved = false

        // Progressive quality loop
        while (quality >= 15) {
            FileOutputStream(outputFile).use { outStream ->
                currentBitmap.compress(compressFormat, quality, outStream)
                outStream.flush()
            }
            if (outputFile.length() <= maxFileSizeBytes) {
                achieved = true
                break
            }
            quality -= 10
        }

        // If still exceeding target size and format is JPEG, gently scale down dimensions
        if (!achieved && compressFormat == Bitmap.CompressFormat.JPEG) {
            var scale = 0.9f
            while (scale >= 0.5f && !achieved) {
                val newW = (currentBitmap.width * scale).roundToInt()
                val newH = (currentBitmap.height * scale).roundToInt()
                if (newW < 50 || newH < 50) break

                val scaled = Bitmap.createScaledBitmap(currentBitmap, newW, newH, true)
                for (q in listOf(85, 70, 50, 30)) {
                    FileOutputStream(outputFile).use { outStream ->
                        scaled.compress(compressFormat, q, outStream)
                        outStream.flush()
                    }
                    if (outputFile.length() <= maxFileSizeBytes) {
                        achieved = true
                        currentBitmap = scaled
                        break
                    }
                }
                scale -= 0.1f
            }
        }

        // Verify actual output
        val finalSize = outputFile.length()
        if (!outputFile.exists() || finalSize <= 0) {
            return@withContext ImageProcessResult(
                success = false,
                outputFile = outputFile,
                outputWidth = 0,
                outputHeight = 0,
                originalSizeBytes = originalSize,
                outputSizeBytes = 0,
                compressionRatio = 0f,
                errorMessage = "Target file output verification failed"
            )
        }

        val ratio = if (originalSize > 0) {
            ((originalSize - finalSize).toFloat() / originalSize.toFloat()) * 100f
        } else 0f

        ImageProcessResult(
            success = true,
            outputFile = outputFile,
            outputWidth = currentBitmap.width,
            outputHeight = currentBitmap.height,
            originalSizeBytes = originalSize,
            outputSizeBytes = finalSize,
            compressionRatio = ratio
        )
    }

    /**
     * Rotate bitmap by angle (90, 180, 270)
     */
    suspend fun rotateImage(sourceFile: File, degrees: Float, baseOutputName: String): ImageProcessResult =
        withContext(Dispatchers.IO) {
            val originalSize = sourceFile.length()
            val bitmap = BitmapFactory.decodeFile(sourceFile.absolutePath)
                ?: return@withContext ImageProcessResult(
                    false, sourceFile, 0, 0, originalSize, 0, 0f, "Failed to decode source bitmap"
                )

            val matrix = Matrix().apply { postRotate(degrees) }
            val rotatedBitmap = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)

            val outputFile = fileManager.createOutputFile(baseOutputName, sourceFile.extension)
            FileOutputStream(outputFile).use { out ->
                val format = if (sourceFile.extension.equals("png", true)) Bitmap.CompressFormat.PNG else Bitmap.CompressFormat.JPEG
                rotatedBitmap.compress(format, 92, out)
            }

            ImageProcessResult(
                success = true,
                outputFile = outputFile,
                outputWidth = rotatedBitmap.width,
                outputHeight = rotatedBitmap.height,
                originalSizeBytes = originalSize,
                outputSizeBytes = outputFile.length(),
                compressionRatio = 0f
            )
        }
}

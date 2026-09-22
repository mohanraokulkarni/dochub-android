package com.dochub.app.engine

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Rect
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

    private fun decodeBitmapSafely(sourceFile: File): Bitmap? {
        return try {
            fileManager.openDecryptedStream(sourceFile).use { inStream ->
                BitmapFactory.decodeStream(inStream)
            }
        } catch (_: Exception) {
            BitmapFactory.decodeFile(sourceFile.absolutePath)
        }
    }

    /**
     * Real Progressive Target-Size Compression
     */
    suspend fun compressToTargetSize(
        sourceFile: File,
        targetFormat: String = "JPG", // JPG or PNG
        targetWidth: Int? = null,
        targetHeight: Int? = null,
        maxFileSizeBytes: Long,
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

        var bitmap = decodeBitmapSafely(sourceFile)
            ?: return@withContext ImageProcessResult(
                success = false,
                outputFile = sourceFile,
                outputWidth = 0,
                outputHeight = 0,
                originalSizeBytes = originalSize,
                outputSizeBytes = 0,
                compressionRatio = 0f,
                errorMessage = "Unable to decode image file. File may be corrupted or unsupported."
            )

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
     * Crops image given rectangular crop coordinates.
     */
    suspend fun cropImage(
        sourceFile: File,
        cropLeft: Int,
        cropTop: Int,
        cropWidth: Int,
        cropHeight: Int,
        targetFormat: String = "JPG",
        baseOutputName: String = "cropped_image"
    ): ImageProcessResult = withContext(Dispatchers.IO) {
        val originalSize = sourceFile.length()
        val bitmap = decodeBitmapSafely(sourceFile)
            ?: return@withContext ImageProcessResult(
                false, sourceFile, 0, 0, originalSize, 0, 0f, "Failed to decode bitmap"
            )

        val safeLeft = cropLeft.coerceIn(0, bitmap.width - 1)
        val safeTop = cropTop.coerceIn(0, bitmap.height - 1)
        val safeW = cropWidth.coerceIn(1, bitmap.width - safeLeft)
        val safeH = cropHeight.coerceIn(1, bitmap.height - safeTop)

        val cropped = Bitmap.createBitmap(bitmap, safeLeft, safeTop, safeW, safeH)

        val ext = if (targetFormat.equals("PNG", true)) "png" else "jpg"
        val format = if (targetFormat.equals("PNG", true)) Bitmap.CompressFormat.PNG else Bitmap.CompressFormat.JPEG
        val outputFile = fileManager.createOutputFile(baseOutputName, ext)

        FileOutputStream(outputFile).use { out ->
            cropped.compress(format, 95, out)
        }

        ImageProcessResult(
            success = outputFile.exists() && outputFile.length() > 0,
            outputFile = outputFile,
            outputWidth = cropped.width,
            outputHeight = cropped.height,
            originalSizeBytes = originalSize,
            outputSizeBytes = outputFile.length(),
            compressionRatio = 0f
        )
    }

    /**
     * Converts format between JPG and PNG with optional solid background for PNG transparency.
     */
    suspend fun convertFormat(
        sourceFile: File,
        targetFormat: String, // "JPG" or "PNG"
        backgroundColorInt: Int = Color.WHITE,
        baseOutputName: String = "converted_image"
    ): ImageProcessResult = withContext(Dispatchers.IO) {
        val originalSize = sourceFile.length()
        val bitmap = decodeBitmapSafely(sourceFile)
            ?: return@withContext ImageProcessResult(
                false, sourceFile, 0, 0, originalSize, 0, 0f, "Failed to decode source image"
            )

        val isTargetJpg = targetFormat.equals("JPG", true) || targetFormat.equals("JPEG", true)
        val ext = if (isTargetJpg) "jpg" else "png"
        val compressFormat = if (isTargetJpg) Bitmap.CompressFormat.JPEG else Bitmap.CompressFormat.PNG

        val outputBitmap = if (isTargetJpg && bitmap.hasAlpha()) {
            val solid = Bitmap.createBitmap(bitmap.width, bitmap.height, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(solid)
            canvas.drawColor(backgroundColorInt)
            canvas.drawBitmap(bitmap, 0f, 0f, Paint(Paint.FILTER_BITMAP_FLAG))
            solid
        } else {
            bitmap
        }

        val outputFile = fileManager.createOutputFile(baseOutputName, ext)
        FileOutputStream(outputFile).use { out ->
            outputBitmap.compress(compressFormat, 95, out)
        }

        ImageProcessResult(
            success = outputFile.exists() && outputFile.length() > 0,
            outputFile = outputFile,
            outputWidth = outputBitmap.width,
            outputHeight = outputBitmap.height,
            originalSizeBytes = originalSize,
            outputSizeBytes = outputFile.length(),
            compressionRatio = 0f
        )
    }

    /**
     * Rotates bitmap by angle (90, 180, 270).
     */
    suspend fun rotateImage(sourceFile: File, degrees: Float, baseOutputName: String): ImageProcessResult =
        withContext(Dispatchers.IO) {
            val originalSize = sourceFile.length()
            val bitmap = decodeBitmapSafely(sourceFile)
                ?: return@withContext ImageProcessResult(
                    false, sourceFile, 0, 0, originalSize, 0, 0f, "Failed to decode source bitmap"
                )

            val matrix = Matrix().apply { postRotate(degrees) }
            val rotatedBitmap = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)

            val ext = if (sourceFile.extension.equals("png", true)) "png" else "jpg"
            val outputFile = fileManager.createOutputFile(baseOutputName, ext)
            FileOutputStream(outputFile).use { out ->
                val format = if (ext == "png") Bitmap.CompressFormat.PNG else Bitmap.CompressFormat.JPEG
                rotatedBitmap.compress(format, 92, out)
            }

            ImageProcessResult(
                success = outputFile.exists() && outputFile.length() > 0,
                outputFile = outputFile,
                outputWidth = rotatedBitmap.width,
                outputHeight = rotatedBitmap.height,
                originalSizeBytes = originalSize,
                outputSizeBytes = outputFile.length(),
                compressionRatio = 0f
            )
        }
}

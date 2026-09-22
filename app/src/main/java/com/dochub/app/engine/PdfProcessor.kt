package com.dochub.app.engine

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.pdf.PdfDocument
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import com.dochub.app.data.storage.FileManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

class PdfProcessor(private val fileManager: FileManager) {

    data class PdfProcessResult(
        val success: Boolean,
        val outputFiles: List<File>,
        val pageCount: Int,
        val totalSizeBytes: Long,
        val errorMessage: String? = null
    )

    enum class PageStandard(val widthPt: Int, val heightPt: Int) {
        A4(595, 842),
        A3(842, 1191),
        LETTER(612, 792),
        LEGAL(612, 1008)
    }

    enum class FitMode {
        CONTAIN,
        COVER,
        ORIGINAL
    }

    /**
     * Converts a single or multiple image files into a single multi-page PDF document.
     * Uses Android's native android.graphics.pdf.PdfDocument.
     */
    suspend fun imagesToPdf(
        imageFiles: List<File>,
        pageStandard: PageStandard = PageStandard.A4,
        fitMode: FitMode = FitMode.CONTAIN,
        marginPt: Int = 20,
        outputBaseName: String = "document"
    ): PdfProcessResult = withContext(Dispatchers.IO) {
        if (imageFiles.isEmpty()) {
            return@withContext PdfProcessResult(false, emptyList(), 0, 0, "No image files provided")
        }

        val pdfDoc = PdfDocument()
        try {
            imageFiles.forEachIndexed { index, file ->
                val bitmap = BitmapFactory.decodeFile(file.absolutePath) ?: return@forEachIndexed

                val pageInfo = PdfDocument.PageInfo.Builder(
                    pageStandard.widthPt,
                    pageStandard.heightPt,
                    index + 1
                ).create()

                val page = pdfDoc.startPage(pageInfo)
                val canvas = page.canvas

                val availableWidth = (pageStandard.widthPt - (marginPt * 2)).toFloat()
                val availableHeight = (pageStandard.heightPt - (marginPt * 2)).toFloat()

                val bmpRatio = bitmap.width.toFloat() / bitmap.height.toFloat()
                val availRatio = availableWidth / availableHeight

                var drawWidth = availableWidth
                var drawHeight = availableHeight

                when (fitMode) {
                    FitMode.CONTAIN -> {
                        if (bmpRatio > availRatio) {
                            drawWidth = availableWidth
                            drawHeight = availableWidth / bmpRatio
                        } else {
                            drawHeight = availableHeight
                            drawWidth = availableHeight * bmpRatio
                        }
                    }
                    FitMode.COVER -> {
                        if (bmpRatio > availRatio) {
                            drawHeight = availableHeight
                            drawWidth = availableHeight * bmpRatio
                        } else {
                            drawWidth = availableWidth
                            drawHeight = availableWidth / bmpRatio
                        }
                    }
                    FitMode.ORIGINAL -> {
                        drawWidth = bitmap.width.toFloat().coerceAtMost(availableWidth)
                        drawHeight = (drawWidth / bmpRatio).coerceAtMost(availableHeight)
                    }
                }

                val left = marginPt + (availableWidth - drawWidth) / 2f
                val top = marginPt + (availableHeight - drawHeight) / 2f

                val destRect = Rect(
                    left.toInt(),
                    top.toInt(),
                    (left + drawWidth).toInt(),
                    (top + drawHeight).toInt()
                )

                canvas.drawBitmap(bitmap, null, destRect, Paint(Paint.FILTER_BITMAP_FLAG))
                pdfDoc.finishPage(page)
                bitmap.recycle()
            }

            val outputFile = fileManager.createOutputFile(outputBaseName, "pdf")
            FileOutputStream(outputFile).use { out ->
                pdfDoc.writeTo(out)
            }

            if (!outputFile.exists() || outputFile.length() <= 0) {
                return@withContext PdfProcessResult(false, emptyList(), 0, 0, "Failed to verify PDF output")
            }

            PdfProcessResult(
                success = true,
                outputFiles = listOf(outputFile),
                pageCount = imageFiles.size,
                totalSizeBytes = outputFile.length()
            )
        } catch (e: Exception) {
            PdfProcessResult(false, emptyList(), 0, 0, e.message ?: "Unknown PDF creation error")
        } finally {
            pdfDoc.close()
        }
    }

    /**
     * Extracts pages from a PDF document to JPEG/PNG images using Android's native PdfRenderer.
     */
    suspend fun pdfToImages(
        pdfFile: File,
        targetPages: List<Int>? = null, // 1-indexed pages. null = all
        outputFormat: String = "JPG",
        scaleFactor: Float = 2.0f, // 2x for high resolution
        outputBaseName: String = "pdf_page"
    ): PdfProcessResult = withContext(Dispatchers.IO) {
        if (!pdfFile.exists() || pdfFile.length() <= 0) {
            return@withContext PdfProcessResult(false, emptyList(), 0, 0, "PDF file does not exist or is empty")
        }

        val outputImages = mutableListOf<File>()
        var pfd: ParcelFileDescriptor? = null
        var renderer: PdfRenderer? = null

        try {
            pfd = ParcelFileDescriptor.open(pdfFile, ParcelFileDescriptor.MODE_READ_ONLY)
            renderer = PdfRenderer(pfd)
            val totalPages = renderer.pageCount

            val pagesToProcess = (1..totalPages).filter { pageNum ->
                targetPages == null || targetPages.contains(pageNum)
            }

            val compressFormat = if (outputFormat.equals("PNG", true)) {
                Bitmap.CompressFormat.PNG
            } else {
                Bitmap.CompressFormat.JPEG
            }
            val ext = if (outputFormat.equals("PNG", true)) "png" else "jpg"

            for (pageNum in pagesToProcess) {
                val page = renderer.openPage(pageNum - 1)
                val width = (page.width * scaleFactor).toInt()
                val height = (page.height * scaleFactor).toInt()

                val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                // Fill background with white for PDFs with transparency
                val canvas = Canvas(bitmap)
                canvas.drawColor(android.graphics.Color.WHITE)

                page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                page.close()

                val outFile = fileManager.createOutputFile("${outputBaseName}_page_$pageNum", ext)
                FileOutputStream(outFile).use { out ->
                    bitmap.compress(compressFormat, 92, out)
                    out.flush()
                }
                bitmap.recycle()

                if (outFile.exists() && outFile.length() > 0) {
                    outputImages.add(outFile)
                }
            }

            val totalBytes = outputImages.sumOf { it.length() }
            PdfProcessResult(
                success = outputImages.isNotEmpty(),
                outputFiles = outputImages,
                pageCount = outputImages.size,
                totalSizeBytes = totalBytes
            )
        } catch (e: Exception) {
            PdfProcessResult(false, emptyList(), 0, 0, e.message ?: "Failed rendering PDF to images")
        } finally {
            renderer?.close()
            pfd?.close()
        }
    }
}

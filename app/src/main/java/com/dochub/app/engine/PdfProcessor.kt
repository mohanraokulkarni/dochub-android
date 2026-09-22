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
     * Converts single or multiple image files into a single multi-page PDF document.
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
                val bitmap = try {
                    fileManager.openDecryptedStream(file).use { inStream ->
                        BitmapFactory.decodeStream(inStream)
                    }
                } catch (_: Exception) {
                    BitmapFactory.decodeFile(file.absolutePath)
                } ?: return@forEachIndexed

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
        scaleFactor: Float = 2.0f,
        outputBaseName: String = "pdf_page"
    ): PdfProcessResult = withContext(Dispatchers.IO) {
        val tempSource = if (fileManager.cryptoManager.isFileEncrypted(pdfFile)) {
            fileManager.createTempDecryptedCopy(pdfFile)
        } else {
            pdfFile
        }

        val outputImages = mutableListOf<File>()
        var pfd: ParcelFileDescriptor? = null
        var renderer: PdfRenderer? = null

        try {
            pfd = ParcelFileDescriptor.open(tempSource, ParcelFileDescriptor.MODE_READ_ONLY)
            renderer = PdfRenderer(pfd)
            val totalPages = renderer.pageCount

            val pagesToProcess = (1..totalPages).filter { pageNum ->
                targetPages == null || targetPages.contains(pageNum)
            }

            val isPng = outputFormat.equals("PNG", true)
            val compressFormat = if (isPng) Bitmap.CompressFormat.PNG else Bitmap.CompressFormat.JPEG
            val ext = if (isPng) "png" else "jpg"

            for (pageNum in pagesToProcess) {
                val page = renderer.openPage(pageNum - 1)
                val width = (page.width * scaleFactor).toInt()
                val height = (page.height * scaleFactor).toInt()

                val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
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

            PdfProcessResult(
                success = outputImages.isNotEmpty(),
                outputFiles = outputImages,
                pageCount = outputImages.size,
                totalSizeBytes = outputImages.sumOf { it.length() }
            )
        } catch (e: Exception) {
            PdfProcessResult(false, emptyList(), 0, 0, e.message ?: "Failed rendering PDF to images")
        } finally {
            renderer?.close()
            pfd?.close()
            if (tempSource != pdfFile) {
                tempSource.delete() // Clean up temporary decrypted file immediately
            }
        }
    }

    /**
     * Merges multiple PDF files into one combined PDF using native Android PdfRenderer & PdfDocument.
     */
    suspend fun mergePdfs(
        pdfFiles: List<File>,
        outputBaseName: String = "Combined_Document"
    ): PdfProcessResult = withContext(Dispatchers.IO) {
        if (pdfFiles.isEmpty()) {
            return@withContext PdfProcessResult(false, emptyList(), 0, 0, "No PDF files selected to merge")
        }

        val combinedDoc = PdfDocument()
        var totalPageCounter = 0
        val tempFilesToClean = mutableListOf<File>()

        try {
            for (file in pdfFiles) {
                val tempSource = if (fileManager.cryptoManager.isFileEncrypted(file)) {
                    val temp = fileManager.createTempDecryptedCopy(file)
                    tempFilesToClean.add(temp)
                    temp
                } else {
                    file
                }

                ParcelFileDescriptor.open(tempSource, ParcelFileDescriptor.MODE_READ_ONLY).use { pfd ->
                    PdfRenderer(pfd).use { renderer ->
                        for (i in 0 until renderer.pageCount) {
                            totalPageCounter++
                            val page = renderer.openPage(i)
                            val pageInfo = PdfDocument.PageInfo.Builder(page.width, page.height, totalPageCounter).create()
                            val newPage = combinedDoc.startPage(pageInfo)

                            val bitmap = Bitmap.createBitmap(page.width, page.height, Bitmap.Config.ARGB_8888)
                            val canvas = Canvas(bitmap)
                            canvas.drawColor(android.graphics.Color.WHITE)
                            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_PRINT)
                            page.close()

                            newPage.canvas.drawBitmap(bitmap, 0f, 0f, Paint(Paint.FILTER_BITMAP_FLAG))
                            combinedDoc.finishPage(newPage)
                            bitmap.recycle()
                        }
                    }
                }
            }

            val outputFile = fileManager.createOutputFile(outputBaseName, "pdf")
            FileOutputStream(outputFile).use { out ->
                combinedDoc.writeTo(out)
            }

            if (!outputFile.exists() || outputFile.length() <= 0) {
                return@withContext PdfProcessResult(false, emptyList(), 0, 0, "Failed to verify merged PDF output")
            }

            PdfProcessResult(
                success = true,
                outputFiles = listOf(outputFile),
                pageCount = totalPageCounter,
                totalSizeBytes = outputFile.length()
            )
        } catch (e: Exception) {
            PdfProcessResult(false, emptyList(), 0, 0, e.message ?: "Failed merging PDFs")
        } finally {
            combinedDoc.close()
            tempFilesToClean.forEach { it.delete() }
        }
    }

    /**
     * Splits a PDF into two parts (pages 1..splitAfterPage and splitAfterPage+1..Total).
     */
    suspend fun splitPdf(
        pdfFile: File,
        splitAfterPage: Int,
        outputBaseName: String = "Document"
    ): PdfProcessResult = withContext(Dispatchers.IO) {
        val tempSource = if (fileManager.cryptoManager.isFileEncrypted(pdfFile)) {
            fileManager.createTempDecryptedCopy(pdfFile)
        } else {
            pdfFile
        }

        val generatedFiles = mutableListOf<File>()

        try {
            ParcelFileDescriptor.open(tempSource, ParcelFileDescriptor.MODE_READ_ONLY).use { pfd ->
                PdfRenderer(pfd).use { renderer ->
                    val total = renderer.pageCount
                    if (splitAfterPage < 1 || splitAfterPage >= total) {
                        return@withContext PdfProcessResult(
                            false, emptyList(), 0, 0,
                            "Split page $splitAfterPage is out of valid range (1 to ${total - 1})"
                        )
                    }

                    // Part 1: 0 until splitAfterPage
                    val docPart1 = PdfDocument()
                    for (i in 0 until splitAfterPage) {
                        val page = renderer.openPage(i)
                        val pageInfo = PdfDocument.PageInfo.Builder(page.width, page.height, i + 1).create()
                        val newPage = docPart1.startPage(pageInfo)
                        val bitmap = Bitmap.createBitmap(page.width, page.height, Bitmap.Config.ARGB_8888)
                        Canvas(bitmap).drawColor(android.graphics.Color.WHITE)
                        page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_PRINT)
                        page.close()
                        newPage.canvas.drawBitmap(bitmap, 0f, 0f, Paint(Paint.FILTER_BITMAP_FLAG))
                        docPart1.finishPage(newPage)
                        bitmap.recycle()
                    }
                    val filePart1 = fileManager.createOutputFile("${outputBaseName}_part_1", "pdf")
                    FileOutputStream(filePart1).use { docPart1.writeTo(it) }
                    docPart1.close()
                    if (filePart1.exists() && filePart1.length() > 0) generatedFiles.add(filePart1)

                    // Part 2: splitAfterPage until total
                    val docPart2 = PdfDocument()
                    var p2Index = 1
                    for (i in splitAfterPage until total) {
                        val page = renderer.openPage(i)
                        val pageInfo = PdfDocument.PageInfo.Builder(page.width, page.height, p2Index++).create()
                        val newPage = docPart2.startPage(pageInfo)
                        val bitmap = Bitmap.createBitmap(page.width, page.height, Bitmap.Config.ARGB_8888)
                        Canvas(bitmap).drawColor(android.graphics.Color.WHITE)
                        page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_PRINT)
                        page.close()
                        newPage.canvas.drawBitmap(bitmap, 0f, 0f, Paint(Paint.FILTER_BITMAP_FLAG))
                        docPart2.finishPage(newPage)
                        bitmap.recycle()
                    }
                    val filePart2 = fileManager.createOutputFile("${outputBaseName}_part_2", "pdf")
                    FileOutputStream(filePart2).use { docPart2.writeTo(it) }
                    docPart2.close()
                    if (filePart2.exists() && filePart2.length() > 0) generatedFiles.add(filePart2)
                }
            }

            PdfProcessResult(
                success = generatedFiles.size == 2,
                outputFiles = generatedFiles,
                pageCount = generatedFiles.size,
                totalSizeBytes = generatedFiles.sumOf { it.length() }
            )
        } catch (e: Exception) {
            PdfProcessResult(false, emptyList(), 0, 0, e.message ?: "Failed splitting PDF")
        } finally {
            if (tempSource != pdfFile) tempSource.delete()
        }
    }
}

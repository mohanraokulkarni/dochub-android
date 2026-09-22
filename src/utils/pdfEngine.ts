import { PDFDocument } from 'pdf-lib';

export interface ImageToPdfOptions {
  pageSize: 'A4' | 'A3' | 'Letter' | 'Legal';
  marginPt: number;
  fitMode: 'contain' | 'cover' | 'original';
}

const PAGE_DIMENSIONS = {
  A4: [595.28, 841.89] as [number, number],
  A3: [841.89, 1190.55] as [number, number],
  Letter: [612.0, 792.0] as [number, number],
  Legal: [612.0, 1008.0] as [number, number],
};

/**
 * Creates a real valid multi-page PDF locally from image data URLs using pdf-lib.
 */
export async function imagesToPdf(
  images: { dataUrl: string; name: string }[],
  options: ImageToPdfOptions = { pageSize: 'A4', marginPt: 20, fitMode: 'contain' }
): Promise<{ dataUrl: string; blob: Blob; sizeBytes: number; pageCount: number }> {
  const pdfDoc = await PDFDocument.create();
  const [pageW, pageH] = PAGE_DIMENSIONS[options.pageSize] || PAGE_DIMENSIONS.A4;

  for (const item of images) {
    const page = pdfDoc.addPage([pageW, pageH]);
    const isPng = item.dataUrl.startsWith('data:image/png');

    // Convert data URL to bytes
    const base64Data = item.dataUrl.split(',')[1];
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const embeddedImage = isPng
      ? await pdfDoc.embedPng(imageBytes)
      : await pdfDoc.embedJpg(imageBytes);

    const availableW = pageW - options.marginPt * 2;
    const availableH = pageH - options.marginPt * 2;

    const imgW = embeddedImage.width;
    const imgH = embeddedImage.height;
    const imgRatio = imgW / imgH;
    const availRatio = availableW / availableH;

    let drawW = availableW;
    let drawH = availableH;

    if (options.fitMode === 'contain') {
      if (imgRatio > availRatio) {
        drawW = availableW;
        drawH = availableW / imgRatio;
      } else {
        drawH = availableH;
        drawW = availableH * imgRatio;
      }
    } else if (options.fitMode === 'original') {
      drawW = Math.min(imgW, availableW);
      drawH = drawW / imgRatio;
    }

    const x = options.marginPt + (availableW - drawW) / 2;
    const y = options.marginPt + (availableH - drawH) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: drawW,
      height: drawH,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  return {
    dataUrl,
    blob,
    sizeBytes: blob.size,
    pageCount: images.length,
  };
}

/**
 * Merges multiple PDFs locally into a single output PDF.
 */
export async function mergePdfs(
  pdfDataUrls: string[]
): Promise<{ dataUrl: string; blob: Blob; sizeBytes: number; pageCount: number }> {
  const mergedPdf = await PDFDocument.create();

  for (const dataUrl of pdfDataUrls) {
    const base64 = dataUrl.split(',')[1];
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const doc = await PDFDocument.load(bytes);
    const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const pdfBytes = await mergedPdf.save();
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const outUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  return {
    dataUrl: outUrl,
    blob,
    sizeBytes: blob.size,
    pageCount: mergedPdf.getPageCount(),
  };
}

/**
 * Splits a PDF by extracting specified page ranges (e.g. [1, 2]).
 */
export async function splitPdf(
  pdfDataUrl: string,
  pageNumbers1Indexed: number[]
): Promise<{ dataUrl: string; blob: Blob; sizeBytes: number; pageCount: number }> {
  const base64 = pdfDataUrl.split(',')[1];
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const sourceDoc = await PDFDocument.load(bytes);

  const subDoc = await PDFDocument.create();
  const totalPages = sourceDoc.getPageCount();

  const zeroIndexed = pageNumbers1Indexed
    .map((p) => p - 1)
    .filter((p) => p >= 0 && p < totalPages);

  const pages = await subDoc.copyPages(sourceDoc, zeroIndexed);
  pages.forEach((p) => subDoc.addPage(p));

  const pdfBytes = await subDoc.save();
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const outUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  return {
    dataUrl: outUrl,
    blob,
    sizeBytes: blob.size,
    pageCount: subDoc.getPageCount(),
  };
}

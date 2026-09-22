export interface ProcessImageOptions {
  targetFormat: 'JPG' | 'PNG';
  targetWidth?: number;
  targetHeight?: number;
  maxFileSizeBytes?: number;
  quality?: number; // 0 - 100
  rotation?: number; // 0, 90, 180, 270
}

export interface ProcessImageResult {
  dataUrl: string;
  blob: Blob;
  outputSizeBytes: number;
  width: number;
  height: number;
  reductionPercentage: number;
}

export function convertUnitsToPixels(value: number, unit: string, dpi: number = 300): number {
  switch (unit.toLowerCase()) {
    case 'mm':
      return Math.round((value / 25.4) * dpi);
    case 'cm':
      return Math.round((value / 2.54) * dpi);
    case 'in':
      return Math.round(value * dpi);
    default:
      return Math.round(value);
  }
}

/**
 * Real local browser Canvas image processing engine with target-size progressive compression.
 * Works 100% offline, no cloud APIs.
 */
export async function processImageLocal(
  sourceDataUrl: string,
  originalSizeBytes: number,
  options: ProcessImageOptions
): Promise<ProcessImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        let width = options.targetWidth || img.naturalWidth;
        let height = options.targetHeight || img.naturalHeight;

        // If only one dimension is given, preserve aspect ratio
        if (options.targetWidth && !options.targetHeight) {
          height = Math.round((img.naturalHeight / img.naturalWidth) * width);
        } else if (!options.targetWidth && options.targetHeight) {
          width = Math.round((img.naturalWidth / img.naturalHeight) * height);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D canvas context');

        // Handle rotation if present
        if (options.rotation && options.rotation !== 0) {
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((options.rotation * Math.PI) / 180);
          ctx.drawImage(img, -width / 2, -height / 2, width, height);
          ctx.restore();
        } else {
          // Fill white background for JPG conversion
          if (options.targetFormat === 'JPG') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }
          ctx.drawImage(img, 0, 0, width, height);
        }

        const mime = options.targetFormat === 'PNG' ? 'image/png' : 'image/jpeg';

        // If no target max size is specified, encode with provided quality
        if (!options.maxFileSizeBytes || options.targetFormat === 'PNG') {
          const q = (options.quality ?? 85) / 100;
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('Failed to create image blob'));
              const reader = new FileReader();
              reader.onloadend = () => {
                const outDataUrl = reader.result as string;
                const reduction =
                  originalSizeBytes > 0
                    ? Math.max(0, Math.round(((originalSizeBytes - blob.size) / originalSizeBytes) * 100))
                    : 0;
                resolve({
                  dataUrl: outDataUrl,
                  blob,
                  outputSizeBytes: blob.size,
                  width,
                  height,
                  reductionPercentage: reduction,
                });
              };
              reader.readAsDataURL(blob);
            },
            mime,
            q
          );
          return;
        }

        // Section 10 Progressive Target-Size Compression Algorithm
        const targetMax = options.maxFileSizeBytes;
        let quality = 0.95;
        let bestBlob: Blob | null = null;

        const getBlob = (q: number): Promise<Blob> => {
          return new Promise((res, rej) => {
            canvas.toBlob(
              (b) => {
                if (b) res(b);
                else rej(new Error('Canvas to blob failed'));
              },
              mime,
              q
            );
          });
        };

        // 1. Progressive quality steps down to 0.15
        while (quality >= 0.15) {
          const b = await getBlob(quality);
          bestBlob = b;
          if (b.size <= targetMax) {
            break;
          }
          quality -= 0.08;
        }

        // 2. If still exceeding target max, progressively scale down canvas dimensions
        if (bestBlob && bestBlob.size > targetMax) {
          let scale = 0.9;
          while (scale >= 0.4) {
            const scaledCanvas = document.createElement('canvas');
            const scaledW = Math.round(width * scale);
            const scaledH = Math.round(height * scale);
            scaledCanvas.width = scaledW;
            scaledCanvas.height = scaledH;
            const scaledCtx = scaledCanvas.getContext('2d');
            if (scaledCtx) {
              scaledCtx.fillStyle = '#FFFFFF';
              scaledCtx.fillRect(0, 0, scaledW, scaledH);
              scaledCtx.drawImage(canvas, 0, 0, scaledW, scaledH);

              for (const q of [0.8, 0.6, 0.4, 0.2]) {
                const b = await new Promise<Blob | null>((res) =>
                  scaledCanvas.toBlob(res, mime, q)
                );
                if (b) {
                  bestBlob = b;
                  if (b.size <= targetMax) {
                    width = scaledW;
                    height = scaledH;
                    break;
                  }
                }
              }
            }
            if (bestBlob && bestBlob.size <= targetMax) break;
            scale -= 0.1;
          }
        }

        if (!bestBlob) throw new Error('Target size compression failed');

        const reader = new FileReader();
        reader.onloadend = () => {
          const outDataUrl = reader.result as string;
          const reduction =
            originalSizeBytes > 0
              ? Math.max(0, Math.round(((originalSizeBytes - bestBlob!.size) / originalSizeBytes) * 100))
              : 0;
          resolve({
            dataUrl: outDataUrl,
            blob: bestBlob!,
            outputSizeBytes: bestBlob!.size,
            width,
            height,
            reductionPercentage: reduction,
          });
        };
        reader.readAsDataURL(bestBlob);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image into Canvas'));
    img.src = sourceDataUrl;
  });
}

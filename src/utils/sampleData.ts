import { StoredDocument } from '../types';

export function createSamplePhotoDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 1200, 1600);
  gradient.addColorStop(0, '#E2E8F0');
  gradient.addColorStop(1, '#CBD5E1');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 1600);

  // Border frame
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#94A3B8';
  ctx.strokeRect(40, 40, 1120, 1520);

  // Silhouette / ID Avatar placeholder
  ctx.fillStyle = '#64748B';
  // Head
  ctx.beginPath();
  ctx.arc(600, 600, 220, 0, Math.PI * 2);
  ctx.fill();

  // Shoulders
  ctx.beginPath();
  ctx.ellipse(600, 1200, 450, 320, 0, 0, Math.PI * 2);
  ctx.fill();

  // Badge Header
  ctx.fillStyle = '#1E3A8A';
  ctx.fillRect(80, 80, 1040, 160);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OFFICIAL IDENTITY SPECIMEN', 600, 180);

  // Document Footer details
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('DOC-ID: #DH-984210-ORIGINAL', 600, 1420);
  ctx.font = '32px sans-serif';
  ctx.fillText('Dimensions: 1200 × 1600 px • Source: High-Res Camera Capture', 600, 1480);

  return canvas.toDataURL('image/jpeg', 0.95);
}

export function createSampleCertificateDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 850;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#FAF5FF';
  ctx.fillRect(0, 0, 1200, 850);

  ctx.lineWidth = 12;
  ctx.strokeStyle = '#7E22CE';
  ctx.strokeRect(30, 30, 1140, 790);

  ctx.fillStyle = '#581C87';
  ctx.font = 'bold 52px serif';
  ctx.textAlign = 'center';
  ctx.fillText('CERTIFICATE OF ACADEMIC COMPLETION', 600, 160);

  ctx.fillStyle = '#374151';
  ctx.font = '28px sans-serif';
  ctx.fillText('This certifies the successful verification of all graduation requirements.', 600, 320);

  ctx.fillStyle = '#1F2937';
  ctx.font = 'bold 42px serif';
  ctx.fillText('Candidate Name: Alex Johnson', 600, 450);

  ctx.fillStyle = '#6B7280';
  ctx.font = '24px monospace';
  ctx.fillText('ACADEMIC YEAR: 2025-2026 • REGISTRATION #8849-AC', 600, 560);

  // Signature box
  ctx.fillStyle = '#E5E7EB';
  ctx.fillRect(400, 680, 400, 3);
  ctx.fillStyle = '#4B5563';
  ctx.font = 'italic 26px serif';
  ctx.fillText('Authorized Signature', 600, 720);

  return canvas.toDataURL('image/jpeg', 0.92);
}

export function getInitialSeedDocuments(): StoredDocument[] {
  const photoUrl = createSamplePhotoDataUrl();
  const certUrl = createSampleCertificateDataUrl();

  const photoBytes = Math.round((photoUrl.length * 3) / 4);
  const certBytes = Math.round((certUrl.length * 3) / 4);

  return [
    {
      id: 'doc-seed-1',
      originalName: 'passport_candidate_raw.jpg',
      displayName: 'Passport Candidate Photo',
      mimeType: 'image/jpeg',
      extension: 'jpg',
      sizeBytes: photoBytes,
      category: 'Identity',
      tags: ['photo', 'passport', 'id'],
      favorite: true,
      dataUrl: photoUrl,
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now() - 3600000,
    },
    {
      id: 'doc-seed-2',
      originalName: 'academic_degree_scan.jpg',
      displayName: 'Academic Degree Certificate',
      mimeType: 'image/jpeg',
      extension: 'jpg',
      sizeBytes: certBytes,
      category: 'Education',
      tags: ['degree', 'certificate', 'education'],
      favorite: false,
      dataUrl: certUrl,
      createdAt: Date.now() - 7200000,
      updatedAt: Date.now() - 7200000,
    },
  ];
}

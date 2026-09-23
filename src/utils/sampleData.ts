import { StoredDocument } from '../types';

export function createSamplePhotoDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 900, 1200);
  gradient.addColorStop(0, '#E2E8F0');
  gradient.addColorStop(1, '#CBD5E1');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 900, 1200);

  // Border frame
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#94A3B8';
  ctx.strokeRect(30, 30, 840, 1140);

  // Silhouette / ID Avatar placeholder
  ctx.fillStyle = '#64748B';
  // Head
  ctx.beginPath();
  ctx.arc(450, 450, 160, 0, Math.PI * 2);
  ctx.fill();

  // Shoulders
  ctx.beginPath();
  ctx.ellipse(450, 900, 340, 240, 0, 0, Math.PI * 2);
  ctx.fill();

  // Badge Header
  ctx.fillStyle = '#1E3A8A';
  ctx.fillRect(60, 60, 780, 120);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OFFICIAL IDENTITY SPECIMEN', 450, 135);

  // Document Footer details
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 28px monospace';
  ctx.fillText('DOC-ID: #DH-984210-ORIGINAL', 450, 1070);
  ctx.font = '24px sans-serif';
  ctx.fillText('Dimensions: 900 × 1200 px • Offline Encrypted', 450, 1115);

  return canvas.toDataURL('image/jpeg', 0.9);
}

export function createSampleCertificateDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#FAF5FF';
  ctx.fillRect(0, 0, 1000, 700);

  ctx.lineWidth = 10;
  ctx.strokeStyle = '#7E22CE';
  ctx.strokeRect(25, 25, 950, 650);

  ctx.fillStyle = '#581C87';
  ctx.font = 'bold 42px serif';
  ctx.textAlign = 'center';
  ctx.fillText('CERTIFICATE OF ACADEMIC COMPLETION', 500, 130);

  ctx.fillStyle = '#374151';
  ctx.font = '22px sans-serif';
  ctx.fillText('This certifies the successful verification of all graduation requirements.', 500, 250);

  ctx.fillStyle = '#1F2937';
  ctx.font = 'bold 34px serif';
  ctx.fillText('Candidate Name: Alex Johnson', 500, 360);

  ctx.fillStyle = '#6B7280';
  ctx.font = '20px monospace';
  ctx.fillText('ACADEMIC YEAR: 2025-2026 • REGISTRATION #8849-AC', 500, 450);

  // Signature box
  ctx.fillStyle = '#E5E7EB';
  ctx.fillRect(350, 550, 300, 3);
  ctx.fillStyle = '#4B5563';
  ctx.font = 'italic 22px serif';
  ctx.fillText('Authorized Signature', 500, 590);

  return canvas.toDataURL('image/jpeg', 0.9);
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
      encrypted: true,
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
      encrypted: true,
      dataUrl: certUrl,
      createdAt: Date.now() - 7200000,
      updatedAt: Date.now() - 7200000,
    },
  ];
}

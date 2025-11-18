/**
 * API Route - Upload de factures
 * POST /api/upload - Upload un fichier et déclenche le traitement OCR
 * GET /api/upload - Liste les factures uploadées
 */

import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { publishOCRJob } from '@/lib/queue';
import { handleAPIError, ValidationError } from '@/lib/utils';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 secondes max

// Types MIME autorisés
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

// Taille maximale: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * POST /api/upload
 * Upload une facture PDF/image
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // 1. Validation du fichier
    if (!file) {
      throw new ValidationError('Aucun fichier fourni', {
        file: 'Le champ "file" est requis',
      });
    }

    // Validation du type MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new ValidationError('Type de fichier non autorisé', {
        mimeType: `Types acceptés: PDF, JPEG, PNG. Reçu: ${file.type}`,
      });
    }

    // Validation de la taille
    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError('Fichier trop volumineux', {
        size: `Taille maximale: 10MB. Reçu: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      });
    }

    // 2. Génération d'un nom de fichier unique
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = file.name.split('.').pop() || 'pdf';
    const uniqueFileName = `invoice-${timestamp}.${extension}`;

    console.log(`📤 Upload de ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

    // 3. Upload vers Vercel Blob
    const blob = await put(uniqueFileName, file, {
      access: 'public',
      addRandomSuffix: false, // Déjà unique avec timestamp
    });

    console.log(`✅ Fichier uploadé vers Blob: ${blob.url}`);

    // 4. Créer l'enregistrement Invoice en DB
    const invoice = await prisma.invoice.create({
      data: {
        fileName: file.name,
        fileUrl: blob.url,
        fileSize: file.size,
        mimeType: file.type,
        status: 'UPLOADED',
        uploadedAt: new Date(),
      },
    });

    console.log(`✅ Invoice créée en DB: ${invoice.id}`);

    // 5. Déclencher le traitement OCR asynchrone via QStash
    try {
      const jobId = await publishOCRJob(invoice.id);
      console.log(`✅ Job OCR déclenché: ${jobId}`);
    } catch (qstashError) {
      // Log l'erreur mais ne bloque pas la réponse
      console.error('⚠️ Erreur lors du déclenchement du job OCR:', qstashError);
      // L'invoice est créée, le traitement OCR pourra être relancé manuellement
    }

    // 6. Retourner la réponse
    return NextResponse.json(
      {
        success: true,
        message: 'Fichier uploadé avec succès',
        invoice: {
          id: invoice.id,
          fileName: invoice.fileName,
          fileUrl: invoice.fileUrl,
          fileSize: invoice.fileSize,
          mimeType: invoice.mimeType,
          status: invoice.status,
          uploadedAt: invoice.uploadedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * GET /api/upload
 * Liste les factures uploadées (avec filtres optionnels)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Filtres optionnels
    const status = searchParams.get('status'); // UPLOADED, OCR_IN_PROGRESS, etc.
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Construction de la requête Prisma
    const where: any = {};

    if (status) {
      where.status = status;
    }

    // Récupération des factures
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: {
          uploadedAt: 'desc',
        },
        take: limit,
        skip: offset,
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          fileSize: true,
          mimeType: true,
          status: true,
          uploadedAt: true,
          processedAt: true,
          ocrConfidence: true,
          supplierName: true,
          invoiceNumber: true,
          invoiceDate: true,
          amountTTC: true,
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

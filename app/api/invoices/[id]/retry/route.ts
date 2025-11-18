/**
 * API Route - Relancer OCR manuellement
 * POST /api/invoices/[id]/retry
 */

import { prisma } from '@/lib/db';
import { publishOCRJob } from '@/lib/queue';
import { handleAPIError, ValidationError } from '@/lib/utils';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return Response.json(
        { error: 'Facture introuvable' },
        { status: 404 }
      );
    }

    // Vérifier qu'on peut relancer
    if (invoice.status === 'OCR_PROCESSING') {
      throw new ValidationError('OCR déjà en cours');
    }

    if (invoice.status === 'VALIDATED' || invoice.status === 'EXPORTED') {
      throw new ValidationError('Facture déjà traitée, impossible de relancer OCR');
    }

    // Reset statut
    await prisma.invoice.update({
      where: { id },
      data: {
        status: 'UPLOADED',
        errorMessage: null,
      },
    });

    // Relancer le job OCR
    await publishOCRJob(id);

    return Response.json({
      success: true,
      message: 'OCR relancé',
      invoiceId: id,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * API Route - Détails d'une facture
 * GET /api/invoices/[id]
 */

import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/utils';
import { handleAPIError } from '@/lib/utils';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        accountingEntries: true,
      },
    });

    if (!invoice) {
      return Response.json(
        { error: 'Facture introuvable' },
        { status: 404 }
      );
    }

    // Déchiffrer les données sensibles si présentes
    let ocrText = null;
    if (invoice.ocrText) {
      try {
        ocrText = decrypt(invoice.ocrText);
      } catch (decryptError) {
        console.error('❌ Erreur décryptage texte OCR:', decryptError);
      }
    }

    // Ne pas exposer les données brutes encryptées dans l'API
    const { ocrRawData, ...invoiceWithoutRaw } = invoice;

    return Response.json({
      success: true,
      invoice: {
        ...invoiceWithoutRaw,
        ocrText, // Déchiffré
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

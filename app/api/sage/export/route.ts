/**
 * API Route - Export Sage 50 (RImport.txt)
 * POST /api/sage/export
 * Génère un fichier RImport.txt pour import dans Sage 50/Ciel Compta
 */

import { prisma } from '@/lib/db';
import { put } from '@vercel/blob';
import { generateRImportFile, generateRImportFilename } from '@/lib/sage/rimport-generator';
import { handleAPIError, ValidationError } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { invoiceIds } = body;

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      throw new ValidationError('invoiceIds requis (array)');
    }

    console.log(`📊 Export Sage pour ${invoiceIds.length} factures`);

    // 1. Récupérer les factures avec leurs écritures
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        status: { in: ['VALIDATED', 'AI_COMPLETED'] }, // Seulement factures validées
      },
      include: {
        accountingEntries: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (invoices.length === 0) {
      throw new ValidationError('Aucune facture validée trouvée');
    }

    if (invoices.length !== invoiceIds.length) {
      const missing = invoiceIds.length - invoices.length;
      console.warn(`⚠️ ${missing} factures non trouvées ou non validées`);
    }

    // 2. Générer le fichier RImport
    const rimportBuffer = await generateRImportFile(invoices);

    // 3. Upload vers Vercel Blob
    const filename = generateRImportFilename();
    const blob = await put(`sage-exports/${filename}`, rimportBuffer, {
      access: 'public',
      contentType: 'text/plain; charset=windows-1252',
    });

    console.log(`✅ Fichier RImport uploadé: ${blob.url}`);

    // 4. Calculer totaux
    const totalAmount = invoices.reduce(
      (sum, inv) => sum + (inv.amountTTC ? parseFloat(inv.amountTTC.toString()) : 0),
      0
    );

    // 5. Créer l'enregistrement SageExport
    const sageExport = await prisma.sageExport.create({
      data: {
        exportDate: new Date(),
        fileName: filename,
        fileUrl: blob.url,
        fileSize: rimportBuffer.length,
        invoiceCount: invoices.length,
        totalAmount,
        status: 'COMPLETED',
        invoices: {
          connect: invoices.map(inv => ({ id: inv.id })),
        },
      },
    });

    // 6. Mettre à jour le statut des factures
    await prisma.invoice.updateMany({
      where: { id: { in: invoices.map(inv => inv.id) } },
      data: {
        status: 'EXPORTED',
        exportedAt: new Date(),
      },
    });

    console.log(`✅ ${invoices.length} factures marquées comme exportées`);

    // 7. Réponse
    return Response.json({
      success: true,
      export: {
        id: sageExport.id,
        fileName: filename,
        downloadUrl: blob.url,
        invoiceCount: invoices.length,
        totalAmount,
      },
    });

  } catch (error) {
    return handleAPIError(error);
  }
}

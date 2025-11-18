/**
 * API Route - Analyse IA avec Claude
 * POST /api/invoices/[id]/analyze
 * Appelé de manière asynchrone par QStash après l'OCR
 */

import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/utils';
import { analyzeInvoiceWithRetry } from '@/lib/ai';
import { handleAPIError, AIError } from '@/lib/utils';
import { verifyQStashSignature } from '@/lib/queue';

export const maxDuration = 25;

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Vérifier signature QStash
    const isValidSignature = await verifyQStashSignature(request);
    if (!isValidSignature) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: invoiceId } = params;

    console.log(`🤖 Démarrage analyse IA pour facture: ${invoiceId}`);

    // 2. Récupérer la facture
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new AIError(`Facture ${invoiceId} introuvable`);
    }

    // Vérifier que l'OCR est terminé
    if (invoice.status !== 'OCR_COMPLETED') {
      throw new AIError(`OCR non terminé pour facture ${invoiceId}`);
    }

    // 3. Mettre à jour le statut
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'AI_PROCESSING' },
    });

    // 4. Déchiffrer le texte OCR
    if (!invoice.ocrText) {
      throw new AIError('Texte OCR manquant');
    }

    const ocrText = decrypt(invoice.ocrText);

    // 5. Préparer les données pour Claude
    const analysisInput = {
      ocrText,
      extractedFields: {
        supplierName: invoice.supplierName || undefined,
        invoiceNumber: invoice.invoiceNumber || undefined,
        invoiceDate: invoice.invoiceDate || null,
        amountHT: invoice.amountHT ? parseFloat(invoice.amountHT.toString()) : undefined,
        amountTVA: invoice.amountTVA ? parseFloat(invoice.amountTVA.toString()) : undefined,
        amountTTC: invoice.amountTTC ? parseFloat(invoice.amountTTC.toString()) : undefined,
        tvaRate: invoice.tvaRate ? parseFloat(invoice.tvaRate.toString()) : undefined,
      },
    };

    // 6. Analyser avec Claude (avec retry)
    console.log('🤖 Appel Claude AI...');
    const startTime = Date.now();

    const aiResult = await analyzeInvoiceWithRetry(analysisInput);

    const duration = Date.now() - startTime;
    console.log(`✅ Analyse IA terminée en ${duration}ms`);

    // 7. Mettre à jour la facture avec les données IA
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'AI_COMPLETED',

        // Mise à jour des champs si Claude a corrigé
        supplierName: aiResult.supplier.name,
        invoiceNumber: aiResult.invoice.number,
        invoiceDate: new Date(aiResult.invoice.date),

        amountHT: aiResult.amounts.ht,
        amountTVA: aiResult.amounts.tva,
        amountTTC: aiResult.amounts.ttc,
        tvaRate: aiResult.amounts.tvaRate,

        accountNumber: aiResult.supplier.accountNumber,
        expenseAccount: aiResult.accounting.expenseAccount,
        journalCode: aiResult.accounting.journalCode,
        analyticalCode: aiResult.accounting.analyticalCode,
      },
    });

    // 8. Créer les écritures comptables
    const entryDate = new Date(aiResult.invoice.date);

    for (const entry of aiResult.entries) {
      await prisma.accountingEntry.create({
        data: {
          invoiceId,
          journalCode: entry.journalCode,
          entryDate,
          accountNumber: entry.accountNumber,
          label: entry.label,
          debit: entry.debit,
          credit: entry.credit,
        },
      });
    }

    console.log(`✅ ${aiResult.entries.length} écritures comptables créées`);

    // 9. Réponse succès
    return Response.json({
      success: true,
      invoiceId,
      result: aiResult,
      duration,
    });

  } catch (error) {
    console.error('❌ Erreur analyse IA:', error);

    // Mettre à jour le statut en erreur
    try {
      const { id: invoiceId } = params;
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'ERROR',
          errorMessage: error instanceof Error ? error.message : 'Erreur IA inconnue',
        },
      });
    } catch (updateError) {
      console.error('❌ Impossible de mettre à jour le statut:', updateError);
    }

    return handleAPIError(error);
  }
}

/**
 * API Route - Traitement OCR avec AWS Textract
 * POST /api/ocr/process
 * Appelé de manière asynchrone par QStash après l'upload
 */

import { prisma } from '@/lib/db';
import { analyzeInvoice } from '@/lib/ocr';
import { encrypt } from '@/lib/utils';
import { handleAPIError, OCRError } from '@/lib/utils';
import { verifyQStashSignature, publishAIAnalysisJob } from '@/lib/queue';

// Timeout Vercel : 25 secondes max
export const maxDuration = 25;

export async function POST(request: Request) {
  try {
    // 1. Vérifier signature QStash (sécurité)
    const isValidSignature = await verifyQStashSignature(request);
    if (!isValidSignature) {
      console.error('❌ Signature QStash invalide');
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Récupérer invoiceId
    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      throw new OCRError('invoiceId manquant');
    }

    console.log(`🔍 Démarrage OCR pour facture: ${invoiceId}`);

    // 3. Récupérer la facture depuis DB
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new OCRError(`Facture ${invoiceId} introuvable`);
    }

    // Vérifier que la facture n'est pas déjà en cours de traitement
    if (invoice.status === 'OCR_PROCESSING') {
      console.log(`⏭️ OCR déjà en cours pour ${invoiceId}`);
      return Response.json({
        success: true,
        message: 'OCR already in progress'
      });
    }

    // 4. Mettre à jour le statut
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'OCR_PROCESSING',
        errorMessage: null, // Reset erreurs précédentes
      },
    });

    // 5. Télécharger le fichier depuis Vercel Blob
    console.log(`📥 Téléchargement: ${invoice.fileUrl}`);
    const fileResponse = await fetch(invoice.fileUrl);

    if (!fileResponse.ok) {
      throw new OCRError('Impossible de télécharger le fichier');
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6. Analyser avec AWS Textract
    console.log(`🔍 Analyse Textract en cours...`);
    const startTime = Date.now();

    const ocrResult = await analyzeInvoice(buffer);

    const duration = Date.now() - startTime;
    console.log(`✅ Textract terminé en ${duration}ms`);

    // 7. Chiffrer les données brutes OCR
    const encryptedRawData = encrypt(JSON.stringify(ocrResult.raw));
    const encryptedText = encrypt(ocrResult.text);

    // 8. Mettre à jour la facture avec les résultats OCR
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'OCR_COMPLETED',
        processedAt: new Date(),

        // Données brutes (encryptées)
        ocrRawData: encryptedRawData,
        ocrText: encryptedText,
        ocrConfidence: ocrResult.confidence,

        // Données extraites par Textract
        supplierName: ocrResult.fields.fournisseur || null,
        supplierVAT: ocrResult.fields.numeroTVAFournisseur || null,
        supplierAddress: ocrResult.fields.adresseFournisseur || null,

        invoiceNumber: ocrResult.fields.numeroFacture || null,
        invoiceDate: ocrResult.fields.dateFacture || null,
        dueDate: ocrResult.fields.dateEcheance || null,

        amountHT: ocrResult.fields.montantHT || null,
        amountTVA: ocrResult.fields.montantTVA || null,
        amountTTC: ocrResult.fields.montantTTC || null,
        tvaRate: ocrResult.fields.tauxTVA || null,
        currency: ocrResult.fields.devise || 'EUR',

        // Reset compteur d'erreurs
        retryCount: 0,
        errorMessage: null,
      },
    });

    console.log(`✅ Facture ${invoiceId} mise à jour avec données OCR`);
    console.log(`   - Fournisseur: ${ocrResult.fields.fournisseur}`);
    console.log(`   - Montant TTC: ${ocrResult.fields.montantTTC}€`);
    console.log(`   - Confiance: ${(ocrResult.confidence * 100).toFixed(1)}%`);

    // 9. Déclencher analyse IA si confiance suffisante
    if (ocrResult.confidence >= 0.7) {
      console.log(`🤖 Déclenchement analyse IA pour ${invoiceId}`);
      try {
        await publishAIAnalysisJob(invoiceId);
      } catch (aiJobError) {
        console.error('⚠️ Erreur déclenchement IA:', aiJobError);
        // Ne pas bloquer, l'IA peut être lancée manuellement
      }
    } else {
      console.log(`⚠️ Confiance trop faible (${(ocrResult.confidence * 100).toFixed(1)}%), analyse IA non déclenchée`);
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'PENDING_VALIDATION',
          errorMessage: 'Confiance OCR faible, validation manuelle recommandée',
        },
      });
    }

    // 10. Réponse succès
    return Response.json({
      success: true,
      invoiceId,
      confidence: ocrResult.confidence,
      fields: ocrResult.fields,
      duration,
    });

  } catch (error) {
    console.error('❌ Erreur traitement OCR:', error);

    // Récupérer l'invoiceId pour mettre à jour le statut
    try {
      const body = await request.json();
      const { invoiceId } = body;

      if (invoiceId) {
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
        });

        if (invoice) {
          const newRetryCount = (invoice.retryCount || 0) + 1;
          const maxRetries = 3;

          await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
              status: newRetryCount >= maxRetries ? 'OCR_FAILED' : 'UPLOADED',
              errorMessage: error instanceof Error ? error.message : 'Erreur OCR inconnue',
              retryCount: newRetryCount,
              lastRetryAt: new Date(),
            },
          });

          console.log(`❌ Facture ${invoiceId} - Tentative ${newRetryCount}/${maxRetries}`);
        }
      }
    } catch (updateError) {
      console.error('❌ Impossible de mettre à jour le statut:', updateError);
    }

    return handleAPIError(error);
  }
}

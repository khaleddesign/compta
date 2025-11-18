/**
 * QStash Client - Gestion des jobs asynchrones
 * Utilise Upstash QStash pour les traitements OCR et IA
 */

import { Client } from '@upstash/qstash';

if (!process.env.QSTASH_TOKEN) {
  console.warn('⚠️ QSTASH_TOKEN manquante dans .env');
}

// Initialisation du client QStash
export const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN || '',
});

/**
 * Publie un job OCR pour traiter une facture
 * @param invoiceId - ID de la facture à traiter
 * @returns Job ID QStash
 */
export async function publishOCRJob(invoiceId: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const response = await qstashClient.publishJSON({
    url: `${baseUrl}/api/ocr/process`,
    body: {
      invoiceId,
      type: 'OCR_ANALYSIS',
    },
    retries: 3,
    delay: 2, // Délai de 2 secondes avant traitement
  });

  console.log(`✅ Job OCR publié pour facture ${invoiceId}:`, response.messageId);
  return response.messageId;
}

/**
 * Publie un job d'analyse IA (Claude) pour une facture
 * @param invoiceId - ID de la facture à analyser
 * @returns Job ID QStash
 */
export async function publishAIAnalysisJob(invoiceId: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const response = await qstashClient.publishJSON({
    url: `${baseUrl}/api/invoices/${invoiceId}/analyze`,
    body: {
      invoiceId,
      type: 'AI_ANALYSIS',
    },
    retries: 3,
    delay: 2,
  });

  console.log(`✅ Job IA publié pour facture ${invoiceId}:`, response.messageId);
  return response.messageId;
}

/**
 * Vérifie la signature QStash d'une requête webhook
 * Pour sécuriser les endpoints de traitement asynchrone
 *
 * @param request - Request Next.js
 * @returns true si signature valide
 */
export async function verifyQStashSignature(
  request: Request
): Promise<boolean> {
  const signature = request.headers.get('upstash-signature');
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!signature || !currentSigningKey) {
    console.warn('⚠️ Signature QStash manquante');
    return false;
  }

  try {
    const body = await request.text();
    const { Receiver } = await import('@upstash/qstash');

    const receiverConfig: any = {
      currentSigningKey,
    };

    if (nextSigningKey) {
      receiverConfig.nextSigningKey = nextSigningKey;
    }

    const receiver = new Receiver(receiverConfig);

    await receiver.verify({
      signature,
      body,
    });

    return true;
  } catch (error) {
    console.error('❌ Erreur vérification signature QStash:', error);
    return false;
  }
}

/**
 * Publie un job de génération d'export Sage
 * @param invoiceIds - IDs des factures à exporter
 * @returns Job ID QStash
 */
export async function publishSageExportJob(
  invoiceIds: string[]
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const response = await qstashClient.publishJSON({
    url: `${baseUrl}/api/sage/export`,
    body: {
      invoiceIds,
      type: 'SAGE_EXPORT',
    },
    retries: 2,
  });

  console.log(`✅ Job Export Sage publié pour ${invoiceIds.length} factures:`, response.messageId);
  return response.messageId;
}

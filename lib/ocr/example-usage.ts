/**
 * EXEMPLES D'UTILISATION D'AWS TEXTRACT
 *
 * Ce fichier montre comment utiliser le nouveau service AWS Textract
 * pour analyser des factures PDF.
 */

import { analyzeInvoice, analyzeInvoiceFromUrl, validateAWSCredentials } from './aws-textract';
import { analyzeInvoiceWithAI } from '../claude-ai';

/**
 * Exemple 1: Analyse d'une facture depuis un Buffer
 */
export async function example1_AnalyzeFromBuffer(fileBuffer: Buffer) {
  try {
    console.log('📄 Analyse de la facture avec AWS Textract...');

    const result = await analyzeInvoice(fileBuffer);

    console.log('✅ Analyse terminée !');
    console.log('Confiance:', `${result.confidence.toFixed(2)}%`);
    console.log('Fournisseur:', result.fields.fournisseur);
    console.log('Numéro de facture:', result.fields.numeroFacture);
    console.log('Date:', result.fields.dateFacture);
    console.log('Montant TTC:', `${result.fields.montantTTC}€`);
    console.log('TVA:', `${result.fields.tauxTVA}%`);

    return result;
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error);
    throw error;
  }
}

/**
 * Exemple 2: Analyse d'une facture depuis une URL (Vercel Blob)
 */
export async function example2_AnalyzeFromUrl(fileUrl: string) {
  try {
    console.log('🌐 Téléchargement et analyse depuis URL...');

    const result = await analyzeInvoiceFromUrl(fileUrl);

    console.log('✅ Analyse terminée !');
    console.log('Données extraites:', result.fields);

    return result;
  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  }
}

/**
 * Exemple 3: Workflow complet (OCR + IA + Export)
 */
export async function example3_CompleteWorkflow(fileUrl: string) {
  try {
    // Étape 1: Validation des credentials
    console.log('🔐 Validation des credentials AWS...');
    if (!validateAWSCredentials()) {
      throw new Error('Credentials AWS manquants ou invalides');
    }

    // Étape 2: OCR avec AWS Textract
    console.log('📄 Analyse OCR avec AWS Textract...');
    const ocrResult = await analyzeInvoiceFromUrl(fileUrl);
    console.log(`✅ OCR terminé (confiance: ${ocrResult.confidence.toFixed(2)}%)`);

    // Vérifier la confiance
    if (ocrResult.confidence < 80) {
      console.warn('⚠️  Confiance faible - Validation manuelle recommandée');
    }

    // Étape 3: Analyse IA avec Claude
    console.log('🤖 Génération des écritures comptables avec Claude...');
    const ecritures = await analyzeInvoiceWithAI({
      ocrText: ocrResult.text,
      ocrFields: ocrResult.fields,
      context: `Confiance OCR: ${ocrResult.confidence}%`,
    });
    console.log('✅ Écritures générées:', ecritures.lignes.length, 'lignes');

    // Étape 4: Affichage du résultat
    console.log('\n📊 Résumé:');
    console.log('Journal:', ecritures.journal);
    console.log('Date:', ecritures.dateEcriture);
    console.log('Pièce:', ecritures.pieceComptable);

    ecritures.lignes.forEach((ligne, index) => {
      console.log(`\n${index + 1}. ${ligne.libelleCompte} (${ligne.numeroCompte})`);
      console.log(`   Débit: ${ligne.debit}€ | Crédit: ${ligne.credit}€`);
    });

    return { ocrResult, ecritures };
  } catch (error) {
    console.error('❌ Erreur dans le workflow:', error);
    throw error;
  }
}

/**
 * Exemple 4: Traitement avec gestion d'erreurs avancée
 */
export async function example4_WithErrorHandling(fileUrl: string) {
  // Validation des credentials
  if (!validateAWSCredentials()) {
    return {
      success: false,
      error: 'Credentials AWS manquants. Vérifiez AWS_REGION, AWS_ACCESS_KEY_ID et AWS_SECRET_ACCESS_KEY',
    };
  }

  try {
    // Analyse OCR
    const ocrResult = await analyzeInvoiceFromUrl(fileUrl);

    // Vérification de la qualité
    if (ocrResult.confidence < 70) {
      return {
        success: false,
        error: `Confiance trop faible (${ocrResult.confidence}%). Le document nécessite une vérification manuelle.`,
        data: ocrResult,
      };
    }

    // Vérification des champs obligatoires
    const requiredFields = ['fournisseur', 'numeroFacture', 'montantTTC'];
    const missingFields = requiredFields.filter(
      (field) => !ocrResult.fields[field as keyof typeof ocrResult.fields]
    );

    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Champs manquants: ${missingFields.join(', ')}`,
        data: ocrResult,
      };
    }

    // Génération des écritures
    const ecritures = await analyzeInvoiceWithAI({
      ocrText: ocrResult.text,
      ocrFields: ocrResult.fields,
    });

    return {
      success: true,
      data: {
        ocr: ocrResult,
        ecritures,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

/**
 * Exemple 5: Comparaison de champs extraits
 */
export async function example5_CompareFields(fileUrl: string) {
  const result = await analyzeInvoiceFromUrl(fileUrl);

  console.log('\n📋 Champs extraits:');
  console.log('─'.repeat(50));

  const fields = result.fields;

  // Informations fournisseur
  console.log('\n👤 FOURNISSEUR:');
  console.log('  Nom:', fields.fournisseur || 'N/A');
  console.log('  Adresse:', fields.adresseFournisseur || 'N/A');
  console.log('  N° TVA:', fields.numeroTVAFournisseur || 'N/A');
  console.log('  SIRET:', fields.siretFournisseur || 'N/A');

  // Informations facture
  console.log('\n📄 FACTURE:');
  console.log('  N° Facture:', fields.numeroFacture || 'N/A');
  console.log('  Date:', fields.dateFacture?.toLocaleDateString('fr-FR') || 'N/A');
  console.log('  Échéance:', fields.dateEcheance?.toLocaleDateString('fr-FR') || 'N/A');

  // Montants
  console.log('\n💰 MONTANTS:');
  console.log('  HT:', fields.montantHT ? `${fields.montantHT.toFixed(2)}€` : 'N/A');
  console.log('  TVA:', fields.montantTVA ? `${fields.montantTVA.toFixed(2)}€` : 'N/A');
  console.log('  TTC:', fields.montantTTC ? `${fields.montantTTC.toFixed(2)}€` : 'N/A');
  console.log('  Taux TVA:', fields.tauxTVA ? `${fields.tauxTVA.toFixed(2)}%` : 'N/A');
  console.log('  Devise:', fields.devise || 'EUR');

  // Confiance
  console.log('\n📊 QUALITÉ:');
  console.log('  Confiance globale:', `${result.confidence.toFixed(2)}%`);

  if (result.confidence >= 95) {
    console.log('  ✅ Excellente qualité');
  } else if (result.confidence >= 80) {
    console.log('  ⚠️  Qualité acceptable - Vérification recommandée');
  } else {
    console.log('  ❌ Qualité faible - Validation manuelle requise');
  }

  return result;
}

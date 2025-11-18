import {
  TextractClient,
  AnalyzeExpenseCommand,
  AnalyzeExpenseCommandInput,
  AnalyzeExpenseCommandOutput,
  GetExpenseAnalysisCommand,
  StartExpenseAnalysisCommand,
  Block,
  ExpenseDocument,
  ExpenseField,
} from '@aws-sdk/client-textract';

// Configuration du client AWS Textract
const textractClient = new TextractClient({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface OCRResult {
  raw: AnalyzeExpenseCommandOutput;
  text: string;
  fields: {
    fournisseur?: string;
    numeroFacture?: string;
    dateFacture?: Date;
    dateEcheance?: Date;
    montantHT?: number;
    montantTVA?: number;
    montantTTC?: number;
    tauxTVA?: number;
    devise?: string;
    adresseFournisseur?: string;
    siretFournisseur?: string;
    numeroTVAFournisseur?: string;
  };
  confidence: number;
}

/**
 * Analyse une facture PDF avec AWS Textract
 * @param fileBuffer Buffer du fichier PDF
 * @returns Résultat de l'analyse OCR
 */
export async function analyzeInvoice(fileBuffer: Buffer): Promise<OCRResult> {
  try {
    const params: AnalyzeExpenseCommandInput = {
      Document: {
        Bytes: fileBuffer,
      },
    };

    const command = new AnalyzeExpenseCommand(params);
    const response = await textractClient.send(command);

    if (!response.ExpenseDocuments || response.ExpenseDocuments.length === 0) {
      throw new Error('Aucun document trouvé dans le fichier');
    }

    const expenseDoc = response.ExpenseDocuments[0];

    // Extraire le texte complet
    const fullText = extractFullText(expenseDoc);

    // Extraire les champs structurés
    const extractedFields = extractFields(expenseDoc);

    // Calculer la confiance moyenne
    const confidence = calculateConfidence(expenseDoc);

    return {
      raw: response,
      text: fullText,
      fields: extractedFields,
      confidence,
    };
  } catch (error) {
    console.error('Erreur lors de l\'analyse avec AWS Textract:', error);
    throw error;
  }
}

/**
 * Analyse une facture depuis une URL (pour fichiers stockés sur S3 ou Vercel Blob)
 * @param fileUrl URL du fichier
 * @returns Résultat de l'analyse OCR
 */
export async function analyzeInvoiceFromUrl(fileUrl: string): Promise<OCRResult> {
  try {
    // Télécharger le fichier depuis l'URL
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Erreur lors du téléchargement du fichier: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    return analyzeInvoice(fileBuffer);
  } catch (error) {
    console.error('Erreur lors de l\'analyse depuis URL:', error);
    throw error;
  }
}

/**
 * Analyse asynchrone pour les gros documents (> 5MB)
 * Utilise StartExpenseAnalysis et polling
 */
export async function analyzeInvoiceAsync(s3Bucket: string, s3Key: string): Promise<OCRResult> {
  try {
    // Démarrer l'analyse asynchrone
    const startCommand = new StartExpenseAnalysisCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: s3Bucket,
          Name: s3Key,
        },
      },
    });

    const startResponse = await textractClient.send(startCommand);
    const jobId = startResponse.JobId!;

    // Polling pour attendre la fin de l'analyse
    let jobStatus = 'IN_PROGRESS';
    let result: AnalyzeExpenseCommandOutput | null = null;

    while (jobStatus === 'IN_PROGRESS') {
      await sleep(2000); // Attendre 2 secondes

      const getCommand = new GetExpenseAnalysisCommand({ JobId: jobId });
      const getResponse = await textractClient.send(getCommand);

      jobStatus = getResponse.JobStatus!;

      if (jobStatus === 'SUCCEEDED') {
        result = getResponse as any; // Cast nécessaire car les types sont similaires
      } else if (jobStatus === 'FAILED') {
        throw new Error(`L'analyse a échoué: ${getResponse.StatusMessage}`);
      }
    }

    if (!result || !result.ExpenseDocuments || result.ExpenseDocuments.length === 0) {
      throw new Error('Aucun document trouvé dans le résultat');
    }

    const expenseDoc = result.ExpenseDocuments[0];
    const fullText = extractFullText(expenseDoc);
    const extractedFields = extractFields(expenseDoc);
    const confidence = calculateConfidence(expenseDoc);

    return {
      raw: result,
      text: fullText,
      fields: extractedFields,
      confidence,
    };
  } catch (error) {
    console.error('Erreur lors de l\'analyse asynchrone:', error);
    throw error;
  }
}

/**
 * Extrait le texte complet du document
 */
function extractFullText(expenseDoc: ExpenseDocument): string {
  const textBlocks: string[] = [];

  // Extraire le texte des blocs de ligne
  if (expenseDoc.LineItemGroups) {
    expenseDoc.LineItemGroups.forEach((group) => {
      group.LineItems?.forEach((lineItem) => {
        lineItem.LineItemExpenseFields?.forEach((field) => {
          if (field.ValueDetection?.Text) {
            textBlocks.push(field.ValueDetection.Text);
          }
        });
      });
    });
  }

  // Extraire le texte des champs du résumé
  if (expenseDoc.SummaryFields) {
    expenseDoc.SummaryFields.forEach((field) => {
      if (field.ValueDetection?.Text) {
        textBlocks.push(field.ValueDetection.Text);
      }
    });
  }

  return textBlocks.join('\n');
}

/**
 * Extrait les champs structurés de la facture
 */
function extractFields(expenseDoc: ExpenseDocument): OCRResult['fields'] {
  const fields: OCRResult['fields'] = {};

  if (!expenseDoc.SummaryFields) {
    return fields;
  }

  // Mapping des champs Textract vers nos champs
  const fieldMapping: Record<string, string> = {
    VENDOR_NAME: 'fournisseur',
    INVOICE_RECEIPT_ID: 'numeroFacture',
    INVOICE_RECEIPT_DATE: 'dateFacture',
    DUE_DATE: 'dateEcheance',
    SUBTOTAL: 'montantHT',
    TAX: 'montantTVA',
    TOTAL: 'montantTTC',
    CURRENCY_CODE: 'devise',
    VENDOR_ADDRESS: 'adresseFournisseur',
    VAT_NUMBER: 'numeroTVAFournisseur',
  };

  expenseDoc.SummaryFields.forEach((field) => {
    const fieldType = field.Type?.Text;
    const fieldValue = field.ValueDetection?.Text;

    if (!fieldType || !fieldValue) return;

    const mappedField = fieldMapping[fieldType];
    if (!mappedField) return;

    // Conversion selon le type de champ
    if (mappedField === 'dateFacture' || mappedField === 'dateEcheance') {
      fields[mappedField] = parseDate(fieldValue);
    } else if (
      mappedField === 'montantHT' ||
      mappedField === 'montantTVA' ||
      mappedField === 'montantTTC'
    ) {
      fields[mappedField] = parseAmount(fieldValue);
    } else {
      (fields as any)[mappedField] = fieldValue;
    }
  });

  // Calculer le taux de TVA si possible
  if (fields.montantTVA && fields.montantHT && fields.montantHT > 0) {
    fields.tauxTVA = (fields.montantTVA / fields.montantHT) * 100;
  }

  return fields;
}

/**
 * Calcule la confiance moyenne du document
 */
function calculateConfidence(expenseDoc: ExpenseDocument): number {
  const confidences: number[] = [];

  if (expenseDoc.SummaryFields) {
    expenseDoc.SummaryFields.forEach((field) => {
      if (field.ValueDetection?.Confidence) {
        confidences.push(field.ValueDetection.Confidence);
      }
    });
  }

  if (confidences.length === 0) return 0;

  return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
}

/**
 * Parse une date depuis différents formats
 */
function parseDate(dateString: string): Date | undefined {
  try {
    // Formats courants: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
    const formats = [
      /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
      /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        if (format === formats[1]) {
          // YYYY-MM-DD
          return new Date(dateString);
        } else {
          // DD/MM/YYYY ou DD-MM-YYYY
          const day = parseInt(match[1]);
          const month = parseInt(match[2]) - 1; // Les mois commencent à 0
          const year = parseInt(match[3]);
          return new Date(year, month, day);
        }
      }
    }

    // Fallback: essayer de parser directement
    const parsed = new Date(dateString);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  } catch (error) {
    console.error('Erreur lors du parsing de date:', error);
    return undefined;
  }
}

/**
 * Parse un montant depuis une chaîne de caractères
 * Gère les formats: 1234.56, 1 234,56, 1,234.56, etc.
 */
function parseAmount(amountString: string): number | undefined {
  try {
    // Supprimer les espaces et les symboles de devise
    let cleaned = amountString.replace(/[^\d.,\-]/g, '');

    // Détecter le séparateur décimal (le dernier . ou ,)
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');

    if (lastComma > lastDot) {
      // Format français: 1 234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      // Format anglais: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? undefined : parsed;
  } catch (error) {
    console.error('Erreur lors du parsing de montant:', error);
    return undefined;
  }
}

/**
 * Utilitaire pour attendre (sleep)
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Valide les credentials AWS
 */
export function validateAWSCredentials(): boolean {
  const required = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
  return required.every((key) => !!process.env[key]);
}

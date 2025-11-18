/**
 * Client Anthropic Claude AI
 * Analyse de factures et génération d'écritures comptables
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ClaudeAnalysisInput {
  ocrText: string;
  extractedFields: {
    supplierName?: string;
    invoiceNumber?: string;
    invoiceDate?: Date | null;
    amountHT?: number;
    amountTVA?: number;
    amountTTC?: number;
    tvaRate?: number;
  };
}

export interface AccountingEntryData {
  journalCode: string;
  accountNumber: string;
  label: string;
  debit: number;
  credit: number;
}

export interface ClaudeAnalysisResult {
  supplier: {
    name: string;
    accountNumber: string; // 401xxx
  };
  invoice: {
    number: string;
    date: string; // ISO format
  };
  amounts: {
    ht: number;
    tva: number;
    ttc: number;
    tvaRate: number;
  };
  accounting: {
    journalCode: string; // ACH, VTE, BQ, OD
    expenseAccount: string; // 6xxxxx
    analyticalCode?: string;
  };
  entries: AccountingEntryData[];
  validation: {
    isBalanced: boolean;
    totalDebit: number;
    totalCredit: number;
    confidence: number; // 0-1
    warnings: string[];
  };
}

/**
 * Analyse une facture avec Claude AI
 */
export async function analyzeInvoiceWithClaude(
  input: ClaudeAnalysisInput
): Promise<ClaudeAnalysisResult> {

  const prompt = buildAnalysisPrompt(input);

  try {
    console.log('🤖 Appel Claude AI...');
    const startTime = Date.now();

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Moins cher, rapide
      max_tokens: 2000,
      temperature: 0.1, // Peu de créativité, précision max
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Claude AI terminé en ${duration}ms`);

    // Extraire le JSON de la réponse
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Réponse Claude invalide : pas de JSON trouvé');
    }

    const result: ClaudeAnalysisResult = JSON.parse(jsonMatch[0]);

    // Validation post-traitement
    validateResult(result);

    return result;

  } catch (error) {
    console.error('❌ Erreur Claude AI:', error);
    throw error;
  }
}

/**
 * Construit le prompt pour Claude
 */
function buildAnalysisPrompt(input: ClaudeAnalysisInput): string {
  const { ocrText, extractedFields } = input;

  return `Tu es un expert-comptable français spécialisé dans la comptabilité générale.

MISSION : Analyser cette facture et générer les écritures comptables au format Sage.

=== DONNÉES OCR ===
${ocrText}

=== CHAMPS EXTRAITS ===
Fournisseur : ${extractedFields.supplierName || 'Non détecté'}
N° Facture : ${extractedFields.invoiceNumber || 'Non détecté'}
Date : ${extractedFields.invoiceDate?.toISOString().split('T')[0] || 'Non détectée'}
Montant HT : ${extractedFields.amountHT || 0} €
Montant TVA : ${extractedFields.amountTVA || 0} €
Montant TTC : ${extractedFields.amountTTC || 0} €
Taux TVA : ${extractedFields.tvaRate || 20} %

=== INSTRUCTIONS ===

1. VALIDATION DES MONTANTS
   - Vérifie que HT + TVA = TTC (tolérance ±0.02€)
   - Si incohérence, calcule les bonnes valeurs

2. CATÉGORISATION COMPTABLE
   Détermine le compte de charge approprié selon la nature :
   - 601xxx : Achats de matières premières
   - 602xxx : Achats stockés (fournitures)
   - 606xxx : Achats non stockés (services, sous-traitance)
   - 611xxx : Sous-traitance générale
   - 613xxx : Locations
   - 615xxx : Entretien et réparations
   - 621xxx : Personnel extérieur
   - 622xxx : Rémunérations d'intermédiaires et honoraires
   - 623xxx : Publicité, publications
   - 624xxx : Transports
   - 625xxx : Déplacements, missions
   - 626xxx : Frais postaux, télécommunications
   - 627xxx : Services bancaires
   - 628xxx : Divers

3. GÉNÉRATION DES ÉCRITURES
   Crée exactement 3 lignes :

   Ligne 1 (DÉBIT) : Compte de charge 6xxxxx
   - Montant : HT
   - Libellé : [Fournisseur] - [Nature de la dépense]

   Ligne 2 (DÉBIT) : Compte TVA déductible 445660
   - Montant : TVA
   - Libellé : TVA déductible [Taux]%

   Ligne 3 (CRÉDIT) : Compte fournisseur 401000
   - Montant : TTC
   - Libellé : [Fournisseur] - Facture [N°]

4. VALIDATION
   - Vérifie que Total Débit = Total Crédit
   - Signale toute anomalie

=== FORMAT DE RÉPONSE (JSON STRICT) ===

Réponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de texte avant/après) :

{
  "supplier": {
    "name": "string",
    "accountNumber": "401000"
  },
  "invoice": {
    "number": "string",
    "date": "YYYY-MM-DD"
  },
  "amounts": {
    "ht": number,
    "tva": number,
    "ttc": number,
    "tvaRate": number
  },
  "accounting": {
    "journalCode": "ACH",
    "expenseAccount": "6xxxxx",
    "analyticalCode": null
  },
  "entries": [
    {
      "journalCode": "ACH",
      "accountNumber": "6xxxxx",
      "label": "Description courte",
      "debit": number,
      "credit": 0
    },
    {
      "journalCode": "ACH",
      "accountNumber": "445660",
      "label": "TVA déductible 20%",
      "debit": number,
      "credit": 0
    },
    {
      "journalCode": "ACH",
      "accountNumber": "401000",
      "label": "Fournisseur - Facture XXX",
      "debit": 0,
      "credit": number
    }
  ],
  "validation": {
    "isBalanced": boolean,
    "totalDebit": number,
    "totalCredit": number,
    "confidence": number,
    "warnings": ["string"]
  }
}`;
}

/**
 * Valide le résultat de Claude
 */
function validateResult(result: ClaudeAnalysisResult): void {
  // Vérifier que les écritures sont équilibrées
  const totalDebit = result.entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = result.entries.reduce((sum, e) => sum + e.credit, 0);

  const difference = Math.abs(totalDebit - totalCredit);
  if (difference > 0.02) {
    throw new Error(
      `Écritures déséquilibrées : Débit ${totalDebit} ≠ Crédit ${totalCredit}`
    );
  }

  // Vérifier qu'on a exactement 3 écritures
  if (result.entries.length !== 3) {
    throw new Error(`Nombre d'écritures invalide : ${result.entries.length} (attendu : 3)`);
  }

  // Vérifier les comptes
  const accounts = result.entries.map(e => e.accountNumber);
  const hasExpenseAccount = accounts.some(a => a.startsWith('6'));
  const hasTVAAccount = accounts.includes('445660');
  const hasSupplierAccount = accounts.includes('401000');

  if (!hasExpenseAccount || !hasTVAAccount || !hasSupplierAccount) {
    throw new Error('Comptes comptables manquants ou invalides');
  }
}

/**
 * Retry avec backoff exponentiel
 */
export async function analyzeInvoiceWithRetry(
  input: ClaudeAnalysisInput,
  maxRetries = 3
): Promise<ClaudeAnalysisResult> {

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await analyzeInvoiceWithClaude(input);
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Tentative ${attempt}/${maxRetries} échouée:`, error);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`⏳ Retry dans ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Claude AI échec après ${maxRetries} tentatives: ${lastError?.message}`);
}

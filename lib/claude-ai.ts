import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

// Initialisation du client Claude
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Schéma de validation pour les lignes comptables
export const LigneComptableSchema = z.object({
  numeroCompte: z.string(),
  libelleCompte: z.string(),
  debit: z.number().min(0),
  credit: z.number().min(0),
  libelle: z.string(),
  codeAnalytique: z.string().optional(),
});

export const EcrituresComptablesSchema = z.object({
  journal: z.string(),
  dateEcriture: z.string(),
  pieceComptable: z.string(),
  lignes: z.array(LigneComptableSchema),
});

export type LigneComptable = z.infer<typeof LigneComptableSchema>;
export type EcrituresComptables = z.infer<typeof EcrituresComptablesSchema>;

interface AnalyzeInvoiceParams {
  ocrText: string;
  ocrFields: any;
  context?: string;
}

/**
 * Analyse une facture avec Claude et génère les écritures comptables
 * @param params Paramètres d'analyse
 * @returns Écritures comptables structurées
 */
export async function analyzeInvoiceWithAI(
  params: AnalyzeInvoiceParams
): Promise<EcrituresComptables> {
  const { ocrText, ocrFields, context = '' } = params;

  const prompt = `Tu es un expert comptable. Analyse cette facture et génère les écritures comptables au format JSON.

**Données OCR extraites:**
${JSON.stringify(ocrFields, null, 2)}

**Texte complet de la facture:**
${ocrText}

${context ? `**Contexte additionnel:**\n${context}` : ''}

**Instructions:**
1. Analyse attentivement toutes les informations de la facture
2. Génère les écritures comptables complètes (débit/crédit)
3. Respecte le plan comptable français
4. Assure-toi que débit = crédit (équilibre)

**Format de réponse attendu (JSON uniquement):**
{
  "journal": "AC", // Code du journal (AC pour achats)
  "dateEcriture": "2024-01-15", // Date au format YYYY-MM-DD
  "pieceComptable": "FAC2024001", // Numéro de pièce
  "lignes": [
    {
      "numeroCompte": "607000",
      "libelleCompte": "Achats de marchandises",
      "debit": 1000.00,
      "credit": 0,
      "libelle": "Achat fournisseur XYZ"
    },
    {
      "numeroCompte": "445660",
      "libelleCompte": "TVA déductible",
      "debit": 200.00,
      "credit": 0,
      "libelle": "TVA 20%"
    },
    {
      "numeroCompte": "401000",
      "libelleCompte": "Fournisseurs",
      "debit": 0,
      "credit": 1200.00,
      "libelle": "Dette fournisseur XYZ"
    }
  ]
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extraire le contenu texte de la réponse
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Réponse inattendue de Claude');
    }

    // Parser le JSON
    const jsonText = content.text.trim();
    const parsed = JSON.parse(jsonText);

    // Valider avec Zod
    const validated = EcrituresComptablesSchema.parse(parsed);

    // Vérifier l'équilibre débit/crédit
    const totalDebit = validated.lignes.reduce((sum, ligne) => sum + ligne.debit, 0);
    const totalCredit = validated.lignes.reduce((sum, ligne) => sum + ligne.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Écritures déséquilibrées: débit=${totalDebit}, crédit=${totalCredit}`
      );
    }

    return validated;
  } catch (error) {
    console.error('Erreur lors de l\'analyse avec Claude:', error);
    throw error;
  }
}

/**
 * Demande à Claude de valider/corriger des écritures comptables
 */
export async function validateEcritures(
  ecritures: EcrituresComptables
): Promise<{ isValid: boolean; suggestions: string[] }> {
  const prompt = `En tant qu'expert comptable, vérifie ces écritures comptables et fournis des suggestions d'amélioration si nécessaire:

${JSON.stringify(ecritures, null, 2)}

Réponds au format JSON:
{
  "isValid": true/false,
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Réponse inattendue');
    }

    return JSON.parse(content.text.trim());
  } catch (error) {
    console.error('Erreur lors de la validation:', error);
    throw error;
  }
}

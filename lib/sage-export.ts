import * as iconv from 'iconv-lite';
import { LigneComptable, EcrituresComptables } from './claude-ai';

export interface SageExportOptions {
  journalCode?: string;
  exerciseYear?: string;
  outputPath?: string;
}

/**
 * Formate une ligne d'écriture comptable au format Sage .TRA
 * Format: Longueur fixe, encodé en CP1252
 */
function formatLigneSage(
  ligne: LigneComptable,
  date: string,
  journal: string,
  piece: string,
  ordre: number
): string {
  // Format Sage TRA - positions fixes
  // Adapté selon votre configuration Sage

  const fields = [
    journal.padEnd(2, ' '),                          // Code journal (2 car)
    date.replace(/-/g, ''),                          // Date AAAAMMJJ (8 car)
    piece.padEnd(12, ' '),                           // Numéro de pièce (12 car)
    ligne.numeroCompte.padEnd(8, ' '),               // Compte général (8 car)
    ligne.codeAnalytique?.padEnd(6, ' ') || ''.padEnd(6, ' '), // Code analytique (6 car)
    ligne.libelle.substring(0, 25).padEnd(25, ' '),  // Libellé (25 car)
    formatMontant(ligne.debit),                      // Débit (13 car)
    formatMontant(ligne.credit),                     // Crédit (13 car)
    ordre.toString().padStart(3, '0'),               // Numéro d'ordre (3 car)
  ];

  return fields.join('');
}

/**
 * Formate un montant au format Sage (avec 2 décimales, signé)
 */
function formatMontant(montant: number): string {
  const cents = Math.round(montant * 100);
  const sign = cents >= 0 ? '+' : '-';
  const absValue = Math.abs(cents).toString().padStart(11, '0');
  return sign + absValue; // Format: +00000123456 (13 caractères)
}

/**
 * Génère un fichier .TRA pour Sage à partir des écritures comptables
 * @param ecritures Écritures comptables
 * @param options Options d'export
 * @returns Contenu du fichier en Buffer (encodé CP1252)
 */
export function generateSageFile(
  ecritures: EcrituresComptables,
  options: SageExportOptions = {}
): Buffer {
  const {
    journalCode = process.env.SAGE_JOURNAL_CODE || 'AC',
    exerciseYear = process.env.SAGE_EXERCISE_YEAR || new Date().getFullYear().toString(),
  } = options;

  const lines: string[] = [];

  // En-tête du fichier (optionnel selon votre version de Sage)
  const header = `# Export comptable - ${new Date().toISOString()}\n`;
  lines.push(header);

  // Générer chaque ligne d'écriture
  ecritures.lignes.forEach((ligne, index) => {
    const ligneSage = formatLigneSage(
      ligne,
      ecritures.dateEcriture,
      ecritures.journal || journalCode,
      ecritures.pieceComptable,
      index + 1
    );
    lines.push(ligneSage);
  });

  // Joindre toutes les lignes avec retour à la ligne
  const content = lines.join('\r\n') + '\r\n'; // CRLF pour Windows

  // Encoder en CP1252 (Windows-1252) pour Sage
  const buffer = iconv.encode(content, 'cp1252');

  return buffer;
}

/**
 * Valide les écritures avant export
 */
export function validateEcrituresForSage(ecritures: EcrituresComptables): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Vérifier la date
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ecritures.dateEcriture)) {
    errors.push('Format de date invalide (attendu: YYYY-MM-DD)');
  }

  // Vérifier le journal
  if (!ecritures.journal || ecritures.journal.length > 2) {
    errors.push('Code journal invalide (max 2 caractères)');
  }

  // Vérifier la pièce
  if (!ecritures.pieceComptable || ecritures.pieceComptable.length > 12) {
    errors.push('Numéro de pièce invalide (max 12 caractères)');
  }

  // Vérifier l'équilibre
  const totalDebit = ecritures.lignes.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = ecritures.lignes.reduce((sum, l) => sum + l.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    errors.push(`Écritures déséquilibrées: débit=${totalDebit}, crédit=${totalCredit}`);
  }

  // Vérifier chaque ligne
  ecritures.lignes.forEach((ligne, i) => {
    if (!ligne.numeroCompte || ligne.numeroCompte.length > 8) {
      errors.push(`Ligne ${i + 1}: Compte général invalide (max 8 caractères)`);
    }
    if (ligne.libelle.length > 25) {
      errors.push(`Ligne ${i + 1}: Libellé trop long (max 25 caractères)`);
    }
    if (ligne.debit < 0 || ligne.credit < 0) {
      errors.push(`Ligne ${i + 1}: Montants négatifs non autorisés`);
    }
    if (ligne.debit > 0 && ligne.credit > 0) {
      errors.push(`Ligne ${i + 1}: Une ligne ne peut avoir débit ET crédit`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Génère un nom de fichier pour l'export Sage
 */
export function generateFileName(prefix: string = 'EXPORT'): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0];
  return `${prefix}_${timestamp}.TRA`;
}

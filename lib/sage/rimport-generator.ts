/**
 * Générateur de fichiers RImport.txt pour Sage 50 (Ciel Compta)
 * Format: Délimité par tabulations (22 champs)
 * Encodage: Windows-1252 (CP1252)
 */

import { AccountingEntry, Invoice } from '@prisma/client';
import iconv from 'iconv-lite';

interface InvoiceWithEntries extends Invoice {
  accountingEntries: AccountingEntry[];
}

/**
 * Formate une date au format JJ/MM/AAAA
 */
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Formate un montant avec 2 décimales et point
 */
function formatAmount(amount: number): string {
  return amount.toFixed(2); // Ex: 1000.00
}

/**
 * Nettoie un texte pour Sage (max length, caractères spéciaux)
 */
function cleanText(text: string, maxLength: number): string {
  return text
    .replace(/[\t\r\n]/g, ' ') // Enlève tabs et retours ligne
    .replace(/[^\x20-\x7E\xC0-\xFF]/g, '') // Garde ASCII + français
    .substring(0, maxLength)
    .trim();
}

/**
 * Génère une ligne RImport (22 champs séparés par tabulations)
 */
function generateRImportLine(
  entry: AccountingEntry,
  invoice: Invoice,
  pieceNumber: string
): string {
  const fields: string[] = [];

  // 1. N° Mouvement (vide = auto-incrémentation)
  fields.push('');

  // 2. Code journal (OBLIGATOIRE)
  fields.push(entry.journalCode);

  // 3. Date écriture (OBLIGATOIRE) - JJ/MM/AAAA
  fields.push(formatDate(entry.entryDate));

  // 4. N° de compte (OBLIGATOIRE)
  fields.push(entry.accountNumber);

  // 5. Intitulé du compte (vide si le compte existe déjà dans Sage)
  fields.push('');

  // 6. Montant (OBLIGATOIRE)
  const amount = parseFloat(entry.debit.toString()) > 0
    ? parseFloat(entry.debit.toString())
    : parseFloat(entry.credit.toString());
  fields.push(formatAmount(amount));

  // 7. Sens montant (OBLIGATOIRE) - D ou C
  const sens = parseFloat(entry.debit.toString()) > 0 ? 'D' : 'C';
  fields.push(sens);

  // 8. Code statut - V = Validé
  fields.push('V');

  // 9. Libellé écriture (max 50 car) - Nom du fournisseur
  const libelle = invoice.supplierName || entry.label;
  fields.push(cleanText(libelle, 50));

  // 10. N° de pièce (max 15 car)
  fields.push(cleanText(pieceNumber, 15));

  // 11. Type - 3 = Facture fournisseur
  fields.push('3');

  // 12. Date d'échéance - Date de la facture (selon ta pratique)
  if (invoice.invoiceDate) {
    fields.push(formatDate(invoice.invoiceDate));
  } else {
    fields.push('');
  }

  // 13-22. Champs restants (vides)
  for (let i = 13; i <= 22; i++) {
    fields.push('');
  }

  // Joindre avec tabulations
  return fields.join('\t');
}

/**
 * Valide l'équilibre débit/crédit
 */
function validateBalance(entries: AccountingEntry[]): {
  isBalanced: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
} {
  const totalDebit = entries.reduce(
    (sum, e) => sum + parseFloat(e.debit.toString()),
    0
  );
  const totalCredit = entries.reduce(
    (sum, e) => sum + parseFloat(e.credit.toString()),
    0
  );

  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01;

  return {
    isBalanced,
    totalDebit: Number(totalDebit.toFixed(2)),
    totalCredit: Number(totalCredit.toFixed(2)),
    difference: Number(difference.toFixed(2)),
  };
}

/**
 * Génère un fichier RImport.txt pour Sage 50
 */
export async function generateRImportFile(
  invoices: InvoiceWithEntries[]
): Promise<Buffer> {

  const lines: string[] = [];

  // En-têtes obligatoires
  lines.push('##Fichier\tRImport');
  lines.push('##Section\tMvt');

  // Numéro de pièce commence à 1
  let pieceCounter = 1;

  // Collecter toutes les écritures
  const allEntries: { entry: AccountingEntry; invoice: Invoice; pieceNum: string }[] = [];

  for (const invoice of invoices) {
    if (!invoice.accountingEntries || invoice.accountingEntries.length === 0) {
      throw new Error(`Facture ${invoice.id} n'a pas d'écritures comptables`);
    }

    const pieceNumber = String(pieceCounter).padStart(3, '0'); // 001, 002, 003...

    for (const entry of invoice.accountingEntries) {
      allEntries.push({ entry, invoice, pieceNum: pieceNumber });
    }

    pieceCounter++;
  }

  // Valider l'équilibre global
  const balance = validateBalance(allEntries.map(e => e.entry));

  if (!balance.isBalanced) {
    throw new Error(
      `Écritures déséquilibrées !\n` +
      `Total Débit: ${balance.totalDebit}€\n` +
      `Total Crédit: ${balance.totalCredit}€\n` +
      `Différence: ${balance.difference}€`
    );
  }

  console.log(`✅ Écritures équilibrées: ${balance.totalDebit}€`);

  // Générer les lignes d'écritures
  for (const { entry, invoice, pieceNum } of allEntries) {
    const line = generateRImportLine(entry, invoice, pieceNum);
    lines.push(line);
  }

  // Joindre avec saut de ligne Windows (CRLF)
  const content = lines.join('\r\n');

  // Encoder en Windows-1252 (CP1252)
  const buffer = iconv.encode(content, 'win1252');

  console.log(`✅ Fichier RImport généré: ${lines.length - 2} écritures, ${buffer.length} bytes`);

  return buffer;
}

/**
 * Génère un nom de fichier avec timestamp
 */
export function generateRImportFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');

  return `RImport_${year}${month}${day}_${hour}${minute}${second}.txt`;
}

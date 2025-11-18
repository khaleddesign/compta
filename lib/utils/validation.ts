import { z } from 'zod';

/**
 * Validation numéro SIREN (9 chiffres)
 */
export function isValidSIREN(siren: string): boolean {
  const cleaned = siren.replace(/\s/g, '');
  return /^\d{9}$/.test(cleaned);
}

/**
 * Validation numéro SIRET (14 chiffres)
 */
export function isValidSIRET(siret: string): boolean {
  const cleaned = siret.replace(/\s/g, '');
  return /^\d{14}$/.test(cleaned);
}

/**
 * Validation numéro TVA intracommunautaire français
 * Format: FR + 2 chiffres clé + 9 chiffres SIREN
 */
export function isValidFrenchVAT(vat: string): boolean {
  const cleaned = vat.replace(/\s/g, '').toUpperCase();
  return /^FR[0-9A-Z]{2}\d{9}$/.test(cleaned);
}

/**
 * Validation cohérence montants HT + TVA = TTC
 */
export function validateAmounts(
  ht: number,
  tva: number,
  ttc: number,
  tolerance = 0.02
): { isValid: boolean; difference: number; message?: string } {
  const calculated = ht + tva;
  const difference = Math.abs(calculated - ttc);

  return {
    isValid: difference <= tolerance,
    difference,
    message: difference > tolerance
      ? `Incohérence: HT(${ht}) + TVA(${tva}) = ${calculated.toFixed(2)} ≠ TTC(${ttc}). Diff: ${difference.toFixed(2)}€`
      : undefined,
  };
}

/**
 * Calcul TVA depuis montant HT et taux
 */
export function calculateTVA(ht: number, rate: number): number {
  return Number((ht * (rate / 100)).toFixed(2));
}

/**
 * Calcul TTC depuis HT et TVA
 */
export function calculateTTC(ht: number, tva: number): number {
  return Number((ht + tva).toFixed(2));
}

/**
 * Normalise un numéro de compte comptable
 */
export function normalizeAccountNumber(account: string): string {
  return account.replace(/\s/g, '').padEnd(8, '0').substring(0, 8);
}

/**
 * Schéma Zod pour validation facture
 */
export const InvoiceValidationSchema = z.object({
  supplierName: z.string().min(1, 'Nom fournisseur requis'),
  invoiceNumber: z.string().min(1, 'Numéro facture requis'),
  invoiceDate: z.coerce.date(),
  amountHT: z.number().positive('Montant HT doit être positif'),
  amountTVA: z.number().nonnegative('Montant TVA doit être positif ou nul'),
  amountTTC: z.number().positive('Montant TTC doit être positif'),
  tvaRate: z.number().min(0).max(100, 'Taux TVA invalide'),
  accountNumber: z.string().regex(/^\d{6,8}$/, 'Compte comptable invalide'),
  journalCode: z.enum(['ACH', 'VTE', 'BQ', 'OD'], {
    errorMap: () => ({ message: 'Code journal invalide' }),
  }),
}).refine(
  (data) => {
    const validation = validateAmounts(data.amountHT, data.amountTVA, data.amountTTC);
    return validation.isValid;
  },
  {
    message: 'Incohérence entre HT, TVA et TTC',
    path: ['amountTTC'],
  }
);

export type InvoiceValidationInput = z.infer<typeof InvoiceValidationSchema>;

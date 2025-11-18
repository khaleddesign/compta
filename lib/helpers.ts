import { type ClassValue, clsx } from 'clsx';

/**
 * Utilitaire pour combiner des classes CSS (compatible avec Tailwind)
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Formate un montant en euros
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Formate une date au format français
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR').format(d);
}

/**
 * Valide un fichier PDF
 */
export function validatePDFFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024; // 50MB

  if (!file.type.includes('pdf')) {
    return { valid: false, error: 'Le fichier doit être au format PDF' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'Le fichier ne doit pas dépasser 50MB' };
  }

  return { valid: true };
}

/**
 * Génère un slug à partir d'un texte
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Attend un certain temps (utile pour les tests)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

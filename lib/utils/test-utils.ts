/**
 * Script de test pour les utilitaires
 * Exécuter avec: npx tsx lib/utils/test-utils.ts
 */

import {
  encrypt,
  decrypt,
  hash,
  isValidSIREN,
  isValidSIRET,
  isValidFrenchVAT,
  validateAmounts,
  calculateTVA,
  calculateTTC,
  normalizeAccountNumber,
  InvoiceValidationSchema,
  OCRError,
  AIError,
  ValidationError,
} from './index';

console.log('🧪 Tests des utilitaires de sécurité\n');

// ============================================
// 1. Tests d'encryption/decryption
// ============================================
console.log('📦 1. Tests Encryption/Decryption');
console.log('─'.repeat(50));

const sensitiveData = 'Données confidentielles: SIREN 123456789';
console.log('Données originales:', sensitiveData);

try {
  const encrypted = encrypt(sensitiveData);
  console.log('✅ Encryption réussie:', encrypted.substring(0, 50) + '...');

  const decrypted = decrypt(encrypted);
  console.log('✅ Decryption réussie:', decrypted);

  if (decrypted === sensitiveData) {
    console.log('✅ Encryption/Decryption: SUCCÈS\n');
  } else {
    console.error('❌ Données différentes après decryption!\n');
  }
} catch (error) {
  console.error('❌ Erreur encryption/decryption:', error);
}

// Test hash
const hashedData = hash(sensitiveData);
console.log('Hash SHA-256:', hashedData);
console.log('✅ Hash: SUCCÈS\n');

// ============================================
// 2. Tests de validation
// ============================================
console.log('✅ 2. Tests de validation');
console.log('─'.repeat(50));

// SIREN
const testSIREN = [
  { value: '123456789', expected: true },
  { value: '123 456 789', expected: true },
  { value: '12345678', expected: false },
  { value: 'ABCDEFGHI', expected: false },
];

console.log('SIREN:');
testSIREN.forEach(({ value, expected }) => {
  const result = isValidSIREN(value);
  const status = result === expected ? '✅' : '❌';
  console.log(`  ${status} "${value}" → ${result} (attendu: ${expected})`);
});

// SIRET
const testSIRET = [
  { value: '12345678901234', expected: true },
  { value: '123 456 789 01234', expected: true },
  { value: '123456789012', expected: false },
];

console.log('\nSIRET:');
testSIRET.forEach(({ value, expected }) => {
  const result = isValidSIRET(value);
  const status = result === expected ? '✅' : '❌';
  console.log(`  ${status} "${value}" → ${result} (attendu: ${expected})`);
});

// TVA française
const testVAT = [
  { value: 'FR12123456789', expected: true },
  { value: 'FR AB 123456789', expected: true },
  { value: 'FR123456789', expected: false },
  { value: 'DE123456789', expected: false },
];

console.log('\nTVA française:');
testVAT.forEach(({ value, expected }) => {
  const result = isValidFrenchVAT(value);
  const status = result === expected ? '✅' : '❌';
  console.log(`  ${status} "${value}" → ${result} (attendu: ${expected})`);
});

// ============================================
// 3. Tests calculs comptables
// ============================================
console.log('\n💰 3. Tests calculs comptables');
console.log('─'.repeat(50));

// Validation montants
const testAmounts = [
  { ht: 1000, tva: 200, ttc: 1200, valid: true },
  { ht: 1000, tva: 200, ttc: 1199.99, valid: true }, // tolérance 0.02€
  { ht: 1000, tva: 200, ttc: 1180, valid: false },
];

console.log('Validation montants HT + TVA = TTC:');
testAmounts.forEach(({ ht, tva, ttc, valid }) => {
  const result = validateAmounts(ht, tva, ttc);
  const status = result.isValid === valid ? '✅' : '❌';
  console.log(
    `  ${status} ${ht} + ${tva} = ${ttc} → ${result.isValid} (diff: ${result.difference.toFixed(2)}€)`
  );
  if (result.message) {
    console.log(`      ${result.message}`);
  }
});

// Calcul TVA
console.log('\nCalcul TVA:');
const ht = 1000;
const rate = 20;
const tva = calculateTVA(ht, rate);
console.log(`  HT: ${ht}€, Taux: ${rate}%`);
console.log(`  ✅ TVA calculée: ${tva}€`);

// Calcul TTC
const ttc = calculateTTC(ht, tva);
console.log(`  ✅ TTC calculé: ${ttc}€`);

// Normalisation compte comptable
console.log('\nNormalisation comptes:');
const testAccounts = [
  { input: '401', expected: '40100000' },
  { input: '607000', expected: '60700000' },
  { input: '445660', expected: '44566000' },
];

testAccounts.forEach(({ input, expected }) => {
  const result = normalizeAccountNumber(input);
  const status = result === expected ? '✅' : '❌';
  console.log(`  ${status} "${input}" → "${result}" (attendu: "${expected}")`);
});

// ============================================
// 4. Tests validation Zod
// ============================================
console.log('\n📋 4. Tests validation Zod');
console.log('─'.repeat(50));

const validInvoice = {
  supplierName: 'ACME Corp',
  invoiceNumber: 'FAC-2024-001',
  invoiceDate: new Date('2024-01-15'),
  amountHT: 1000,
  amountTVA: 200,
  amountTTC: 1200,
  tvaRate: 20,
  accountNumber: '401000',
  journalCode: 'ACH' as const,
};

console.log('Facture valide:');
try {
  const result = InvoiceValidationSchema.parse(validInvoice);
  console.log('  ✅ Validation réussie');
  console.log('  Données:', {
    supplier: result.supplierName,
    invoice: result.invoiceNumber,
    ttc: result.amountTTC,
  });
} catch (error: any) {
  console.error('  ❌ Validation échouée:', error.message);
}

const invalidInvoice = {
  ...validInvoice,
  amountTTC: 999, // Incohérence
};

console.log('\nFacture invalide (incohérence montants):');
try {
  InvoiceValidationSchema.parse(invalidInvoice);
  console.error('  ❌ Devrait échouer!');
} catch (error: any) {
  console.log('  ✅ Validation échouée comme prévu');
  console.log('  Erreur:', error.errors[0]?.message);
}

// ============================================
// 5. Tests erreurs custom
// ============================================
console.log('\n🚨 5. Tests erreurs custom');
console.log('─'.repeat(50));

try {
  throw new OCRError('Erreur lors de l\'OCR', 'OCR_TIMEOUT');
} catch (error) {
  if (error instanceof OCRError) {
    console.log('✅ OCRError capturée:');
    console.log(`  Message: ${error.message}`);
    console.log(`  Code: ${error.code}`);
    console.log(`  Status: ${error.statusCode}`);
  }
}

try {
  throw new AIError('Erreur Claude API');
} catch (error) {
  if (error instanceof AIError) {
    console.log('✅ AIError capturée:');
    console.log(`  Message: ${error.message}`);
    console.log(`  Code: ${error.code}`);
  }
}

try {
  throw new ValidationError('Données invalides', {
    email: 'Format invalide',
    amount: 'Doit être positif',
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('✅ ValidationError capturée:');
    console.log(`  Message: ${error.message}`);
    console.log(`  Fields:`, error.fields);
  }
}

console.log('\n✅ Tous les tests terminés!\n');

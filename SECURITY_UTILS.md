# Utilitaires de Sécurité - Documentation

## Vue d'ensemble

Ensemble d'utilitaires pour sécuriser et valider les données sensibles dans l'application de comptabilité.

## 🔒 Encryption (AES-256-GCM)

### Configuration

**Clé d'encryption générée:**
```env
ENCRYPTION_KEY="f9db44033387b93653895485473af2414574338888ac4f8acf7b87cc8d41fe6a"
```

⚠️ **Important :**
- Clé de 64 caractères hexadécimaux (32 bytes)
- Algorithme: AES-256-GCM (Galois/Counter Mode)
- Génère un IV unique pour chaque encryption
- Utilise un tag d'authentification pour intégrité

### Fonctions disponibles

#### `generateEncryptionKey()`
Génère une nouvelle clé aléatoire.

```typescript
import { generateEncryptionKey } from '@/lib/utils';

const key = generateEncryptionKey();
console.log(key); // 64 caractères hex
```

#### `encrypt(text: string): string`
Chiffre des données sensibles.

```typescript
import { encrypt } from '@/lib/utils';

const sensitive = 'SIREN: 123456789';
const encrypted = encrypt(sensitive);
// Format: "iv:authTag:encryptedData"
```

**Utilisation recommandée:**
- Données OCR brutes
- SIREN/SIRET
- Numéros de TVA
- Informations bancaires

#### `decrypt(encryptedText: string): string`
Déchiffre des données.

```typescript
import { decrypt } from '@/lib/utils';

const decrypted = decrypt(encrypted);
// Retourne le texte original
```

#### `hash(text: string): string`
Hash unidirectionnel (SHA-256).

```typescript
import { hash } from '@/lib/utils';

const hashed = hash('123456789');
// Utiliser pour recherche sans révéler la valeur
```

### Exemple d'usage en base de données

```typescript
import { prisma } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/utils';

// Enregistrer une facture avec données encryptées
const invoice = await prisma.invoice.create({
  data: {
    fileName: 'facture.pdf',
    fileUrl: blobUrl,
    fileSize: file.size,
    mimeType: file.type,
    ocrRawData: encrypt(JSON.stringify(ocrData)), // ✅ Encrypté
    supplierSIREN: encrypt('123456789'), // ✅ Encrypté
  },
});

// Lire et déchiffrer
const invoice = await prisma.invoice.findUnique({ where: { id } });
const ocrData = JSON.parse(decrypt(invoice.ocrRawData!));
const siren = decrypt(invoice.supplierSIREN!);
```

## ✅ Validation

### Validation SIREN/SIRET/TVA

#### `isValidSIREN(siren: string): boolean`
Valide un numéro SIREN (9 chiffres).

```typescript
import { isValidSIREN } from '@/lib/utils';

isValidSIREN('123456789'); // true
isValidSIREN('123 456 789'); // true (espaces autorisés)
isValidSIREN('12345678'); // false (8 chiffres)
```

#### `isValidSIRET(siret: string): boolean`
Valide un numéro SIRET (14 chiffres).

```typescript
import { isValidSIRET } from '@/lib/utils';

isValidSIRET('12345678901234'); // true
isValidSIRET('123 456 789 01234'); // true
```

#### `isValidFrenchVAT(vat: string): boolean`
Valide un numéro TVA intracommunautaire français.

Format: `FR` + 2 caractères (chiffres ou lettres) + 9 chiffres SIREN

```typescript
import { isValidFrenchVAT } from '@/lib/utils';

isValidFrenchVAT('FR12123456789'); // true
isValidFrenchVAT('FR AB 123456789'); // true (avec espaces)
isValidFrenchVAT('FR123456789'); // false (manque la clé)
```

### Validation comptable

#### `validateAmounts(ht, tva, ttc, tolerance?)`
Vérifie la cohérence HT + TVA = TTC.

```typescript
import { validateAmounts } from '@/lib/utils';

const result = validateAmounts(1000, 200, 1200);
console.log(result.isValid); // true
console.log(result.difference); // 0

const result2 = validateAmounts(1000, 200, 1199.99);
console.log(result2.isValid); // true (tolérance 0.02€)

const result3 = validateAmounts(1000, 200, 1180);
console.log(result3.isValid); // false
console.log(result3.message); // "Incohérence: HT(1000) + TVA(200) = 1200.00 ≠ TTC(1180). Diff: 20.00€"
```

#### `calculateTVA(ht, rate): number`
Calcule la TVA à partir du montant HT et du taux.

```typescript
import { calculateTVA } from '@/lib/utils';

const tva = calculateTVA(1000, 20); // 200.00
const tva2 = calculateTVA(1000, 5.5); // 55.00
```

#### `calculateTTC(ht, tva): number`
Calcule le montant TTC.

```typescript
import { calculateTTC } from '@/lib/utils';

const ttc = calculateTTC(1000, 200); // 1200.00
```

#### `normalizeAccountNumber(account): string`
Normalise un numéro de compte comptable (8 caractères).

```typescript
import { normalizeAccountNumber } from '@/lib/utils';

normalizeAccountNumber('401'); // "40100000"
normalizeAccountNumber('607000'); // "60700000"
normalizeAccountNumber('445660'); // "44566000"
```

### Validation Zod

#### `InvoiceValidationSchema`
Schéma de validation complet pour une facture.

```typescript
import { InvoiceValidationSchema } from '@/lib/utils';

const data = {
  supplierName: 'ACME Corp',
  invoiceNumber: 'FAC-2024-001',
  invoiceDate: new Date('2024-01-15'),
  amountHT: 1000,
  amountTVA: 200,
  amountTTC: 1200,
  tvaRate: 20,
  accountNumber: '401000',
  journalCode: 'ACH',
};

try {
  const validated = InvoiceValidationSchema.parse(data);
  console.log('✅ Validation réussie');
} catch (error) {
  console.error('❌ Erreurs:', error.errors);
}
```

**Validations effectuées:**
- `supplierName`: non vide
- `invoiceNumber`: non vide
- `invoiceDate`: date valide
- `amountHT`: > 0
- `amountTVA`: ≥ 0
- `amountTTC`: > 0
- `tvaRate`: entre 0 et 100
- `accountNumber`: 6 à 8 chiffres
- `journalCode`: ACH, VTE, BQ ou OD
- **Cohérence**: HT + TVA = TTC (avec tolérance 0.02€)

## 🚨 Gestion d'erreurs

### Classes d'erreurs custom

#### `AppError`
Classe de base pour toutes les erreurs.

```typescript
import { AppError } from '@/lib/utils';

throw new AppError('Message', 500, 'ERROR_CODE');
```

#### `OCRError`
Erreurs liées à l'OCR (AWS Textract).

```typescript
import { OCRError } from '@/lib/utils';

throw new OCRError('Timeout OCR', 'OCR_TIMEOUT');
// statusCode: 500
// code: 'OCR_TIMEOUT'
```

#### `AIError`
Erreurs liées à l'IA (Claude).

```typescript
import { AIError } from '@/lib/utils';

throw new AIError('Rate limit dépassé', 'AI_RATE_LIMIT');
// statusCode: 500
// code: 'AI_RATE_LIMIT'
```

#### `ValidationError`
Erreurs de validation de données.

```typescript
import { ValidationError } from '@/lib/utils';

throw new ValidationError('Données invalides', {
  email: 'Format invalide',
  amount: 'Doit être positif',
});
// statusCode: 400
// code: 'VALIDATION_ERROR'
// fields: { email: ..., amount: ... }
```

#### `DatabaseError`
Erreurs de base de données.

```typescript
import { DatabaseError } from '@/lib/utils';

throw new DatabaseError('Connexion échouée');
// statusCode: 500
// code: 'DATABASE_ERROR'
```

### Handler d'erreurs API

#### `handleAPIError(error): Response`
Convertit les erreurs en réponses HTTP.

```typescript
import { handleAPIError, OCRError } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    // Votre logique
    throw new OCRError('Timeout');
  } catch (error) {
    return handleAPIError(error);
    // Response JSON avec status approprié
  }
}
```

**Gestion automatique:**
- `AppError` → Status code personnalisé
- Erreurs Prisma P2002 → 409 Conflict
- Autres erreurs → 500 Internal Error

**Exemple de réponse:**
```json
{
  "error": "Timeout OCR",
  "code": "OCR_TIMEOUT"
}
```

## 📦 Utilisation dans les routes API

### Exemple complet

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  encrypt,
  decrypt,
  validateAmounts,
  InvoiceValidationSchema,
  handleAPIError,
  ValidationError,
  DatabaseError,
} from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Validation Zod
    const validated = InvoiceValidationSchema.parse(body);

    // 2. Validation métier supplémentaire
    const amountCheck = validateAmounts(
      validated.amountHT,
      validated.amountTVA,
      validated.amountTTC
    );

    if (!amountCheck.isValid) {
      throw new ValidationError('Montants incohérents', {
        amounts: amountCheck.message!,
      });
    }

    // 3. Encryption des données sensibles
    const ocrDataEncrypted = encrypt(JSON.stringify(body.ocrData));

    // 4. Enregistrement en base
    const invoice = await prisma.invoice.create({
      data: {
        ...validated,
        ocrRawData: ocrDataEncrypted,
      },
    });

    return NextResponse.json({ success: true, id: invoice.id });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

## 🧪 Tests

### Exécuter les tests

```bash
npx tsx lib/utils/test-utils.ts
```

**Tests inclus:**
- ✅ Encryption/Decryption
- ✅ Hash SHA-256
- ✅ Validation SIREN/SIRET/TVA
- ✅ Calculs comptables
- ✅ Normalisation comptes
- ✅ Validation Zod
- ✅ Erreurs custom

### Exemple de sortie

```
🧪 Tests des utilitaires de sécurité

📦 1. Tests Encryption/Decryption
──────────────────────────────────────────────────
Données originales: Données confidentielles: SIREN 123456789
✅ Encryption réussie: 3f2a8b9c...
✅ Decryption réussie: Données confidentielles: SIREN 123456789
✅ Encryption/Decryption: SUCCÈS

✅ 2. Tests de validation
──────────────────────────────────────────────────
SIREN:
  ✅ "123456789" → true (attendu: true)
  ✅ "123 456 789" → true (attendu: true)
  ✅ "12345678" → false (attendu: false)
  ...
```

## 🔐 Sécurité

### Bonnes pratiques

1. **ENCRYPTION_KEY**
   - ⚠️ Ne jamais committer dans Git
   - ✅ Stocker dans .env (ignoré par Git)
   - ✅ Changer en production
   - ✅ Backup sécurisé de la clé

2. **Données à encrypter**
   - ✅ Données OCR brutes
   - ✅ SIREN/SIRET
   - ✅ Numéros TVA
   - ✅ Coordonnées bancaires

3. **Hash vs Encryption**
   - **Hash**: Pour recherche sans révéler (index, comparaison)
   - **Encryption**: Pour stockage réversible

4. **Validation**
   - ✅ Toujours valider côté serveur
   - ✅ Utiliser Zod pour validation structurée
   - ✅ Vérifier cohérence métier

## 📚 Ressources

- [Node.js Crypto](https://nodejs.org/api/crypto.html)
- [AES-GCM](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [Zod Documentation](https://zod.dev/)
- [SIREN/SIRET](https://www.insee.fr/fr/information/3539241)

## ⚠️ Notes importantes

- Les fonctions d'encryption nécessitent `ENCRYPTION_KEY` configurée
- Un warning s'affiche au démarrage si la clé est manquante/invalide
- Les erreurs d'encryption/decryption sont loggées mais ne révèlent pas de données sensibles
- La tolérance de 0.02€ pour les montants permet de gérer les arrondis

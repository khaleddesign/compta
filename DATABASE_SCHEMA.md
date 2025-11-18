# Schéma de Base de Données - Comptabilité OCR

## Vue d'ensemble

Le schéma Prisma optimisé pour gérer le workflow complet des factures :
**Upload → OCR → Analyse IA → Validation → Export Sage**

## Modèles de données

### 1. Invoice (Factures)
Table principale qui stocke toutes les factures uploadées et leur statut de traitement.

```prisma
model Invoice {
  id            String         @id @default(cuid())

  // Fichier
  fileName      String
  fileUrl       String         // URL Vercel Blob
  fileSize      Int
  mimeType      String

  // Temporalité
  uploadedAt    DateTime       @default(now())
  processedAt   DateTime?
  validatedAt   DateTime?
  exportedAt    DateTime?

  // Statut
  status        InvoiceStatus  @default(UPLOADED)

  // Données OCR
  ocrRawData    String?        @db.Text
  ocrText       String?        @db.Text
  ocrConfidence Float?         // 0-1

  // Données extraites
  supplierName    String?
  supplierVAT     String?
  supplierSIREN   String?
  supplierAddress String?       @db.Text
  invoiceNumber   String?
  invoiceDate     DateTime?
  dueDate         DateTime?

  // Montants
  amountHT      Decimal?       @db.Decimal(12, 2)
  amountTVA     Decimal?       @db.Decimal(12, 2)
  amountTTC     Decimal?       @db.Decimal(12, 2)
  tvaRate       Decimal?       @db.Decimal(5, 2)
  currency      String         @default("EUR")

  // Catégorisation
  accountNumber  String?
  expenseAccount String?
  journalCode    String?
  analyticalCode String?

  // Autres
  lineItems       Json?
  validatedBy     String?
  validationNotes String?       @db.Text
  errorMessage    String?       @db.Text
  retryCount      Int           @default(0)

  // Relations
  accountingEntries AccountingEntry[]
  exports           SageExport[]
}
```

**Indexes:**
- `status` - Pour filtrer par statut
- `invoiceDate` - Pour trier par date
- `uploadedAt` - Pour trier par date d'upload
- `supplierName` - Pour rechercher par fournisseur

### 2. AccountingEntry (Écritures comptables)
Stocke les lignes d'écritures comptables générées pour chaque facture.

```prisma
model AccountingEntry {
  id             String   @id @default(cuid())
  invoiceId      String
  invoice        Invoice  @relation(...)

  // Écriture Sage
  journalCode    String   // ACH, VTE, BQ, OD
  entryDate      DateTime
  accountNumber  String   // 401xxx, 6xxxx, 445xxx
  label          String

  // Montants
  debit          Decimal  @db.Decimal(12, 2)
  credit         Decimal  @db.Decimal(12, 2)

  // Analytique
  analyticalCode String?

  createdAt      DateTime @default(now())
}
```

**Indexes:**
- `invoiceId` - Pour récupérer toutes les lignes d'une facture
- `journalCode` - Pour filtrer par journal
- `entryDate` - Pour trier par date

### 3. SageExport (Exports vers Sage)
Historique des exports de fichiers .TRA vers Sage.

```prisma
model SageExport {
  id            String       @id @default(cuid())

  exportDate    DateTime     @default(now())
  fileName      String       // export_20250116_143022.TRA
  fileUrl       String?
  fileSize      Int?

  invoiceCount  Int
  totalAmount   Decimal      @db.Decimal(12, 2)

  status        ExportStatus @default(PENDING)
  errorMessage  String?      @db.Text

  invoices      Invoice[]    @relation("InvoiceExports")

  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}
```

**Indexes:**
- `exportDate` - Pour trier par date
- `status` - Pour filtrer par statut

### 4. User (Utilisateurs)
Gestion des utilisateurs pour la validation et l'audit.

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      String   @default("USER") // USER, ADMIN
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Enums

### InvoiceStatus
Statuts possibles pour une facture dans le workflow.

```prisma
enum InvoiceStatus {
  UPLOADED           // Fichier uploadé sur Vercel Blob
  OCR_PROCESSING     // OCR Textract en cours
  OCR_COMPLETED      // OCR terminé avec succès
  OCR_FAILED         // OCR échoué
  AI_PROCESSING      // Analyse Claude en cours
  AI_COMPLETED       // Analyse IA terminée
  PENDING_VALIDATION // En attente de validation utilisateur
  VALIDATED          // Validé par l'utilisateur
  EXPORTED           // Exporté vers Sage
  ERROR              // Erreur générale
}
```

### ExportStatus
Statuts pour les exports Sage.

```prisma
enum ExportStatus {
  PENDING   // Export en attente
  COMPLETED // Export terminé
  FAILED    // Export échoué
}
```

## Relations

```
Invoice (1) ──< (N) AccountingEntry
Invoice (N) ──> (N) SageExport
```

- Une facture peut avoir plusieurs écritures comptables
- Plusieurs factures peuvent être dans un même export Sage

## Workflow de statuts

```
UPLOADED
   ↓
OCR_PROCESSING
   ↓
OCR_COMPLETED (ou OCR_FAILED)
   ↓
AI_PROCESSING
   ↓
AI_COMPLETED
   ↓
PENDING_VALIDATION
   ↓
VALIDATED
   ↓
EXPORTED
```

## Utilisation du client Prisma

### Import
```typescript
import { prisma, InvoiceStatus, ExportStatus } from '@/lib/db';
```

### Exemples de requêtes

#### Créer une facture
```typescript
const invoice = await prisma.invoice.create({
  data: {
    fileName: 'facture.pdf',
    fileUrl: 'https://...',
    fileSize: 123456,
    mimeType: 'application/pdf',
    status: 'UPLOADED',
  },
});
```

#### Récupérer les factures avec leurs écritures
```typescript
const invoices = await prisma.invoice.findMany({
  where: { status: 'VALIDATED' },
  include: {
    accountingEntries: true,
  },
  orderBy: { uploadedAt: 'desc' },
});
```

#### Créer des écritures comptables
```typescript
await prisma.accountingEntry.createMany({
  data: [
    {
      invoiceId: invoice.id,
      journalCode: 'ACH',
      entryDate: new Date(),
      accountNumber: '607000',
      label: 'Achat marchandises',
      debit: 1000,
      credit: 0,
    },
    {
      invoiceId: invoice.id,
      journalCode: 'ACH',
      entryDate: new Date(),
      accountNumber: '445660',
      label: 'TVA déductible',
      debit: 200,
      credit: 0,
    },
    {
      invoiceId: invoice.id,
      journalCode: 'ACH',
      entryDate: new Date(),
      accountNumber: '401000',
      label: 'Fournisseur',
      debit: 0,
      credit: 1200,
    },
  ],
});
```

#### Créer un export Sage
```typescript
const export = await prisma.sageExport.create({
  data: {
    fileName: 'export_20250116.TRA',
    invoiceCount: 10,
    totalAmount: 15000,
    status: 'PENDING',
    invoices: {
      connect: invoiceIds.map(id => ({ id })),
    },
  },
});
```

#### Mettre à jour le statut d'une facture
```typescript
await prisma.invoice.update({
  where: { id: invoiceId },
  data: {
    status: 'OCR_COMPLETED',
    ocrConfidence: 0.98,
    processedAt: new Date(),
  },
});
```

## Migration et Setup

### 1. Configuration de PostgreSQL
```bash
# Créer la base de données
createdb comptabilite_ocr

# Ou avec Docker
docker run --name postgres-comptabilite \
  -e POSTGRES_DB=comptabilite_ocr \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:16
```

### 2. Variables d'environnement
```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/comptabilite_ocr?schema=public"
```

### 3. Exécuter la migration
```bash
npx prisma migrate dev --name init
```

### 4. Générer le client
```bash
npx prisma generate
```

### 5. Explorer la base de données
```bash
npx prisma studio
```

## Sécurité

- Les données OCR brutes (`ocrRawData`) peuvent contenir des informations sensibles
- Envisager le chiffrement au niveau application pour les champs sensibles
- Utiliser des parameterized queries (Prisma le fait automatiquement)
- Implémenter des politiques de rétention des données

## Performance

- Indexes créés sur les champs fréquemment filtrés/triés
- Utiliser `select` pour limiter les champs retournés
- Pagination recommandée pour les listes
- Considérer des index composites pour les requêtes complexes

## Backup

```bash
# Backup PostgreSQL
pg_dump comptabilite_ocr > backup_$(date +%Y%m%d).sql

# Restore
psql comptabilite_ocr < backup_20250116.sql
```

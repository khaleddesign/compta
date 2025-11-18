# Changelog - Migration Prisma Schema

## Date : 16 Novembre 2025

## 🎯 Objectif
Migration vers un schéma de base de données PostgreSQL optimisé pour le workflow complet de traitement des factures.

## ✅ Changements effectués

### 1. Nouveau schéma Prisma (`prisma/schema.prisma`)

#### Modèles créés/modifiés

| Modèle | Action | Description |
|--------|--------|-------------|
| `Invoice` | Renommé | Ancien: `Facture`, nouveau: `Invoice` |
| `AccountingEntry` | Renommé | Ancien: `LigneComptable`, nouveau: `AccountingEntry` |
| `SageExport` | Créé | Nouveau modèle pour gérer les exports |
| `User` | Créé | Nouveau modèle pour l'authentification |

#### Enums créés/modifiés

| Enum | Action | Valeurs |
|------|--------|---------|
| `InvoiceStatus` | Modifié | 10 statuts (UPLOADED, OCR_PROCESSING, OCR_COMPLETED, OCR_FAILED, AI_PROCESSING, AI_COMPLETED, PENDING_VALIDATION, VALIDATED, EXPORTED, ERROR) |
| `ExportStatus` | Créé | 3 statuts (PENDING, COMPLETED, FAILED) |

### 2. Nouveaux champs dans Invoice

**Champs ajoutés:**
- `supplierVAT` - Numéro TVA intracommunautaire
- `supplierSIREN` - Numéro SIREN
- `supplierAddress` - Adresse complète
- `ocrConfidence` - Score de confiance OCR (0-1)
- `processedAt` - Date de fin de traitement
- `validatedAt` - Date de validation
- `exportedAt` - Date d'export
- `accountNumber` - Compte fournisseur (401xxx)
- `expenseAccount` - Compte de charge (6xxxx)
- `journalCode` - Code journal (ACH, VTE, etc.)
- `analyticalCode` - Code analytique optionnel
- `lineItems` - Lignes de facture (JSON)
- `validatedBy` - Utilisateur validateur
- `validationNotes` - Notes de validation
- `retryCount` - Nombre de tentatives
- `lastRetryAt` - Date dernière tentative

**Champs supprimés:**
- `createdAt` → `uploadedAt` (renommé)
- `updatedAt` (supprimé)
- `ocrData` → `ocrRawData` (renommé)
- `ocrProcessedAt` (supprimé)
- `aiAnalysis` (supprimé)
- `aiProcessedAt` (supprimé)
- `fournisseur` → `supplierName` (renommé)
- `numeroFacture` → `invoiceNumber` (renommé)
- `dateFacture` → `invoiceDate` (renommé)
- `dateEcheance` → `dueDate` (renommé)
- `montantHT` → `amountHT` (renommé)
- `montantTVA` → `amountTVA` (renommé)
- `montantTTC` → `amountTTC` (renommé)
- `tauxTVA` → `tvaRate` (renommé)
- `sageExported` (supprimé - remplacé par relation)
- `sageExportedAt` → `exportedAt` (renommé)
- `sageExportPath` (supprimé)
- `metadata` (supprimé)
- `errors` → `errorMessage` (simplifié)

**Changements de type:**
- `Float` → `Decimal` pour tous les montants
- Ajout de `@db.Decimal(12, 2)` pour précision

### 3. Structure des fichiers

#### Créés
```
lib/db/
├── prisma.ts      # Client Prisma singleton
└── index.ts       # Export centralisé
```

#### Supprimés
```
lib/prisma.ts      # Remplacé par lib/db/
```

### 4. Migrations de code

#### Routes API mises à jour

**`app/api/upload/route.ts`:**
```typescript
// Avant
import { prisma } from '@/lib/prisma';
const facture = await prisma.facture.create({ ... });

// Après
import { prisma } from '@/lib/db';
const invoice = await prisma.invoice.create({ ... });
```

**`app/api/factures/route.ts`:**
```typescript
// Avant
const factures = await prisma.facture.findMany({
  include: { lignesComptables: true },
  orderBy: { createdAt: 'desc' },
});

// Après
const invoices = await prisma.invoice.findMany({
  include: { accountingEntries: true },
  orderBy: { uploadedAt: 'desc' },
});
```

### 5. Nouveaux index

**Invoice:**
- `status` (existing)
- `invoiceDate` (existing)
- `uploadedAt` (new)
- `supplierName` (new)

**AccountingEntry:**
- `invoiceId` (existing)
- `journalCode` (new)
- `entryDate` (new)

**SageExport:**
- `exportDate` (new)
- `status` (new)

### 6. Variables d'environnement

**Mise à jour `.env.example`:**
```env
# Avant
DATABASE_URL="postgresql://user:password@localhost:5432/comptabilite_automation?schema=public"

# Après
DATABASE_URL="postgresql://user:password@localhost:5432/comptabilite_ocr?schema=public"
```

### 7. Documentation créée

| Fichier | Description |
|---------|-------------|
| `DATABASE_SCHEMA.md` | Documentation complète du schéma |
| `PRISMA_SETUP.md` | Guide de configuration PostgreSQL et Prisma |
| `CHANGELOG_PRISMA.md` | Ce fichier - historique des changements |
| `prisma/schema.prisma.backup` | Sauvegarde de l'ancien schéma |

## 🚀 Migration requise

### Pour migrer les données existantes

Si vous aviez déjà des données dans l'ancienne base :

1. **Exporter les données**
```bash
npx prisma db pull
```

2. **Créer un script de migration**
```typescript
// migrate-data.ts
import { PrismaClient as OldPrismaClient } from '@prisma/client';
import { prisma } from './lib/db';

async function migrate() {
  const oldPrisma = new OldPrismaClient();

  const oldFactures = await oldPrisma.facture.findMany();

  for (const facture of oldFactures) {
    await prisma.invoice.create({
      data: {
        fileName: facture.fileName,
        fileUrl: facture.fileUrl,
        fileSize: facture.fileSize,
        mimeType: facture.mimeType,
        uploadedAt: facture.createdAt,
        status: facture.status as any,
        supplierName: facture.fournisseur,
        invoiceNumber: facture.numeroFacture,
        invoiceDate: facture.dateFacture,
        dueDate: facture.dateEcheance,
        amountHT: facture.montantHT,
        amountTVA: facture.montantTVA,
        amountTTC: facture.montantTTC,
        tvaRate: facture.tauxTVA,
      },
    });
  }
}
```

3. **Exécuter la migration**
```bash
npx tsx migrate-data.ts
```

### Pour une nouvelle installation

```bash
# 1. Configurer .env
cp .env.example .env
# Éditer .env avec votre DATABASE_URL

# 2. Créer la base de données PostgreSQL
createdb comptabilite_ocr

# 3. Exécuter la migration
npx prisma migrate dev --name init

# 4. Vérifier avec Prisma Studio
npx prisma studio
```

## 📊 Impact

### Base de données
- ✅ Schéma plus structuré et normalisé
- ✅ Types `Decimal` pour précision monétaire
- ✅ Nouveaux index pour performance
- ✅ RelationsMany-to-Many pour exports
- ✅ Gestion des utilisateurs

### Code
- ✅ Nomenclature anglaise cohérente
- ✅ Import centralisé via `@/lib/db`
- ✅ Types TypeScript générés automatiquement
- ⚠️ Breaking changes dans les routes API

### Performance
- ✅ Meilleurs index pour les requêtes fréquentes
- ✅ Types Decimal plus performants que Float
- ✅ Relations optimisées

## ⚠️ Breaking Changes

### Routes API
- `prisma.facture` → `prisma.invoice`
- `lignesComptables` → `accountingEntries`
- `createdAt` → `uploadedAt`

### Imports
```typescript
// Avant
import { prisma } from '@/lib/prisma';

// Après
import { prisma, InvoiceStatus, ExportStatus } from '@/lib/db';
```

### Champs renommés
Tous les champs ont été anglicisés :
- `fournisseur` → `supplierName`
- `numeroFacture` → `invoiceNumber`
- `dateFacture` → `invoiceDate`
- `montantHT` → `amountHT`
- etc.

## 🔄 Retour en arrière (Rollback)

Si besoin de revenir à l'ancien schéma :

```bash
# Restaurer l'ancien schéma
cp prisma/schema.prisma.backup prisma/schema.prisma

# Supprimer les migrations
rm -rf prisma/migrations

# Régénérer
npx prisma generate
npx prisma migrate dev --name rollback
```

## 📝 Notes

- L'ancien schéma est sauvegardé dans `prisma/schema.prisma.backup`
- Le fichier `.env` a été créé avec des valeurs par défaut
- La migration PostgreSQL doit être exécutée manuellement
- Tous les tests doivent être mis à jour avec les nouveaux noms de modèles

## ✅ Validation

Pour valider que tout fonctionne :

```bash
# 1. Vérifier la compilation
npm run build

# 2. Vérifier Prisma
npx prisma validate

# 3. Tester la connexion DB
npx prisma studio
```

## 🎓 Prochaines étapes

1. [ ] Configurer PostgreSQL (voir `PRISMA_SETUP.md`)
2. [ ] Exécuter `npx prisma migrate dev --name init`
3. [ ] Mettre à jour les tests unitaires
4. [ ] Créer les seeders de données de test
5. [ ] Mettre à jour la documentation API
6. [ ] Implémenter l'authentification avec le modèle User

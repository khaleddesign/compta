# ✅ PostgreSQL Configuration - TERMINÉE

## 🎉 Configuration réussie !

La base de données PostgreSQL a été configurée avec succès et toutes les migrations ont été appliquées.

## 📊 Détails de la configuration

### Base de données
- **Nom** : `comptabilite_ocr`
- **Utilisateur** : `comptauser`
- **Mot de passe** : `ComptaSecure2025!`
- **Port** : `5432`
- **Version PostgreSQL** : `14`

### Connexion
```env
DATABASE_URL="postgresql://comptauser:ComptaSecure2025!@localhost:5432/comptabilite_ocr?schema=public"
```

## 📋 Tables créées

```
✅ invoices              (35 colonnes)
✅ accounting_entries    (10 colonnes)
✅ sage_exports          (11 colonnes)
✅ users                 (6 colonnes)
✅ _InvoiceExports       (table de relation)
✅ _prisma_migrations    (historique des migrations)
```

### Structure de la table `invoices`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | ID unique (cuid) |
| `fileName` | TEXT | Nom du fichier |
| `fileUrl` | TEXT | URL Vercel Blob |
| `fileSize` | INTEGER | Taille en bytes |
| `mimeType` | TEXT | Type MIME |
| `uploadedAt` | TIMESTAMP | Date d'upload |
| `processedAt` | TIMESTAMP | Date de traitement |
| `validatedAt` | TIMESTAMP | Date de validation |
| `exportedAt` | TIMESTAMP | Date d'export |
| `status` | InvoiceStatus | Statut du workflow |
| `ocrRawData` | TEXT | Données brutes OCR |
| `ocrText` | TEXT | Texte extrait |
| `ocrConfidence` | FLOAT | Score de confiance (0-1) |
| `supplierName` | TEXT | Nom du fournisseur |
| `supplierVAT` | TEXT | N° TVA intracommunautaire |
| `supplierSIREN` | TEXT | N° SIREN |
| `supplierAddress` | TEXT | Adresse complète |
| `invoiceNumber` | TEXT | N° de facture |
| `invoiceDate` | TIMESTAMP | Date de facture |
| `dueDate` | TIMESTAMP | Date d'échéance |
| `amountHT` | DECIMAL(12,2) | Montant HT |
| `amountTVA` | DECIMAL(12,2) | Montant TVA |
| `amountTTC` | DECIMAL(12,2) | Montant TTC |
| `tvaRate` | DECIMAL(5,2) | Taux de TVA (%) |
| `currency` | TEXT | Devise (défaut: EUR) |
| `accountNumber` | TEXT | Compte fournisseur |
| `expenseAccount` | TEXT | Compte de charge |
| `journalCode` | TEXT | Code journal |
| `analyticalCode` | TEXT | Code analytique |
| `lineItems` | JSONB | Lignes de facture |
| `validatedBy` | TEXT | Validé par |
| `validationNotes` | TEXT | Notes de validation |
| `errorMessage` | TEXT | Message d'erreur |
| `retryCount` | INTEGER | Nombre de tentatives |
| `lastRetryAt` | TIMESTAMP | Dernière tentative |

## 🔍 Vérification

### Lister les tables
```bash
psql -U comptauser -d comptabilite_ocr -c "\dt"
```

### Ouvrir Prisma Studio
```bash
npx prisma studio
# Ouvre http://localhost:5555
```

### Voir la structure d'une table
```bash
psql -U comptauser -d comptabilite_ocr -c "\d invoices"
```

## 📦 Migration créée

```
prisma/migrations/
└── 20251116211114_init/
    └── migration.sql
```

Cette migration contient :
- Création des 4 enums (`InvoiceStatus`, `ExportStatus`)
- Création des 4 tables principales
- Création de la table de relation `_InvoiceExports`
- Création de tous les index
- Définition des foreign keys

## 🧪 Tester la base de données

### Via Prisma Client (TypeScript)

Créer un fichier `test-database.ts` :

```typescript
import { prisma, InvoiceStatus } from './lib/db';

async function testDatabase() {
  console.log('🧪 Test de la base de données...\n');

  // 1. Créer un utilisateur
  const user = await prisma.user.create({
    data: {
      email: 'admin@comptabilite.fr',
      name: 'Admin Test',
      role: 'ADMIN',
    },
  });
  console.log('✅ Utilisateur créé:', user.email);

  // 2. Créer une facture
  const invoice = await prisma.invoice.create({
    data: {
      fileName: 'facture_test.pdf',
      fileUrl: 'https://example.com/facture.pdf',
      fileSize: 524288, // 512 KB
      mimeType: 'application/pdf',
      status: 'UPLOADED',
      supplierName: 'ACME Corp',
      invoiceNumber: 'FAC-2024-001',
      invoiceDate: new Date('2024-01-15'),
      amountHT: 1000.00,
      amountTVA: 200.00,
      amountTTC: 1200.00,
      tvaRate: 20.00,
    },
  });
  console.log('✅ Facture créée:', invoice.invoiceNumber);

  // 3. Créer des écritures comptables
  await prisma.accountingEntry.createMany({
    data: [
      {
        invoiceId: invoice.id,
        journalCode: 'ACH',
        entryDate: new Date('2024-01-15'),
        accountNumber: '607000',
        label: 'Achat marchandises',
        debit: 1000.00,
        credit: 0,
      },
      {
        invoiceId: invoice.id,
        journalCode: 'ACH',
        entryDate: new Date('2024-01-15'),
        accountNumber: '445660',
        label: 'TVA déductible 20%',
        debit: 200.00,
        credit: 0,
      },
      {
        invoiceId: invoice.id,
        journalCode: 'ACH',
        entryDate: new Date('2024-01-15'),
        accountNumber: '401000',
        label: 'Fournisseur ACME Corp',
        debit: 0,
        credit: 1200.00,
      },
    ],
  });
  console.log('✅ 3 écritures comptables créées');

  // 4. Récupérer la facture avec ses écritures
  const invoiceWithEntries = await prisma.invoice.findUnique({
    where: { id: invoice.id },
    include: { accountingEntries: true },
  });
  console.log('\n📊 Facture complète:');
  console.log('  ID:', invoiceWithEntries?.id);
  console.log('  Fournisseur:', invoiceWithEntries?.supplierName);
  console.log('  Montant TTC:', invoiceWithEntries?.amountTTC + '€');
  console.log('  Écritures:', invoiceWithEntries?.accountingEntries.length);

  // 5. Statistiques
  const stats = {
    totalInvoices: await prisma.invoice.count(),
    totalUsers: await prisma.user.count(),
    totalEntries: await prisma.accountingEntry.count(),
  };
  console.log('\n📈 Statistiques:');
  console.log('  Total factures:', stats.totalInvoices);
  console.log('  Total utilisateurs:', stats.totalUsers);
  console.log('  Total écritures:', stats.totalEntries);

  console.log('\n✅ Tests terminés avec succès!');
}

testDatabase()
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

Exécuter :
```bash
npx tsx test-database.ts
```

### Via psql (SQL direct)

```bash
# Insérer une facture
psql -U comptauser -d comptabilite_ocr << EOF
INSERT INTO invoices (
  id, "fileName", "fileUrl", "fileSize", "mimeType", status, "supplierName", "invoiceNumber"
) VALUES (
  'test123', 'test.pdf', 'https://example.com/test.pdf', 1024, 'application/pdf', 'UPLOADED', 'Test Corp', 'TEST-001'
);
EOF

# Lister les factures
psql -U comptauser -d comptabilite_ocr -c "SELECT id, \"fileName\", status FROM invoices;"
```

## 🚀 Utilisation dans l'application

### Import du client Prisma
```typescript
import { prisma, InvoiceStatus, ExportStatus } from '@/lib/db';
```

### Créer une facture
```typescript
const invoice = await prisma.invoice.create({
  data: {
    fileName: file.name,
    fileUrl: blobUrl,
    fileSize: file.size,
    mimeType: file.type,
    status: 'UPLOADED',
  },
});
```

### Récupérer les factures
```typescript
const invoices = await prisma.invoice.findMany({
  where: { status: 'VALIDATED' },
  include: { accountingEntries: true },
  orderBy: { uploadedAt: 'desc' },
  take: 50,
});
```

### Mettre à jour le statut
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

## 🔒 Sécurité

### Credentials PostgreSQL
- ⚠️ Le mot de passe est stocké dans `.env` (non versionné)
- ⚠️ Changer le mot de passe en production
- ✅ `.env` est dans `.gitignore`

### Recommandations
```bash
# En production, utiliser un mot de passe fort
ALTER USER comptauser WITH PASSWORD 'VotreMotDePasseTresSecurise123!@#';

# Et mettre à jour .env
DATABASE_URL="postgresql://comptauser:VotreMotDePasseTresSecurise123!@#@localhost:5432/comptabilite_ocr?schema=public"
```

## 🛠️ Commandes utiles

### Réinitialiser la base de données
```bash
npx prisma migrate reset
# ⚠️ Supprime toutes les données !
```

### Voir les migrations appliquées
```bash
psql -U comptauser -d comptabilite_ocr -c "SELECT * FROM _prisma_migrations;"
```

### Backup de la base de données
```bash
pg_dump -U comptauser comptabilite_ocr > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore
```bash
psql -U comptauser comptabilite_ocr < backup_20251116_220000.sql
```

## 📚 Prochaines étapes

1. ✅ Base de données configurée
2. ✅ Migrations appliquées
3. ✅ Client Prisma généré
4. ⏭️ Implémenter les routes API
5. ⏭️ Créer l'interface utilisateur
6. ⏭️ Intégrer AWS Textract
7. ⏭️ Intégrer Claude AI
8. ⏭️ Implémenter l'export Sage

## 🎓 Ressources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Schema complet](./DATABASE_SCHEMA.md)
- [Guide de setup](./PRISMA_SETUP.md)

---

**Configuration terminée le** : 16 Novembre 2025, 22:11
**Migration ID** : `20251116211114_init`

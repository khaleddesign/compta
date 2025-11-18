# Configuration Prisma - Guide de démarrage rapide

## ✅ Ce qui a été fait

- ✅ Schéma Prisma créé (`prisma/schema.prisma`)
- ✅ Client Prisma généré
- ✅ Fichiers `lib/db/` créés
- ✅ Routes API mises à jour
- ✅ .env.example mis à jour
- ✅ Ancien schéma sauvegardé (`prisma/schema.prisma.backup`)

## 📋 Changements de nomenclature

### Anciens modèles → Nouveaux modèles

| Ancien | Nouveau |
|--------|---------|
| `Facture` | `Invoice` |
| `LigneComptable` | `AccountingEntry` |
| `FactureStatus` | `InvoiceStatus` |
| - | `SageExport` (nouveau) |
| - | `User` (nouveau) |

### Changements dans les APIs

**Avant:**
```typescript
import { prisma } from '@/lib/prisma';
const facture = await prisma.facture.create({ ... });
```

**Après:**
```typescript
import { prisma } from '@/lib/db';
const invoice = await prisma.invoice.create({ ... });
```

## 🚀 Configuration PostgreSQL

### Option 1: Installation locale

#### macOS (Homebrew)
```bash
brew install postgresql@16
brew services start postgresql@16

# Créer la base de données
createdb comptabilite_ocr
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Démarrer le service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Créer un utilisateur et une base
sudo -u postgres psql
CREATE DATABASE comptabilite_ocr;
CREATE USER comptauser WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE comptabilite_ocr TO comptauser;
\q
```

#### Windows
1. Télécharger depuis https://www.postgresql.org/download/windows/
2. Installer avec pgAdmin
3. Créer la base `comptabilite_ocr`

### Option 2: Docker (recommandé pour le développement)

```bash
# Créer et démarrer le conteneur PostgreSQL
docker run --name postgres-comptabilite \
  -e POSTGRES_DB=comptabilite_ocr \
  -e POSTGRES_USER=comptauser \
  -e POSTGRES_PASSWORD=VotreMotDePasseSecurise123 \
  -p 5432:5432 \
  -v postgres-data:/var/lib/postgresql/data \
  -d postgres:16

# Vérifier que ça fonctionne
docker logs postgres-comptabilite
```

### Option 3: Cloud (Production)

**Supabase (gratuit):**
1. Créer un compte sur https://supabase.com
2. Créer un nouveau projet
3. Récupérer la DATABASE_URL depuis Settings > Database

**Neon (gratuit):**
1. Créer un compte sur https://neon.tech
2. Créer un nouveau projet
3. Récupérer la DATABASE_URL

**Railway:**
1. Créer un compte sur https://railway.app
2. Créer un service PostgreSQL
3. Récupérer la DATABASE_URL

## 🔧 Configuration .env

### 1. Créer le fichier .env
```bash
# Si .env n'existe pas encore
cp .env.example .env
```

### 2. Éditer .env avec votre DATABASE_URL

**Pour PostgreSQL local:**
```env
DATABASE_URL="postgresql://comptauser:VotreMotDePasse@localhost:5432/comptabilite_ocr?schema=public"
```

**Pour Docker:**
```env
DATABASE_URL="postgresql://comptauser:VotreMotDePasseSecurise123@localhost:5432/comptabilite_ocr?schema=public"
```

**Pour Supabase/Neon/Railway:**
```env
DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
```

## 🎯 Exécuter la migration

### 1. Vérifier la connexion
```bash
npx prisma db pull --force --schema=prisma/schema.prisma
```

Si ça fonctionne, votre connexion est OK !

### 2. Créer les tables
```bash
npx prisma migrate dev --name init
```

Cette commande va :
- Créer toutes les tables dans PostgreSQL
- Générer le client Prisma
- Créer le dossier `prisma/migrations/`

### 3. Vérifier les tables créées
```bash
# Ouvrir Prisma Studio (interface graphique)
npx prisma studio
```

Ou avec psql:
```bash
psql -U comptauser -d comptabilite_ocr -c "\dt"
```

Vous devriez voir :
- `invoices`
- `accounting_entries`
- `sage_exports`
- `users`

## 🧪 Tester la base de données

### Test avec Prisma Studio
```bash
npx prisma studio
```

Ouvrir http://localhost:5555 et :
1. Créer un utilisateur de test
2. Créer une facture de test
3. Vérifier que tout fonctionne

### Test avec un script
Créer `test-db.ts` :
```typescript
import { prisma } from './lib/db';

async function main() {
  // Créer un utilisateur
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN',
    },
  });
  console.log('✅ User created:', user);

  // Créer une facture
  const invoice = await prisma.invoice.create({
    data: {
      fileName: 'test.pdf',
      fileUrl: 'https://example.com/test.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      status: 'UPLOADED',
    },
  });
  console.log('✅ Invoice created:', invoice);

  // Lister toutes les factures
  const invoices = await prisma.invoice.findMany();
  console.log('📋 Total invoices:', invoices.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Exécuter :
```bash
npx tsx test-db.ts
```

## 🔍 Commandes utiles

### Réinitialiser la base de données
```bash
npx prisma migrate reset
# ⚠️ Attention : supprime toutes les données !
```

### Synchroniser le schéma sans migration
```bash
npx prisma db push
# Utile en développement
```

### Régénérer le client Prisma
```bash
npx prisma generate
```

### Formater le schéma
```bash
npx prisma format
```

### Valider le schéma
```bash
npx prisma validate
```

## 📊 Structure des tables créées

```sql
-- invoices
CREATE TABLE "invoices" (
  "id" TEXT PRIMARY KEY,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "status" "InvoiceStatus" DEFAULT 'UPLOADED',
  "uploadedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  -- ... autres champs
);

-- accounting_entries
CREATE TABLE "accounting_entries" (
  "id" TEXT PRIMARY KEY,
  "invoiceId" TEXT NOT NULL,
  "journalCode" TEXT NOT NULL,
  "debit" DECIMAL(12,2) NOT NULL,
  "credit" DECIMAL(12,2) NOT NULL,
  -- ... autres champs
  FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE
);

-- sage_exports
CREATE TABLE "sage_exports" (
  "id" TEXT PRIMARY KEY,
  "exportDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "fileName" TEXT NOT NULL,
  "status" "ExportStatus" DEFAULT 'PENDING',
  -- ... autres champs
);

-- users
CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "role" TEXT DEFAULT 'USER',
  -- ... autres champs
);
```

## 🐛 Troubleshooting

### Erreur: "Environment variable not found: DATABASE_URL"
```bash
# Vérifier que .env existe
cat .env | grep DATABASE_URL

# Si vide, ajouter la DATABASE_URL
echo 'DATABASE_URL="postgresql://..."' >> .env
```

### Erreur: "Can't reach database server"
```bash
# Vérifier que PostgreSQL est démarré
# Pour Docker:
docker ps | grep postgres

# Pour service local:
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS
```

### Erreur: "password authentication failed"
```bash
# Vérifier le mot de passe dans DATABASE_URL
# Réinitialiser le mot de passe PostgreSQL:
sudo -u postgres psql
ALTER USER comptauser WITH PASSWORD 'nouveau_mot_de_passe';
```

### Erreur lors de la migration
```bash
# Supprimer le dossier migrations et recommencer
rm -rf prisma/migrations
npx prisma migrate dev --name init
```

## 📚 Ressources

- [Documentation Prisma](https://www.prisma.io/docs)
- [Schéma du projet](./DATABASE_SCHEMA.md)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

## ✅ Checklist de configuration

- [ ] PostgreSQL installé/démarré
- [ ] Base de données `comptabilite_ocr` créée
- [ ] Fichier `.env` créé avec DATABASE_URL
- [ ] `npx prisma migrate dev --name init` exécuté
- [ ] `npx prisma studio` fonctionne
- [ ] Test de création d'une facture réussi
- [ ] Application Next.js se lance sans erreur

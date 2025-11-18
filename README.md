# Automatisation Comptable - Factures OCR + IA

Application Next.js 14 pour automatiser la saisie comptable à partir de factures PDF avec OCR (AWS Textract) et analyse IA (Claude).

## 🚀 Stack Technique

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Base de données**: PostgreSQL avec Prisma ORM
- **OCR**: AWS Textract (99.2% de précision)
- **IA**: Anthropic Claude 3.5 Haiku
- **Stockage**: Vercel Blob
- **Queue**: Upstash QStash
- **Sécurité**: AES-256-GCM encryption
- **Validation**: Zod

## 📋 Workflow Automatisé

1. **Upload** : L'utilisateur upload une facture PDF/image (max 10MB)
2. **OCR** : AWS Textract extrait le texte et les données structurées (async via QStash)
3. **Analyse IA** : Claude génère automatiquement les 3 écritures comptables (async via QStash)
   - Débit: Compte de charge 6xxxxx (HT)
   - Débit: TVA déductible 445660 (TVA)
   - Crédit: Fournisseur 401000 (TTC)
4. **Export** : Génération fichier RImport.txt pour Sage 50 (format TAB-delimited, encodage Windows-1252)

## Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés API

# Initialiser la base de données
npx prisma migrate dev --name init

# Lancer le serveur de développement
npm run dev
```

## Variables d'environnement

Voir `.env.example` pour la liste complète des variables nécessaires.

## Structure du projet

```
.
├── app/
│   ├── api/
│   │   ├── upload/              # Upload factures → Vercel Blob
│   │   ├── ocr/process/         # OCR avec AWS Textract
│   │   ├── invoices/[id]/
│   │   │   ├── analyze/         # Analyse IA avec Claude
│   │   │   └── retry/           # Retry OCR/IA
│   │   └── sage/export/         # Export RImport.txt
│   └── ...
├── lib/
│   ├── ai/
│   │   └── claude-client.ts     # Client Claude 3.5 Haiku
│   ├── ocr/
│   │   └── aws-textract.ts      # Client AWS Textract
│   ├── sage/
│   │   └── rimport-generator.ts # Générateur RImport.txt
│   ├── queue/
│   │   └── qstash.ts            # Client QStash
│   └── utils/
│       ├── encryption.ts        # AES-256-GCM
│       └── validation.ts        # Zod schemas
├── prisma/
│   └── schema.prisma            # Modèles: Invoice, AccountingEntry, SageExport
└── public/
```

## Développement

```bash
# Lancer en mode développement
npm run dev

# Build pour production
npm run build

# Lancer en production
npm start
```

## License

Propriétaire

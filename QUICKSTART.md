# Guide de démarrage rapide

## 1. Configuration de l'environnement

### Copier le fichier .env
```bash
cp .env.example .env
```

### Remplir les variables d'environnement dans `.env`

**Base de données PostgreSQL:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/comptabilite_automation?schema=public"
```

**Azure Document Intelligence:**
1. Créer une ressource Azure Form Recognizer
2. Récupérer l'endpoint et la clé
```env
AZURE_FORM_RECOGNIZER_ENDPOINT="https://your-resource.cognitiveservices.azure.com/"
AZURE_FORM_RECOGNIZER_KEY="your-azure-key"
```

**Anthropic Claude:**
1. Créer un compte sur https://console.anthropic.com
2. Générer une clé API
```env
ANTHROPIC_API_KEY="sk-ant-xxx"
```

**Vercel Blob Storage:**
1. Créer un projet Vercel
2. Activer Blob Storage dans les settings
```env
BLOB_READ_WRITE_TOKEN="vercel_blob_xxx"
```

**Upstash QStash (optionnel pour la queue):**
1. Créer un compte sur https://console.upstash.com
2. Créer un QStash
```env
QSTASH_URL="https://qstash.upstash.io"
QSTASH_TOKEN="xxx"
QSTASH_CURRENT_SIGNING_KEY="xxx"
QSTASH_NEXT_SIGNING_KEY="xxx"
```

## 2. Configuration de la base de données

### Installer PostgreSQL localement (si nécessaire)
```bash
# macOS avec Homebrew
brew install postgresql
brew services start postgresql

# Créer la base de données
createdb comptabilite_automation
```

### Exécuter les migrations Prisma
```bash
npx prisma migrate dev --name init
```

### Vérifier la base de données
```bash
npx prisma studio
```

## 3. Démarrer l'application

### Mode développement
```bash
npm run dev
```

L'application sera accessible sur http://localhost:3000

### Build production
```bash
npm run build
npm start
```

## 4. Tester l'application

### Test manuel
1. Ouvrir http://localhost:3000
2. Cliquer sur "Commencer"
3. Uploader une facture PDF

### Test avec curl
```bash
# Upload d'une facture
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/path/to/facture.pdf"

# Liste des factures
curl http://localhost:3000/api/factures
```

## 5. Workflow complet

1. **Upload**: L'utilisateur upload une facture PDF via l'interface
2. **OCR**: Azure Document Intelligence extrait le texte et les données
3. **Analyse IA**: Claude génère les écritures comptables
4. **Validation**: L'utilisateur vérifie et valide les écritures
5. **Export**: Génération du fichier .TRA pour Sage (encodage CP1252)

## 6. Structure des API Routes

- `POST /api/upload` - Upload d'une facture
- `GET /api/factures` - Liste des factures
- `POST /api/process-ocr` - Traiter l'OCR (à implémenter)
- `POST /api/process-ai` - Analyse IA (à implémenter)
- `POST /api/export-sage` - Export Sage (à implémenter)

## 7. Prochaines étapes

- [ ] Implémenter la page d'upload avec drag & drop
- [ ] Créer l'API route pour le traitement OCR
- [ ] Créer l'API route pour l'analyse IA
- [ ] Implémenter l'export Sage
- [ ] Ajouter l'authentification
- [ ] Créer l'interface de validation des écritures
- [ ] Intégrer QStash pour le traitement asynchrone
- [ ] Ajouter les tests

## Ressources utiles

- [Documentation Next.js 14](https://nextjs.org/docs)
- [Documentation Prisma](https://www.prisma.io/docs)
- [Azure Document Intelligence](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/)
- [Anthropic Claude](https://docs.anthropic.com/)
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)

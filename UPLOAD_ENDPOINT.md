# Upload Endpoint - Documentation

## ✅ Configuration terminée

Date : 17 Novembre 2025, 20:47

## 📦 Fichiers créés

```
lib/queue/
├── qstash.ts          # Client QStash pour jobs asynchrones
└── index.ts           # Exports centralisés

app/api/upload/
└── route.ts           # Endpoint POST et GET pour upload

public/
└── test-upload.html   # Page de test HTML
```

## 🔧 Fichiers modifiés

- `.env.example` - Ajout de commentaires pour QStash et Vercel Blob
- `lib/utils.ts` → `lib/helpers.ts` - Renommé pour éviter conflit avec `lib/utils/`

## 🚀 Fonctionnalités implémentées

### 1. Client QStash (`lib/queue/qstash.ts`)

#### Initialisation
```typescript
import { Client } from '@upstash/qstash';

export const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN || '',
});
```

#### Fonctions disponibles

**publishOCRJob(invoiceId: string)**
- Publie un job OCR pour traiter une facture
- URL cible: `/api/ocr/process`
- Retries: 3
- Délai: 2 secondes

```typescript
import { publishOCRJob } from '@/lib/queue';

const jobId = await publishOCRJob('invoice-123');
// ✅ Job OCR publié pour facture invoice-123: msg_xxx
```

**publishAIAnalysisJob(invoiceId: string)**
- Publie un job d'analyse IA (Claude)
- URL cible: `/api/ai/analyze`
- Retries: 3
- Délai: 2 secondes

```typescript
import { publishAIAnalysisJob } from '@/lib/queue';

const jobId = await publishAIAnalysisJob('invoice-123');
// ✅ Job IA publié pour facture invoice-123: msg_xxx
```

**publishSageExportJob(invoiceIds: string[])**
- Publie un job d'export Sage
- URL cible: `/api/sage/export`
- Retries: 2

```typescript
import { publishSageExportJob } from '@/lib/queue';

const jobId = await publishSageExportJob(['inv-1', 'inv-2', 'inv-3']);
// ✅ Job Export Sage publié pour 3 factures: msg_xxx
```

**verifyQStashSignature(request: Request)**
- Vérifie la signature QStash d'une requête webhook
- Utilise `QSTASH_CURRENT_SIGNING_KEY` et `QSTASH_NEXT_SIGNING_KEY`

```typescript
import { verifyQStashSignature } from '@/lib/queue';

export async function POST(request: Request) {
  const isValid = await verifyQStashSignature(request);

  if (!isValid) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Traiter la requête...
}
```

### 2. Upload Endpoint (`app/api/upload/route.ts`)

#### POST /api/upload - Upload une facture

**Validation:**
- Types MIME autorisés: `application/pdf`, `image/jpeg`, `image/jpg`, `image/png`
- Taille maximale: 10 MB

**Workflow:**
1. Validation du fichier (type, taille)
2. Génération d'un nom unique avec timestamp
3. Upload vers Vercel Blob
4. Création de l'enregistrement `Invoice` en DB (status: `UPLOADED`)
5. Déclenchement du job OCR via QStash
6. Retour de la réponse avec les détails de la facture

**Requête:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@facture.pdf"
```

**Réponse succès (201):**
```json
{
  "success": true,
  "message": "Fichier uploadé avec succès",
  "invoice": {
    "id": "clxxx123456",
    "fileName": "facture.pdf",
    "fileUrl": "https://blob.vercel-storage.com/invoice-2025-11-17T20-30-00.pdf",
    "fileSize": 245678,
    "mimeType": "application/pdf",
    "status": "UPLOADED",
    "uploadedAt": "2025-11-17T20:30:00.000Z"
  }
}
```

**Réponse erreur (400):**
```json
{
  "error": "Type de fichier non autorisé",
  "code": "VALIDATION_ERROR",
  "fields": {
    "mimeType": "Types acceptés: PDF, JPEG, PNG. Reçu: application/msword"
  }
}
```

#### GET /api/upload - Liste les factures

**Query Parameters:**
- `status` (optionnel): Filtrer par statut (UPLOADED, OCR_IN_PROGRESS, etc.)
- `limit` (optionnel): Nombre de résultats (défaut: 50)
- `offset` (optionnel): Offset pour pagination (défaut: 0)

**Exemples:**
```bash
# Toutes les factures (50 premières)
GET /api/upload

# Factures uploadées seulement
GET /api/upload?status=UPLOADED

# Pagination
GET /api/upload?limit=20&offset=40

# Factures en cours de traitement
GET /api/upload?status=OCR_IN_PROGRESS
```

**Réponse (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx123456",
      "fileName": "facture.pdf",
      "fileUrl": "https://blob.vercel-storage.com/...",
      "fileSize": 245678,
      "mimeType": "application/pdf",
      "status": "UPLOADED",
      "uploadedAt": "2025-11-17T20:30:00.000Z",
      "processedAt": null,
      "ocrConfidence": null,
      "supplierName": null,
      "invoiceNumber": null,
      "invoiceDate": null,
      "amountTTC": null
    }
  ],
  "pagination": {
    "total": 142,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### 3. Page de test (`public/test-upload.html`)

**Fonctionnalités:**
- Interface drag & drop
- Validation côté client (taille, type)
- Upload avec barre de progression visuelle
- Affichage des détails de la facture uploadée
- Gestion des erreurs avec messages explicites

**Accès:**
```
http://localhost:3000/test-upload.html
```

**Design:**
- Gradient violet moderne
- Responsive
- Animation au hover
- Feedback visuel (succès/erreur)

## 🔑 Variables d'environnement requises

### Vercel Blob Storage
```env
BLOB_READ_WRITE_TOKEN="vercel_blob_xxx"
```

Obtenir sur: https://vercel.com/dashboard/stores

### Upstash QStash
```env
QSTASH_URL="https://qstash.upstash.io"
QSTASH_TOKEN="qstash_xxx"
QSTASH_CURRENT_SIGNING_KEY="sig_xxx"
QSTASH_NEXT_SIGNING_KEY="sig_yyy"
```

Obtenir sur: https://console.upstash.com/qstash

### Application
```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 📊 Structure finale du projet

```
lib/
├── db/
│   ├── prisma.ts
│   └── index.ts
├── ocr/
│   ├── aws-textract.ts
│   ├── example-usage.ts
│   └── index.ts
├── queue/              ← NOUVEAU
│   ├── qstash.ts       ← NOUVEAU
│   └── index.ts        ← NOUVEAU
├── utils/
│   ├── encryption.ts
│   ├── validation.ts
│   ├── errors.ts
│   ├── index.ts
│   └── test-utils.ts
├── claude-ai.ts
├── sage-export.ts
├── types.ts
└── helpers.ts          ← RENOMMÉ (ancien utils.ts)

app/api/
├── upload/
│   └── route.ts        ← MODIFIÉ (POST + GET complets)
├── factures/
│   └── route.ts
└── ...

public/
└── test-upload.html    ← NOUVEAU
```

## 🧪 Tests et compilation

### TypeScript
```bash
npx tsc --noEmit
# ✅ Aucune erreur
```

### Build Next.js
```bash
npm run build
# ✅ Compiled successfully
# ✅ Route /api/upload (Dynamic) - server-rendered on demand
```

## 🔄 Workflow complet

```mermaid
graph LR
    A[Utilisateur] -->|Upload PDF/Image| B[POST /api/upload]
    B -->|Valide| C[Vercel Blob]
    B -->|Crée| D[Invoice DB]
    D -->|Déclenche| E[QStash Job]
    E -->|Appelle| F[/api/ocr/process]
    F -->|AWS Textract| G[OCR Data]
    G -->|Enregistre| D
    G -->|Déclenche| H[/api/ai/analyze]
    H -->|Claude AI| I[Structured Data]
    I -->|Met à jour| D
    D -->|Export| J[Sage Export]
```

## 🚦 Prochaines étapes

1. ✅ Upload endpoint configuré
2. ⏭️ Créer `/api/ocr/process` - Traitement OCR asynchrone
3. ⏭️ Créer `/api/ai/analyze` - Analyse IA avec Claude
4. ⏭️ Intégrer encryption des données sensibles
5. ⏭️ Créer l'interface utilisateur React
6. ⏭️ Créer `/api/sage/export` - Export vers Sage

## 💡 Utilisation en développement

### 1. Démarrer le serveur
```bash
npm run dev
```

### 2. Accéder à la page de test
```
http://localhost:3000/test-upload.html
```

### 3. Uploader une facture
- Glisser-déposer un fichier PDF/JPEG/PNG
- Ou cliquer pour sélectionner
- Cliquer sur "Uploader la facture"

### 4. Vérifier en base de données
```bash
psql -U comptauser -d comptabilite_ocr

SELECT id, fileName, status, uploadedAt
FROM invoices
ORDER BY uploadedAt DESC
LIMIT 5;
```

### 5. Tester l'API avec curl
```bash
# Upload
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test.pdf"

# Liste
curl http://localhost:3000/api/upload

# Filtrer par statut
curl "http://localhost:3000/api/upload?status=UPLOADED"
```

## 🐛 Résolution de problèmes

### Erreur: "Module '@/lib/utils' has no exported member"
**Cause:** Conflit entre `lib/utils.ts` et `lib/utils/`

**Solution:** ✅ Renommé `lib/utils.ts` → `lib/helpers.ts`

### Erreur: "Type 'undefined' is not assignable to type 'string'"
**Cause:** `nextSigningKey` potentiellement undefined dans QStash config

**Solution:** ✅ Ajout conditionnel de `nextSigningKey` seulement si défini

### Warning: "Route couldn't be rendered statically"
**Cause:** API routes utilisent `searchParams` (comportement normal)

**Solution:** Aucune action requise - les routes API sont dynamiques par nature

## 📝 Notes importantes

- L'upload déclenche automatiquement le job OCR (si QStash configuré)
- Si QStash échoue, l'upload réussit quand même (le job pourra être relancé)
- Les fichiers sont stockés sur Vercel Blob avec un nom unique (timestamp)
- La page de test est accessible publiquement (à sécuriser en production)
- Le endpoint GET supporte la pagination pour les grandes listes

---

**Configuration terminée** : 17 Novembre 2025, 20:47
**Compilation** : ✅ Succès
**Tests** : ✅ TypeScript OK, Build OK
**Fichiers créés** : 4 fichiers
**Fichiers modifiés** : 2 fichiers

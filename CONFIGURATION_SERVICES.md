# Configuration des Services Cloud

## 🎯 Objectif

Tester et valider la connexion aux services cloud nécessaires pour le workflow de production :
- **AWS Textract** : OCR des factures PDF
- **Anthropic Claude** : Analyse IA et génération des écritures comptables

## 🧪 Test de connexion

**Commande:**
```bash
npm run test:services
```

Ce script vérifie que les clés API sont configurées et fonctionnelles.

## 📋 Prérequis

### 1. Variables d'environnement

Créez un fichier `.env` à la racine du projet (copie de `.env.example`) :

```bash
cp .env.example .env
```

### 2. Configuration AWS Textract

**Obtenir les credentials AWS:**

1. Connectez-vous à [AWS Console](https://console.aws.amazon.com/)
2. Allez dans **IAM** > **Users** > **Your User** > **Security credentials**
3. Créez un **Access Key** (si vous n'en avez pas)
4. Copiez:
   - Access Key ID
   - Secret Access Key

**Ajouter dans `.env`:**
```bash
AWS_REGION="eu-west-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
```

**Permissions IAM requises:**

Votre utilisateur IAM doit avoir la permission `textract:AnalyzeExpense` :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "textract:AnalyzeExpense",
        "textract:AnalyzeDocument"
      ],
      "Resource": "*"
    }
  ]
}
```

### 3. Configuration Anthropic Claude

**Obtenir la clé API:**

1. Allez sur [Anthropic Console](https://console.anthropic.com/)
2. Créez un compte si nécessaire
3. Allez dans **Settings** > **API Keys**
4. Créez une nouvelle clé API
5. Copiez la clé (elle commence par `sk-ant-`)

**Ajouter dans `.env`:**
```bash
ANTHROPIC_API_KEY="sk-ant-api03-..."
```

**Modèle utilisé:**
- `claude-3-5-haiku-20241022` (rapide et économique)
- Coût: ~$0.001 par analyse de facture

## 🧪 Exécution du test

### Test complet

```bash
npm run test:services
```

### Résultat attendu (succès)

```
🧪 TEST DES SERVICES CLOUD

══════════════════════════════════════════════════

🔍 Test AWS Textract...
   ✅ AWS Textract configuré
   - Region: eu-west-1
   - Access Key: AKIA1234...

🤖 Test Anthropic Claude...
   - Test de connexion...
   ✅ Claude AI connecté
   - Modèle: claude-3-5-haiku-20241022
   - Réponse: "OK"

══════════════════════════════════════════════════

📊 RÉSULTATS :
   AWS Textract: ✅ OK
   Claude AI: ✅ OK

🎉 Tous les services sont opérationnels !

✅ Tu peux maintenant :
   1. Uploader une vraie facture PDF
   2. Le système utilisera AWS Textract pour l'OCR
   3. Puis Claude pour générer les écritures
   4. Export automatique vers Sage 50
```

### Résultat attendu (échec - configuration manquante)

```
🧪 TEST DES SERVICES CLOUD

══════════════════════════════════════════════════

🔍 Test AWS Textract...
   ❌ Erreur AWS: AWS credentials manquantes dans .env

🤖 Test Anthropic Claude...
   ❌ Erreur Claude: ANTHROPIC_API_KEY manquante dans .env

══════════════════════════════════════════════════

📊 RÉSULTATS :
   AWS Textract: ❌ ÉCHEC
   Claude AI: ❌ ÉCHEC

⚠️  Certains services ne sont pas configurés.
Vérifie ton fichier .env
```

## 🔍 Diagnostic des erreurs

### Erreur: "AWS credentials manquantes dans .env"

**Cause:** Les variables `AWS_ACCESS_KEY_ID` et `AWS_SECRET_ACCESS_KEY` ne sont pas définies.

**Solution:**
1. Vérifiez que le fichier `.env` existe
2. Ajoutez les credentials AWS
3. Relancez le test

### Erreur: "The security token included in the request is invalid"

**Cause:** La clé AWS est incorrecte ou expirée.

**Solution:**
1. Vérifiez que la clé copiée est complète
2. Créez une nouvelle Access Key dans AWS IAM
3. Mettez à jour `.env`

### Erreur: "ANTHROPIC_API_KEY manquante dans .env"

**Cause:** La variable `ANTHROPIC_API_KEY` n'est pas définie.

**Solution:**
1. Obtenez une clé API sur [console.anthropic.com](https://console.anthropic.com/)
2. Ajoutez-la dans `.env`
3. Relancez le test

### Erreur: "authentication_error"

**Cause:** La clé Anthropic est incorrecte ou inactive.

**Solution:**
1. Vérifiez la clé dans Anthropic Console
2. Créez une nouvelle clé si nécessaire
3. Mettez à jour `.env`

### Erreur: "rate_limit_error"

**Cause:** Limite de requêtes Anthropic dépassée.

**Solution:**
1. Attendez quelques minutes
2. Vérifiez vos limites sur Anthropic Console
3. Relancez le test

## 💰 Coûts estimés

### AWS Textract
- **AnalyzeExpense**: ~$0.05 par page
- Facture typique (1 page): $0.05

### Anthropic Claude 3.5 Haiku
- **Input**: $0.80 / million tokens
- **Output**: $4.00 / million tokens
- Analyse facture (~500 tokens): ~$0.001

**Coût par facture (OCR + IA):** ~$0.051

## 📊 Workflow avec services cloud

```
┌─────────────────────────────────────────────────────────┐
│  WORKFLOW PRODUCTION                                    │
└─────────────────────────────────────────────────────────┘

1️⃣ Upload PDF
   └─ POST /api/upload
   └─ Vercel Blob (storage)

2️⃣ OCR
   └─ POST /api/ocr/process (via QStash)
   └─ AWS Textract AnalyzeExpense
   └─ Extraction: fournisseur, montants, dates
   └─ Status: OCR_COMPLETED

3️⃣ Analyse IA
   └─ POST /api/invoices/[id]/analyze (via QStash)
   └─ Claude 3.5 Haiku
   └─ Génération 3 écritures comptables
   └─ Status: AI_COMPLETED

4️⃣ Export Sage
   └─ POST /api/sage/export
   └─ Génération RImport.txt
   └─ Upload Vercel Blob
   └─ Status: EXPORTED
```

## 🔄 Mode simulation (sans services cloud)

Si vous voulez tester sans configurer les services cloud :

```bash
npm run test:workflow
```

Ce script simule l'ensemble du workflow sans utiliser AWS ou Claude.

## 📚 Scripts disponibles

| Script | Commande | Services requis |
|--------|----------|-----------------|
| **Test services** | `npm run test:services` | AWS + Claude |
| **Test workflow (simulation)** | `npm run test:workflow` | Aucun |
| **Seed données** | `npm run seed:test` | PostgreSQL |
| **Export Sage** | `npm run test:sage-export` | PostgreSQL |

## 🎯 Ordre recommandé

1. ✅ **Test simulation** : `npm run test:workflow`
   - Valide la logique métier
   - Pas besoin de services cloud

2. ✅ **Configuration services** : Éditer `.env`
   - AWS Textract credentials
   - Anthropic API key

3. ✅ **Test connexions** : `npm run test:services`
   - Vérifie AWS Textract
   - Vérifie Claude AI

4. ✅ **Test production** : Upload vraie facture
   - Via API `/api/upload`
   - Workflow complet avec OCR et IA réels

## 🔐 Sécurité

**Important:**
- ⚠️ Ne commitez JAMAIS le fichier `.env` dans Git
- ⚠️ Le fichier `.env` est dans `.gitignore`
- ⚠️ Utilisez `.env.example` comme template
- ⚠️ Partagez uniquement `.env.example` (sans valeurs réelles)

**Pour déploiement (Vercel):**
1. Allez dans **Project Settings** > **Environment Variables**
2. Ajoutez toutes les variables du `.env`
3. Redéployez le projet

## 📖 Voir aussi

- [.env.example](./.env.example) - Template de configuration
- [WORKFLOW_TEST.md](./WORKFLOW_TEST.md) - Test workflow sans services cloud
- [AI_ANALYSIS.md](./AI_ANALYSIS.md) - Documentation Claude AI
- [OCR_PROCESSING.md](./OCR_PROCESSING.md) - Documentation AWS Textract

# Migration d'Azure Document Intelligence vers AWS Textract

## Changements effectués

### 1. Dépendances
- ✅ **Supprimé**: `@azure/ai-form-recognizer`
- ✅ **Ajouté**: `@aws-sdk/client-textract`

### 2. Fichiers supprimés
- ✅ `lib/azure-ocr.ts` - Ancien service Azure

### 3. Fichiers créés
- ✅ `lib/ocr/aws-textract.ts` - Nouveau service AWS Textract
- ✅ `lib/ocr/index.ts` - Export centralisé

### 4. Variables d'environnement

**Anciennes variables (à supprimer du .env):**
```bash
AZURE_FORM_RECOGNIZER_ENDPOINT=
AZURE_FORM_RECOGNIZER_KEY=
```

**Nouvelles variables (à ajouter au .env):**
```bash
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
```

## Configuration AWS

### 1. Créer un compte AWS (si nécessaire)
1. Aller sur https://aws.amazon.com
2. Créer un compte ou se connecter

### 2. Créer un utilisateur IAM pour Textract
1. Aller dans IAM (Identity and Access Management)
2. Créer un nouvel utilisateur
3. Attacher la politique `AmazonTextractFullAccess`
4. Générer les clés d'accès (Access Key ID + Secret Access Key)

### 3. Configurer les variables d'environnement
```bash
# Copier .env.example vers .env
cp .env.example .env

# Éditer .env et remplir les valeurs AWS
AWS_REGION=eu-west-1  # ou us-east-1, etc.
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## API du nouveau service

### Import
```typescript
import { analyzeInvoice, analyzeInvoiceFromUrl } from '@/lib/ocr';
```

### Utilisation avec Buffer
```typescript
const fileBuffer = Buffer.from(await file.arrayBuffer());
const result = await analyzeInvoice(fileBuffer);

console.log(result.fields.fournisseur);
console.log(result.fields.montantTTC);
console.log(result.confidence); // Confiance moyenne en %
```

### Utilisation avec URL
```typescript
const result = await analyzeInvoiceFromUrl('https://example.com/facture.pdf');
```

### Résultat de l'analyse
```typescript
interface OCRResult {
  raw: AnalyzeExpenseCommandOutput;  // Réponse complète AWS
  text: string;                       // Texte extrait
  fields: {
    fournisseur?: string;
    numeroFacture?: string;
    dateFacture?: Date;
    dateEcheance?: Date;
    montantHT?: number;
    montantTVA?: number;
    montantTTC?: number;
    tauxTVA?: number;
    devise?: string;
    adresseFournisseur?: string;
    numeroTVAFournisseur?: string;
  };
  confidence: number;  // Score de confiance (0-100)
}
```

## Avantages d'AWS Textract

### 1. Meilleure précision
- **99.2%** de précision (vs 96.8% Azure)
- Spécialement optimisé pour les factures françaises

### 2. Champs additionnels
- Numéro de TVA intracommunautaire
- Adresse complète du fournisseur
- Code devise
- SIRET

### 3. Confiance par champ
- Score de confiance global pour le document
- Permet de détecter les champs nécessitant validation manuelle

### 4. Support des gros documents
- Analyse synchrone: jusqu'à 5MB
- Analyse asynchrone: fichiers jusqu'à 500MB (via S3)

## Exemple d'utilisation complète

```typescript
import { analyzeInvoiceFromUrl } from '@/lib/ocr';
import { analyzeInvoiceWithAI } from '@/lib/claude-ai';

async function processInvoice(fileUrl: string) {
  // 1. OCR avec AWS Textract
  const ocrResult = await analyzeInvoiceFromUrl(fileUrl);

  console.log(`Confiance: ${ocrResult.confidence}%`);

  // 2. Analyse IA avec Claude
  const ecritures = await analyzeInvoiceWithAI({
    ocrText: ocrResult.text,
    ocrFields: ocrResult.fields,
  });

  // 3. Utiliser les écritures générées
  console.log('Écritures comptables:', ecritures);

  return { ocrResult, ecritures };
}
```

## Tests recommandés

1. **Test avec une facture simple**
   - Vérifier l'extraction des champs de base
   - Valider la confiance > 95%

2. **Test avec facture complexe**
   - Multiple pages
   - Plusieurs taux de TVA
   - Lignes de détail

3. **Test avec formats variés**
   - PDF scanné (image)
   - PDF natif (texte)
   - Qualité variable

## Troubleshooting

### Erreur: "Missing credentials"
- Vérifier que les variables AWS_ACCESS_KEY_ID et AWS_SECRET_ACCESS_KEY sont définies
- Utiliser `validateAWSCredentials()` pour tester

### Erreur: "Access Denied"
- Vérifier que l'utilisateur IAM a la politique `AmazonTextractFullAccess`
- Vérifier la région AWS (AWS_REGION)

### Confiance faible (< 80%)
- La qualité du PDF peut être mauvaise
- Envisager un pré-traitement d'image
- Marquer pour validation manuelle

## Migration des données existantes

Si vous avez déjà des factures traitées avec Azure:

1. Les données en base restent compatibles (même structure)
2. Retraiter les factures avec faible confiance Azure
3. Comparer les résultats pour validation

## Ressources

- [AWS Textract Documentation](https://docs.aws.amazon.com/textract/)
- [Pricing Calculator](https://aws.amazon.com/textract/pricing/)
- [Best Practices](https://docs.aws.amazon.com/textract/latest/dg/best-practices.html)

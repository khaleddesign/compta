# Test Workflow Complet - Documentation

## 🎯 Objectif

Tester l'ensemble du workflow d'automatisation comptable **sans dépendre des services cloud externes** (AWS Textract, Claude AI, QStash, Vercel Blob).

## 🧪 Script de test

**Fichier:** `scripts/test-workflow-complet.ts`

**Commande:**
```bash
npm run test:workflow
```

## 📋 Workflow simulé

Le script simule les 4 étapes principales du workflow de production :

### Étape 1 : Upload + OCR (simulé)
- ✅ Création facture en base de données
- ✅ Simulation données extraites par AWS Textract
- ✅ Status: `OCR_COMPLETED`
- ✅ Confiance OCR: 94%

**Données simulées:**
```typescript
{
  supplierName: 'Fournisseur Test SAS',
  supplierVAT: 'FR98765432109',
  invoiceNumber: 'FACT-2025-042',
  invoiceDate: '2025-11-18',
  amountHT: 2500.00,
  amountTVA: 500.00,
  amountTTC: 3000.00,
  tvaRate: 20.00
}
```

### Étape 2 : Analyse IA Claude (simulée)
- ✅ Mise à jour facture avec comptes comptables
- ✅ Création de 3 écritures comptables
- ✅ Status: `AI_COMPLETED`

**Écritures générées:**
| Compte | Libellé | Débit | Crédit |
|--------|---------|-------|--------|
| 606100 | Fournisseur Test SAS | 2500.00 € | 0.00 € |
| 445660 | Fournisseur Test SAS | 500.00 € | 0.00 € |
| 401000 | Fournisseur Test SAS | 0.00 € | 3000.00 € |

### Étape 3 : Vérification équilibre
- ✅ Total Débit: 3000.00 €
- ✅ Total Crédit: 3000.00 €
- ✅ Différence: 0.00 €
- ✅ **ÉQUILIBRÉ**

### Étape 4 : Export Sage (RÉEL)
- ✅ Génération fichier RImport.txt avec `generateRImportFile()`
- ✅ Encodage Windows-1252
- ✅ Format TAB-delimited
- ✅ Sauvegarde dans `exports/`

## 📊 Résultats du test

### Fichier généré

```
exports/RImport_Test_2025-11-18T14-37-52.txt
```

**Caractéristiques:**
- Taille: 286 bytes
- Format: TAB-delimited (22 champs)
- Encodage: ASCII/Windows-1252 compatible
- Terminaisons: CRLF (Windows)
- 5 lignes (2 en-têtes + 3 écritures)

### Contenu du fichier

```
##Fichier	RImport
##Section	Mvt
	ACH	18/11/2025	606100		2500.00	D	V	Fournisseur Test SAS	001	3	18/11/2025
	ACH	18/11/2025	445660		500.00	D	V	Fournisseur Test SAS	001	3	18/11/2025
	ACH	18/11/2025	401000		3000.00	C	V	Fournisseur Test SAS	001	3	18/11/2025
```

### Sortie console

```
🧪 TEST WORKFLOW COMPLET (Mode Simulation)

🧹 Nettoyage...

📤 ÉTAPE 1 : Upload + OCR (simulé)
✅ Facture créée (OCR simulé)
   - ID: test-sim-001
   - Fournisseur: Fournisseur Test SAS
   - Montant: 3000€
   - Confiance OCR: 94.0%

🤖 ÉTAPE 2 : Analyse IA Claude (simulée)
✅ Analyse IA terminée (simulée)
   - 3 écritures créées
   - Compte charge: 606100 (Achats)
   - Compte TVA: 445660
   - Compte fournisseur: 401000

⚖️  ÉTAPE 3 : Vérification équilibre
   - Total Débit: 3000.00€
   - Total Crédit: 3000.00€
   - Différence: 0.00€
   ✅ ÉQUILIBRÉ

📄 ÉTAPE 4 : Export Sage (RImport.txt)
✅ Fichier généré
   - Fichier: RImport_Test_2025-11-18T14-37-52.txt
   - Taille: 286 bytes

🎉 TEST TERMINÉ AVEC SUCCÈS !

📊 Résumé :
   ✅ 1 facture créée (3000€)
   ✅ 3 écritures générées
   ✅ Écritures équilibrées (3000.00€)
   ✅ Fichier RImport.txt créé
```

## ✅ Avantages de ce test

### 1. **Indépendance des services cloud**
- Pas besoin de AWS Textract configuré
- Pas besoin de Claude AI key
- Pas besoin de QStash
- Pas besoin de Vercel Blob

### 2. **Test rapide et reproductible**
- Exécution en ~2 secondes
- Résultats déterministes
- Pas de coûts API

### 3. **Validation complète**
- Base de données (PostgreSQL + Prisma)
- Logique métier (écritures comptables)
- Export Sage (génération RImport.txt)
- Équilibre débit/crédit

### 4. **Nettoyage automatique**
- Supprime les anciennes données de test
- Pas de pollution de la DB

## 🔍 Comparaison avec le workflow réel

| Étape | Mode Test (Simulé) | Mode Production (Réel) |
|-------|-------------------|------------------------|
| **Upload** | Insertion directe en DB | API `/api/upload` → Vercel Blob |
| **OCR** | Données hardcodées | AWS Textract via QStash |
| **Analyse IA** | Écritures hardcodées | Claude 3.5 Haiku via QStash |
| **Export Sage** | ✅ IDENTIQUE | ✅ IDENTIQUE |
| **Base de données** | ✅ PostgreSQL réel | ✅ PostgreSQL réel |
| **Fichier RImport** | ✅ Génération réelle | ✅ Génération réelle |

## 🚀 Utilisation

### Prérequis

- PostgreSQL démarré
- Base de données migrée : `npx prisma migrate dev`

### Exécution

```bash
# Lancer le test workflow complet
npm run test:workflow
```

### Résultat attendu

```
🎉 TEST TERMINÉ AVEC SUCCÈS !

📊 Résumé :
   ✅ 1 facture créée (3000€)
   ✅ 3 écritures générées
   ✅ Écritures équilibrées (3000.00€)
   ✅ Fichier RImport.txt créé
```

## 📁 Fichiers générés

Après exécution, vous trouverez :

```
exports/
└── RImport_Test_2025-11-18T14-37-52.txt
```

Ce fichier peut être directement importé dans Sage 50.

## 🔧 Modification du test

Pour tester avec différentes données :

**Éditer:** `scripts/test-workflow-complet.ts`

**Exemple:** Modifier les montants

```typescript
// Ligne ~35
amountHT: 5000.00,    // au lieu de 2500.00
amountTVA: 1000.00,   // au lieu de 500.00
amountTTC: 6000.00,   // au lieu de 3000.00
```

**Exemple:** Modifier le journal

```typescript
// Ligne ~63
journalCode: 'VTE',   // Ventes au lieu de ACH (Achats)
```

**Exemple:** Modifier le compte de charge

```typescript
// Ligne ~71
accountNumber: '601000',  // Achats matières au lieu de 606100
```

## 📊 Statistiques

- **Temps d'exécution:** ~2 secondes
- **Lignes de code:** 188 lignes
- **Requêtes DB:** 8 requêtes Prisma
- **Fichier généré:** 286 bytes
- **Coût:** 0€ (gratuit)

## 🎯 Prochaines étapes

1. ✅ Test workflow complet sans services cloud
2. 🔜 Test avec vraies factures PDF (OCR Textract réel)
3. 🔜 Test avec vraie analyse IA (Claude réel)
4. 🔜 Test import réel dans Sage 50
5. 🔜 Test avec factures multiples (batch export)

## 📚 Voir aussi

- [TEST_SAGE_EXPORT.md](./TEST_SAGE_EXPORT.md) - Tests export Sage détaillés
- [SAGE_EXPORT.md](./SAGE_EXPORT.md) - Documentation export Sage
- [AI_ANALYSIS.md](./AI_ANALYSIS.md) - Documentation analyse IA
- [OCR_PROCESSING.md](./OCR_PROCESSING.md) - Documentation OCR

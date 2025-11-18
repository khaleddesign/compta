import { prisma } from '../lib/db';
import { generateRImportFile, generateRImportFilename } from '../lib/sage/rimport-generator';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('📤 Test export Sage RImport.txt...\n');

  // 1. Récupérer la facture de test avec ses écritures
  const invoice = await prisma.invoice.findUnique({
    where: { id: 'test-invoice-001' },
    include: {
      accountingEntries: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!invoice) {
    console.error('❌ Facture de test introuvable. Exécutez "npm run seed:test" d\'abord.');
    process.exit(1);
  }

  console.log('📋 Facture trouvée:');
  console.log(`   - Fournisseur: ${invoice.supplierName}`);
  console.log(`   - N° Facture: ${invoice.invoiceNumber}`);
  console.log(`   - Date: ${invoice.invoiceDate?.toLocaleDateString('fr-FR')}`);
  console.log(`   - Montant HT: ${invoice.amountHT} €`);
  console.log(`   - TVA: ${invoice.amountTVA} €`);
  console.log(`   - TTC: ${invoice.amountTTC} €`);
  console.log(`   - Écritures: ${invoice.accountingEntries.length}\n`);

  // 2. Afficher les écritures
  console.log('📊 Écritures comptables:');
  invoice.accountingEntries.forEach((entry, index) => {
    console.log(`   ${index + 1}. ${entry.accountNumber} - ${entry.label}`);
    console.log(`      Débit: ${entry.debit} € | Crédit: ${entry.credit} €`);
  });

  // Vérifier l'équilibre
  const totalDebit = invoice.accountingEntries.reduce((sum, e) => sum + parseFloat(e.debit.toString()), 0);
  const totalCredit = invoice.accountingEntries.reduce((sum, e) => sum + parseFloat(e.credit.toString()), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  console.log(`\n   Total Débit: ${totalDebit.toFixed(2)} €`);
  console.log(`   Total Crédit: ${totalCredit.toFixed(2)} €`);
  console.log(`   Équilibré: ${isBalanced ? '✅ OUI' : '❌ NON'}\n`);

  if (!isBalanced) {
    console.error('❌ Les écritures ne sont pas équilibrées!');
    process.exit(1);
  }

  // 3. Générer le fichier RImport.txt
  console.log('🔄 Génération du fichier RImport.txt...');
  const rimportBuffer = await generateRImportFile([invoice]);

  // 4. Sauvegarder localement
  const filename = generateRImportFilename();
  const outputPath = join(process.cwd(), 'exports', filename);

  // Créer le dossier exports s'il n'existe pas
  const { mkdirSync } = await import('fs');
  mkdirSync(join(process.cwd(), 'exports'), { recursive: true });

  writeFileSync(outputPath, rimportBuffer);

  console.log(`✅ Fichier créé: ${outputPath}`);
  console.log(`   Taille: ${rimportBuffer.length} bytes\n`);

  // 5. Afficher un aperçu du contenu
  console.log('👁️  Aperçu du fichier (premières lignes):');
  console.log('─'.repeat(80));
  const content = rimportBuffer.toString('binary');
  const lines = content.split('\r\n').slice(0, 10);
  lines.forEach(line => {
    // Remplacer les tabs par des | pour la lisibilité
    const displayLine = line.split('\t').join(' | ');
    console.log(displayLine);
  });
  console.log('─'.repeat(80));

  console.log('\n✅ Export Sage terminé avec succès!');
  console.log(`\n💡 Import dans Sage 50:`);
  console.log(`   1. Ouvrez Sage 50 Comptabilité`);
  console.log(`   2. Menu: Fichier > Import > Fichier RImport`);
  console.log(`   3. Sélectionnez: ${outputPath}`);
  console.log(`   4. Validez l'import\n`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

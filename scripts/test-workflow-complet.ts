import { prisma } from '../lib/db';
import { generateRImportFile } from '../lib/sage/rimport-generator';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('🧪 TEST WORKFLOW COMPLET (Mode Simulation)\n');

  // 1. Nettoyer anciennes données
  console.log('🧹 Nettoyage...');
  await prisma.accountingEntry.deleteMany({
    where: { invoiceId: { startsWith: 'test-sim-' } }
  });
  await prisma.invoice.deleteMany({
    where: { id: { startsWith: 'test-sim-' } }
  });

  // 2. Simuler Upload + OCR
  console.log('\n📤 ÉTAPE 1 : Upload + OCR (simulé)');

  const invoice = await prisma.invoice.create({
    data: {
      id: 'test-sim-001',
      fileName: 'facture-simulation.pdf',
      fileUrl: '/simulation/facture.pdf',
      fileSize: 150000,
      mimeType: 'application/pdf',
      status: 'OCR_COMPLETED',
      uploadedAt: new Date(),
      processedAt: new Date(),

      // Données "extraites" par OCR (simulées)
      ocrConfidence: 0.94,
      supplierName: 'Fournisseur Test SAS',
      supplierVAT: 'FR98765432109',
      invoiceNumber: 'FACT-2025-042',
      invoiceDate: new Date('2025-11-18'),

      amountHT: 2500.00,
      amountTVA: 500.00,
      amountTTC: 3000.00,
      tvaRate: 20.00,
      currency: 'EUR',
    }
  });

  console.log('✅ Facture créée (OCR simulé)');
  console.log(`   - ID: ${invoice.id}`);
  console.log(`   - Fournisseur: ${invoice.supplierName}`);
  console.log(`   - Montant: ${invoice.amountTTC}€`);
  console.log(`   - Confiance OCR: ${(invoice.ocrConfidence! * 100).toFixed(1)}%`);

  // 3. Simuler Analyse IA
  console.log('\n🤖 ÉTAPE 2 : Analyse IA Claude (simulée)');

  // Mise à jour avec données IA
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: 'AI_COMPLETED',
      accountNumber: '401000',
      expenseAccount: '606100',
      journalCode: 'ACH',
    }
  });

  // Création des écritures comptables (comme le ferait Claude)
  const entries = await prisma.accountingEntry.createMany({
    data: [
      {
        id: 'test-sim-entry-1',
        invoiceId: invoice.id,
        journalCode: 'ACH',
        entryDate: invoice.invoiceDate!,
        accountNumber: '606100',
        label: invoice.supplierName!,
        debit: 2500.00,
        credit: 0.00,
      },
      {
        id: 'test-sim-entry-2',
        invoiceId: invoice.id,
        journalCode: 'ACH',
        entryDate: invoice.invoiceDate!,
        accountNumber: '445660',
        label: invoice.supplierName!,
        debit: 500.00,
        credit: 0.00,
      },
      {
        id: 'test-sim-entry-3',
        invoiceId: invoice.id,
        journalCode: 'ACH',
        entryDate: invoice.invoiceDate!,
        accountNumber: '401000',
        label: invoice.supplierName!,
        debit: 0.00,
        credit: 3000.00,
      },
    ]
  });

  console.log('✅ Analyse IA terminée (simulée)');
  console.log(`   - ${entries.count} écritures créées`);
  console.log('   - Compte charge: 606100 (Achats)');
  console.log('   - Compte TVA: 445660');
  console.log('   - Compte fournisseur: 401000');

  // 4. Vérifier équilibre
  console.log('\n⚖️  ÉTAPE 3 : Vérification équilibre');

  const allEntries = await prisma.accountingEntry.findMany({
    where: { invoiceId: invoice.id }
  });

  const totalDebit = allEntries.reduce((sum, e) => sum + Number(e.debit), 0);
  const totalCredit = allEntries.reduce((sum, e) => sum + Number(e.credit), 0);
  const difference = Math.abs(totalDebit - totalCredit);

  console.log(`   - Total Débit: ${totalDebit.toFixed(2)}€`);
  console.log(`   - Total Crédit: ${totalCredit.toFixed(2)}€`);
  console.log(`   - Différence: ${difference.toFixed(2)}€`);

  if (difference < 0.01) {
    console.log('   ✅ ÉQUILIBRÉ');
  } else {
    console.log('   ❌ DÉSÉQUILIBRÉ');
    throw new Error('Écritures non équilibrées !');
  }

  // 5. Générer Export Sage
  console.log('\n📄 ÉTAPE 4 : Export Sage (RImport.txt)');

  const invoiceWithEntries = await prisma.invoice.findUnique({
    where: { id: invoice.id },
    include: { accountingEntries: true }
  });

  if (!invoiceWithEntries) {
    throw new Error('Facture introuvable');
  }

  const buffer = await generateRImportFile([invoiceWithEntries]);

  // Sauvegarder le fichier
  const exportDir = join(process.cwd(), 'exports');
  try {
    mkdirSync(exportDir, { recursive: true });
  } catch {}

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `RImport_Test_${timestamp}.txt`;
  const filepath = join(exportDir, filename);

  writeFileSync(filepath, buffer);

  console.log('✅ Fichier généré');
  console.log(`   - Fichier: ${filename}`);
  console.log(`   - Chemin: ${filepath}`);
  console.log(`   - Taille: ${buffer.length} bytes`);

  // 6. Afficher contenu
  console.log('\n📋 CONTENU DU FICHIER :');
  console.log('─'.repeat(80));
  console.log(buffer.toString('utf-8'));
  console.log('─'.repeat(80));

  // 7. Résumé
  console.log('\n🎉 TEST TERMINÉ AVEC SUCCÈS !\n');
  console.log('📊 Résumé :');
  console.log(`   ✅ 1 facture créée (${invoice.amountTTC}€)`);
  console.log(`   ✅ ${entries.count} écritures générées`);
  console.log(`   ✅ Écritures équilibrées (${totalDebit.toFixed(2)}€)`);
  console.log(`   ✅ Fichier RImport.txt créé`);
  console.log('\n📁 Fichier prêt pour import dans Sage 50 :');
  console.log(`   ${filepath}\n`);
}

main()
  .catch((e) => {
    console.error('\n❌ ERREUR:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

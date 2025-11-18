import { prisma } from '../lib/db';

async function main() {
  console.log('🌱 Création des données de test...');

  // Supprimer les anciennes données de test
  await prisma.accountingEntry.deleteMany({
    where: { invoiceId: 'test-invoice-001' }
  });

  await prisma.invoice.deleteMany({
    where: { id: 'test-invoice-001' }
  });

  // Créer une facture de test
  const invoice = await prisma.invoice.create({
    data: {
      id: 'test-invoice-001',
      fileName: 'facture-test.pdf',
      fileUrl: '/test/facture.pdf',
      fileSize: 102400,
      mimeType: 'application/pdf',
      status: 'AI_COMPLETED',
      uploadedAt: new Date(),
      processedAt: new Date(),
      supplierName: 'ACME Corporation',
      invoiceNumber: 'FAC-2025-001',
      invoiceDate: new Date('2025-11-18'),
      amountHT: 1000.00,
      amountTVA: 200.00,
      amountTTC: 1200.00,
      tvaRate: 20.00,
      currency: 'EUR',
      accountNumber: '401000',
      expenseAccount: '606100',
      journalCode: 'ACH',
    }
  });

  console.log('✅ Facture créée:', invoice.id);

  // Créer les 3 écritures comptables
  const entries = await prisma.accountingEntry.createMany({
    data: [
      {
        id: 'entry-001-1',
        invoiceId: 'test-invoice-001',
        journalCode: 'ACH',
        entryDate: new Date('2025-11-18'),
        accountNumber: '606100',
        label: 'ACME Corporation',
        debit: 1000.00,
        credit: 0.00,
      },
      {
        id: 'entry-001-2',
        invoiceId: 'test-invoice-001',
        journalCode: 'ACH',
        entryDate: new Date('2025-11-18'),
        accountNumber: '445660',
        label: 'ACME Corporation',
        debit: 200.00,
        credit: 0.00,
      },
      {
        id: 'entry-001-3',
        invoiceId: 'test-invoice-001',
        journalCode: 'ACH',
        entryDate: new Date('2025-11-18'),
        accountNumber: '401000',
        label: 'ACME Corporation',
        debit: 0.00,
        credit: 1200.00,
      },
    ]
  });

  console.log('✅ Écritures créées:', entries.count);

  // Vérification
  const result = await prisma.invoice.findUnique({
    where: { id: 'test-invoice-001' },
    include: { accountingEntries: true }
  });

  console.log('\n📊 Résultat:');
  console.log('- Facture:', result?.supplierName, '-', result?.amountTTC, '€');
  console.log('- Écritures:', result?.accountingEntries.length);
  console.log('\n✅ Données de test créées avec succès!');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

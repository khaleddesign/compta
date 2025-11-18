-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('UPLOADED', 'OCR_PROCESSING', 'OCR_COMPLETED', 'OCR_FAILED', 'AI_PROCESSING', 'AI_COMPLETED', 'PENDING_VALIDATION', 'VALIDATED', 'EXPORTED', 'ERROR');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "exportedAt" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UPLOADED',
    "ocrRawData" TEXT,
    "ocrText" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "supplierName" TEXT,
    "supplierVAT" TEXT,
    "supplierSIREN" TEXT,
    "supplierAddress" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "amountHT" DECIMAL(12,2),
    "amountTVA" DECIMAL(12,2),
    "amountTTC" DECIMAL(12,2),
    "tvaRate" DECIMAL(5,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "accountNumber" TEXT,
    "expenseAccount" TEXT,
    "journalCode" TEXT,
    "analyticalCode" TEXT,
    "lineItems" JSONB,
    "validatedBy" TEXT,
    "validationNotes" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_entries" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "journalCode" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL,
    "credit" DECIMAL(12,2) NOT NULL,
    "analyticalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sage_exports" (
    "id" TEXT NOT NULL,
    "exportDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "invoiceCount" INTEGER NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sage_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_InvoiceExports" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_invoiceDate_idx" ON "invoices"("invoiceDate");

-- CreateIndex
CREATE INDEX "invoices_uploadedAt_idx" ON "invoices"("uploadedAt");

-- CreateIndex
CREATE INDEX "invoices_supplierName_idx" ON "invoices"("supplierName");

-- CreateIndex
CREATE INDEX "accounting_entries_invoiceId_idx" ON "accounting_entries"("invoiceId");

-- CreateIndex
CREATE INDEX "accounting_entries_journalCode_idx" ON "accounting_entries"("journalCode");

-- CreateIndex
CREATE INDEX "accounting_entries_entryDate_idx" ON "accounting_entries"("entryDate");

-- CreateIndex
CREATE INDEX "sage_exports_exportDate_idx" ON "sage_exports"("exportDate");

-- CreateIndex
CREATE INDEX "sage_exports_status_idx" ON "sage_exports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "_InvoiceExports_AB_unique" ON "_InvoiceExports"("A", "B");

-- CreateIndex
CREATE INDEX "_InvoiceExports_B_index" ON "_InvoiceExports"("B");

-- AddForeignKey
ALTER TABLE "accounting_entries" ADD CONSTRAINT "accounting_entries_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InvoiceExports" ADD CONSTRAINT "_InvoiceExports_A_fkey" FOREIGN KEY ("A") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InvoiceExports" ADD CONSTRAINT "_InvoiceExports_B_fkey" FOREIGN KEY ("B") REFERENCES "sage_exports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

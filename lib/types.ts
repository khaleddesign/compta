// Types partagés dans l'application

export interface FactureData {
  id: string;
  fileName: string;
  fileUrl: string;
  status: FactureStatus;
  fournisseur?: string;
  numeroFacture?: string;
  dateFacture?: Date;
  dateEcheance?: Date;
  montantHT?: number;
  montantTVA?: number;
  montantTTC?: number;
  tauxTVA?: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum FactureStatus {
  UPLOADED = 'UPLOADED',
  OCR_PENDING = 'OCR_PENDING',
  OCR_PROCESSING = 'OCR_PROCESSING',
  OCR_COMPLETED = 'OCR_COMPLETED',
  AI_PENDING = 'AI_PENDING',
  AI_PROCESSING = 'AI_PROCESSING',
  AI_COMPLETED = 'AI_COMPLETED',
  VALIDATION_NEEDED = 'VALIDATION_NEEDED',
  VALIDATED = 'VALIDATED',
  EXPORTED = 'EXPORTED',
  ERROR = 'ERROR',
}

export interface ProcessingError {
  step: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  error?: string;
}

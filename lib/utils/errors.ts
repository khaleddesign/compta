export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class OCRError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 500, code || 'OCR_ERROR');
    this.name = 'OCRError';
  }
}

export class AIError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 500, code || 'AI_ERROR');
    this.name = 'AIError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 500, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}

/**
 * Handler d'erreurs pour les routes API
 */
export function handleAPIError(error: unknown): Response {
  console.error('❌ API Error:', error);

  if (error instanceof AppError) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
        ...(error instanceof ValidationError && { fields: error.fields }),
      },
      { status: error.statusCode }
    );
  }

  // Erreur Prisma
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: any };
    if (prismaError.code === 'P2002') {
      return Response.json(
        { error: 'Ressource déjà existante', code: 'DUPLICATE' },
        { status: 409 }
      );
    }
  }

  // Erreur inconnue
  return Response.json(
    {
      error: 'Erreur serveur interne',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

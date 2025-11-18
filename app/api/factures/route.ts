import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * API Route pour récupérer la liste des factures
 * GET /api/invoices (ou /api/factures)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = status ? { status: status as any } : {};

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { uploadedAt: 'desc' },
        include: {
          accountingEntries: true,
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des factures:', error);
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des factures',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  }
}

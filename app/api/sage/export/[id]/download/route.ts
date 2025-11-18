/**
 * API Route - Téléchargement export Sage
 * GET /api/sage/export/[id]/download
 * Redirige vers le fichier RImport.txt sur Vercel Blob
 */

import { prisma } from '@/lib/db';
import { handleAPIError } from '@/lib/utils';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const sageExport = await prisma.sageExport.findUnique({
      where: { id },
    });

    if (!sageExport || !sageExport.fileUrl) {
      return Response.json(
        { error: 'Export introuvable' },
        { status: 404 }
      );
    }

    // Rediriger vers le fichier sur Vercel Blob
    return Response.redirect(sageExport.fileUrl, 302);

  } catch (error) {
    return handleAPIError(error);
  }
}

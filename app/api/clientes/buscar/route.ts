import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET: Buscar cliente por número de documento
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const numeroDoc = searchParams.get('numeroDoc');
    const tipoDoc = searchParams.get('tipoDoc');

    if (!numeroDoc) {
      return NextResponse.json(
        { error: 'Número de documento es requerido' },
        { status: 400 }
      );
    }

    // Buscar cliente por número de documento y tipo (si se proporciona)
    const whereClause: any = {
      numeroDoc: numeroDoc.trim(),
      activo: true
    };

    if (tipoDoc) {
      whereClause.tipoDoc = tipoDoc;
    }

    const cliente = await prisma.cliente.findFirst({
      where: whereClause
    });

    if (!cliente) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Cliente no encontrado',
          cliente: null
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        numeroDoc: cliente.numeroDoc,
        tipoDoc: cliente.tipoDoc,
        telefono: cliente.telefono,
        email: cliente.email,
        direccion: cliente.direccion
      }
    });

  } catch (error) {
    console.error('❌ Error al buscar cliente:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
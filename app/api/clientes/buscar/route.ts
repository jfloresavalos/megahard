import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET: Buscar cliente por número de documento o nombre
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const numeroDoc = searchParams.get('numeroDoc');
    const tipoDoc = searchParams.get('tipoDoc');
    const nombre = searchParams.get('nombre');

    // Validar que al menos uno de los parámetros esté presente
    if (!numeroDoc && !nombre) {
      return NextResponse.json(
        { error: 'Número de documento o nombre es requerido' },
        { status: 400 }
      );
    }

    // Construir cláusula WHERE según el tipo de búsqueda
    let whereClause: any = {
      activo: true
    };

    if (nombre) {
      // Búsqueda por nombre (case insensitive, contiene)
      whereClause.nombre = {
        contains: nombre.trim(),
        mode: 'insensitive'
      };
    } else if (numeroDoc) {
      // Búsqueda por número de documento
      whereClause.numeroDoc = numeroDoc.trim();
      if (tipoDoc) {
        whereClause.tipoDoc = tipoDoc;
      }
    }

    // Si es búsqueda por nombre, puede devolver múltiples resultados
    if (nombre) {
      const clientes = await prisma.cliente.findMany({
        where: whereClause,
        take: 10, // Limitar a 10 resultados
        orderBy: {
          nombre: 'asc'
        }
      });

      if (clientes.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'No se encontraron clientes con ese nombre',
            clientes: []
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        clientes: clientes.map(c => ({
          id: c.id,
          nombre: c.nombre,
          numeroDoc: c.numeroDoc,
          tipoDoc: c.tipoDoc,
          telefono: c.telefono,
          email: c.email,
          direccion: c.direccion
        }))
      });
    } else {
      // Búsqueda por documento - devuelve un solo resultado
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
    }

  } catch (error) {
    console.error('❌ Error al buscar cliente:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
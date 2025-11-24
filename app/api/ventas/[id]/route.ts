import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;
    const ventaId = id;

    const venta = await prisma.venta.findUnique({
      where: { id: ventaId },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            numeroDoc: true,
            telefono: true
          }
        },
        usuario: {
          select: {
            nombre: true
          }
        },
        sede: {
          select: {
            nombre: true
          }
        },
        servicio: { // ✅ Incluir servicio relacionado
          select: {
            numeroServicio: true,
            tipoServicio: true
          }
        },
        items: {
          include: {
            producto: {
              select: {
                codigo: true,
                nombre: true,
                descripcion: true
              }
            }
          }
        },
        pagos: {
          include: {
            metodoPago: {
              select: {
                nombre: true
              }
            }
          }
        }
      }
    });

    if (!venta) {
      return NextResponse.json(
        { error: 'Venta no encontrada' },
        { status: 404 }
      );
    }

    // ✅ LOG DETALLADO para debugging
    console.log('📊 VENTA OBTENIDA:', {
      id: venta.id,
      numeroVenta: venta.numeroVenta,
      servicioId: (venta as any).servicioId,
      servicio: venta.servicio,
      tieneServicio: !!venta.servicio
    });

    return NextResponse.json({
      success: true,
      venta
    });

  } catch (error: any) {
    console.error('❌ Error al obtener venta:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
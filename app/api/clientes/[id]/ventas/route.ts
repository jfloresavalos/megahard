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
    const clienteId = id;

    // Buscar cliente
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId }
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Obtener ventas
    const ventas = await prisma.venta.findMany({
      where: { clienteId },
      include: {
        sede: {
          select: {
            nombre: true
          }
        },
        usuario: {
          select: {
            nombre: true
          }
        },
        items: {
          include: {
            producto: {
              select: {
                codigo: true,
                nombre: true
              }
            }
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      }
    });

    // Calcular totales
    const totalVentas = ventas.length;
    const totalGastado = ventas
      .filter(v => v.estado === 'COMPLETADA')
      .reduce((sum, v) => sum + Number(v.total), 0);

    // Formatear ventas
    const ventasFormateadas = ventas.map(v => ({
      id: v.id,
      numeroVenta: v.numeroVenta,
      fecha: v.fecha,
      tipoComprobante: v.tipoComprobante,
      items: v.items.length,
      productosResumen: v.items.slice(0, 3).map(item => 
        `${item.producto?.codigo || 'N/A'} - ${item.producto?.nombre || 'Producto'}`
      ),
      masProductos: v.items.length > 3 ? `+${v.items.length - 3} más` : null,
      subtotal: Number(v.subtotal),
      total: Number(v.total),
      estado: v.estado,
      sede: v.sede?.nombre || 'N/A',
      vendedor: v.usuario?.nombre || 'N/A'
    }));

    return NextResponse.json({
      success: true,
      ventas: ventasFormateadas,
      resumen: {
        totalVentas,
        totalGastado
      }
    });

  } catch (error: any) {
    console.error('❌ Error al obtener ventas del cliente:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
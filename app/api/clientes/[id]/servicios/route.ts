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

    // Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado'); // Filtro opcional por estado

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

    // Construir filtro
    const whereClause: any = { clienteId };
    if (estado) {
      whereClause.estado = estado;
    }

    // Obtener servicios
    const servicios = await prisma.servicioTecnico.findMany({
      where: whereClause,
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
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calcular totales
    const totalServicios = servicios.length;
    const totalGastado = servicios
      .filter(s => s.estado !== 'CANCELADO')
      .reduce((sum, s) => sum + Number(s.total), 0);
    
    const totalSaldo = servicios
      .filter(s => s.estado !== 'CANCELADO')
      .reduce((sum, s) => sum + Number(s.saldo), 0);

    // Formatear servicios
    const serviciosFormateados = servicios.map(s => ({
      id: s.id,
      numeroServicio: s.numeroServicio,
      fecha: s.createdAt,
      fechaEntrega: s.fechaEntregaReal || s.fechaEntregaEstimada,
      tipoEquipo: s.tipoEquipo,
      marcaModelo: s.marcaModelo,
      estado: s.estado,
      total: Number(s.total),
      aCuenta: Number(s.aCuenta),
      saldo: Number(s.saldo),
      sede: s.sede?.nombre || 'N/A',
      tecnico: s.usuario?.nombre || 'N/A'
    }));

    return NextResponse.json({
      success: true,
      servicios: serviciosFormateados,
      resumen: {
        totalServicios,
        totalGastado,
        totalSaldo
      }
    });

  } catch (error: any) {
    console.error('❌ Error al obtener servicios del cliente:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
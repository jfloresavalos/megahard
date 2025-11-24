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

    // 1. Estadísticas de Servicios Técnicos
    const servicios = await prisma.servicioTecnico.findMany({
      where: { clienteId },
      select: {
        id: true,
        estado: true,
        total: true,
        saldo: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const totalServicios = servicios.length;
    const serviciosActivos = servicios.filter(
      s => s.estado !== 'ENTREGADO' && s.estado !== 'CANCELADO'
    ).length;
    
    const totalGastadoServicios = servicios
      .filter(s => s.estado !== 'CANCELADO')
      .reduce((sum, s) => sum + Number(s.total), 0);
    
    const deudaServicios = servicios
      .filter(s => s.estado !== 'CANCELADO')
      .reduce((sum, s) => sum + Number(s.saldo), 0);

    // 2. Estadísticas de Ventas
    const ventas = await prisma.venta.findMany({
      where: { clienteId },
      select: {
        id: true,
        total: true,
        estado: true,
        fecha: true
      }
    });

    const totalVentas = ventas.length;
    const totalGastadoVentas = ventas
      .filter(v => v.estado === 'COMPLETADA')
      .reduce((sum, v) => sum + Number(v.total), 0);

    // 3. Total General
    const totalGastado = totalGastadoServicios + totalGastadoVentas;
    const totalPagado = totalGastado - deudaServicios;
    const deudaTotal = deudaServicios;

    // 4. Última visita (último servicio o venta)
    const ultimoServicio = servicios.length > 0 
      ? servicios.reduce((prev, current) => 
          new Date(current.updatedAt) > new Date(prev.updatedAt) ? current : prev
        )
      : null;

    const ultimaVenta = ventas.length > 0
      ? ventas.reduce((prev, current) =>
          new Date(current.fecha) > new Date(prev.fecha) ? current : prev
        )
      : null;

    let ultimaVisita = cliente.createdAt;
    if (ultimoServicio && ultimaVenta) {
      ultimaVisita = new Date(ultimoServicio.updatedAt) > new Date(ultimaVenta.fecha)
        ? ultimoServicio.updatedAt
        : ultimaVenta.fecha;
    } else if (ultimoServicio) {
      ultimaVisita = ultimoServicio.updatedAt;
    } else if (ultimaVenta) {
      ultimaVisita = ultimaVenta.fecha;
    }

    // 5. Respuesta
    return NextResponse.json({
      success: true,
      estadisticas: {
        // Servicios
        totalServicios,
        serviciosActivos,
        totalGastadoServicios,
        deudaServicios,

        // Ventas
        totalVentas,
        totalGastadoVentas,

        // Totales generales
        totalGastado,
        totalPagado,
        deudaTotal,

        // Fechas
        ultimaVisita,
        fechaRegistro: cliente.createdAt
      }
    });

  } catch (error: any) {
    console.error('❌ Error al obtener estadísticas del cliente:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
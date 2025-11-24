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

    // 1. Obtener servicios con sus pagos
    const servicios = await prisma.servicioTecnico.findMany({
      where: { 
        clienteId,
        estado: { not: 'CANCELADO' }
      },
      select: {
        id: true,
        numeroServicio: true,
        createdAt: true,
        total: true,
        aCuenta: true,
        saldo: true,
        estado: true,
        metodoPago: true,
        metodoPagoSaldo: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 2. Obtener ventas con sus pagos
    const ventas = await prisma.venta.findMany({
      where: { 
        clienteId,
        estado: 'COMPLETADA'
      },
      include: {
        pagos: {
          include: {
            metodoPago: true
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      }
    });

    // 3. Construir historial de transacciones
    const transacciones: any[] = [];

    // Agregar servicios
    servicios.forEach(servicio => {
      // Adelanto inicial
      if (Number(servicio.aCuenta) > 0) {
        transacciones.push({
          id: `servicio-${servicio.id}-adelanto`,
          fecha: servicio.createdAt,
          tipo: 'SERVICIO',
          subTipo: 'ADELANTO',
          referencia: servicio.numeroServicio,
          descripcion: `Adelanto servicio ${servicio.numeroServicio}`,
          monto: Number(servicio.aCuenta),
          metodo: servicio.metodoPago,
          estado: servicio.estado
        });
      }

      // Pago de saldo (si está entregado y el saldo fue pagado)
      if (servicio.estado === 'ENTREGADO' && servicio.metodoPagoSaldo) {
        const montoPagado = Number(servicio.total) - Number(servicio.saldo);
        const saldoPagado = montoPagado - Number(servicio.aCuenta);
        
        if (saldoPagado > 0) {
          transacciones.push({
            id: `servicio-${servicio.id}-saldo`,
            fecha: servicio.createdAt, // Usamos createdAt como referencia
            tipo: 'SERVICIO',
            subTipo: 'SALDO',
            referencia: servicio.numeroServicio,
            descripcion: `Saldo servicio ${servicio.numeroServicio}`,
            monto: saldoPagado,
            metodo: servicio.metodoPagoSaldo,
            estado: servicio.estado
          });
        }
      }
    });

    // Agregar ventas
    ventas.forEach(venta => {
      venta.pagos.forEach(pago => {
        transacciones.push({
          id: `venta-${venta.id}-pago-${pago.id}`,
          fecha: venta.fecha,
          tipo: 'VENTA',
          subTipo: 'PAGO',
          referencia: venta.numeroVenta,
          descripcion: `Venta ${venta.numeroVenta}`,
          monto: Number(pago.monto),
          metodo: pago.metodoPago?.nombre || 'N/A',
          estado: venta.estado
        });
      });
    });

    // Ordenar por fecha (más reciente primero)
    transacciones.sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    // 4. Calcular resumen
    const totalServicios = servicios.reduce((sum, s) => sum + Number(s.total), 0);
    const totalVentas = ventas.reduce((sum, v) => sum + Number(v.total), 0);
    const totalGeneral = totalServicios + totalVentas;
    
    const totalPagado = transacciones.reduce((sum, t) => sum + t.monto, 0);
    
    const deudaServicios = servicios.reduce((sum, s) => sum + Number(s.saldo), 0);
    const deudaTotal = deudaServicios; // Las ventas siempre están pagadas

    // 5. Servicios/Ventas con saldo pendiente
    const pendientes = servicios
      .filter(s => Number(s.saldo) > 0)
      .map(s => ({
        tipo: 'SERVICIO',
        referencia: s.numeroServicio,
        fecha: s.createdAt,
        total: Number(s.total),
        saldo: Number(s.saldo),
        estado: s.estado
      }));

    return NextResponse.json({
      success: true,
      estadoCuenta: {
        resumen: {
          totalServicios,
          totalVentas,
          totalGeneral,
          totalPagado,
          deudaTotal
        },
        transacciones,
        pendientes
      }
    });

  } catch (error: any) {
    console.error('❌ Error al obtener estado de cuenta:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // ✅ Solo admin puede anular
    if (session.user.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Solo administradores pueden anular servicios' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const servicioId = id;
    
    const body = await request.json();
    const {
      motivo,
      observaciones,
      devolverAdelanto = false,
      montoDevolucion = 0,
      metodoDevolucion = null
    } = body;

    console.log('🚫 Anulando servicio:', servicioId);

    // Validaciones
    if (!motivo || motivo.trim() === '') {
      return NextResponse.json(
        { error: 'El motivo de anulación es obligatorio' },
        { status: 400 }
      );
    }

    // Buscar el servicio
    const servicio = await prisma.servicioTecnico.findUnique({
      where: { id: servicioId },
      include: {
        items: {
          include: {
            producto: true
          }
        },
        cliente: true,
        usuario: true,
        sede: true
      }
    });

    if (!servicio) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }

    // ✅ No se puede anular un servicio ENTREGADO
    if (servicio.estado === 'ENTREGADO') {
      return NextResponse.json(
        { error: 'No se puede anular un servicio que ya fue entregado' },
        { status: 409 }
      );
    }

    // ✅ No se puede anular un servicio ya CANCELADO
    if (servicio.estado === 'CANCELADO') {
      return NextResponse.json(
        { error: 'Este servicio ya está cancelado' },
        { status: 409 }
      );
    }

    // Validar monto de devolución
    if (devolverAdelanto) {
      if (montoDevolucion <= 0) {
        return NextResponse.json(
          { error: 'El monto de devolución debe ser mayor a 0' },
          { status: 400 }
        );
      }

      if (montoDevolucion > Number(servicio.aCuenta)) {
        return NextResponse.json(
          { error: 'El monto a devolver no puede ser mayor al adelanto pagado' },
          { status: 400 }
        );
      }

      if (!metodoDevolucion) {
        return NextResponse.json(
          { error: 'El método de devolución es obligatorio' },
          { status: 400 }
        );
      }
    }

    // ✅ USAR TRANSACCIÓN
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Actualizar el servicio a CANCELADO
      const servicioActualizado = await tx.servicioTecnico.update({
        where: { id: servicioId },
        data: {
          estado: 'CANCELADO',
          motivoCancelacion: motivo,
          observacionCancelacion: observaciones?.trim() || null,
          fechaCancelacion: new Date(),
          adelantoDevuelto: devolverAdelanto ? montoDevolucion : 0,
          metodoDevolucion: devolverAdelanto ? metodoDevolucion : null,
          usuarioCancelacionId: session.user.id
        },
        include: {
          cliente: true,
          usuario: true,
          sede: true,
          items: {
            include: {
              producto: true
            }
          }
        }
      });

      // 2. Si el servicio estaba REPARADO, devolver repuestos al stock
      if (servicio.estado === 'REPARADO' && servicio.items && servicio.items.length > 0) {
        console.log('📦 Devolviendo repuestos al stock...');

        for (const item of servicio.items) {
          // Devolver stock
          await tx.productoSede.update({
            where: {
              productoId_sedeId: {
                productoId: item.productoId,
                sedeId: servicio.sedeId
              }
            },
            data: {
              stock: {
                increment: item.cantidad
              }
            }
          });

          // Registrar movimiento
          const productoSedeActualizado = await tx.productoSede.findUnique({
            where: {
              productoId_sedeId: {
                productoId: item.productoId,
                sedeId: servicio.sedeId
              }
            }
          });

          await tx.movimientoStock.create({
            data: {
              productoId: item.productoId,
              sedeId: servicio.sedeId,
              tipo: 'AJUSTE_DEVOLUCION',
              cantidad: item.cantidad,
              stockAntes: (productoSedeActualizado?.stock || 0) - item.cantidad,
              stockDespues: productoSedeActualizado?.stock || 0,
              motivo: `Devolución por cancelación de servicio ${servicio.numeroServicio}`,
              referencia: servicioId
            }
          });
        }
      }

      // 3. Registrar en historial
      await tx.servicioHistorial.create({
        data: {
          servicioId: servicioId,
          estadoAnterior: servicio.estado,
          estadoNuevo: 'CANCELADO',
          comentario: [
            `🚫 Servicio cancelado.`,
            `Motivo: ${motivo}`,
            observaciones ? `Observaciones: ${observaciones}` : '',
            devolverAdelanto ? `Se devolvió S/ ${montoDevolucion.toFixed(2)} vía ${metodoDevolucion}` : 'No se devolvió dinero',
            servicio.items.length > 0 ? `Se devolvieron ${servicio.items.length} repuesto(s) al stock` : ''
          ].filter(Boolean).join('. '),
          usuarioId: session.user.id,
        }
      });

      return servicioActualizado;
    });

    console.log('✅ Servicio anulado exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Servicio anulado correctamente',
      servicio: resultado,
    });
    
  } catch (error: any) {
    console.error('❌ Error al anular servicio:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
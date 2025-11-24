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

    const { id } = await context.params;
    const servicioId = id;
    
    const body = await request.json();
    const {
      fechaEntrega,
      saldoPagado,
      metodoPagoSaldo,
      observaciones,
      quienRecibeNombre,
      quienRecibeDni,
      productosVendidos = [] // ✅ NUEVO: Array de productos vendidos
    } = body;

    console.log('📦 Marcando servicio como ENTREGADO:', servicioId);
    console.log('📝 Datos recibidos:', {
      fechaEntrega,
      saldoPagado,
      productosVendidosLength: productosVendidos.length,
      productosVendidos: JSON.stringify(productosVendidos, null, 2)
    });

    if (!fechaEntrega) {
      return NextResponse.json(
        { error: 'La fecha de entrega es obligatoria' },
        { status: 400 }
      );
    }

    // Buscar el servicio
    const servicio = await prisma.servicioTecnico.findUnique({
      where: { id: servicioId },
      include: {
        cliente: true,
        usuario: true,
        sede: true
      }
    });

    if (!servicio) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }

    // Validar permisos
    const esAdmin = session.user.rol === 'admin';
    const esMismaSede = session.user.sedeId === servicio.sedeId;

    if (!esAdmin && !esMismaSede) {
      return NextResponse.json(
        { error: 'No tiene permisos para modificar este servicio' },
        { status: 403 }
      );
    }

    // Validar que esté en estado REPARADO
    if (servicio.estado !== 'REPARADO') {
      return NextResponse.json(
        { error: `Solo se pueden entregar servicios en estado REPARADO. Estado actual: ${servicio.estado}` },
        { status: 409 }
      );
    }

    // ✅ CRÍTICO: Validar que tenga diagnóstico y solución
    if (!servicio.diagnostico || !servicio.solucion) {
      return NextResponse.json(
        { error: 'El servicio debe tener diagnóstico y solución antes de entregarse' },
        { status: 400 }
      );
    }

    // ✅ VALIDAR STOCK DE PRODUCTOS VENDIDOS
    if (productosVendidos.length > 0) {
      for (const item of productosVendidos) {
        const productoSede = await prisma.productoSede.findUnique({
          where: {
            productoId_sedeId: {
              productoId: item.productoId,
              sedeId: servicio.sedeId
            }
          }
        });

        if (!productoSede || productoSede.stock < item.cantidad) {
          const producto = await prisma.producto.findUnique({ where: { id: item.productoId } });
          return NextResponse.json(
            { error: `Stock insuficiente para ${producto?.nombre || 'producto'}. Disponible: ${productoSede?.stock || 0}` },
            { status: 400 }
          );
        }
      }
    }

    // ✅ CALCULAR TOTAL DE PRODUCTOS VENDIDOS
    let totalProductosVendidos = 0
    let productosVendidosConInfo: any[] = []

    if (productosVendidos.length > 0) {
      for (const item of productosVendidos) {
        const producto = await prisma.producto.findUnique({
          where: { id: item.productoId },
          select: {
            id: true,
            codigo: true,
            nombre: true,
            descripcion: true
          }
        })

        const subtotal = item.cantidad * item.precioUnit
        totalProductosVendidos += subtotal

        productosVendidosConInfo.push({
          productoId: item.productoId,
          codigo: producto?.codigo || 'N/A',
          nombre: producto?.nombre || 'Producto',
          cantidad: item.cantidad,
          precioUnit: item.precioUnit,
          subtotal: subtotal
        })
      }
    }

    // Preparar datos de actualización
    const nuevoTotal = Number(servicio.total) + totalProductosVendidos
    const nuevoSaldo = Math.max(0, nuevoTotal - Number(servicio.aCuenta)) // ✅ Evitar saldo negativo

    const updateData: any = {
      estado: 'ENTREGADO',
      fechaEntregaReal: new Date(fechaEntrega),
      quienRecibeNombre: quienRecibeNombre || null,
      quienRecibeDni: quienRecibeDni || null,
      total: nuevoTotal, // ✅ Actualizar total
      saldo: saldoPagado ? 0 : nuevoSaldo // ✅ Actualizar saldo
    }

    // Si pagó el saldo, actualizar aCuenta
    if (saldoPagado && Number(servicio.saldo) > 0) {
      updateData.aCuenta = nuevoTotal // ✅ Pagar todo incluyendo productos
      updateData.saldo = 0
      
      if (metodoPagoSaldo) {
        updateData.metodoPagoSaldo = metodoPagoSaldo
      }
    }

    // ✅ Guardar productos vendidos con información completa
    if (productosVendidosConInfo.length > 0) {
      updateData.productosVendidos = productosVendidosConInfo
    }

    // ✅ USAR TRANSACCIÓN PARA GARANTIZAR CONSISTENCIA
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Actualizar el servicio
      const servicioActualizado = await tx.servicioTecnico.update({
        where: { id: servicioId },
        data: updateData,
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

      // 2. Procesar venta de productos (si hay)
      console.log('🔍 Verificando productos vendidos...', {
        hayProductos: productosVendidos.length > 0,
        cantidad: productosVendidos.length
      });

      if (productosVendidos.length > 0) {
        console.log('💰 Creando venta para productos vendidos...');

        // Calcular total de productos vendidos
        const totalProductos = productosVendidos.reduce(
          (sum: number, item: any) => sum + (item.cantidad * item.precioUnit),
          0
        );
        console.log('💵 Total de productos:', totalProductos);

        // Generar número de venta
        const ultimaVenta = await tx.venta.findFirst({
          orderBy: { numeroVenta: 'desc' }
        });
        
        let nuevoNumero = 'V-0001';
        if (ultimaVenta) {
          const ultimoNum = parseInt(ultimaVenta.numeroVenta.split('-')[1]);
          nuevoNumero = `V-${String(ultimoNum + 1).padStart(4, '0')}`;
        }

        // Crear la venta
        console.log('📝 Creando venta:', {
          numeroVenta: nuevoNumero,
          total: totalProductos,
          clienteId: servicio.clienteId,
          sedeId: servicio.sedeId
        });

        const venta = await tx.venta.create({
          data: {
            numeroVenta: nuevoNumero,
            tipoComprobante: 'BOLETA',
            subtotal: totalProductos,
            total: totalProductos,
            clienteId: servicio.clienteId,
            usuarioId: session.user.id,
            sedeId: servicio.sedeId,
            servicioId: servicioId, // ✅ Referencia al servicio
            estado: 'COMPLETADA'
          }
        });

        console.log('✅ Venta creada:', venta.id, venta.numeroVenta);

        // Crear items de venta y descontar stock
        for (const item of productosVendidos) {
          // Crear item de venta
          await tx.ventaItem.create({
            data: {
              ventaId: venta.id,
              productoId: item.productoId,
              cantidad: item.cantidad,
              precioUnit: item.precioUnit,
              precioOriginal: item.precioUnit,
              subtotal: item.cantidad * item.precioUnit
            }
          });

          // Descontar stock
          await tx.productoSede.update({
            where: {
              productoId_sedeId: {
                productoId: item.productoId,
                sedeId: servicio.sedeId
              }
            },
            data: {
              stock: {
                decrement: item.cantidad
              }
            }
          });

          // Registrar movimiento de stock
          const productoSede = await tx.productoSede.findUnique({
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
              tipo: 'SALIDA_VENTA',
              cantidad: -item.cantidad,
              stockAntes: (productoSede?.stock || 0) + item.cantidad,
              stockDespues: productoSede?.stock || 0,
              motivo: `Venta al entregar servicio ${servicio.numeroServicio}`,
              referencia: venta.id
            }
          });
        }

        // Crear pago de la venta
        await tx.ventaPago.create({
          data: {
            ventaId: venta.id,
            metodoPagoId: await obtenerMetodoPagoId(tx, metodoPagoSaldo || 'EFECTIVO'),
            monto: totalProductos
          }
        });
      }

      // 3. Registrar en historial
      await tx.servicioHistorial.create({
        data: {
          servicioId: servicioId,
          estadoAnterior: 'REPARADO',
          estadoNuevo: 'ENTREGADO',
          comentario: [
            'Servicio entregado.',
            quienRecibeNombre ? `Recogió: ${quienRecibeNombre} (DNI: ${quienRecibeDni})` : `Recogió: ${servicio.clienteNombre}`,
            productosVendidosConInfo.length > 0 ? `Se vendieron ${productosVendidosConInfo.length} producto(s) adicional(es) por S/ ${totalProductosVendidos.toFixed(2)}` : '',
            saldoPagado ? `Saldo pagado completamente (${metodoPagoSaldo})` : `Entregado con saldo pendiente de S/ ${nuevoSaldo.toFixed(2)}`,
            observaciones || ''
          ].filter(Boolean).join('. '),
          usuarioId: session.user.id,
        }
      });

      return servicioActualizado;
    });

    console.log('✅ Servicio marcado como ENTREGADO exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Servicio marcado como ENTREGADO correctamente',
      servicio: resultado,
    });
    
  } catch (error: any) {
    console.error('❌ Error al marcar como entregado:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ✅ Función auxiliar para obtener ID del método de pago
async function obtenerMetodoPagoId(tx: any, nombreMetodo: string): Promise<string> {
  let metodoPago = await tx.metodoPago.findFirst({
    where: { nombre: nombreMetodo }
  });

  if (!metodoPago) {
    metodoPago = await tx.metodoPago.create({
      data: { nombre: nombreMetodo }
    });
  }

  return metodoPago.id;
}
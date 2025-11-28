import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

interface RepuestoActualizado {
  productoId: string;
  productoNombre: string;
  cantidad: number;
  precioUnit: number;
  subtotal: number;
  itemId?: string; // Si existe, es un item existente
}

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
      diagnostico,
      solucion,
      fotosDespues = [],
      repuestosActualizados = [],
    } = body;

    console.log('✏️ Editando reparación:', servicioId);
    console.log('📝 Nuevos datos:', { diagnostico, solucion, fotos: fotosDespues.length, repuestos: repuestosActualizados.length });

    if (!diagnostico || !solucion) {
      return NextResponse.json(
        { error: 'El diagnóstico y la solución son obligatorios' },
        { status: 400 }
      );
    }

    const servicio = await prisma.servicioTecnico.findUnique({
      where: { id: servicioId },
      include: {
        items: true
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

    // Validar que no esté ENTREGADO o CANCELADO
    if (servicio.estado === 'ENTREGADO' || servicio.estado === 'CANCELADO') {
      return NextResponse.json(
        { error: `No se puede editar un servicio ${servicio.estado}` },
        { status: 409 }
      );
    }

    // ✅ LÓGICA DE AJUSTE DE REPUESTOS
    const itemsExistentes = servicio.items;
    const itemsExistentesIds = itemsExistentes.map(i => i.productoId);
    const itemsNuevosIds = repuestosActualizados.map((r: RepuestoActualizado) => r.productoId);

    // Items a eliminar (están en BD pero no en la nueva lista)
    const itemsAEliminar = itemsExistentes.filter(
      item => !itemsNuevosIds.includes(item.productoId)
    );

    // Items a agregar (están en la nueva lista pero no en BD)
    const itemsAAgregar = repuestosActualizados.filter(
      (r: RepuestoActualizado) => !itemsExistentesIds.includes(r.productoId)
    );

    // Items a actualizar (están en ambos pero cantidad cambió)
    const itemsAActualizar = repuestosActualizados.filter((r: RepuestoActualizado) => {
      const itemExistente = itemsExistentes.find(i => i.productoId === r.productoId);
      return itemExistente && itemExistente.cantidad !== r.cantidad;
    });

    console.log('📊 Análisis de cambios:');
    console.log('  - Items a eliminar:', itemsAEliminar.length);
    console.log('  - Items a agregar:', itemsAAgregar.length);
    console.log('  - Items a actualizar:', itemsAActualizar.length);

    // Calcular nuevo costo total de repuestos
    const nuevoCostoRepuestos = repuestosActualizados.reduce(
      (sum: number, r: RepuestoActualizado) => sum + r.subtotal,
      0
    );

    const diferenciaCosto = nuevoCostoRepuestos - Number(servicio.costoRepuestos || 0);

    // ✅ TRANSACCIÓN
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Eliminar items que ya no están
      for (const item of itemsAEliminar) {
        // Devolver stock
        await tx.productoSede.update({
          where: {
            productoId_sedeId: {
              productoId: item.productoId,
              sedeId: servicio.sedeId,
            },
          },
          data: {
            stock: {
              increment: item.cantidad,
            },
          },
        });

        // Registrar movimiento
        const productoSede = await tx.productoSede.findUnique({
          where: {
            productoId_sedeId: {
              productoId: item.productoId,
              sedeId: servicio.sedeId,
            },
          },
        });

        await tx.movimientoStock.create({
          data: {
            productoId: item.productoId,
            sedeId: servicio.sedeId,
            tipo: 'ENTRADA_DEVOLUCION',
            cantidad: item.cantidad,
            stockAntes: productoSede!.stock - item.cantidad,
            stockDespues: productoSede!.stock,
            motivo: `Devolución por edición de reparación ${servicio.numeroServicio}`,
            referencia: servicioId,
          },
        });

        // Eliminar el item
        await tx.servicioItem.delete({
          where: { id: item.id },
        });

        console.log(`✅ Item eliminado y stock devuelto: ${item.productoId} x${item.cantidad}`);
      }

      // 2. Agregar nuevos items
      for (const repuesto of itemsAAgregar) {
        // Verificar stock
        const productoSede = await tx.productoSede.findUnique({
          where: {
            productoId_sedeId: {
              productoId: repuesto.productoId,
              sedeId: servicio.sedeId,
            },
          },
        });

        if (!productoSede || productoSede.stock < repuesto.cantidad) {
          throw new Error(`Stock insuficiente para ${repuesto.productoNombre}`);
        }

        // Crear item
        await tx.servicioItem.create({
          data: {
            servicioId: servicioId,
            productoId: repuesto.productoId,
            cantidad: repuesto.cantidad,
            precioUnit: repuesto.precioUnit,
            subtotal: repuesto.subtotal,
          },
        });

        // Descontar stock
        await tx.productoSede.update({
          where: {
            productoId_sedeId: {
              productoId: repuesto.productoId,
              sedeId: servicio.sedeId,
            },
          },
          data: {
            stock: {
              decrement: repuesto.cantidad,
            },
          },
        });

        // Registrar movimiento
        await tx.movimientoStock.create({
          data: {
            productoId: repuesto.productoId,
            sedeId: servicio.sedeId,
            tipo: 'SALIDA_REPARACION',
            cantidad: -repuesto.cantidad,
            stockAntes: productoSede.stock,
            stockDespues: productoSede.stock - repuesto.cantidad,
            motivo: `Agregado en edición de reparación ${servicio.numeroServicio}`,
            referencia: servicioId,
          },
        });

        console.log(`✅ Item agregado y stock descontado: ${repuesto.productoNombre} x${repuesto.cantidad}`);
      }

      // 3. Actualizar items existentes con cantidad diferente
      for (const repuesto of itemsAActualizar) {
        const itemExistente = itemsExistentes.find(i => i.productoId === repuesto.productoId)!;
        const diferencia = repuesto.cantidad - itemExistente.cantidad;

        // Actualizar el item
        await tx.servicioItem.update({
          where: { id: itemExistente.id },
          data: {
            cantidad: repuesto.cantidad,
            subtotal: repuesto.subtotal,
          },
        });

        if (diferencia !== 0) {
          const productoSede = await tx.productoSede.findUnique({
            where: {
              productoId_sedeId: {
                productoId: repuesto.productoId,
                sedeId: servicio.sedeId,
              },
            },
          });

          if (diferencia > 0) {
            // Necesita más stock - descontar
            if (productoSede!.stock < diferencia) {
              throw new Error(`Stock insuficiente para aumentar ${repuesto.productoNombre}`);
            }

            await tx.productoSede.update({
              where: {
                productoId_sedeId: {
                  productoId: repuesto.productoId,
                  sedeId: servicio.sedeId,
                },
              },
              data: {
                stock: {
                  decrement: diferencia,
                },
              },
            });

            await tx.movimientoStock.create({
              data: {
                productoId: repuesto.productoId,
                sedeId: servicio.sedeId,
                tipo: 'SALIDA_REPARACION',
                cantidad: -diferencia,
                stockAntes: productoSede!.stock,
                stockDespues: productoSede!.stock - diferencia,
                motivo: `Ajuste en edición de reparación ${servicio.numeroServicio}`,
                referencia: servicioId,
              },
            });
          } else {
            // Necesita menos stock - devolver
            await tx.productoSede.update({
              where: {
                productoId_sedeId: {
                  productoId: repuesto.productoId,
                  sedeId: servicio.sedeId,
                },
              },
              data: {
                stock: {
                  increment: Math.abs(diferencia),
                },
              },
            });

            await tx.movimientoStock.create({
              data: {
                productoId: repuesto.productoId,
                sedeId: servicio.sedeId,
                tipo: 'ENTRADA_DEVOLUCION',
                cantidad: Math.abs(diferencia),
                stockAntes: productoSede!.stock,
                stockDespues: productoSede!.stock + Math.abs(diferencia),
                motivo: `Ajuste en edición de reparación ${servicio.numeroServicio}`,
                referencia: servicioId,
              },
            });
          }

          console.log(`✅ Item actualizado: ${repuesto.productoNombre} (${itemExistente.cantidad} → ${repuesto.cantidad})`);
        }
      }

      // 4. Actualizar el servicio
      const servicioActualizado = await tx.servicioTecnico.update({
        where: { id: servicioId },
        data: {
          diagnostico,
          solucion,
          fotosDespues,
          costoRepuestos: {
            set: nuevoCostoRepuestos,
          },
          total: {
            increment: diferenciaCosto,
          },
          saldo: {
            increment: diferenciaCosto,
          },
        },
      });

      // ✅ NO registrar en historial cuando se edita reparación
      // Solo se registra el historial cuando se cambia de estado

      return servicioActualizado;
    });

    console.log('✅ Reparación editada exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Reparación actualizada correctamente',
      servicio: resultado,
    });
    
  } catch (error: any) {
    console.error('❌ Error al editar reparación:', error);
    
    if (error.message.includes('Stock insuficiente')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

interface ReparacionInput {
  diagnostico: string;
  solucion: string;
  fotosDespues: string[]; 
  repuestosUsados: {
    productoId: string;
    cantidad: number;
    precioUnit: number;
    subtotal: number;
    productoNombre: string;
  }[];
}

// ✅ CORRECCIÓN: params es una Promise
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. --- SEGURIDAD Y AUTENTICACIÓN ---
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // ✅ CORRECCIÓN: Await para obtener params
    const { id } = await context.params;
    const servicioId = id;
    
    const body: ReparacionInput = await request.json();

    const {
      diagnostico,
      solucion,
      fotosDespues = [],
      repuestosUsados = [],
    } = body;

    console.log('🔧 Marcando como reparado - servicioId:', servicioId);
    console.log('📝 Diagnóstico:', diagnostico);
    console.log('📝 Solución:', solucion);
    console.log('📸 Fotos después:', fotosDespues.length);
    console.log('🔩 Repuestos:', repuestosUsados.length);

    // Validación de datos de entrada
    if (!diagnostico || !solucion) {
      return NextResponse.json(
        { error: 'El diagnóstico y la solución son obligatorios' },
        { status: 400 }
      );
    }

    if (!servicioId) {
      return NextResponse.json(
        { error: 'ID del servicio no encontrado en la URL' },
        { status: 400 }
      );
    }
    
    // 2. --- VALIDACIÓN DE PERMISOS ---
    const servicio = await prisma.servicioTecnico.findUnique({
      where: { id: servicioId },
    });

    if (!servicio) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }

    const esAdmin = session.user.rol === 'admin';
    const esMismaSede = session.user.sedeId === servicio.sedeId;

    if (!esAdmin && !esMismaSede) {
      return NextResponse.json(
        { error: 'No tiene permisos para modificar este servicio' },
        { status: 403 }
      );
    }

    // ✅ Validar que el servicio esté EN_REPARACION (taller) o EN_DOMICILIO (domicilio)
    const estadosPermitidos = ['EN_REPARACION', 'EN_DOMICILIO'];
    if (!estadosPermitidos.includes(servicio.estado)) {
      return NextResponse.json(
        { error: `El servicio debe estar EN_REPARACION o EN_DOMICILIO. Estado actual: ${servicio.estado}` },
        { status: 409 }
      );
    }

    // ✅ Validar que la fecha de reparación sea posterior a la fecha de recepción
    const fechaActual = new Date();
    const fechaRecepcion = new Date(servicio.fechaRecepcion);
    if (fechaActual < fechaRecepcion) {
      return NextResponse.json(
        { error: 'La fecha de reparación no puede ser anterior a la fecha de recepción' },
        { status: 400 }
      );
    }

    // 3. --- LÓGICA DE NEGOCIO (TRANSACCIÓN) ---
    const costoTotalRepuestos = repuestosUsados.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );

    console.log('💰 Costo total repuestos:', costoTotalRepuestos);

    const updatedServicio = await prisma.$transaction(async (tx) => {
      // --- PASO A: Actualizar el Servicio Técnico ---
      const servicioActualizado = await tx.servicioTecnico.update({
        where: { id: servicioId },
        data: {
          estado: 'REPARADO',
          diagnostico,
          solucion,
          fechaReparacion: new Date(), // Guardar fecha actual de reparación
          fotosDespues: {
            push: fotosDespues,
          },
          costoRepuestos: {
            increment: costoTotalRepuestos,
          },
          total: {
            increment: costoTotalRepuestos,
          },
          saldo: {
            increment: costoTotalRepuestos,
          },
        },
      });

      // --- PASO B: Crear los ServicioItems ---
      if (repuestosUsados.length > 0) {
        await tx.servicioItem.createMany({
          data: repuestosUsados.map((item) => ({
            servicioId: servicioId,
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnit: item.precioUnit,
            subtotal: item.subtotal,
          })),
        });
      }

      // --- PASO C y D: Descontar Stock y Crear Movimiento (Uno por uno) ---
      for (const item of repuestosUsados) {
        // Verificar que existe stock suficiente
        const productoSede = await tx.productoSede.findUnique({
          where: {
            productoId_sedeId: {
              productoId: item.productoId,
              sedeId: servicio.sedeId,
            },
          },
        });

        if (!productoSede) {
          throw new Error(`Producto ${item.productoNombre} no encontrado en esta sede`);
        }

        if (productoSede.stock < item.cantidad) {
          throw new Error(`Stock insuficiente para ${item.productoNombre}. Disponible: ${productoSede.stock}, Requerido: ${item.cantidad}`);
        }

        // Descontar stock
        const productoActualizado = await tx.productoSede.update({
          where: {
            productoId_sedeId: {
              productoId: item.productoId,
              sedeId: servicio.sedeId,
            },
          },
          data: {
            stock: {
              decrement: item.cantidad,
            },
          },
        });

        // Crear movimiento de stock
        await tx.movimientoStock.create({
          data: {
            productoId: item.productoId,
            sedeId: servicio.sedeId,
            tipo: 'SALIDA_REPARACION',
            cantidad: -item.cantidad,
            stockAntes: productoSede.stock,
            stockDespues: productoActualizado.stock,
            motivo: `Reparación Guía ${servicio.numeroServicio}`,
            referencia: servicioId,
          },
        });

        console.log(`✅ Stock descontado: ${item.productoNombre} x${item.cantidad}`);
      }
      
      // --- PASO E: Registrar en Historial ---
      const comentarioRepuestos = repuestosUsados.length > 0
        ? ` Repuestos: ${repuestosUsados.map(r => `${r.productoNombre} (x${r.cantidad})`).join(', ')}`
        : '';

      await tx.servicioHistorial.create({
        data: {
          servicioId: servicioId,
          estadoAnterior: servicio.estado,
          estadoNuevo: 'REPARADO',
          comentario: `Diagnóstico: ${diagnostico}. Solución: ${solucion}.${comentarioRepuestos}`,
          usuarioId: session.user.id,
        }
      });

      return servicioActualizado;
    });

    console.log('✅ Servicio marcado como REPARADO exitosamente');

    // 4. --- RESPUESTA ---
    return NextResponse.json({
      success: true,
      message: 'Servicio marcado como REPARADO',
      servicio: updatedServicio,
    });
    
  } catch (error: any) {
    console.error('❌ Error al marcar servicio como reparado:', error);
    
    if (error.message.includes('stock')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
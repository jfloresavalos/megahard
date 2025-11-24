import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// POST: Anular un movimiento
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const movimientoId = id;
    
    // Obtener el body del request
    let motivoAnulacion = '';
    try {
      const body = await request.json();
      motivoAnulacion = body.motivoAnulacion || '';
    } catch (e) {
      // Si no hay body, continuar sin motivo
    }

    // Obtener el movimiento
    const movimiento = await prisma.movimientoStock.findUnique({
      where: { id: movimientoId }
    });

    if (!movimiento) {
      return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });
    }

    // Validar que no esté ya anulado
    if (movimiento.anulado) {
      return NextResponse.json({ error: 'Este movimiento ya fue anulado' }, { status: 400 });
    }

    // ✅ Bloquear anulación de movimientos de servicios técnicos
    if (movimiento.tipo === 'SALIDA_REPARACION') {
      return NextResponse.json(
        { error: 'No se puede anular movimientos de repuestos utilizados en servicios. El movimiento está vinculado a un servicio técnico.' },
        { status: 403 }
      );
    }

    if (movimiento.tipo === 'SALIDA_VENTA') {
      return NextResponse.json(
        { error: 'No se puede anular movimientos de ventas. Para anular una venta, use el módulo de ventas.' },
        { status: 403 }
      );
    }

    // Obtener la relación ProductoSede para revertir el stock
    const productoSede = await prisma.productoSede.findUnique({
      where: {
        productoId_sedeId: {
          productoId: movimiento.productoId,
          sedeId: movimiento.sedeId
        }
      }
    });

    if (!productoSede) {
      return NextResponse.json({ error: 'Información de stock no encontrada' }, { status: 404 });
    }

    // Calcular el nuevo stock (revertir al estado anterior del movimiento)
    // El stock actual es stockDespues del movimiento, así que revertimos a stockAntes
    const nuevoStock = movimiento.stockAntes;

    // Actualizar el movimiento a anulado
    const movimientoAnulado = await prisma.movimientoStock.update({
      where: { id: movimientoId },
      data: {
        anulado: true,
        usuarioAnulaId: session.user.id,
        fechaAnulacion: new Date(),
        motivoAnulacion: motivoAnulacion
      },
      include: {
        producto: {
          select: { nombre: true, codigo: true }
        },
        sede: {
          select: { nombre: true }
        }
      }
    });

    // Revertir el stock en ProductoSede
    await prisma.productoSede.update({
      where: {
        productoId_sedeId: {
          productoId: movimiento.productoId,
          sedeId: movimiento.sedeId
        }
      },
      data: { stock: nuevoStock }
    });

    return NextResponse.json({
      success: true,
      message: `Movimiento anulado correctamente. Stock revertido a ${nuevoStock} unidades`,
      movimiento: movimientoAnulado
    });

  } catch (error: any) {
    console.error('❌ Error al anular movimiento:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PUT: Confirmar recepción de traspaso
export async function PUT(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { observaciones } = body;

    console.log('🔄 PUT /api/traspasos/[id]/recibir:', { id, observaciones, usuarioId: session.user.id });

    // Obtener el traspaso de entrada
    const traspasoEntrada = await prisma.movimientoStock.findUnique({
      where: { id },
      include: {
        traspasoRelacionado: true
      }
    });

    console.log('📦 Traspaso encontrado:', traspasoEntrada?.id, 'tipo:', traspasoEntrada?.tipo);

    if (!traspasoEntrada) {
      return NextResponse.json(
        { error: 'Traspaso no encontrado' },
        { status: 404 }
      );
    }

    if (traspasoEntrada.tipo !== 'TRASPASO_ENTRADA') {
      return NextResponse.json(
        { error: 'Este no es un traspaso de entrada' },
        { status: 400 }
      );
    }

    if (traspasoEntrada.estadoTraspaso === 'RECIBIDO') {
      return NextResponse.json(
        { error: 'Este traspaso ya fue recibido' },
        { status: 400 }
      );
    }

    if (traspasoEntrada.estadoTraspaso === 'CANCELADO' || traspasoEntrada.estadoTraspaso === 'RECHAZADO') {
      return NextResponse.json(
        { error: 'Este traspaso está cancelado o rechazado' },
        { status: 400 }
      );
    }

    // Confirmar recepción en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // Actualizar traspaso de entrada
      const entradaActualizada = await tx.movimientoStock.update({
        where: { id },
        data: {
          estadoTraspaso: 'RECIBIDO',
          fechaRecepcion: new Date(),
          usuarioRecibeId: session.user.id,
          observaciones: observaciones || traspasoEntrada.observaciones
        }
      });

      // Actualizar traspaso de salida relacionado
      if (traspasoEntrada.traspasoRelacionado) {
        await tx.movimientoStock.update({
          where: { id: traspasoEntrada.traspasoRelacionado.id },
          data: {
            estadoTraspaso: 'RECIBIDO',
            fechaRecepcion: new Date()
          }
        });
      }

      return entradaActualizada;
    });

    return NextResponse.json({
      success: true,
      message: 'Traspaso recibido correctamente',
      movimiento: resultado
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    );
  }
}
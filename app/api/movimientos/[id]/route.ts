import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET: Obtener detalle de un movimiento
export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;

    const movimiento = await prisma.movimientoStock.findUnique({
      where: { id },
      include: {
        producto: true,
        sede: true
      }
    });

    if (!movimiento) {
      return NextResponse.json(
        { error: 'Movimiento no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      movimiento
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    );
  }
}

// PUT: Editar movimiento
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
    const { motivo } = body;

    const movimiento = await prisma.movimientoStock.findUnique({
      where: { id }
    });

    if (!movimiento) {
      return NextResponse.json(
        { error: 'Movimiento no encontrado' },
        { status: 404 }
      );
    }

    if (movimiento.anulado) {
      return NextResponse.json(
        { error: 'No se puede editar un movimiento anulado' },
        { status: 400 }
      );
    }

    const actualizado = await prisma.movimientoStock.update({
      where: { id },
      data: {
        motivo: motivo !== undefined ? motivo : movimiento.motivo
      }
    });

    return NextResponse.json({
      success: true,
      movimiento: actualizado
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    );
  }
}

// DELETE: Anular movimiento
export async function DELETE(
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
    const { motivoAnulacion } = body;

    if (!motivoAnulacion) {
      return NextResponse.json(
        { error: 'Motivo de anulación requerido' },
        { status: 400 }
      );
    }

    const movimiento = await prisma.movimientoStock.findUnique({
      where: { id },
      include: { producto: true }
    });

    if (!movimiento) {
      return NextResponse.json(
        { error: 'Movimiento no encontrado' },
        { status: 404 }
      );
    }

    if (movimiento.anulado) {
      return NextResponse.json(
        { error: 'El movimiento ya está anulado' },
        { status: 400 }
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const anulado = await tx.movimientoStock.update({
        where: { id },
        data: {
          anulado: true,
          motivoAnulacion,
          fechaAnulacion: new Date(),
          usuarioAnulaId: session.user.id
        }
      });

      return anulado;
    });

    return NextResponse.json({
      success: true,
      message: 'Movimiento anulado',
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
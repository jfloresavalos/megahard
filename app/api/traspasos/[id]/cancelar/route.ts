import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PUT: Cancelar/Rechazar traspaso
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
    const { motivo, accion } = body;
    const usuarioSedeId = (session.user as any).sedeId || null;
    const esAdmin = (session.user as any).rol === 'ADMIN' || (session.user as any).rol === 'admin';

    if (!motivo) {
      return NextResponse.json(
        { error: 'Motivo es requerido' },
        { status: 400 }
      );
    }

    if (!accion || !['CANCELAR', 'RECHAZAR'].includes(accion)) {
      return NextResponse.json(
        { error: 'Acción inválida' },
        { status: 400 }
      );
    }

    // Obtener el traspaso
    const traspasoSalida = await prisma.movimientoStock.findUnique({
      where: { id },
      include: {
        producto: true,
        traspasoRelacionado: true,
        usuario: true
      }
    });

    if (!traspasoSalida) {
      return NextResponse.json(
        { error: 'Traspaso no encontrado' },
        { status: 404 }
      );
    }

    if (traspasoSalida.tipo !== 'TRASPASO_SALIDA') {
      return NextResponse.json(
        { error: 'Este no es un traspaso de salida' },
        { status: 400 }
      );
    }

    // 🔐 VALIDACIONES DE PERMISOS
    // CANCELAR: solo sede origen o admin
    if (accion === 'CANCELAR' && !esAdmin && usuarioSedeId !== traspasoSalida.sedeId) {
      return NextResponse.json(
        { error: 'Solo la sede origen puede cancelar este traspaso' },
        { status: 403 }
      );
    }

    // RECHAZAR: solo sede destino o admin
    if (accion === 'RECHAZAR' && !esAdmin && usuarioSedeId !== traspasoSalida.traspasoRelacionado?.sedeId) {
      return NextResponse.json(
        { error: 'Solo la sede destino puede rechazar este traspaso' },
        { status: 403 }
      );
    }

    // No se puede cancelar/rechazar si ya está recibido
    if (traspasoSalida.estadoTraspaso === 'RECIBIDO') {
      return NextResponse.json(
        { error: `No se puede ${accion === 'CANCELAR' ? 'cancelar' : 'rechazar'} un traspaso ya recibido`,
          razon: 'RECIBIDO' },
        { status: 400 }
      );
    }

    // No se puede procesar si ya está cancelado/rechazado
    if (traspasoSalida.estadoTraspaso === 'CANCELADO' || traspasoSalida.estadoTraspaso === 'RECHAZADO') {
      return NextResponse.json(
        { error: `Este traspaso ya está ${traspasoSalida.estadoTraspaso.toLowerCase()}`,
          razon: traspasoSalida.estadoTraspaso },
        { status: 400 }
      );
    }

    // 📝 ACCIÓN SELECCIONADA
    const estadoNuevo = accion === 'CANCELAR' ? 'CANCELADO' : 'RECHAZADO';

    console.log(`📋 ${accion} Traspaso:`, { id, estadoNuevo, usuarioSedeId, esAdmin });

    // Actualizar en transacción atómica
    const resultado = await prisma.$transaction(async (tx) => {
      // Actualizar traspaso de salida
      const salidaActualizada = await tx.movimientoStock.update({
        where: { id },
        data: {
          estadoTraspaso: estadoNuevo,
          observaciones: motivo,
          fechaAnulacion: new Date() // Nuevo campo para auditoría
        }
      });

      // Actualizar traspaso de entrada relacionado también
      if (traspasoSalida.traspasoRelacionado) {
        await tx.movimientoStock.update({
          where: { id: traspasoSalida.traspasoRelacionado.id },
          data: {
            estadoTraspaso: estadoNuevo,
            observaciones: motivo,
            fechaAnulacion: new Date()
          }
        });
      }

      return salidaActualizada;
    });

    return NextResponse.json({
      success: true,
      message: `Traspaso ${estadoNuevo.toLowerCase()} exitosamente`,
      estado: estadoNuevo,
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
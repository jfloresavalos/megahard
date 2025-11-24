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
    const { nuevoEstado } = body;

    console.log('🔄 Cambiando estado del servicio:', servicioId, 'a', nuevoEstado);

    if (!nuevoEstado) {
      return NextResponse.json(
        { error: 'El nuevo estado es obligatorio' },
        { status: 400 }
      );
    }

    // Buscar el servicio
    const servicio = await prisma.servicioTecnico.findUnique({
      where: { id: servicioId }
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
        { error: `No se puede cambiar el estado de un servicio ${servicio.estado}` },
        { status: 409 }
      );
    }

    // Actualizar el estado
    const servicioActualizado = await prisma.servicioTecnico.update({
      where: { id: servicioId },
      data: {
        estado: nuevoEstado
      },
      include: {
        cliente: true,
        usuario: true,
        sede: true
      }
    });

    // Registrar en historial
    await prisma.servicioHistorial.create({
      data: {
        servicioId: servicioId,
        estadoAnterior: servicio.estado,
        estadoNuevo: nuevoEstado,
        comentario: `Estado cambiado de ${servicio.estado} a ${nuevoEstado}`,
        usuarioId: session.user.id,
      }
    });

    console.log('✅ Estado cambiado exitosamente');

    return NextResponse.json({
      success: true,
      message: `Estado cambiado a ${nuevoEstado}`,
      servicio: servicioActualizado,
    });
    
  } catch (error: any) {
    console.error('❌ Error al cambiar estado:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
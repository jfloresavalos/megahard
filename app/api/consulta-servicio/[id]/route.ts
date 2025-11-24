import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { dni } = body;

    // Validar DNI
    if (!dni || dni.trim() === '') {
      return NextResponse.json(
        { error: 'El DNI es obligatorio' },
        { status: 400 }
      );
    }

    // Buscar el servicio y validar que el DNI coincida
    const servicio = await prisma.servicioTecnico.findUnique({
      where: { id },
      include: {
        sede: {
          select: {
            nombre: true,
            direccion: true,
            telefono: true
          }
        },
        tipoServicioRelacion: {
          select: {
            nombre: true
          }
        }
      }
    });

    if (!servicio) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }

    // Validar que el DNI coincida
    if (servicio.clienteDni !== dni.trim()) {
      return NextResponse.json(
        { error: 'No tiene permisos para ver este servicio' },
        { status: 403 }
      );
    }

    // Solo mostrar servicios pendientes (no cancelados ni entregados)
    if (servicio.estado === 'CANCELADO' || servicio.estado === 'ENTREGADO') {
      return NextResponse.json(
        { error: 'Servicio no disponible para consulta' },
        { status: 404 }
      );
    }

    // Obtener historial
    const historial = await prisma.servicioHistorial.findMany({
      where: {
        servicioId: id
      },
      orderBy: {
        fecha: 'asc'
      },
      select: {
        estadoAnterior: true,
        estadoNuevo: true,
        comentario: true,
        fecha: true
      }
    });

    // Preparar respuesta sin información sensible
    const servicioPublico = {
      id: servicio.id,
      numeroServicio: servicio.numeroServicio,
      clienteNombre: servicio.clienteNombre,
      clienteCelular: servicio.clienteCelular,
      tipoEquipo: servicio.tipoEquipo,
      marcaModelo: servicio.marcaModelo,
      descripcionEquipo: servicio.descripcionEquipo,
      problemasReportados: servicio.problemasReportados as any || [],
      otrosProblemas: servicio.otrosProblemas,
      descripcionProblema: servicio.descripcionProblema,
      estado: servicio.estado,
      prioridad: servicio.prioridad,
      fechaRecepcion: servicio.fechaRecepcion,
      fechaEntregaEstimada: servicio.fechaEntregaEstimada,
      fechaEntregaReal: servicio.fechaEntregaReal,
      // ✅ Solo mostrar diagnóstico si está REPARADO o ENTREGADO
      diagnostico: ['REPARADO', 'ENTREGADO'].includes(servicio.estado) ? servicio.diagnostico : null,
      solucion: ['REPARADO', 'ENTREGADO'].includes(servicio.estado) ? servicio.solucion : null,
      garantiaDias: servicio.garantiaDias,
      sede: servicio.sede,
      tipoServicio: servicio.tipoServicioRelacion || { nombre: 'No especificado' },
      createdAt: servicio.createdAt,
      // ❌ NO incluir precios
    };

    return NextResponse.json({
      success: true,
      servicio: servicioPublico,
      historial
    });

  } catch (error: any) {
    console.error('❌ Error en consulta de servicio:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    return NextResponse.json(
      { error: 'Error al consultar el servicio', details: error.message },
      { status: 500 }
    );
  }
}

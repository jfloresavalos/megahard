import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dni } = body;

    // Validar que venga el DNI
    if (!dni || dni.trim() === '') {
      return NextResponse.json(
        { error: 'El DNI es obligatorio' },
        { status: 400 }
      );
    }

    // Validar formato de DNI (8 dígitos)
    if (!/^\d{8}$/.test(dni.trim())) {
      return NextResponse.json(
        { error: 'El DNI debe tener 8 dígitos' },
        { status: 400 }
      );
    }

    // Construir query - Solo buscar por DNI y mostrar solo servicios pendientes
    const whereCondition: any = {
      clienteDni: dni.trim(),
      estado: {
        notIn: ['CANCELADO', 'ENTREGADO'] // Solo mostrar servicios pendientes (no cancelados ni entregados)
      }
    };

    // Buscar servicios
    const servicios = await prisma.servicioTecnico.findMany({
      where: whereCondition,
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
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Máximo 10 servicios para evitar sobrecarga
    });

    if (servicios.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron servicios pendientes con este DNI' },
        { status: 404 }
      );
    }

    // Mapear servicios para ocultar información sensible
    const serviciosPublicos = servicios.map(servicio => ({
      id: servicio.id,
      numeroServicio: servicio.numeroServicio,
      clienteNombre: servicio.clienteNombre,
      clienteCelular: servicio.clienteCelular,
      tipoEquipo: servicio.tipoEquipo,
      marcaModelo: servicio.marcaModelo,
      descripcionEquipo: servicio.descripcionEquipo,
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
      // ❌ NO incluir precios (total, aCuenta, saldo, costoServicio, costoRepuestos)
    }));

    return NextResponse.json({
      success: true,
      servicios: serviciosPublicos,
      total: serviciosPublicos.length
    });

  } catch (error: any) {
    console.error('❌ Error en consulta pública:', error);
    return NextResponse.json(
      { error: 'Error al consultar el servicio' },
      { status: 500 }
    );
  }
}

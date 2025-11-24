import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';

    // Obtener todos los clientes
    const clientes = await prisma.cliente.findMany({
      where: { activo: true },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Si se solicitan estadísticas, calcularlas para cada cliente
    if (includeStats) {
      const clientesConStats = await Promise.all(
        clientes.map(async (cliente) => {
          // Obtener servicios
          const servicios = await prisma.servicioTecnico.findMany({
            where: { clienteId: cliente.id },
            select: {
              estado: true,
              saldo: true
            }
          });

          const totalServicios = servicios.length;
          const serviciosActivos = servicios.filter(
            s => s.estado !== 'ENTREGADO' && s.estado !== 'CANCELADO'
          ).length;
          
          const deudaTotal = servicios
            .filter(s => s.estado !== 'CANCELADO')
            .reduce((sum, s) => sum + Number(s.saldo), 0);

          // Obtener ventas
          const ventas = await prisma.venta.findMany({
            where: { 
              clienteId: cliente.id,
              estado: 'COMPLETADA'
            },
            select: {
              id: true
            }
          });

          const totalVentas = ventas.length;

          return {
            ...cliente,
            totalServicios,
            serviciosActivos,
            totalVentas,
            deudaTotal
          };
        })
      );

      return NextResponse.json({
        success: true,
        clientes: clientesConStats
      });
    }

    // Sin estadísticas
    return NextResponse.json({
      success: true,
      clientes
    });

  } catch (error: any) {
    console.error('❌ Error al obtener clientes:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo cliente
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      tipoDoc,
      numeroDoc,
      nombre,
      razonSocial,
      telefono,
      email,
      direccion
    } = body;

    // Validaciones
    if (!numeroDoc || !numeroDoc.trim()) {
      return NextResponse.json(
        { error: 'El número de documento es obligatorio' },
        { status: 400 }
      );
    }

    if (!nombre || !nombre.trim()) {
      return NextResponse.json(
        { error: 'El nombre es obligatorio' },
        { status: 400 }
      );
    }

    // Verificar que el numeroDoc no esté en uso
    const clienteExiste = await prisma.cliente.findFirst({
      where: { numeroDoc: numeroDoc.trim() }
    });

    if (clienteExiste) {
      return NextResponse.json(
        { error: 'Ya existe un cliente con ese número de documento' },
        { status: 409 }
      );
    }

    // Crear cliente
    const nuevoCliente = await prisma.cliente.create({
      data: {
        tipoDoc: tipoDoc || 'DNI',
        numeroDoc: numeroDoc.trim(),
        nombre: nombre.trim(),
        razonSocial: razonSocial?.trim() || null,
        telefono: telefono?.trim() || null,
        email: email?.trim() || null,
        direccion: direccion?.trim() || null,
        activo: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Cliente creado correctamente',
      cliente: nuevoCliente
    });

  } catch (error: any) {
    console.error('❌ Error al crear cliente:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET: Obtener un cliente
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;
    const clienteId = id;

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId }
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      cliente
    });

  } catch (error: any) {
    console.error('❌ Error al obtener cliente:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT: Actualizar un cliente
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;
    const clienteId = id;

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

    // Verificar que el cliente existe
    const clienteExiste = await prisma.cliente.findUnique({
      where: { id: clienteId }
    });

    if (!clienteExiste) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el numeroDoc no esté en uso por otro cliente
    const clienteConDoc = await prisma.cliente.findFirst({
      where: {
        numeroDoc,
        id: { not: clienteId }
      }
    });

    if (clienteConDoc) {
      return NextResponse.json(
        { error: 'Ya existe otro cliente con ese número de documento' },
        { status: 409 }
      );
    }

    // Actualizar cliente
    const clienteActualizado = await prisma.cliente.update({
      where: { id: clienteId },
      data: {
        tipoDoc: tipoDoc || 'DNI',
        numeroDoc: numeroDoc.trim(),
        nombre: nombre.trim(),
        razonSocial: razonSocial?.trim() || null,
        telefono: telefono?.trim() || null,
        email: email?.trim() || null,
        direccion: direccion?.trim() || null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Cliente actualizado correctamente',
      cliente: clienteActualizado
    });

  } catch (error: any) {
    console.error('❌ Error al actualizar cliente:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
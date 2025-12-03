import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - Actualizar servicio
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nombre, descripcion, precioSugerido } = body

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: 'El nombre es requerido' },
        { status: 400 }
      )
    }

    const servicio = await prisma.servicioAdicionalCatalogo.update({
      where: { id },
      data: {
        nombre,
        descripcion,
        precioSugerido: parseFloat(precioSugerido) || 0
      }
    })

    return NextResponse.json({
      success: true,
      servicio
    })
  } catch (error: any) {
    console.error('Error al actualizar servicio:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Servicio no encontrado' },
        { status: 404 }
      )
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Este servicio ya existe' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error al actualizar servicio' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar servicio
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.servicioAdicionalCatalogo.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Servicio eliminado correctamente'
    })
  } catch (error: any) {
    console.error('Error al eliminar servicio:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Servicio no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error al eliminar servicio' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - Actualizar problema
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nombre, descripcion } = body

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: 'El nombre es requerido' },
        { status: 400 }
      )
    }

    const problema = await prisma.problemaComun.update({
      where: { id },
      data: {
        nombre,
        descripcion
      }
    })

    return NextResponse.json({
      success: true,
      problema
    })
  } catch (error: any) {
    console.error('Error al actualizar problema:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Problema no encontrado' },
        { status: 404 }
      )
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Este problema ya existe' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error al actualizar problema' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar problema
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.problemaComun.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Problema eliminado correctamente'
    })
  } catch (error: any) {
    console.error('Error al eliminar problema:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Problema no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error al eliminar problema' },
      { status: 500 }
    )
  }
}

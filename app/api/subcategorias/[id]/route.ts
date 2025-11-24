import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT - Actualizar subcategoría
export async function PUT(
  request: Request,
  context: RouteParams
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { nombre } = body

    if (!nombre) {
      return NextResponse.json({ 
        success: false,
        error: 'El nombre es obligatorio'
      }, { status: 400 })
    }

    const subcategoriaActual = await prisma.subcategoria.findUnique({
      where: { id }
    })

    if (!subcategoriaActual) {
      return NextResponse.json({ 
        success: false,
        error: 'Subcategoría no encontrada'
      }, { status: 404 })
    }

    if (nombre !== subcategoriaActual.nombre) {
      const otraSubcategoria = await prisma.subcategoria.findFirst({
        where: { 
          nombre,
          categoriaId: subcategoriaActual.categoriaId,
          NOT: { id }
        }
      })

      if (otraSubcategoria) {
        return NextResponse.json({ 
          success: false,
          error: 'Ya existe otra subcategoría con ese nombre en esta categoría'
        }, { status: 400 })
      }
    }

    const subcategoria = await prisma.subcategoria.update({
      where: { id },
      data: { nombre }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Subcategoría actualizada correctamente',
      subcategoria
    })
  } catch (error) {
    console.error('Error al actualizar subcategoría:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al actualizar subcategoría'
    }, { status: 500 })
  }
}

// DELETE - Eliminar subcategoría
export async function DELETE(
  request: Request,
  context: RouteParams
) {
  try {
    const { id } = await context.params

    const subcategoria = await prisma.subcategoria.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            productos: true
          }
        }
      }
    })

    if (!subcategoria) {
      return NextResponse.json({ 
        success: false,
        error: 'Subcategoría no encontrada'
      }, { status: 404 })
    }

    if (subcategoria._count.productos > 0) {
      return NextResponse.json({ 
        success: false,
        error: `No se puede eliminar la subcategoría porque tiene ${subcategoria._count.productos} producto(s) asociado(s)`
      }, { status: 400 })
    }

    await prisma.subcategoria.delete({
      where: { id }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Subcategoría eliminada correctamente'
    })
  } catch (error) {
    console.error('Error al eliminar subcategoría:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al eliminar subcategoría'
    }, { status: 500 })
  }
}
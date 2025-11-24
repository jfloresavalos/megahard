import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT - Actualizar categoría
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

    const categoriaActual = await prisma.categoria.findUnique({
      where: { id }
    })

    if (!categoriaActual) {
      return NextResponse.json({ 
        success: false,
        error: 'Categoría no encontrada'
      }, { status: 404 })
    }

    if (nombre !== categoriaActual.nombre) {
      const otraCategoria = await prisma.categoria.findFirst({
        where: { 
          nombre,
          NOT: { id }
        }
      })

      if (otraCategoria) {
        return NextResponse.json({ 
          success: false,
          error: 'Ya existe otra categoría con ese nombre'
        }, { status: 400 })
      }
    }

    const categoria = await prisma.categoria.update({
      where: { id },
      data: { nombre }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Categoría actualizada correctamente',
      categoria
    })
  } catch (error) {
    console.error('Error al actualizar categoría:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al actualizar categoría'
    }, { status: 500 })
  }
}

// DELETE - Eliminar categoría
export async function DELETE(
  request: Request,
  context: RouteParams
) {
  try {
    const { id } = await context.params

    const categoria = await prisma.categoria.findUnique({
      where: { id },
      include: {
        subcategorias: {
          include: {
            _count: {
              select: {
                productos: true
              }
            }
          }
        }
      }
    })

    if (!categoria) {
      return NextResponse.json({ 
        success: false,
        error: 'Categoría no encontrada'
      }, { status: 404 })
    }

    if (categoria.subcategorias.length > 0) {
      const totalProductos = categoria.subcategorias.reduce(
        (sum, sub) => sum + sub._count.productos, 
        0
      )
      
      if (totalProductos > 0) {
        return NextResponse.json({ 
          success: false,
          error: `No se puede eliminar la categoría porque tiene ${totalProductos} producto(s) en sus subcategorías`
        }, { status: 400 })
      }

      return NextResponse.json({ 
        success: false,
        error: `No se puede eliminar la categoría porque tiene ${categoria.subcategorias.length} subcategoría(s). Elimina las subcategorías primero.`
      }, { status: 400 })
    }

    await prisma.categoria.delete({
      where: { id }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Categoría eliminada correctamente'
    })
  } catch (error) {
    console.error('Error al eliminar categoría:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al eliminar categoría'
    }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener producto por ID
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        subcategoria: {
          include: {
            categoria: true
          }
        },
        sedes: {
          include: {
            sede: true
          }
        }
      }
    })

    if (!producto) {
      return NextResponse.json({ 
        success: false,
        error: 'Producto no encontrado'
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      producto
    })
  } catch (error) {
    console.error('Error al obtener producto:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al obtener producto'
    }, { status: 500 })
  }
}

// PUT - Actualizar producto
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { nombre, descripcion, precioCompra, precioVenta, garantia, stockMin, imagenes } = body

    const producto = await prisma.producto.update({
      where: { id },
      data: {
        nombre,
        descripcion,
        precioCompra: parseFloat(precioCompra),
        precioVenta: parseFloat(precioVenta),
        garantia,
        stockMin: parseInt(stockMin),
        imagenes: imagenes || []
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Producto actualizado correctamente',
      producto
    })
  } catch (error) {
    console.error('Error al actualizar producto:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al actualizar producto'
    }, { status: 500 })
  }
}

// DELETE - Eliminar (desactivar) producto
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const producto = await prisma.producto.update({
      where: { id },
      data: { activo: false }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Producto eliminado correctamente',
      producto
    })
  } catch (error) {
    console.error('Error al eliminar producto:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al eliminar producto'
    }, { status: 500 })
  }
}
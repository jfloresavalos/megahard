import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Obtener sede por ID
export async function GET(
  request: Request,
  context: RouteParams
) {
  try {
    const { id } = await context.params
    
    const sede = await prisma.sede.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            productos: true,
            usuarios: true
          }
        }
      }
    })

    if (!sede) {
      return NextResponse.json({ 
        success: false,
        error: 'Sede no encontrada'
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      sede
    })
  } catch (error) {
    console.error('Error al obtener sede:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al obtener sede'
    }, { status: 500 })
  }
}

// PUT - Actualizar sede
export async function PUT(
  request: Request,
  context: RouteParams
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { nombre, direccion, telefono } = body

    // Validar campos requeridos
    if (!nombre) {
      return NextResponse.json({ 
        success: false,
        error: 'El nombre es obligatorio'
      }, { status: 400 })
    }

    // Verificar que la sede existe
    const sedeActual = await prisma.sede.findUnique({
      where: { id }
    })

    if (!sedeActual) {
      return NextResponse.json({ 
        success: false,
        error: 'Sede no encontrada'
      }, { status: 404 })
    }

    // Verificar que el nombre no esté en uso por otra sede
    if (nombre !== sedeActual.nombre) {
      const otraSede = await prisma.sede.findFirst({
        where: { 
          nombre,
          NOT: { id }
        }
      })

      if (otraSede) {
        return NextResponse.json({ 
          success: false,
          error: 'Ya existe otra sede con ese nombre'
        }, { status: 400 })
      }
    }

    // Actualizar la sede
    const sede = await prisma.sede.update({
      where: { id },
      data: {
        nombre,
        direccion: direccion || null,
        telefono: telefono || null
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Sede actualizada correctamente',
      sede
    })
  } catch (error) {
    console.error('Error al actualizar sede:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al actualizar sede'
    }, { status: 500 })
  }
}

// DELETE - Eliminar sede
export async function DELETE(
  request: Request,
  context: RouteParams
) {
  try {
    const { id } = await context.params

    // Verificar que la sede existe
    const sede = await prisma.sede.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            productos: true,
            usuarios: true
          }
        }
      }
    })

    if (!sede) {
      return NextResponse.json({ 
        success: false,
        error: 'Sede no encontrada'
      }, { status: 404 })
    }

    // Verificar que no tenga productos o usuarios asociados
    if (sede._count.productos > 0) {
      return NextResponse.json({ 
        success: false,
        error: `No se puede eliminar la sede porque tiene ${sede._count.productos} producto(s) asociado(s)`
      }, { status: 400 })
    }

    if (sede._count.usuarios > 0) {
      return NextResponse.json({ 
        success: false,
        error: `No se puede eliminar la sede porque tiene ${sede._count.usuarios} usuario(s) asociado(s)`
      }, { status: 400 })
    }

    // Eliminar la sede
    await prisma.sede.delete({
      where: { id }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Sede eliminada correctamente'
    })
  } catch (error) {
    console.error('Error al eliminar sede:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al eliminar sede'
    }, { status: 500 })
  }
}
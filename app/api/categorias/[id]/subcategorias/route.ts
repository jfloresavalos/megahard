import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST - Crear subcategoría
export async function POST(
  request: Request,
  context: RouteParams
) {
  try {
    const { id: categoriaId } = await context.params
    const body = await request.json()
    const { nombre } = body

    if (!nombre) {
      return NextResponse.json({ 
        success: false,
        error: 'El nombre es obligatorio'
      }, { status: 400 })
    }

    const subcategoriaExistente = await prisma.subcategoria.findFirst({
      where: { 
        nombre,
        categoriaId 
      }
    })

    if (subcategoriaExistente) {
      return NextResponse.json({ 
        success: false,
        error: 'Ya existe una subcategoría con ese nombre en esta categoría'
      }, { status: 400 })
    }

    const subcategoria = await prisma.subcategoria.create({
      data: {
        nombre,
        categoriaId
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Subcategoría creada correctamente',
      subcategoria
    })
  } catch (error) {
    console.error('Error al crear subcategoría:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al crear subcategoría'
    }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener todas las categorías con subcategorías
export async function GET() {
  try {
    const categorias = await prisma.categoria.findMany({
      include: {
        subcategorias: {
          include: {
            _count: {
              select: {
                productos: true
              }
            }
          },
          orderBy: {
            nombre: 'asc'
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    })

    return NextResponse.json({ 
      success: true,
      categorias
    })
  } catch (error) {
    console.error('Error al obtener categorías:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al obtener categorías'
    }, { status: 500 })
  }
}

// POST - Crear nueva categoría
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre } = body

    if (!nombre) {
      return NextResponse.json({ 
        success: false,
        error: 'El nombre es obligatorio'
      }, { status: 400 })
    }

    const categoriaExistente = await prisma.categoria.findFirst({
      where: { nombre }
    })

    if (categoriaExistente) {
      return NextResponse.json({ 
        success: false,
        error: 'Ya existe una categoría con ese nombre'
      }, { status: 400 })
    }

    const categoria = await prisma.categoria.create({
      data: { nombre }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Categoría creada correctamente',
      categoria
    })
  } catch (error) {
    console.error('Error al crear categoría:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al crear categoría'
    }, { status: 500 })
  }
}
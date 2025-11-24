import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener todas las sedes
export async function GET() {
  try {
    const sedes = await prisma.sede.findMany({
      include: {
        _count: {
          select: {
            productos: true,
            usuarios: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    })

    return NextResponse.json({ 
      success: true,
      sedes
    })
  } catch (error) {
    console.error('Error al obtener sedes:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al obtener sedes'
    }, { status: 500 })
  }
}

// POST - Crear nueva sede
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre, direccion, telefono } = body

    // Validar campos requeridos
    if (!nombre) {
      return NextResponse.json({ 
        success: false,
        error: 'El nombre es obligatorio'
      }, { status: 400 })
    }

    // Verificar que el nombre no exista
    const sedeExistente = await prisma.sede.findFirst({
      where: { nombre }
    })

    if (sedeExistente) {
      return NextResponse.json({ 
        success: false,
        error: 'Ya existe una sede con ese nombre'
      }, { status: 400 })
    }

    // Crear la sede
    const sede = await prisma.sede.create({
      data: {
        nombre,
        direccion: direccion || null,
        telefono: telefono || null
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Sede creada correctamente',
      sede
    })
  } catch (error) {
    console.error('Error al crear sede:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al crear sede'
    }, { status: 500 })
  }
}
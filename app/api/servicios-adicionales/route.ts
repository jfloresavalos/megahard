import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener servicios activos
export async function GET() {
  try {
    const servicios = await prisma.servicioAdicionalCatalogo.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json({ 
      success: true,
      servicios
    })
  } catch (error) {
    console.error('Error al obtener servicios:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al obtener servicios'
    }, { status: 500 })
  }
}

// POST - Crear nuevo servicio
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre, descripcion, precioSugerido } = body

    if (!nombre) {
      return NextResponse.json({ 
        success: false,
        error: 'El nombre es requerido'
      }, { status: 400 })
    }

    const servicio = await prisma.servicioAdicionalCatalogo.create({
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
    console.error('Error al crear servicio:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        success: false,
        error: 'Este servicio ya existe'
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: false,
      error: 'Error al crear servicio'
    }, { status: 500 })
  }
}
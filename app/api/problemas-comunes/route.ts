import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener problemas activos
export async function GET() {
  try {
    const problemas = await prisma.problemaComun.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json({ 
      success: true,
      problemas
    })
  } catch (error) {
    console.error('Error al obtener problemas:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al obtener problemas'
    }, { status: 500 })
  }
}

// POST - Crear nuevo problema
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre, descripcion } = body

    if (!nombre) {
      return NextResponse.json({ 
        success: false,
        error: 'El nombre es requerido'
      }, { status: 400 })
    }

    const problema = await prisma.problemaComun.create({
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
    console.error('Error al crear problema:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        success: false,
        error: 'Este problema ya existe'
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: false,
      error: 'Error al crear problema'
    }, { status: 500 })
  }
}
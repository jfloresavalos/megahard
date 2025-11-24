import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const metodosPago = await prisma.metodoPago.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json({
      success: true,
      metodosPago
    })
  } catch (error) {
    console.error('Error al obtener métodos de pago:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al obtener métodos de pago'
    }, { status: 500 })
  }
}

// Crear nuevo método de pago
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { nombre } = await request.json()

    if (!nombre || nombre.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'El nombre es obligatorio'
      }, { status: 400 })
    }

    // Verificar si ya existe
    const existe = await prisma.metodoPago.findUnique({
      where: { nombre: nombre.trim().toUpperCase() }
    })

    if (existe) {
      return NextResponse.json({
        success: false,
        error: 'Ya existe un método de pago con ese nombre'
      }, { status: 400 })
    }

    const metodoPago = await prisma.metodoPago.create({
      data: {
        nombre: nombre.trim().toUpperCase()
      }
    })

    return NextResponse.json({
      success: true,
      metodoPago
    })
  } catch (error) {
    console.error('Error al crear método de pago:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al crear método de pago'
    }, { status: 500 })
  }
}

// Actualizar método de pago
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, nombre, activo } = await request.json()

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID es obligatorio'
      }, { status: 400 })
    }

    const data: any = {}
    if (nombre !== undefined) data.nombre = nombre.trim().toUpperCase()
    if (activo !== undefined) data.activo = activo

    const metodoPago = await prisma.metodoPago.update({
      where: { id },
      data
    })

    return NextResponse.json({
      success: true,
      metodoPago
    })
  } catch (error) {
    console.error('Error al actualizar método de pago:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al actualizar método de pago'
    }, { status: 500 })
  }
}

// Eliminar (desactivar) método de pago
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID es obligatorio'
      }, { status: 400 })
    }

    // Desactivar en lugar de eliminar
    await prisma.metodoPago.update({
      where: { id },
      data: { activo: false }
    })

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Error al eliminar método de pago:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al eliminar método de pago'
    }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const venta = await prisma.venta.findUnique({
      where: { id },
      include: {
        cliente: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            username: true
          }
        },
        sede: true,
        servicio: {
          select: {
            numeroServicio: true,
            tipoServicio: true
          }
        },
        items: {
          include: {
            producto: true
          }
        },
        pagos: {
          include: {
            metodoPago: true
          }
        }
      }
    })

    if (!venta) {
      return NextResponse.json(
        { success: false, error: 'Venta no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      venta
    })
  } catch (error) {
    console.error('Error al obtener venta:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener venta' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') || 'este_mes'
    const mes = searchParams.get('mes') || new Date().toISOString().substring(0, 7)
    const top = parseInt(searchParams.get('top') || '10')
    const sedeParam = searchParams.get('sede')

    const esAdmin = session.user.rol === 'admin' || session.user.rol === 'supervisor'
    const userSedeId = session.user.sedeId

    let inicio: Date
    let fin: Date
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    switch (periodo) {
      case 'hoy':
        inicio = new Date(hoy)
        fin = new Date(hoy)
        fin.setHours(23, 59, 59, 999)
        break

      case 'esta_semana':
        const primeroDiaSemana = new Date(hoy)
        primeroDiaSemana.setDate(hoy.getDate() - hoy.getDay())
        inicio = new Date(primeroDiaSemana)
        fin = new Date(hoy)
        fin.setHours(23, 59, 59, 999)
        break

      case 'este_mes':
        const [año, mesStr] = mes.split('-')
        inicio = new Date(Number(año), Number(mesStr) - 1, 1)
        fin = new Date(Number(año), Number(mesStr), 0)
        fin.setHours(23, 59, 59, 999)
        break

      case 'mes_anterior':
        const ahora = new Date(mes)
        const mesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
        inicio = new Date(mesAnterior)
        fin = new Date(mesAnterior.getFullYear(), mesAnterior.getMonth() + 1, 0)
        fin.setHours(23, 59, 59, 999)
        break

      case 'ultimo_trimestre':
        const trimestre = Math.floor(hoy.getMonth() / 3) - 1
        inicio = new Date(hoy.getFullYear(), trimestre * 3, 1)
        fin = new Date(hoy.getFullYear(), trimestre * 3 + 3, 0)
        fin.setHours(23, 59, 59, 999)
        break

      default:
        inicio = new Date(hoy)
        fin = new Date(hoy)
        fin.setHours(23, 59, 59, 999)
    }

    // Filtro de sede
    const whereCondition: any = {
      fecha: { gte: inicio, lte: fin },
      estado: 'COMPLETADA'
    }
    
    // Aplicar filtro de sede
    if (esAdmin && sedeParam && sedeParam !== 'TODAS') {
      // Admin consultando una sede específica
      whereCondition.sedeId = sedeParam
    } else if (!esAdmin && userSedeId) {
      // Usuario regular: solo su sede
      whereCondition.sedeId = userSedeId
    }
    // Si es admin sin sede específica, consultar todas (sin filtrar)

    // Obtener todas las ventas en el período
    const ventas = await prisma.venta.findMany({
      where: whereCondition,
      include: {
        items: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    })

    // Agrupar por producto
    const productosMap = new Map<string, any>()

    ventas.forEach(venta => {
      venta.items.forEach(item => {
        const key = item.productoId
        if (!productosMap.has(key)) {
          productosMap.set(key, {
            id: item.productoId,
            nombre: item.producto.nombre,
            cantidad: 0,
            ingresos: 0
          })
        }
        const prod = productosMap.get(key)!
        prod.cantidad += item.cantidad
        prod.ingresos += Number(item.precioUnit) * item.cantidad
      })
    })

    // Convertir a array y ordenar
    const productos = Array.from(productosMap.values())
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, top)

    // Calcular totales
    const totalIngresos = productos.reduce((sum, p) => sum + p.ingresos, 0)
    const totalCantidad = productos.reduce((sum, p) => sum + p.cantidad, 0)

    return NextResponse.json({
      productos,
      totales: {
        ingresos: totalIngresos,
        cantidad: totalCantidad
      }
    })
  } catch (error) {
    console.error('Error en productos-vendidos:', error)
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 })
  }
}

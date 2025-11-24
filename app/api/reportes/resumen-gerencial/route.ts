import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') || 'este_mes'
    const mes = searchParams.get('mes') || new Date().toISOString().substring(0, 7)

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

      case 'este_trimestre':
        const trimestre = Math.floor(hoy.getMonth() / 3)
        inicio = new Date(hoy.getFullYear(), trimestre * 3, 1)
        fin = new Date(hoy.getFullYear(), trimestre * 3 + 3, 0)
        fin.setHours(23, 59, 59, 999)
        break

      case 'este_año':
        inicio = new Date(hoy.getFullYear(), 0, 1)
        fin = new Date(hoy.getFullYear(), 11, 31)
        fin.setHours(23, 59, 59, 999)
        break

      default:
        inicio = new Date(hoy)
        fin = new Date(hoy)
        fin.setHours(23, 59, 59, 999)
    }

    // Obtener ventas
    const ventas = await prisma.venta.findMany({
      where: {
        fecha: { gte: inicio, lte: fin },
        estado: 'COMPLETADA'
      },
      include: {
        items: { include: { producto: true } }
      }
    })

    // Obtener servicios técnicos
    const servicios = await prisma.servicioTecnico.findMany({
      where: {
        fechaRecepcion: { gte: inicio, lte: fin }
      }
    })

    // Calcular KPIs
    const totalVentas = ventas.reduce((sum, v) => sum + Number(v.total), 0)
    const totalServicios = servicios.reduce((sum, s) => sum + Number(s.total || 0), 0)
    const totalIngresos = totalVentas + totalServicios
    const cantidadTransacciones = ventas.length

    // Calcular costo total (suma de costos de productos vendidos)
    const costoTotal = ventas.reduce((sum, v) => {
      return sum + v.items.reduce((itemSum, item) => {
        return itemSum + (Number(item.producto.precioCompra) * item.cantidad)
      }, 0)
    }, 0)

    const margen = totalIngresos > 0 ? (totalIngresos - costoTotal) / totalIngresos : 0
    const ticketPromedio = cantidadTransacciones > 0 ? totalVentas / cantidadTransacciones : 0

    // Top 10 productos vendidos
    const productosMap = new Map<string, any>()

    ventas.forEach(v => {
      v.items.forEach(item => {
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

    const topProductos = Array.from(productosMap.values())
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 10)

    return NextResponse.json({
      kpis: {
        totalVentas,
        totalIngresos,
        margen,
        cantidadTransacciones,
        ticketPromedio
      },
      topProductos
    })
  } catch (error) {
    console.error('Error en resumen-gerencial:', error)
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 })
  }
}

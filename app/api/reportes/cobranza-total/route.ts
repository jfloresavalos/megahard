import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rango = searchParams.get('rango') || 'hoy'
    const mes = searchParams.get('mes') || new Date().toISOString().substring(0, 7)

    let inicio: Date
    let fin: Date
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    switch (rango) {
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

      case 'esta_quincena':
        const día = hoy.getDate()
        inicio = new Date(hoy)
        inicio.setDate(día > 15 ? 16 : 1)
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

      default:
        inicio = new Date(hoy)
        fin = new Date(hoy)
        fin.setHours(23, 59, 59, 999)
    }

    // Obtener todas las ventas con sus pagos
    const ventas = await prisma.venta.findMany({
      where: {
        fecha: { gte: inicio, lte: fin },
        estado: 'COMPLETADA'
      },
      include: {
        pagos: {
          include: { metodoPago: true }
        }
      }
    })

    // Calcular totales de ventas
    let ventasContado = 0
    let creditoCobrado = 0
    let creditoPendiente = 0

    ventas.forEach(venta => {
      if (venta.pagos.length === 0) {
        // Sin pagos = crédito pendiente
        creditoPendiente += Number(venta.total)
      } else {
        // Tiene pagos
        const pagado = venta.pagos.reduce((sum, p) => sum + Number(p.monto), 0)
        const pendiente = Number(venta.total) - pagado

        // Asumir que si el pago es en EFECTIVO es contado, si no hay pago es crédito
        if (venta.pagos.some(p => p.metodoPago.nombre === 'EFECTIVO')) {
          ventasContado += pagado
          if (pendiente > 0) creditoPendiente += pendiente
        } else {
          creditoCobrado += pagado
          if (pendiente > 0) creditoPendiente += pendiente
        }
      }
    })

    // Servicios técnicos
    const servicios = await prisma.servicioTecnico.findMany({
      where: {
        fechaRecepcion: { gte: inicio, lte: fin }
      }
    })

    const serviciosCobrado = servicios.reduce((sum, s) => {
      return sum + Number(s.aCuenta || 0)
    }, 0)

    const serviciosPendiente = servicios.reduce((sum, s) => {
      return sum + Number(s.saldo || 0)
    }, 0)

    const totalCobrado = ventasContado + creditoCobrado + serviciosCobrado
    const totalPendiente = creditoPendiente + serviciosPendiente
    const totalGeneral = totalCobrado + totalPendiente

    return NextResponse.json({
      totales: {
        cobrado: parseFloat(totalCobrado.toFixed(2)),
        pendiente: parseFloat(totalPendiente.toFixed(2)),
        porcentaje: totalGeneral > 0 ? totalCobrado / totalGeneral : 0
      },
      detalles: [
        {
          tipo: 'Ventas Contado',
          cobrado: parseFloat(ventasContado.toFixed(2)),
          pendiente: 0
        },
        {
          tipo: 'Ventas Crédito',
          cobrado: parseFloat(creditoCobrado.toFixed(2)),
          pendiente: parseFloat(creditoPendiente.toFixed(2))
        },
        {
          tipo: 'Servicios Técnicos',
          cobrado: parseFloat(serviciosCobrado.toFixed(2)),
          pendiente: parseFloat(serviciosPendiente.toFixed(2))
        }
      ]
    })
  } catch (error) {
    console.error('Error en cobranza-total:', error)
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 })
  }
}

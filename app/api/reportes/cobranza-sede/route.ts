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
    const fechaInicio = searchParams.get('fechaInicio') || new Date().toISOString().split('T')[0]
    const fechaFin = searchParams.get('fechaFin') || new Date().toISOString().split('T')[0]
    const sedeParamId = searchParams.get('sede')

    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    fin.setHours(23, 59, 59, 999)

    const esAdmin = session.user.rol === 'admin' || session.user.rol === 'supervisor'
    const userSedeId = session.user.sedeId

    console.log('[COBRANZA-SEDE]', {
      usuario: session.user.username,
      rol: session.user.rol,
      userSedeId,
      sedeParamId,
      esAdmin
    })

    // Determinar qué sedes consultar
    let sedesAConsultar: any[]
    if (esAdmin && sedeParamId && sedeParamId !== 'TODAS') {
      // Admin consultando una sede específica
      sedesAConsultar = await prisma.sede.findMany({
        where: { id: sedeParamId, activo: true },
        select: { id: true, nombre: true }
      })
    } else if (esAdmin) {
      // Admin consultando todas las sedes (cuando sedeParamId es TODAS o no existe)
      sedesAConsultar = await prisma.sede.findMany({
        where: { activo: true },
        select: { id: true, nombre: true }
      })
    } else {
      // Usuario regular: solo su sede
      if (!userSedeId) {
        return NextResponse.json({ error: 'Usuario sin sede asignada' }, { status: 400 })
      }
      sedesAConsultar = await prisma.sede.findMany({
        where: { id: userSedeId, activo: true },
        select: { id: true, nombre: true }
      })
    }

    const cobranzaData = await Promise.all(
      sedesAConsultar.map(async (sede) => {
        // Obtener todas las ventas de la sede
        const ventas = await prisma.venta.findMany({
          where: {
            sedeId: sede.id,
            fecha: { gte: inicio, lte: fin },
            estado: 'COMPLETADA'
          },
          include: {
            pagos: {
              include: { metodoPago: true }
            }
          }
        })

        // Calcular totales
        let ventasContado = 0
        let creditoCobrado = 0
        let creditoPendiente = 0

        ventas.forEach(venta => {
          if (venta.pagos.length === 0) {
            // Sin pagos, asumimos que es crédito
            creditoPendiente += Number(venta.total)
          } else {
            // Sumar los pagos
            const pagado = venta.pagos.reduce((sum, p) => sum + Number(p.monto), 0)
            const esCreditoTotal = pagado > 0 && venta.pagos.some(p => p.metodoPago.nombre === 'CREDITO')
            
            if (esCreditoTotal) {
              creditoCobrado += pagado
              creditoPendiente += Number(venta.total) - pagado
            } else {
              ventasContado += pagado
            }
          }
        })

        // Servicios: usar aCuenta y saldo
        const servicios = await prisma.servicioTecnico.findMany({
          where: {
            sedeId: sede.id,
            fechaRecepcion: { gte: inicio, lte: fin }
          }
        })

        const serviciosCobrado = servicios.reduce((sum, s) => sum + Number(s.aCuenta || 0), 0)
        const serviciosPendiente = servicios.reduce((sum, s) => sum + Number(s.saldo || 0), 0)

        const totalCobrado = ventasContado + creditoCobrado + serviciosCobrado
        const totalPendiente = creditoPendiente + serviciosPendiente
        const totalCreado = totalCobrado + totalPendiente

        return {
          sede: sede.nombre,
          sedeId: sede.id,
          totalCobrado,
          totalPendiente,
          totalCreado,
          porcentajeCobrado: totalCreado > 0 ? totalCobrado / totalCreado : 0,
          ventasContado,
          ventasCredito: creditoCobrado,
          serviciosCobrado,
          serviciosPendiente
        }
      })
    )

    // Totales consolidados
    const totalCobrado = cobranzaData.reduce((sum, s) => sum + s.totalCobrado, 0)
    const totalPendiente = cobranzaData.reduce((sum, s) => sum + s.totalPendiente, 0)
    const totalCreado = totalCobrado + totalPendiente

    return NextResponse.json({
      sedes: cobranzaData,
      totales: {
        cobrado: totalCobrado,
        pendiente: totalPendiente,
        creditos: totalCreado,
        porcentaje: totalCreado > 0 ? totalCobrado / totalCreado : 0
      }
    })
  } catch (error) {
    console.error('Error en cobranza-sede:', error)
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 })
  }
}

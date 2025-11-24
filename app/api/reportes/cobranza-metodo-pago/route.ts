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

    console.log('[COBRANZA-METODO-PAGO]', {
      usuario: session.user.username,
      rol: session.user.rol,
      userSedeId,
      sedeParamId,
      esAdmin
    })

    // Determinar qué sede(s) consultar
    let whereCondition: any = {
      fecha: { gte: inicio, lte: fin },
      estado: 'COMPLETADA'
    }

    if (esAdmin && sedeParamId && sedeParamId !== 'TODAS') {
      whereCondition.sedeId = sedeParamId
    } else if (!esAdmin && userSedeId) {
      whereCondition.sedeId = userSedeId
    }

    // Obtener todas las ventas con sus pagos
    const ventas = await prisma.venta.findMany({
      where: whereCondition,
      include: {
        pagos: {
          include: { metodoPago: true }
        }
      }
    })

    // Obtener servicios técnicos
    const servicios = await prisma.servicioTecnico.findMany({
      where: {
        fechaRecepcion: { gte: inicio, lte: fin },
        ...(esAdmin && sedeParamId && sedeParamId !== 'TODAS' ? { sedeId: sedeParamId } : {}),
        ...(!esAdmin && userSedeId ? { sedeId: userSedeId } : {})
      }
    })

    // Agrupar ingresos por método de pago
    const metodosPagoMap = new Map<string, number>()

    // Procesar ventas
    ventas.forEach(venta => {
      if (venta.pagos.length === 0) {
        // Si no hay pagos, no se cuenta como ingreso (es crédito pendiente)
        return
      }

      venta.pagos.forEach(pago => {
        const metodonombre = pago.metodoPago.nombre
        const monto = Number(pago.monto)
        metodosPagoMap.set(
          metodonombre,
          (metodosPagoMap.get(metodonombre) || 0) + monto
        )
      })
    })

    // Procesar servicios (aCuenta es lo cobrado)
    servicios.forEach(servicio => {
      const aCuenta = Number(servicio.aCuenta || 0)
      if (aCuenta > 0) {
        // Asumir que servicios se cobran en efectivo (o podrías agregar campo metodoPago en servicios)
        metodosPagoMap.set(
          'EFECTIVO',
          (metodosPagoMap.get('EFECTIVO') || 0) + aCuenta
        )
      }
    })

    // Convertir map a array ordenado
    const metodosData = Array.from(metodosPagoMap.entries())
      .map(([nombre, monto]) => ({
        metodo: nombre,
        monto: parseFloat(monto.toFixed(2))
      }))
      .sort((a, b) => b.monto - a.monto)

    const totalIngreso = metodosData.reduce((sum, m) => sum + m.monto, 0)

    return NextResponse.json({
      fechaInicio,
      fechaFin,
      sede: sedeParamId,
      metodos: metodosData,
      total: parseFloat(totalIngreso.toFixed(2)),
      cantidad_metodos: metodosData.length
    })
  } catch (error) {
    console.error('[COBRANZA-METODO-PAGO] Error:', error)
    return NextResponse.json(
      { error: 'Error al cargar el reporte' },
      { status: 500 }
    )
  }
}

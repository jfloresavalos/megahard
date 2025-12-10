import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'

interface CajaDiariaParams {
  fecha: Date
  sedeId?: string // undefined = TODAS las sedes
}

export async function getCajaDiaria(params: CajaDiariaParams) {
  const { fecha, sedeId } = params

  // 1. Obtener ventas del día
  const ventas = await prisma.venta.findMany({
    where: {
      fecha: {
        gte: startOfDay(fecha),
        lte: endOfDay(fecha),
      },
      sedeId: sedeId || undefined,
      estado: 'COMPLETADA',
    },
    include: {
      sede: { select: { nombre: true } },
      usuario: { select: { nombre: true } },
      cliente: { select: { nombre: true } },
      pagos: {
        include: {
          metodoPago: { select: { nombre: true } },
        },
      },
      items: {
        include: {
          producto: { select: { nombre: true, codigo: true } },
        },
      },
    },
    orderBy: { fecha: 'desc' },
  })

  // 2. Obtener servicios entregados del día (cobros completos)
  const serviciosEntregados = await prisma.servicioTecnico.findMany({
    where: {
      fechaEntregaReal: {
        gte: startOfDay(fecha),
        lte: endOfDay(fecha),
      },
      sedeId: sedeId || undefined,
      estado: 'ENTREGADO',
    },
    include: {
      sede: { select: { nombre: true } },
      usuario: { select: { nombre: true } },
      cliente: { select: { nombre: true } },
    },
  })

  // 3. Obtener adelantos de servicios del día (que NO fueron entregados el mismo día)
  const serviciosAdelanto = await prisma.servicioTecnico.findMany({
    where: {
      fechaRecepcion: {
        gte: startOfDay(fecha),
        lte: endOfDay(fecha),
      },
      sedeId: sedeId || undefined,
      aCuenta: { gt: 0 },
      // Excluir servicios que ya fueron entregados
      estado: { not: 'ENTREGADO' }
    },
    include: {
      sede: { select: { nombre: true } },
      usuario: { select: { nombre: true } },
      cliente: { select: { nombre: true } },
    },
  })

  // 4. Calcular totales
  const totalVentas = ventas.reduce((sum, v) => sum + Number(v.total), 0)
  const totalServiciosEntregados = serviciosEntregados.reduce(
    (sum, s) => sum + Number(s.total || 0),
    0
  )
  const totalAdelantos = serviciosAdelanto.reduce(
    (sum, s) => sum + Number(s.aCuenta),
    0
  )
  const totalGeneral = totalVentas + totalServiciosEntregados + totalAdelantos

  // 5. Agrupar por método de pago (ventas + servicios)
  const porMetodoPago: Record<string, number> = {}

  // 5.1 Pagos de ventas
  ventas.forEach((venta) => {
    venta.pagos.forEach((pago) => {
      const metodo = pago.metodoPago.nombre
      porMetodoPago[metodo] = (porMetodoPago[metodo] || 0) + Number(pago.monto)
    })
  })

  // 5.2 Pagos de servicios entregados (usar método final)
  serviciosEntregados.forEach((servicio) => {
    const total = Number(servicio.total || 0)
    const metodo = servicio.metodoPagoSaldo || servicio.metodoPago || 'EFECTIVO'
    porMetodoPago[metodo] = (porMetodoPago[metodo] || 0) + total
  })

  // 5.3 Adelantos de servicios
  serviciosAdelanto.forEach((servicio) => {
    const adelanto = Number(servicio.aCuenta || 0)
    const metodo = servicio.metodoPago || 'EFECTIVO'
    porMetodoPago[metodo] = (porMetodoPago[metodo] || 0) + adelanto
  })

  // 6. Si es consolidado (todas las sedes), agrupar por sede
  let porSede: Record<string, any> = {}
  if (!sedeId) {
    ventas.forEach((v) => {
      const sede = v.sede.nombre
      if (!porSede[sede]) {
        porSede[sede] = {
          totalVentas: 0,
          cantidadVentas: 0,
          totalServicios: 0,
          totalAdelantos: 0,
          total: 0,
        }
      }
      porSede[sede].totalVentas += Number(v.total)
      porSede[sede].cantidadVentas += 1
      porSede[sede].total += Number(v.total)
    })

    serviciosEntregados.forEach((s) => {
      const sede = s.sede.nombre
      if (!porSede[sede]) {
        porSede[sede] = {
          totalVentas: 0,
          cantidadVentas: 0,
          totalServicios: 0,
          totalAdelantos: 0,
          total: 0,
        }
      }
      porSede[sede].totalServicios += Number(s.total || 0)
      porSede[sede].total += Number(s.total || 0)
    })

    serviciosAdelanto.forEach((s) => {
      const sede = s.sede.nombre
      if (!porSede[sede]) {
        porSede[sede] = {
          totalVentas: 0,
          cantidadVentas: 0,
          totalServicios: 0,
          totalAdelantos: 0,
          total: 0,
        }
      }
      porSede[sede].totalAdelantos += Number(s.aCuenta)
      porSede[sede].total += Number(s.aCuenta)
    })
  }

  return {
    ventas,
    serviciosEntregados,
    serviciosAdelanto,
    estadisticas: {
      totalVentas,
      cantidadVentas: ventas.length,
      totalServiciosEntregados,
      cantidadServiciosEntregados: serviciosEntregados.length,
      totalAdelantos,
      cantidadAdelantos: serviciosAdelanto.length,
      totalGeneral,
      porMetodoPago,
    },
    consolidado: !sedeId,
    porSede: !sedeId ? porSede : null,
  }
}

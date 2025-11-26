import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

// GET - Obtener todas las ventas
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sedeId = searchParams.get('sedeId')
    const fechaDesde = searchParams.get('fechaDesde') || searchParams.get('fechaInicio')
    const fechaHasta = searchParams.get('fechaHasta') || searchParams.get('fechaFin')

    const where: any = {}

    if (sedeId) {
      where.sedeId = sedeId
    }

    // ✅ Filtro de fechas con zona horaria de Perú (UTC-5)
    if (fechaDesde || fechaHasta) {
      where.fecha = {}
      if (fechaDesde) {
        // Perú está en UTC-5, entonces 00:00:00 en Perú es 05:00:00 UTC
        const fechaInicio = new Date(fechaDesde + 'T05:00:00.000Z')
        where.fecha.gte = fechaInicio
        console.log('📅 Filtro desde:', fechaDesde, '→', fechaInicio.toISOString())
      }
      if (fechaHasta) {
        // 23:59:59 en Perú es 04:59:59 del día siguiente en UTC
        const fechaFin = new Date(fechaHasta + 'T05:00:00.000Z')
        fechaFin.setDate(fechaFin.getDate() + 1)
        fechaFin.setMilliseconds(-1)
        where.fecha.lte = fechaFin
        console.log('📅 Filtro hasta:', fechaHasta, '→', fechaFin.toISOString())
      }
    }

    const ventas = await prisma.venta.findMany({
      where,
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
      },
      orderBy: {
        fecha: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      ventas
    })
  } catch (error) {
    console.error('Error al obtener ventas:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al obtener ventas'
    }, { status: 500 })
  }
}

// POST - Crear nueva venta CON DESCUENTO DE STOCK Y MÉTODO DE PAGO
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clienteId, usuarioId, sedeId, items, metodoPago, tipoComprobante } = body

    console.log('📦 [VENTA] Datos recibidos:', JSON.stringify({
      clienteId,
      usuarioId,
      sedeId,
      itemsCount: items?.length,
      metodoPago,
      tipoComprobante
    }))

    // Validaciones básicas
    if (!usuarioId || !sedeId) {
      return NextResponse.json({ 
        success: false,
        error: 'Usuario y sede son obligatorios'
      }, { status: 400 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Debe incluir al menos un producto'
      }, { status: 400 })
    }

    // ✅ Validar método de pago
    if (!metodoPago) {
      return NextResponse.json({ 
        success: false,
        error: 'El método de pago es obligatorio'
      }, { status: 400 })
    }

    // Validar productos y cantidades
    for (const item of items) {
      if (item.cantidad <= 0) {
        return NextResponse.json({ 
          success: false,
          error: `La cantidad debe ser mayor a 0`
        }, { status: 400 })
      }

      if (item.precioUnitario < 0) {
        return NextResponse.json({ 
          success: false,
          error: `El precio no puede ser negativo`
        }, { status: 400 })
      }
    }

    // Calcular subtotal
    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + (item.cantidad * item.precioUnitario)
    }, 0)

    // ✅ TRANSACCIÓN: Crear venta + Descontar stock
    const resultado = await prisma.$transaction(async (tx) => {
      console.log('🔄 [VENTA] Iniciando transacción')

      // 1. Verificar que todos los productos existen y tienen stock suficiente
      for (const item of items) {
        console.log(`🔍 [VENTA] Verificando producto: ${item.productoId}`)

        const producto = await tx.producto.findUnique({
          where: { id: item.productoId }
        })

        if (!producto) {
          throw new Error(`Producto con ID ${item.productoId} no encontrado`)
        }

        console.log(`✅ [VENTA] Producto encontrado: ${producto.nombre}`)

        // Verificar stock en la sede
        const productoSede = await tx.productoSede.findUnique({
          where: {
            productoId_sedeId: {
              productoId: item.productoId,
              sedeId: sedeId
            }
          }
        })

        if (!productoSede) {
          throw new Error(`El producto "${producto.nombre}" no está disponible en esta sede`)
        }

        console.log(`📦 [VENTA] Stock disponible: ${productoSede.stock}, Solicitado: ${item.cantidad}`)

        if (productoSede.stock < item.cantidad) {
          throw new Error(
            `Stock insuficiente para "${producto.nombre}". Disponible: ${productoSede.stock}, Solicitado: ${item.cantidad}`
          )
        }
      }

      // 2. Generar número de venta único
      const ultimaVenta = await tx.venta.findFirst({
        orderBy: { numeroVenta: 'desc' }
      })

      let numeroVenta = 'V-0001'
      if (ultimaVenta && ultimaVenta.numeroVenta) {
        const ultimoNumero = parseInt(ultimaVenta.numeroVenta.split('-')[1])
        numeroVenta = `V-${String(ultimoNumero + 1).padStart(4, '0')}`
      }

      console.log('📝 [VENTA] Número de venta generado:', numeroVenta)

      // 3. Crear venta con items Y PAGOS
      console.log('💾 [VENTA] Creando venta en BD...')

      const venta = await tx.venta.create({
        data: {
          numeroVenta,
          tipoComprobante: tipoComprobante || 'BOLETA',
          clienteId: clienteId || null,
          usuarioId,
          sedeId,
          subtotal: new Decimal(subtotal),
          total: new Decimal(subtotal),
          estado: 'COMPLETADA',
          items: {
            create: items.map((item: any) => ({
              productoId: item.productoId,
              cantidad: item.cantidad,
              precioUnit: new Decimal(item.precioUnitario),
              precioOriginal: new Decimal(item.precioUnitario),
              subtotal: new Decimal(item.cantidad * item.precioUnitario)
            }))
          },
          // ✅ AGREGAR PAGO
          pagos: {
            create: {
              metodoPagoId: metodoPago,
              monto: new Decimal(subtotal)
            }
          }
        },
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

      console.log(`✅ [VENTA] Venta creada en BD: ${venta.id} - ${venta.numeroVenta}`)

      // 4. Descontar stock y crear movimientos
      console.log('📉 [VENTA] Descontando stock...')

      for (const item of items) {
        const productoSede = await tx.productoSede.findUnique({
          where: {
            productoId_sedeId: {
              productoId: item.productoId,
              sedeId: sedeId
            }
          }
        })

        const stockAntes = productoSede!.stock
        const stockDespues = stockAntes - item.cantidad

        console.log(`📦 [VENTA] Producto ${item.productoId}: ${stockAntes} → ${stockDespues}`)

        // Actualizar stock
        await tx.productoSede.update({
          where: {
            productoId_sedeId: {
              productoId: item.productoId,
              sedeId: sedeId
            }
          },
          data: {
            stock: stockDespues
          }
        })

        // Crear movimiento de stock
        await tx.movimientoStock.create({
          data: {
            productoId: item.productoId,
            sedeId: sedeId,
            tipo: 'SALIDA_VENTA',
            cantidad: item.cantidad,
            stockAntes,
            stockDespues,
            motivo: `Venta ${numeroVenta}`,
            referencia: venta.id,
            anulado: false
          }
        })

        console.log(`✅ [VENTA] Stock y movimiento registrados para producto ${item.productoId}`)
      }

      console.log('✅ [VENTA] Transacción completada:', venta.id, venta.numeroVenta)
      return venta
    }, {
      maxWait: 10000, // 10 segundos máximo de espera
      timeout: 30000  // 30 segundos de timeout total
    })

    return NextResponse.json({ 
      success: true,
      message: 'Venta registrada correctamente',
      venta: resultado
    })

  } catch (error: any) {
    console.error('❌ [VENTA] Error al crear venta:', error)
    console.error('❌ [VENTA] Stack trace:', error.stack)
    console.error('❌ [VENTA] Error completo:', JSON.stringify({
      message: error.message,
      code: error.code,
      meta: error.meta
    }))

    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear venta',
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        code: error.code,
        meta: error.meta
      } : undefined
    }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    // ✅ CORRECCIÓN: Await params
    const { id: ventaId } = await context.params
    const { motivoAnulacion } = await request.json()

    console.log('🔄 Intentando anular venta:', ventaId)

    if (!motivoAnulacion || motivoAnulacion.trim() === '') {
      return NextResponse.json({ 
        success: false,
        error: 'El motivo de anulación es requerido'
      }, { status: 400 })
    }

    const venta = await prisma.venta.findUnique({
      where: { id: ventaId },
      include: {
        items: {
          include: {
            producto: true
          }
        }
      }
    })

    if (!venta) {
      return NextResponse.json({ 
        success: false,
        error: 'Venta no encontrada'
      }, { status: 404 })
    }

    if (venta.estado === 'ANULADA') {
      return NextResponse.json({
        success: false,
        error: 'La venta ya está anulada'
      }, { status: 400 })
    }

    // ✅ BLOQUEAR ANULACIÓN DE VENTAS QUE VIENEN DE SERVICIOS TÉCNICOS
    // Buscar si esta venta está relacionada con un servicio
    const servicioRelacionado = await prisma.servicioTecnico.findFirst({
      where: {
        OR: [
          // La venta fue creada al entregar el servicio
          { productosVendidos: { path: [], not: [] } }, // tiene productos vendidos
        ]
      },
      select: {
        id: true,
        numeroServicio: true,
        productosVendidos: true,
        estado: true
      }
    })

    // Verificar si algún movimiento de stock de esta venta tiene referencia a un servicio
    const movimientosRelacionados = await prisma.movimientoStock.findFirst({
      where: {
        referencia: ventaId,
        tipo: 'SALIDA_VENTA',
        motivo: {
          contains: 'servicio'
        }
      }
    })

    if (movimientosRelacionados) {
      // Extraer número de servicio del motivo (formato: "Venta al entregar servicio ST-XXXX")
      const matchServicio = movimientosRelacionados.motivo?.match(/servicio\s+(ST-\d+)/i)
      const numeroServicio = matchServicio ? matchServicio[1] : 'relacionado'

      return NextResponse.json({
        success: false,
        error: `Esta venta no puede anularse porque pertenece al servicio técnico ${numeroServicio}. Si necesita procesar una devolución, debe gestionarla desde el módulo de Servicios Técnicos.`
      }, { status: 400 })
    }

    console.log('📦 Venta encontrada:', venta.numeroVenta, '- Items:', venta.items.length)

    const resultado = await prisma.$transaction(async (tx) => {
      const ventaAnulada = await tx.venta.update({
        where: { id: ventaId },
        data: {
          estado: 'ANULADA',
          motivoAnulacion: motivoAnulacion.trim()
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
          }
        }
      })

      for (const item of venta.items) {
        console.log(`📈 Restaurando stock de ${item.producto.nombre}: +${item.cantidad}`)

        let productoSede = await tx.productoSede.findUnique({
          where: {
            productoId_sedeId: {
              productoId: item.productoId,
              sedeId: venta.sedeId
            }
          }
        })

        if (!productoSede) {
          productoSede = await tx.productoSede.create({
            data: {
              productoId: item.productoId,
              sedeId: venta.sedeId,
              stock: item.cantidad
            }
          })
          console.log(`✨ ProductoSede creado con stock: ${item.cantidad}`)
        } else {
          const nuevoStock = productoSede.stock + item.cantidad
          
          productoSede = await tx.productoSede.update({
            where: {
              productoId_sedeId: {
                productoId: item.productoId,
                sedeId: venta.sedeId
              }
            },
            data: {
              stock: nuevoStock
            }
          })
          console.log(`✅ Stock actualizado: ${productoSede.stock - item.cantidad} → ${productoSede.stock}`)
        }

        await tx.movimientoStock.create({
          data: {
            productoId: item.productoId,
            sedeId: venta.sedeId,
            tipo: 'ANULACION_VENTA',
            cantidad: item.cantidad,
            stockAntes: productoSede.stock - item.cantidad,
            stockDespues: productoSede.stock,
            motivo: `Anulación de venta ${venta.numeroVenta}: ${motivoAnulacion}`,
            referencia: ventaId,
            anulado: false
          }
        })
      }

      console.log('✅ Venta anulada exitosamente')
      return ventaAnulada
    })

    return NextResponse.json({ 
      success: true,
      message: 'Venta anulada correctamente',
      venta: resultado
    })

  } catch (error: any) {
    console.error('❌ Error al anular venta:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Error al anular la venta'
    }, { status: 500 })
  }
}
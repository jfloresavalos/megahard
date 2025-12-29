import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    console.log('🔍 [SERVICIO] Buscando servicio con ID:', id)

    const servicio: any = await prisma.servicioTecnico.findUnique({
      where: {
        id: id
      },
      select: {
        // Campos básicos del servicio
        id: true,
        numeroServicio: true,
        estado: true,
        prioridad: true,

        // Cliente
        clienteId: true,
        clienteNombre: true,
        clienteDni: true,
        clienteCelular: true,
        cliente: {
          select: {
            id: true,
            nombre: true,
            numeroDoc: true,
            telefono: true,
            email: true,
            direccion: true
          }
        },

        // Equipo
        tipoEquipo: true,
        marcaModelo: true,
        descripcionEquipo: true,
        dejoSinCargador: true,
        dejoAccesorios: true,
        esCotizacion: true,
        faltaPernos: true,
        tieneAranaduras: true,
        otrosDetalles: true,

        // Problema
        problemasReportados: true,
        otrosProblemas: true,
        descripcionProblema: true,
        fotosEquipo: true,

        // Reparación
        diagnostico: true,
        solucion: true,
        fotosDespues: true,

        // Costos
        costoServicio: true,
        costoRepuestos: true,
        total: true,
        aCuenta: true,
        saldo: true,
        serviciosAdicionales: true,
        metodoPago: true,
        metodoPagoSaldo: true,

        // Fechas
        fechaRecepcion: true,
        fechaEntregaEstimada: true,
        fechaReparacion: true,
        fechaEntregaReal: true,
        fechaUltimoPago: true,

        // Otros
        garantiaDias: true,
        tipoServicio: true,
        direccionServicio: true,
        quienRecibeNombre: true,
        quienRecibeDni: true,
        productosVendidos: true,

        // Cancelación
        motivoCancelacion: true,
        observacionCancelacion: true,
        fechaCancelacion: true,
        adelantoDevuelto: true,
        metodoDevolucion: true,
        usuarioCancelacionId: true,

        // Usuario y Sede
        usuarioId: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            username: true
          }
        },
        sedeId: true,
        sede: {
          select: {
            id: true,
            nombre: true,
            direccion: true,
            telefono: true
          }
        },

        // Items (repuestos)
        items: {
          select: {
            id: true,
            cantidad: true,
            precioUnit: true,
            subtotal: true,
            producto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                descripcion: true
              }
            }
          },
          orderBy: {
            id: 'asc'
          }
        },

        // Tipo de servicio
        tipoServicioId: true,
        tipoServicioRelacion: {
          select: {
            id: true,
            categoria: true,
            nombre: true,
            descripcion: true
          }
        },

        // Timestamps
        createdAt: true,
        updatedAt: true
      }
    })

    if (!servicio) {
      return NextResponse.json({
        success: false,
        error: 'Servicio no encontrado'
      }, { status: 404 })
    }

    // ✅ DEBUG: Ver qué trae fotosEquipo
    console.log('📸 fotosEquipo raw:', servicio.fotosEquipo)
    console.log('📸 Tipo:', typeof servicio.fotosEquipo)

    // ✅ PARSEAR fotosEquipo, fotosDespues, serviciosAdicionales Y productosVendidos
    let fotosEquipoParsed: string[] = []
    let fotosDespuesParsed: string[] = []
    let serviciosAdicionalesParsed: unknown[] = []
    let problemasReportadosParsed: unknown[] = []
    let productosVendidosParsed: any[] = []

    // Parsear fotos
    if (servicio.fotosEquipo) {
      if (typeof servicio.fotosEquipo === 'string') {
        try {
          fotosEquipoParsed = JSON.parse(servicio.fotosEquipo)
        } catch {
          fotosEquipoParsed = []
        }
      } else if (Array.isArray(servicio.fotosEquipo)) {
        fotosEquipoParsed = servicio.fotosEquipo
      }
    }

    // Parsear fotos después
    if (servicio.fotosDespues) {
      if (typeof servicio.fotosDespues === 'string') {
        try {
          fotosDespuesParsed = JSON.parse(servicio.fotosDespues)
        } catch {
          fotosDespuesParsed = []
        }
      } else if (Array.isArray(servicio.fotosDespues)) {
        fotosDespuesParsed = servicio.fotosDespues
      }
    }

    // Parsear servicios adicionales
    if (servicio.serviciosAdicionales) {
      if (typeof servicio.serviciosAdicionales === 'string') {
        try {
          serviciosAdicionalesParsed = JSON.parse(servicio.serviciosAdicionales)
        } catch {
          serviciosAdicionalesParsed = []
        }
      } else if (Array.isArray(servicio.serviciosAdicionales)) {
        serviciosAdicionalesParsed = servicio.serviciosAdicionales
      } else if (typeof servicio.serviciosAdicionales === 'object') {
        serviciosAdicionalesParsed = [servicio.serviciosAdicionales]
      }
    }

    // Parsear problemas reportados
    if (servicio.problemasReportados) {
      if (typeof servicio.problemasReportados === 'string') {
        try {
          problemasReportadosParsed = JSON.parse(servicio.problemasReportados)
        } catch {
          problemasReportadosParsed = []
        }
      } else if (Array.isArray(servicio.problemasReportados)) {
        problemasReportadosParsed = servicio.problemasReportados
      }
    }

    // Parsear productos vendidos
    if (servicio.productosVendidos) {
      if (typeof servicio.productosVendidos === 'string') {
        try {
          productosVendidosParsed = JSON.parse(servicio.productosVendidos)
        } catch {
          productosVendidosParsed = []
        }
      } else if (Array.isArray(servicio.productosVendidos)) {
        productosVendidosParsed = servicio.productosVendidos
      }
    }

    console.log('✅ [SERVICIO] fotosEquipo parseado:', fotosEquipoParsed?.length || 0)
    console.log('✅ [SERVICIO] fotosDespues parseado:', fotosDespuesParsed?.length || 0)
    console.log('✅ [SERVICIO] serviciosAdicionales parseado:', serviciosAdicionalesParsed?.length || 0)
    console.log('✅ [SERVICIO] items (repuestos):', servicio.items?.length || 0)
    console.log('✅ [SERVICIO] productosVendidos parseado:', productosVendidosParsed?.length || 0)

    // Formatear respuesta
    const servicioFormateado = {
      ...servicio,
      fotosEquipo: fotosEquipoParsed,
      fotosDespues: fotosDespuesParsed,
      serviciosAdicionales: serviciosAdicionalesParsed,
      problemasReportados: problemasReportadosParsed,
      productosVendidos: productosVendidosParsed,
      tecnico: servicio.usuario,
      tipoServicioTipo: servicio.tipoServicio, // ✅ String "TALLER" o "DOMICILIO"
      items: servicio.items // ✅ YA INCLUIDO
    }

    console.log('✅ [SERVICIO] Servicio encontrado y formateado correctamente')

    return NextResponse.json({
      success: true,
      servicio: servicioFormateado
    })
  } catch (error: any) {
    console.error('❌ [SERVICIO] Error al obtener servicio:', error)
    console.error('❌ [SERVICIO] Stack trace:', error.stack)

    return NextResponse.json({
      success: false,
      error: 'Error al obtener servicio',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}


// PUT - Actualizar servicio
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()

    console.log('📝 [SERVICIO] Actualizando servicio ID:', id)
    console.log('📦 [SERVICIO] Datos recibidos:', JSON.stringify(Object.keys(body)))

    // Buscar el servicio existente
    const servicioExistente = await prisma.servicioTecnico.findUnique({
      where: { id }
    })

    if (!servicioExistente) {
      return NextResponse.json({
        success: false,
        error: 'Servicio no encontrado'
      }, { status: 404 })
    }

    const {
      clienteNombre,
      clienteDni,
      clienteCelular,
      tipoEquipo,
      marcaEquipo,
      descripcionEquipo,
      dejoSinCargador,
      dejoAccesorios,
      esCotizacion,
      faltaPernos,
      tieneAranaduras,
      otrosDetalles,
      problemasReportados,
      otrosProblemas,
      descripcionProblema,
      fotosEquipo,
      costoServicio,
      serviciosAdicionales,
      aCuenta,
      metodoPago,
      fechaEstimada,
      garantiaDias,
      prioridad,
      tecnicoId,
      equipos = [], // ✅ Array de equipos con sus datos
      repuestos = [] // ✅ Array de repuestos
    } = body

    // Validar DNI y Celular
    if (clienteDni && clienteDni.length !== 8) {
      return NextResponse.json({
        success: false,
        error: 'El DNI debe tener 8 dígitos'
      }, { status: 400 })
    }

    if (clienteCelular && clienteCelular.length !== 9) {
      return NextResponse.json({
        success: false,
        error: 'El celular debe tener 9 dígitos'
      }, { status: 400 })
    }

    // ✅ VALIDAR: No permitir editar costos si ya está ENTREGADO
    const estadosNoEditablesCostos = ['ENTREGADO', 'CANCELADO']
    const puedeEditarCostos = !estadosNoEditablesCostos.includes(servicioExistente.estado)

    // Preparar datos para actualizar
    const dataToUpdate: any = {
      clienteNombre,
      clienteDni,
      clienteCelular,
      tipoEquipo,
      marcaModelo: marcaEquipo,
      descripcionEquipo,
      dejoSinCargador: dejoSinCargador || false,
      dejoAccesorios: dejoAccesorios || false,
      esCotizacion: esCotizacion || false,
      faltaPernos: faltaPernos || false,
      tieneAranaduras: tieneAranaduras || false,
      otrosDetalles,
      problemasReportados: problemasReportados || [],
      otrosProblemas,
      descripcionProblema,
      fotosEquipo: fotosEquipo || [],
      metodoPago,
      fechaEntregaEstimada: fechaEstimada ? new Date(fechaEstimada) : null,
      garantiaDias: parseInt(garantiaDias) || 30,
      prioridad: prioridad || servicioExistente.prioridad
    }

    // ✅ Solo actualizar costos si el estado lo permite
    if (puedeEditarCostos) {
      // Calcular costo total de TODOS los equipos
      let costoTotalEquipos = 0
      if (equipos && Array.isArray(equipos)) {
        costoTotalEquipos = equipos.reduce((sum: number, equipo: any) => {
          return sum + (parseFloat(equipo.costoServicio) || 0)
        }, 0)
      }

      let costoServiciosAdicionales = 0
      if (serviciosAdicionales && Array.isArray(serviciosAdicionales)) {
        costoServiciosAdicionales = serviciosAdicionales.reduce((sum: number, servicio: any) => {
          return sum + (parseFloat(servicio.precio) || 0)
        }, 0)
      }

      // ✅ Calcular costo de repuestos
      let costoRepuestos = 0
      if (repuestos && Array.isArray(repuestos)) {
        costoRepuestos = repuestos.reduce((sum: number, repuesto: any) => {
          const cantidad = parseFloat(repuesto.cantidad) || 0
          const precio = parseFloat(repuesto.precioUnit) || 0
          return sum + (cantidad * precio)
        }, 0)
      }

      const costoTotalNum = costoTotalEquipos + costoServiciosAdicionales + costoRepuestos
      const aCuentaNum = parseFloat(aCuenta) || 0
      const saldoNum = costoTotalNum - aCuentaNum

      dataToUpdate.costoServicio = costoTotalEquipos
      dataToUpdate.costoRepuestos = costoRepuestos
      // ✅ Guardar equipos y servicios como JSON
      dataToUpdate.serviciosAdicionales = JSON.stringify({
        equipos: equipos || [],
        servicios: serviciosAdicionales || []
      })
      dataToUpdate.total = costoTotalNum
      dataToUpdate.aCuenta = aCuentaNum
      dataToUpdate.saldo = saldoNum
    } else {
      console.log('⚠️ No se pueden editar costos - Estado:', servicioExistente.estado)
    }

    // ✅ Actualizar técnico si se proporciona
    if (tecnicoId) {
      dataToUpdate.usuarioId = tecnicoId
    }

    // ✅ Actualizar cliente si cambió - OPTIMIZADO
    if (clienteDni !== servicioExistente.clienteDni && clienteDni) {
      try {
        const clienteExistente = await prisma.cliente.findFirst({
          where: { numeroDoc: clienteDni }
        })

        if (clienteExistente) {
          // Actualizar cliente existente
          await prisma.cliente.update({
            where: { id: clienteExistente.id },
            data: {
              nombre: clienteNombre,
              telefono: clienteCelular
            }
          })
          dataToUpdate.clienteId = clienteExistente.id
        } else {
          // Crear nuevo cliente
          const nuevoCliente = await prisma.cliente.create({
            data: {
              tipoDoc: 'DNI',
              numeroDoc: clienteDni,
              nombre: clienteNombre,
              telefono: clienteCelular
            }
          })
          dataToUpdate.clienteId = nuevoCliente.id
        }
      } catch (clienteError) {
        console.warn('⚠️ Error al actualizar cliente, continuando sin cambios:', clienteError)
      }
    } else if (servicioExistente.clienteId) {
      // Solo actualizar datos del cliente existente
      try {
        await prisma.cliente.update({
          where: { id: servicioExistente.clienteId },
          data: {
            nombre: clienteNombre,
            telefono: clienteCelular
          }
        })
      } catch (clienteError) {
        console.warn('⚠️ Error al actualizar cliente:', clienteError)
      }
    }

    console.log('💾 [SERVICIO] Actualizando en BD...')

    // Actualizar servicio - SIN incluir relaciones para acelerar
    const servicioActualizado = await prisma.servicioTecnico.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        numeroServicio: true,
        estado: true,
        clienteNombre: true,
        clienteDni: true,
        clienteCelular: true,
        tipoEquipo: true,
        marcaModelo: true,
        descripcionEquipo: true
      }
    })

    console.log('✅ [SERVICIO] Servicio actualizado:', servicioActualizado.numeroServicio)

    // ✅ Procesar repuestos (items) si fueron enviados
    if (repuestos !== undefined) {
      console.log('🔧 [SERVICIO] Procesando repuestos...')

      // 1. Obtener items actuales del servicio
      const itemsActuales = await prisma.servicioItem.findMany({
        where: { servicioId: id },
        include: { producto: true }
      })

      console.log('🔧 [SERVICIO] Items actuales:', itemsActuales.length)

      // 2. Restaurar stock de los items que se van a eliminar
      for (const item of itemsActuales) {
        const productoSede = await prisma.productoSede.findFirst({
          where: {
            productoId: item.productoId,
            sedeId: servicioExistente.sedeId
          }
        })

        if (productoSede) {
          await prisma.productoSede.update({
            where: { id: productoSede.id },
            data: {
              stock: {
                increment: item.cantidad
              }
            }
          })

          // Registrar movimiento de stock
          await prisma.movimientoStock.create({
            data: {
              productoId: item.productoId,
              sedeId: servicioExistente.sedeId,
              tipo: 'DEVOLUCION_SERVICIO',
              cantidad: item.cantidad,
              stockAntes: productoSede.stock,
              stockDespues: productoSede.stock + item.cantidad,
              motivo: 'Devolución por edición de servicio',
              referencia: `Servicio ${servicioActualizado.numeroServicio}`,
              usuarioId: tecnicoId || servicioExistente.usuarioId
            }
          })
        }
      }

      // 3. Eliminar todos los items existentes
      await prisma.servicioItem.deleteMany({
        where: { servicioId: id }
      })

      console.log('🔧 [SERVICIO] Items anteriores eliminados y stock restaurado')

      // 4. Crear nuevos items y descontar stock
      if (Array.isArray(repuestos) && repuestos.length > 0) {
        console.log('🔧 [SERVICIO] Creando', repuestos.length, 'nuevos items...')

        for (const repuesto of repuestos) {
          const { productoId, cantidad, precioUnit } = repuesto
          const cantidadNum = parseFloat(cantidad) || 0
          const precioNum = parseFloat(precioUnit) || 0
          const subtotal = cantidadNum * precioNum

          // Crear ServicioItem
          await prisma.servicioItem.create({
            data: {
              servicioId: id,
              productoId: productoId,
              cantidad: cantidadNum,
              precioUnit: precioNum,
              subtotal: subtotal
            }
          })

          // Descontar stock del ProductoSede
          const productoSede = await prisma.productoSede.findFirst({
            where: {
              productoId: productoId,
              sedeId: servicioExistente.sedeId
            }
          })

          if (productoSede) {
            await prisma.productoSede.update({
              where: { id: productoSede.id },
              data: {
                stock: {
                  decrement: cantidadNum
                }
              }
            })

            // Crear registro de movimiento de stock
            await prisma.movimientoStock.create({
              data: {
                productoId: productoId,
                sedeId: servicioExistente.sedeId,
                tipo: 'USO_SERVICIO',
                cantidad: cantidadNum,
                stockAntes: productoSede.stock,
                stockDespues: productoSede.stock - cantidadNum,
                motivo: 'Repuesto utilizado en reparación',
                referencia: `Servicio ${servicioActualizado.numeroServicio}`,
                usuarioId: tecnicoId || servicioExistente.usuarioId
              }
            })
          } else {
            console.warn(`⚠️ No se encontró ProductoSede para producto ${productoId} en sede ${servicioExistente.sedeId}`)
          }
        }

        console.log('✅ [SERVICIO] Nuevos repuestos procesados exitosamente')
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Servicio actualizado correctamente',
      servicio: servicioActualizado
    })
  } catch (error: any) {
    console.error('❌ [SERVICIO] Error al actualizar servicio:', error)
    console.error('❌ [SERVICIO] Stack trace:', error.stack)
    console.error('❌ [SERVICIO] Error completo:', JSON.stringify({
      message: error.message,
      code: error.code,
      meta: error.meta
    }))

    return NextResponse.json({
      success: false,
      error: error.message || 'Error al actualizar servicio',
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        code: error.code,
        meta: error.meta
      } : undefined
    }, { status: 500 })
  }
}
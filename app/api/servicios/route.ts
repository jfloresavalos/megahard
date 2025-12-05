import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener todos los servicios
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sedeId = searchParams.get('sedeId')
    const estado = searchParams.get('estado')
    const tipoServicio = searchParams.get('tipoServicio')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    const busquedaCliente = searchParams.get('busquedaCliente') // ✅ Nuevo parámetro de búsqueda

    const where: any = {}

    // ✅ Por defecto excluir cancelados, EXCEPTO si se filtra explícitamente por CANCELADO
    if (estado !== 'CANCELADO') {
      where.fechaCancelacion = null
    }

    if (sedeId) {
      where.sedeId = sedeId
    }

    if (estado && estado !== 'TODOS') {
      // ✅ Filtro especial para "PAGO_PENDIENTE"
      if (estado === 'PAGO_PENDIENTE') {
        where.estado = 'ENTREGADO'
        where.saldo = {
          gt: 0
        }
      } else if (estado === 'CANCELADO') {
        // ✅ Si filtra por CANCELADO, mostrar solo los cancelados
        where.estado = 'CANCELADO'
        where.fechaCancelacion = {
          not: null
        }
      } else {
        where.estado = estado
      }
    }

    // ✅ Filtro de tipo de servicio (TALLER o DOMICILIO)
    if (tipoServicio && tipoServicio !== 'TODOS') {
      where.tipoServicio = tipoServicio
    }

    // ✅ Filtro de búsqueda por cliente (DNI, RUC o Nombre)
    if (busquedaCliente && busquedaCliente.trim()) {
      const busqueda = busquedaCliente.trim()

      // Búsqueda flexible: puede ser DNI/RUC o parte del nombre
      where.OR = [
        {
          clienteDni: {
            contains: busqueda,
            mode: 'insensitive'
          }
        },
        {
          clienteNombre: {
            contains: busqueda,
            mode: 'insensitive'
          }
        }
      ]
    }

    // ✅ Filtro de fecha con zona horaria de Perú (UTC-5)
    if (fechaDesde || fechaHasta) {
      where.createdAt = {}

      if (fechaDesde) {
        // Perú está en UTC-5, entonces 00:00:00 en Perú es 05:00:00 UTC
        const fechaInicio = new Date(fechaDesde + 'T05:00:00.000Z')
        where.createdAt.gte = fechaInicio
        console.log('📅 Filtro desde:', fechaDesde, '→', fechaInicio.toISOString())
      }

      if (fechaHasta) {
        // 23:59:59 en Perú es 04:59:59 del día siguiente en UTC
        const fechaFin = new Date(fechaHasta + 'T05:00:00.000Z')
        fechaFin.setDate(fechaFin.getDate() + 1)
        fechaFin.setMilliseconds(-1)
        where.createdAt.lte = fechaFin
        console.log('📅 Filtro hasta:', fechaHasta, '→', fechaFin.toISOString())
      }
    }

    const servicios = await prisma.servicioTecnico.findMany({
      where,
      select: {
        id: true,
        numeroServicio: true,
        estado: true,
        prioridad: true,
        clienteNombre: true,
        clienteDni: true,
        clienteCelular: true,
        tipoEquipo: true,
        marcaModelo: true,
        descripcionEquipo: true,
        total: true,
        aCuenta: true,
        saldo: true,
        fechaRecepcion: true,
        fechaReparacion: true,
        diagnostico: true,
        solucion: true,
        tipoServicio: true,
        motivoCancelacion: true,
        createdAt: true,
        updatedAt: true,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ 
      success: true,
      servicios
    })
  } catch (error) {
    console.error('Error al obtener servicios:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al obtener servicios'
    }, { status: 500 })
  }
}

// POST - Crear nuevo servicio
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      clienteId, // ✅ Puede venir el ID del cliente
      clienteNombre,
      clienteDni,
      clienteTipoDoc = 'DNI',
      clienteCelular,
      tecnicoId,
      sedeId,
      tipoServicioId, // ✅ Puede venir el tipo de servicio específico
      // ✅ AHORA RECIBIMOS ARRAY DE EQUIPOS EN LUGAR DE UN SOLO EQUIPO
      equipos = [], // Array de equipos con sus datos individuales
      fotosServicio = [], // Fotos a nivel de servicio
      serviciosAdicionales,
      repuestos = [], // ✅ REPUESTOS UTILIZADOS
      metodoPago,
      fechaEstimada,
      garantiaDias,
      aCuenta,
      // ✅ CAMPOS PARA SERVICIOS A DOMICILIO
      tipoServicioForm = 'TALLER', // 'TALLER' o 'DOMICILIO'
      direccionServicio,
      prioridad = 'NORMAL',
      // ✅ CAMPOS PARA SERVICIO EXPRESS
      esServicioExpress = false,
      diagnosticoExpress = null,
      solucionExpress = null
    } = body

    console.log('📝 Creando servicio técnico...', tipoServicioForm)
    console.log('📦 Equipos recibidos:', equipos.length) // ✅ DEBUG
    console.log('📸 Fotos del servicio:', fotosServicio.length) // ✅ DEBUG
    console.log('🔧 Repuestos recibidos:', repuestos.length) // ✅ DEBUG
    console.log('📅 fechaEstimada recibida:', fechaEstimada, 'tipo:', typeof fechaEstimada) // ✅ DEBUG

    // ✅ Validar que haya al menos un equipo
    if (!equipos || equipos.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Debe agregar al menos un equipo'
      }, { status: 400 })
    }

    // ✅ Validar campos obligatorios para servicio express
    if (tipoServicioForm === 'EXPRESS') {
      if (!diagnosticoExpress?.trim()) {
        return NextResponse.json({
          success: false,
          error: 'El diagnóstico es obligatorio para servicios express'
        }, { status: 400 })
      }
      if (!solucionExpress?.trim()) {
        return NextResponse.json({
          success: false,
          error: 'La solución es obligatoria para servicios express'
        }, { status: 400 })
      }
    }

    // ✅ Determinar prefijo según tipo de servicio
    let prefijo = 'ST' // TALLER por defecto
    if (tipoServicioForm === 'DOMICILIO') prefijo = 'SD'
    if (tipoServicioForm === 'EXPRESS') prefijo = 'SE'

    // Buscar el último servicio de ESTA sede y tipo específico
    const ultimoServicio = await prisma.servicioTecnico.findFirst({
      where: {
        sedeId: sedeId,
        tipoServicio: tipoServicioForm
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    let numeroServicio = `${prefijo}-0001`
    if (ultimoServicio && ultimoServicio.numeroServicio) {
      // Extraer el número del formato ST-0001 o SD-0001
      const partes = ultimoServicio.numeroServicio.split('-')
      if (partes.length === 2) {
        const ultimoNumero = parseInt(partes[1])
        numeroServicio = `${prefijo}-${String(ultimoNumero + 1).padStart(4, '0')}`
      }
    }

    // ✅ Manejar cliente (puede venir el ID o los datos para crear/buscar)
    let clienteFinal: string | null = null

    if (clienteId) {
      // Ya viene el ID del cliente seleccionado
      clienteFinal = clienteId
    } else if (clienteDni) {
      // Buscar si el cliente ya existe por DNI y tipo de documento
      const clienteExistente = await prisma.cliente.findFirst({
        where: {
          numeroDoc: clienteDni,
          tipoDoc: clienteTipoDoc
        }
      })

      if (clienteExistente) {
        clienteFinal = clienteExistente.id
        // Actualizar datos del cliente si cambió algo
        await prisma.cliente.update({
          where: { id: clienteFinal },
          data: {
            nombre: clienteNombre,
            telefono: clienteCelular
          }
        })
      } else {
        // Crear nuevo cliente
        const nuevoCliente = await prisma.cliente.create({
          data: {
            tipoDoc: clienteTipoDoc,
            numeroDoc: clienteDni,
            nombre: clienteNombre,
            telefono: clienteCelular
          }
        })
        clienteFinal = nuevoCliente.id
      }
    }

    // ✅ Manejar tipo de servicio (puede venir del form o usar genérico)
    let tipoServicioFinal: string | null = null

    if (tipoServicioId) {
      // Ya viene el ID del tipo de servicio
      tipoServicioFinal = tipoServicioId
    } else {
      // Buscar o crear tipo de servicio genérico
      const tipoServicioGenerico = await prisma.tipoServicio.findFirst({
        where: {
          categoria: 'GENERAL',
          nombre: 'Servicio Técnico General'
        }
      })

      if (tipoServicioGenerico) {
        tipoServicioFinal = tipoServicioGenerico.id
      } else {
        const nuevoTipo = await prisma.tipoServicio.create({
          data: {
            categoria: 'GENERAL',
            nombre: 'Servicio Técnico General',
            descripcion: 'Servicio técnico general'
          }
        })
        tipoServicioFinal = nuevoTipo.id
      }
    }

    // ✅ Calcular costos TOTALES de TODOS los equipos
    let costoTotalEquipos = 0
    equipos.forEach((equipo: any) => {
      costoTotalEquipos += parseFloat(equipo.costoServicio) || 0
    })

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

    // ✅ Validar que se haya definido el cliente
    if (!clienteFinal) {
      return NextResponse.json({
        success: false,
        error: 'Debe proporcionar información del cliente'
      }, { status: 400 })
    }

    // ✅ Validar que se haya definido el tipo de servicio
    if (!tipoServicioFinal) {
      return NextResponse.json({
        success: false,
        error: 'Debe proporcionar un tipo de servicio'
      }, { status: 400 })
    }

    // ✅ Determinar estado inicial según tipo de servicio
    let estadoInicial: string
    if (tipoServicioForm === 'EXPRESS') {
      estadoInicial = 'REPARADO'
    } else if (tipoServicioForm === 'DOMICILIO') {
      estadoInicial = 'EN_DOMICILIO'
    } else {
      estadoInicial = 'RECEPCIONADO'
    }

    // ✅ Usar el PRIMER equipo como referencia para los campos de equipoTecnico
    const primerEquipo = equipos[0]
    let descripcionProblemaFinal = ''
    
    // Crear descripción del problema del primer equipo
    if (primerEquipo.problemasSeleccionados && primerEquipo.problemasSeleccionados.length > 0) {
      descripcionProblemaFinal = primerEquipo.problemasSeleccionados.map((p: any) => p.nombre).join(', ')
    }
    
    if (primerEquipo.descripcionProblema) {
      if (descripcionProblemaFinal) {
        descripcionProblemaFinal += '. ' + primerEquipo.descripcionProblema
      } else {
        descripcionProblemaFinal = primerEquipo.descripcionProblema
      }
    }

    if (!descripcionProblemaFinal) {
      descripcionProblemaFinal = 'Por diagnosticar'
    }

    // Crear servicio con UN SOLO registro, pero MÚLTIPLES items/equipos
    const servicio = await prisma.servicioTecnico.create({
      data: {
        numeroServicio,
        cliente: {
          connect: { id: clienteFinal }
        },
        clienteNombre,
        clienteDni,
        clienteCelular,
        tipoServicioRelacion: {
          connect: { id: tipoServicioFinal }
        },
        usuario: {
          connect: { id: tecnicoId }
        },
        sede: {
          connect: { id: sedeId }
        },
        // ✅ Usar datos del PRIMER equipo como referencia
        tipoEquipo: primerEquipo.tipoEquipo,
        marcaModelo: primerEquipo.marcaModelo,
        descripcionEquipo: primerEquipo.descripcionEquipo,
        dejoSinCargador: primerEquipo.dejoSinCargador || false,
        dejoAccesorios: primerEquipo.dejoAccesorios || false,
        esCotizacion: primerEquipo.esCotizacion || false,
        descripcionProblema: descripcionProblemaFinal,
        problemasReportados: primerEquipo.problemasSeleccionados?.map((p: any) => p.id) || [],
        otrosProblemas: primerEquipo.descripcionProblema || '',
        faltaPernos: primerEquipo.faltaPernos || false,
        tieneAranaduras: primerEquipo.tieneAranaduras || false,
        otrosDetalles: primerEquipo.otrosDetalles || '',
        costoServicio: costoTotalEquipos, // ✅ SUMA DE TODOS LOS EQUIPOS
        costoRepuestos: costoRepuestos, // ✅ SUMA DE TODOS LOS REPUESTOS
        total: costoTotalNum,
        aCuenta: aCuentaNum,
        saldo: saldoNum,
        serviciosAdicionales: JSON.stringify({
          equipos: equipos, // ✅ GUARDAR TODOS LOS EQUIPOS CON SUS CHECKBOXES
          servicios: serviciosAdicionales || []
        }),
        metodoPago,
        fechaRecepcion: new Date(),
        fechaEntregaEstimada: fechaEstimada ? new Date(fechaEstimada) : null,
        garantiaDias: parseInt(garantiaDias) || 30,
        fotosEquipo: fotosServicio, // ✅ Fotos a nivel de servicio
        estado: estadoInicial,
        prioridad,
        // ✅ CAMPOS PARA SERVICIOS A DOMICILIO
        tipoServicio: tipoServicioForm,
        direccionServicio: direccionServicio || null,
        // ✅ CAMPOS PARA SERVICIO EXPRESS
        diagnostico: tipoServicioForm === 'EXPRESS' ? diagnosticoExpress : null,
        solucion: tipoServicioForm === 'EXPRESS' ? solucionExpress : null,
        fechaReparacion: tipoServicioForm === 'EXPRESS' ? new Date() : null
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
        items: true
      }
    })

    console.log('✅ Servicio creado:', numeroServicio)

    // ✅ Crear entrada en historial
    await prisma.servicioHistorial.create({
      data: {
        servicioId: servicio.id,
        estadoAnterior: null,
        estadoNuevo: estadoInicial,
        comentario: tipoServicioForm === 'EXPRESS'
          ? `⚡ Servicio Express - Completado inmediatamente. Diagnóstico: ${diagnosticoExpress}. Solución: ${solucionExpress}`
          : `Servicio ${tipoServicioForm} recepcionado`,
        usuarioId: tecnicoId
      }
    })

    // ✅ Procesar repuestos: crear items, descontar stock y registrar movimientos
    if (repuestos && Array.isArray(repuestos) && repuestos.length > 0) {
      console.log('🔧 Procesando', repuestos.length, 'repuestos...')

      for (const repuesto of repuestos) {
        const { productoId, cantidad, precioUnit } = repuesto
        const cantidadNum = parseFloat(cantidad) || 0
        const precioNum = parseFloat(precioUnit) || 0
        const subtotal = cantidadNum * precioNum

        // Crear ServicioItem
        await prisma.servicioItem.create({
          data: {
            servicioId: servicio.id,
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
            sedeId: sedeId
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
              sedeId: sedeId,
              tipo: 'USO_SERVICIO',
              cantidad: cantidadNum,
              stockAntes: productoSede.stock,
              stockDespues: productoSede.stock - cantidadNum,
              motivo: 'Repuesto utilizado en reparación',
              referencia: `Servicio ${numeroServicio}`,
              usuarioId: tecnicoId
            }
          })
        } else {
          console.warn(`⚠️ No se encontró ProductoSede para producto ${productoId} en sede ${sedeId}`)
        }
      }

      console.log('✅ Repuestos procesados exitosamente')
    }

    // ✅ Los equipos se guardan en serviciosAdicionales como JSON
    // No necesitamos crear ServicioItem individuales para cada equipo
    // ya que el costo total se calcula sumando todos los equipos
    console.log('📦 Equipos guardados en serviciosAdicionales (total:', equipos.length, 'equipos)')

    console.log('✅ Servicio creado exitosamente:', numeroServicio)

    return NextResponse.json({ 
      success: true,
      message: 'Servicio técnico registrado correctamente',
      servicio
    })
  } catch (error: any) {
    console.error('❌ Error al crear servicio:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Error al crear servicio técnico'
    }, { status: 500 })
  }
}
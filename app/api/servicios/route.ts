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

    const where: any = {
      fechaCancelacion: null // ✅ Por defecto, excluir cancelados
    }

    if (sedeId) {
      where.sedeId = sedeId
    }

    if (estado && estado !== 'TODOS') {
      where.estado = estado
    }

    // ✅ Filtro de tipo de servicio (TALLER o DOMICILIO)
    if (tipoServicio && tipoServicio !== 'TODOS') {
      where.tipoServicio = tipoServicio
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
      serviciosAdicionales,
      metodoPago,
      fechaEstimada,
      garantiaDias,
      aCuenta,
      // ✅ CAMPOS PARA SERVICIOS A DOMICILIO
      tipoServicioForm = 'TALLER', // 'TALLER' o 'DOMICILIO'
      direccionServicio,
      prioridad = 'NORMAL'
    } = body

    console.log('📝 Creando servicio técnico...', tipoServicioForm)
    console.log('📦 Equipos recibidos:', equipos.length) // ✅ DEBUG
    console.log('📅 fechaEstimada recibida:', fechaEstimada, 'tipo:', typeof fechaEstimada) // ✅ DEBUG

    // ✅ Validar que haya al menos un equipo
    if (!equipos || equipos.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Debe agregar al menos un equipo'
      }, { status: 400 })
    }

    // ✅ Determinar prefijo según tipo de servicio
    const prefijo = tipoServicioForm === 'DOMICILIO' ? 'SD' : 'ST'

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

    const costoTotalNum = costoTotalEquipos + costoServiciosAdicionales
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
    const estadoInicial = tipoServicioForm === 'DOMICILIO' ? 'EN_DOMICILIO' : 'RECEPCIONADO'

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
        costoRepuestos: 0,
        total: costoTotalNum,
        aCuenta: aCuentaNum,
        saldo: saldoNum,
        serviciosAdicionales: serviciosAdicionales || [],
        metodoPago,
        fechaRecepcion: new Date(),
        fechaEntregaEstimada: fechaEstimada ? new Date(fechaEstimada) : null,
        garantiaDias: parseInt(garantiaDias) || 30,
        fotosEquipo: primerEquipo.fotos || [], // ✅ Fotos del primer equipo como referencia
        estado: estadoInicial,
        prioridad,
        // ✅ CAMPOS PARA SERVICIOS A DOMICILIO
        tipoServicio: tipoServicioForm,
        direccionServicio: direccionServicio || null
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

    // ✅ AHORA CREAR UN SERVICIO ITEM POR CADA EQUIPO
    console.log('📦 Creando', equipos.length, 'items de servicio...')
    for (let i = 0; i < equipos.length; i++) {
      const equipo = equipos[i]
      
      // Para este MVP, usamos una "línea" por equipo en lugar de vincular a un producto específico
      // En el futuro se podría vincular a productos del catálogo
      const item = await prisma.servicioItem.create({
        data: {
          servicioId: servicio.id,
          productoId: '', // ✅ Podría linkear a producto, pero por ahora vacío
          cantidad: 1,
          precioUnit: equipo.costoServicio,
          subtotal: equipo.costoServicio,
          // ✅ Guardamos los datos del equipo en JSON para referencia
          detalles: {
            tipoEquipo: equipo.tipoEquipo,
            marcaModelo: equipo.marcaModelo,
            descripcionEquipo: equipo.descripcionEquipo,
            problema: equipo.descripcionProblema,
            problemasIds: equipo.problemasSeleccionados?.map((p: any) => p.id) || [],
            fotos: equipo.fotos || []
          }
        }
      })
      
      console.log(`  ✅ Item ${i + 1}: ${equipo.tipoEquipo} - S/ ${equipo.costoServicio}`)
    }

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
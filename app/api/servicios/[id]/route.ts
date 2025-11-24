import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    console.log('🔍 Buscando servicio con ID:', id)

    const servicio = await prisma.servicioTecnico.findUnique({
      where: {
        id: id
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
        tipoServicioRelacion: true, // ✅ Relación correcta
        items: {  // ✅ AGREGAR ESTE INCLUDE
          include: {
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
        }
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

    // ✅ PARSEAR fotosEquipo, fotosDespues Y serviciosAdicionales
    let fotosEquipoParsed: string[] = []
    let fotosDespuesParsed: string[] = []
    let serviciosAdicionalesParsed: unknown[] = []
    let problemasReportadosParsed: unknown[] = []

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

    console.log('✅ fotosEquipo parseado:', fotosEquipoParsed)
    console.log('✅ fotosDespues parseado:', fotosDespuesParsed)
    console.log('✅ serviciosAdicionales parseado:', serviciosAdicionalesParsed)
    console.log('✅ items (repuestos):', servicio.items.length)

    // Formatear respuesta
    const servicioFormateado = {
      ...servicio,
      fotosEquipo: fotosEquipoParsed,
      fotosDespues: fotosDespuesParsed,
      serviciosAdicionales: serviciosAdicionalesParsed,
      problemasReportados: problemasReportadosParsed,
      tecnico: servicio.usuario,
      tipoServicioTipo: servicio.tipoServicio, // ✅ String "TALLER" o "DOMICILIO"
      tipoServicio: servicio.tipoServicioRelacion, // ✅ Relación al tipo de servicio
      items: servicio.items // ✅ YA INCLUIDO
    }

    return NextResponse.json({
      success: true,
      servicio: servicioFormateado
    })
  } catch (error) {
    console.error('Error al obtener servicio:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al obtener servicio'
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
    
    console.log('📝 Actualizando servicio ID:', id)

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
      tecnicoId
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
      const costoServicioNum = parseFloat(costoServicio) || 0
      let costoServiciosAdicionales = 0

      if (serviciosAdicionales && Array.isArray(serviciosAdicionales)) {
        costoServiciosAdicionales = serviciosAdicionales.reduce((sum: number, servicio: any) => {
          return sum + (parseFloat(servicio.precio) || 0)
        }, 0)
      }

      const costoTotalNum = costoServicioNum + costoServiciosAdicionales
      const aCuentaNum = parseFloat(aCuenta) || 0
      const saldoNum = costoTotalNum - aCuentaNum

      dataToUpdate.costoServicio = costoServicioNum
      dataToUpdate.serviciosAdicionales = serviciosAdicionales || []
      dataToUpdate.total = costoTotalNum
      dataToUpdate.aCuenta = aCuentaNum
      dataToUpdate.saldo = saldoNum
    } else {
      console.log('⚠️ No se pueden editar costos - Estado:', servicioExistente.estado)
    }

    // ✅ Actualizar técnico si se proporciona
    if (tecnicoId) {
      dataToUpdate.usuario = {
        connect: { id: tecnicoId }
      }
    }

    // Actualizar cliente si cambió
    if (clienteDni !== servicioExistente.clienteDni) {
      const clienteExistente = await prisma.cliente.findFirst({
        where: { numeroDoc: clienteDni }
      })

      if (clienteExistente) {
        await prisma.cliente.update({
          where: { id: clienteExistente.id },
          data: {
            nombre: clienteNombre,
            telefono: clienteCelular
          }
        })
        
        dataToUpdate.cliente = {
          connect: { id: clienteExistente.id }
        }
      } else {
        const nuevoCliente = await prisma.cliente.create({
          data: {
            tipoDoc: 'DNI',
            numeroDoc: clienteDni,
            nombre: clienteNombre,
            telefono: clienteCelular
          }
        })
        
        dataToUpdate.cliente = {
          connect: { id: nuevoCliente.id }
        }
      }
    } else {
      if (servicioExistente.clienteId) {
        await prisma.cliente.update({
          where: { id: servicioExistente.clienteId },
          data: {
            nombre: clienteNombre,
            telefono: clienteCelular
          }
        })
      }
    }

    // Actualizar servicio
    const servicioActualizado = await prisma.servicioTecnico.update({
      where: { id },
      data: dataToUpdate,
      include: {
        cliente: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            username: true
          }
        },
        sede: true
      }
    })

    console.log('✅ Servicio actualizado:', servicioActualizado.numeroServicio)

    return NextResponse.json({
      success: true,
      message: 'Servicio actualizado correctamente',
      servicio: servicioActualizado
    })
  } catch (error: any) {
    console.error('❌ Error al actualizar servicio:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al actualizar servicio'
    }, { status: 500 })
  }
}
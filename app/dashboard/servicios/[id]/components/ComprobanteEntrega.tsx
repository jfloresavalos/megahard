"use client"

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ServicioComprobante {
  numeroServicio: string
  clienteNombre: string
  clienteDni: string
  clienteCelular: string
  tipoEquipo: string
  tipoServicioTipo?: string // ✅ "TALLER" o "DOMICILIO"
  direccionServicio?: string | null // ✅ Para servicios a domicilio
  marcaModelo: string
  descripcionEquipo: string
  diagnostico: string | null
  solucion: string | null
  costoServicio: number
  costoRepuestos: number
  total: number
  aCuenta: number
  saldo: number
  fechaRecepcion: string
  fechaEntregaReal: string
  quienRecibeNombre: string | null
  quienRecibeDni: string | null
  sede: {
    nombre: string
    direccion: string
    telefono: string
  }
  items?: Array<{
    cantidad: number
    precioUnit: number
    subtotal: number
    producto: {
      codigo: string
      nombre: string
    }
  }>
  productosVendidos?: Array<{
    codigo: string
    nombre: string
    cantidad: number
    precioUnit: number
    subtotal: number
  }>
  garantiaDias: number
  metodoPago?: string | null
  metodoPagoSaldo?: string | null
  serviciosAdicionales?: any // ✅ Para parsear múltiples equipos
}

const formatFecha = (fecha: string) => {
  return new Date(fecha).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const generarComprobantePDF = (servicio: ServicioComprobante) => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let yPos = 10

    // ==================== PARSEAR EQUIPOS ====================
    let equipos: any[] = [];

    if (servicio.serviciosAdicionales) {
      try {
        let parsed: any;
        if (typeof servicio.serviciosAdicionales === 'string') {
          parsed = JSON.parse(servicio.serviciosAdicionales);
        } else if (typeof servicio.serviciosAdicionales === 'object') {
          parsed = servicio.serviciosAdicionales;
        }

        if (parsed && parsed.equipos && Array.isArray(parsed.equipos)) {
          equipos = parsed.equipos;
        }
      } catch (error) {
        console.error('❌ Error parseando serviciosAdicionales:', error);
      }
    }

    // Fallback: si no hay equipos, usar los datos legacy del servicio principal
    if (equipos.length === 0) {
      equipos = [{
        tipoEquipo: servicio.tipoEquipo,
        marcaModelo: servicio.marcaModelo,
        descripcionEquipo: servicio.descripcionEquipo,
        diagnostico: servicio.diagnostico,
        solucion: servicio.solucion,
        costoServicio: servicio.costoServicio
      }];
    }

    // ==================== ENCABEZADO COMPACTO ====================
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('COMPROBANTE DE ENTREGA', pageWidth / 2, yPos, { align: 'center' })

    yPos += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(servicio.sede.nombre, pageWidth / 2, yPos, { align: 'center' })

    yPos += 4
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(`${servicio.sede.direccion} - Tel: ${servicio.sede.telefono}`, pageWidth / 2, yPos, { align: 'center' })

    yPos += 2
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.line(15, yPos, pageWidth - 15, yPos)
    yPos += 5

    // ==================== INFO DEL SERVICIO ====================
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(`N° ${servicio.numeroServicio}`, 15, yPos)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(`Entrega: ${formatFecha(servicio.fechaEntregaReal)}`, pageWidth / 2, yPos, { align: 'center' })
    doc.text(`Garantía: ${servicio.garantiaDias}d`, pageWidth - 15, yPos, { align: 'right' })
    yPos += 5

    // ==================== DATOS DEL CLIENTE ====================
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('CLIENTE', 15, yPos)

    yPos += 4
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(`${servicio.clienteNombre} - DNI: ${servicio.clienteDni} - Tel: ${servicio.clienteCelular}`, 15, yPos)

    yPos += 5

    // ✅ DIRECCIÓN DEL SERVICIO (solo para DOMICILIO)
    if (servicio.tipoServicioTipo === 'DOMICILIO' && servicio.direccionServicio) {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('Dirección:', 15, yPos)
      doc.setFont('helvetica', 'normal')
      const direccionLines = doc.splitTextToSize(servicio.direccionServicio, pageWidth - 35)
      doc.text(direccionLines[0], 35, yPos)
      yPos += 4
    }

    // ==================== EQUIPOS REPARADOS ====================
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('EQUIPOS REPARADOS', 15, yPos)
    yPos += 4

    const equiposData = equipos.map((equipo: any, index: number) => [
      (index + 1).toString(),
      equipo.tipoEquipo || 'N/A',
      equipo.marcaModelo || 'N/A',
      equipo.descripcionEquipo || 'N/A',
      `S/ ${Number(equipo.costoServicio || 0).toFixed(2)}`
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'TIPO', 'MARCA/MODELO', 'DESCRIPCIÓN', 'COSTO']],
      body: equiposData,
      theme: 'grid',
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        cellPadding: 1
      },
      bodyStyles: { fontSize: 6.5, lineWidth: 0.1, lineColor: [180, 180, 180], cellPadding: 1 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 25 },
        2: { cellWidth: 30 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 22, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 15, right: 15 }
    })

    yPos = (doc as any).lastAutoTable.finalY + 4

    // ==================== REPUESTOS UTILIZADOS ====================
    if (servicio.items && servicio.items.length > 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('REPUESTOS', 15, yPos)
      yPos += 4

      const repuestosData = servicio.items.map(item => [
        item.producto.codigo,
        item.producto.nombre,
        item.cantidad.toString(),
        `S/ ${Number(item.precioUnit).toFixed(2)}`,
        `S/ ${Number(item.subtotal).toFixed(2)}`
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['Cód.', 'Producto', 'Cant.', 'P.U.', 'Subt.']],
        body: repuestosData,
        theme: 'grid',
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontSize: 7,
          fontStyle: 'bold',
          halign: 'center',
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
          cellPadding: 1
        },
        bodyStyles: { fontSize: 6.5, lineWidth: 0.1, lineColor: [180, 180, 180], cellPadding: 1 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 'auto' },
          2: { halign: 'center', cellWidth: 12 },
          3: { halign: 'right', cellWidth: 20 },
          4: { halign: 'right', cellWidth: 20, fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 }
      })

      yPos = (doc as any).lastAutoTable.finalY + 4
    }

    // ==================== SERVICIOS ADICIONALES ====================
    // Parsear servicios adicionales para mostrarlos en una tabla
    let serviciosAdicionalesArray: any[] = []
    if (servicio.serviciosAdicionales) {
      try {
        let parsed: any
        if (typeof servicio.serviciosAdicionales === 'string') {
          parsed = JSON.parse(servicio.serviciosAdicionales)
        } else if (typeof servicio.serviciosAdicionales === 'object') {
          parsed = servicio.serviciosAdicionales
        }

        if (parsed && parsed.servicios && Array.isArray(parsed.servicios)) {
          serviciosAdicionalesArray = parsed.servicios
        }
      } catch (error) {
        console.error('❌ Error parseando servicios adicionales:', error)
      }
    }

    if (serviciosAdicionalesArray.length > 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('SERVICIOS ADICIONALES', 15, yPos)
      yPos += 4

      const serviciosData = serviciosAdicionalesArray.map((servicio: any, index: number) => [
        (index + 1).toString(),
        servicio.nombre || servicio.descripcion || 'Servicio adicional',
        `S/ ${Number(servicio.precio || servicio.costo || 0).toFixed(2)}`
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'DESCRIPCIÓN', 'PRECIO']],
        body: serviciosData,
        theme: 'grid',
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontSize: 7,
          fontStyle: 'bold',
          halign: 'center',
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
          cellPadding: 1
        },
        bodyStyles: { fontSize: 6.5, lineWidth: 0.1, lineColor: [180, 180, 180], cellPadding: 1 },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 }
      })

      yPos = (doc as any).lastAutoTable.finalY + 4
    }

    // ==================== PRODUCTOS VENDIDOS ====================
    if (servicio.productosVendidos && servicio.productosVendidos.length > 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('PRODUCTOS VENDIDOS', 15, yPos)
      yPos += 4

      const productosData = servicio.productosVendidos.map(item => [
        item.codigo,
        item.nombre,
        item.cantidad.toString(),
        `S/ ${Number(item.precioUnit).toFixed(2)}`,
        `S/ ${Number(item.subtotal).toFixed(2)}`
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['Cód.', 'Producto', 'Cant.', 'P.U.', 'Subt.']],
        body: productosData,
        theme: 'grid',
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontSize: 7,
          fontStyle: 'bold',
          halign: 'center',
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
          cellPadding: 1
        },
        bodyStyles: { fontSize: 6.5, lineWidth: 0.1, lineColor: [180, 180, 180], cellPadding: 1 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 'auto' },
          2: { halign: 'center', cellWidth: 12 },
          3: { halign: 'right', cellWidth: 20 },
          4: { halign: 'right', cellWidth: 20, fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 }
      })

      yPos = (doc as any).lastAutoTable.finalY + 4
    }

    // ==================== RESUMEN DE PAGOS ====================
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('RESUMEN', 15, yPos)
    yPos += 4

    const labelX = 18
    const valueX = pageWidth - 18

    // Calcular totales por equipo
    const totalEquipos = equipos.reduce((sum, eq) => sum + Number(eq.costoServicio || 0), 0)

    // Parsear servicios adicionales para calcular su total
    let totalServiciosAdicionales = 0
    if (servicio.serviciosAdicionales) {
      try {
        let parsed: any
        if (typeof servicio.serviciosAdicionales === 'string') {
          parsed = JSON.parse(servicio.serviciosAdicionales)
        } else if (typeof servicio.serviciosAdicionales === 'object') {
          parsed = servicio.serviciosAdicionales
        }

        if (parsed && parsed.servicios && Array.isArray(parsed.servicios)) {
          totalServiciosAdicionales = parsed.servicios.reduce((sum: number, s: any) => sum + (Number(s.precio) || 0), 0)
        }
      } catch (error) {
        console.error('❌ Error parseando servicios adicionales:', error)
      }
    }

    // Calcular total de productos vendidos
    const totalProductosVendidos = servicio.productosVendidos?.reduce((sum: number, item: any) =>
      sum + (Number(item.subtotal) || (item.cantidad * item.precioUnit) || 0), 0) || 0

    // Costo de Servicios (equipos)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(`Servicios (${equipos.length} eq.):`, labelX, yPos)
    doc.text(`S/ ${totalEquipos.toFixed(2)}`, valueX, yPos, { align: 'right' })
    yPos += 3.5

    // Servicios Adicionales (si hay)
    if (totalServiciosAdicionales > 0) {
      doc.text('Serv. Adicionales:', labelX, yPos)
      doc.text(`S/ ${totalServiciosAdicionales.toFixed(2)}`, valueX, yPos, { align: 'right' })
      yPos += 3.5
    }

    // Costo de Repuestos
    doc.text('Repuestos:', labelX, yPos)
    doc.text(`S/ ${Number(servicio.costoRepuestos).toFixed(2)}`, valueX, yPos, { align: 'right' })
    yPos += 3.5

    // Productos Vendidos (si hay)
    if (totalProductosVendidos > 0) {
      doc.text('Productos:', labelX, yPos)
      doc.text(`S/ ${totalProductosVendidos.toFixed(2)}`, valueX, yPos, { align: 'right' })
      yPos += 3.5
    }

    // Línea separadora
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.line(labelX, yPos, valueX, yPos)
    yPos += 3

    // TOTAL (calculado correctamente)
    const totalCalculado = totalEquipos + totalServiciosAdicionales + Number(servicio.costoRepuestos) + totalProductosVendidos
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL:', labelX, yPos)
    doc.text(`S/ ${totalCalculado.toFixed(2)}`, valueX, yPos, { align: 'right' })
    yPos += 4

    // PAGADO (con método de pago si existe)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    const pagado = Number(servicio.aCuenta || 0)
    const saldo = Number(servicio.saldo)

    // Determinar el método de pago a mostrar
    const metodoPagoMostrar = servicio.metodoPagoSaldo || servicio.metodoPago

    if (metodoPagoMostrar) {
      doc.text(`Pagado (${metodoPagoMostrar}):`, labelX, yPos)
    } else {
      doc.text('Pagado:', labelX, yPos)
    }
    doc.text(`S/ ${pagado.toFixed(2)}`, valueX, yPos, { align: 'right' })
    yPos += 3.5

    // Solo mostrar SALDO si hay saldo pendiente
    if (saldo > 0) {
      doc.setFont('helvetica', 'bold')
      doc.text('SALDO:', labelX, yPos)
      doc.text(`S/ ${saldo.toFixed(2)}`, valueX, yPos, { align: 'right' })
      yPos += 4
    }

    yPos += 4

    // ==================== GARANTÍA Y FIRMA ====================
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(`GARANTÍA: ${servicio.garantiaDias} días`, 15, yPos)
    yPos += 3
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.text('No cubre mal uso, golpes, líquidos o manipulación por terceros', 15, yPos)

    yPos += 6

    // CONFORMIDAD Y FIRMA
    const nombreReceptor = servicio.quienRecibeNombre || servicio.clienteNombre
    const dniReceptor = servicio.quienRecibeDni || servicio.clienteDni

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('CONFORME', 15, yPos)
    yPos += 3

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.text(`${nombreReceptor} - DNI: ${dniReceptor}`, 15, yPos)
    yPos += 5

    // Línea de firma
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 80, yPos)
    yPos += 2.5
    doc.setFontSize(6)
    doc.text('Firma', 15, yPos)

    // ==================== FOOTER ====================
    const footerY = pageHeight - 10
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.2)
    doc.line(15, footerY - 2, pageWidth - 15, footerY - 2)

    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text(servicio.sede.nombre, pageWidth / 2, footerY, { align: 'center' })

    const fechaImpresion = new Date().toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    doc.setFontSize(5)
    doc.text(`Impreso: ${fechaImpresion}`, pageWidth / 2, footerY + 3, { align: 'center' })

    // Descargar PDF
    doc.save(`Comprobante_${servicio.numeroServicio}.pdf`)
}

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
    let yPos = 15

    // ==================== ENCABEZADO SIMPLE ====================
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('COMPROBANTE DE ENTREGA', pageWidth / 2, yPos, { align: 'center' })

    yPos += 7
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(servicio.sede.nombre, pageWidth / 2, yPos, { align: 'center' })

    yPos += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(servicio.sede.direccion, pageWidth / 2, yPos, { align: 'center' })

    yPos += 4
    doc.text(`Tel: ${servicio.sede.telefono}`, pageWidth / 2, yPos, { align: 'center' })

    yPos += 2
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.line(20, yPos, pageWidth - 20, yPos)
    yPos += 8

    // ==================== INFO DEL SERVICIO ====================
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`N° Servicio: ${servicio.numeroServicio}`, 20, yPos)
    doc.text(`Fecha Entrega: ${formatFecha(servicio.fechaEntregaReal)}`, pageWidth - 20, yPos, { align: 'right' })
    yPos += 5
    doc.setFont('helvetica', 'normal')
    doc.text(`Recepción: ${formatFecha(servicio.fechaRecepcion)}`, 20, yPos)
    doc.text(`Garantía: ${servicio.garantiaDias} días`, pageWidth - 20, yPos, { align: 'right' })
    yPos += 8

    // ==================== SECCIÓN CLIENTE Y EQUIPO (DOS COLUMNAS) ====================
    const col1X = 20
    const col2X = pageWidth / 2 + 5
    const sectionStartY = yPos

    // COLUMNA 1: DATOS DEL CLIENTE
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('DATOS DEL CLIENTE', col1X, yPos)

    yPos += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Nombre: ${servicio.clienteNombre}`, col1X, yPos)
    yPos += 4
    doc.text(`DNI: ${servicio.clienteDni}`, col1X, yPos)
    yPos += 4
    doc.text(`Celular: ${servicio.clienteCelular}`, col1X, yPos)

    // COLUMNA 2: DATOS DEL EQUIPO
    yPos = sectionStartY
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(servicio.tipoServicioTipo === 'DOMICILIO' ? 'EQUIPO REPARADO (DOMICILIO)' : 'EQUIPO REPARADO', col2X, yPos)

    yPos += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Tipo: ${servicio.tipoEquipo}`, col2X, yPos)
    yPos += 4
    doc.text(`Modelo: ${servicio.marcaModelo}`, col2X, yPos)
    yPos += 4
    const descripcion = servicio.descripcionEquipo || 'N/A'
    const descripcionCorta = descripcion.length > 25 ? descripcion.substring(0, 25) + '...' : descripcion
    doc.text(`Desc: ${descripcionCorta}`, col2X, yPos)

    yPos = sectionStartY + 18

    // ✅ DIRECCIÓN DEL SERVICIO (solo para DOMICILIO)
    if (servicio.tipoServicioTipo === 'DOMICILIO' && servicio.direccionServicio) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('📍 DIRECCIÓN DEL SERVICIO', 20, yPos)
      yPos += 6

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const direccionLines = doc.splitTextToSize(servicio.direccionServicio, pageWidth - 40)
      doc.text(direccionLines, 20, yPos)
      yPos += direccionLines.length * 4 + 6
    }

    // ==================== DIAGNÓSTICO Y SOLUCIÓN ====================
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('DIAGNÓSTICO Y SOLUCIÓN', 20, yPos)
    yPos += 6

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Diagnóstico:', 20, yPos)
    yPos += 4
    doc.setFont('helvetica', 'normal')
    if (servicio.diagnostico) {
      const diagnosticoLines = doc.splitTextToSize(servicio.diagnostico, pageWidth - 40)
      doc.text(diagnosticoLines, 20, yPos)
      yPos += diagnosticoLines.length * 4
    }

    yPos += 3
    doc.setFont('helvetica', 'bold')
    doc.text('Solución:', 20, yPos)
    yPos += 4
    doc.setFont('helvetica', 'normal')
    if (servicio.solucion) {
      const solucionLines = doc.splitTextToSize(servicio.solucion, pageWidth - 40)
      doc.text(solucionLines, 20, yPos)
      yPos += solucionLines.length * 4
    }

    yPos += 8

    // ==================== REPUESTOS UTILIZADOS ====================
    if (servicio.items && servicio.items.length > 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('REPUESTOS UTILIZADOS', 20, yPos)
      yPos += 5

      const repuestosData = servicio.items.map(item => [
        item.producto.codigo,
        item.producto.nombre,
        item.cantidad.toString(),
        `S/ ${Number(item.precioUnit).toFixed(2)}`,
        `S/ ${Number(item.subtotal).toFixed(2)}`
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['Código', 'Producto', 'Cant.', 'P. Unit.', 'Subtotal']],
        body: repuestosData,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center',
          lineWidth: 0.1,
          lineColor: [0, 0, 0]
        },
        bodyStyles: { fontSize: 8, lineWidth: 0.1, lineColor: [150, 150, 150] },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 'auto' },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'right', cellWidth: 25 },
          4: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 }
      })

      yPos = (doc as any).lastAutoTable.finalY + 6
    }

    // ==================== PRODUCTOS VENDIDOS ====================
    if (servicio.productosVendidos && servicio.productosVendidos.length > 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('PRODUCTOS ADICIONALES', 20, yPos)
      yPos += 5

      const productosData = servicio.productosVendidos.map(item => [
        item.codigo,
        item.nombre,
        item.cantidad.toString(),
        `S/ ${Number(item.precioUnit).toFixed(2)}`,
        `S/ ${Number(item.subtotal).toFixed(2)}`
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['Código', 'Producto', 'Cant.', 'P. Unit.', 'Subtotal']],
        body: productosData,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center',
          lineWidth: 0.1,
          lineColor: [0, 0, 0]
        },
        bodyStyles: { fontSize: 8, lineWidth: 0.1, lineColor: [150, 150, 150] },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 'auto' },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'right', cellWidth: 25 },
          4: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 }
      })

      yPos = (doc as any).lastAutoTable.finalY + 6
    }

    // ==================== RESUMEN DE PAGOS ====================
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('RESUMEN DE PAGOS', 20, yPos)
    yPos += 6

    const labelX = 25
    const valueX = pageWidth - 25

    // Costo de Servicio
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Costo de Servicio:', labelX, yPos)
    doc.text(`S/ ${Number(servicio.costoServicio).toFixed(2)}`, valueX, yPos, { align: 'right' })
    yPos += 5

    // Costo de Repuestos
    doc.text('Costo de Repuestos:', labelX, yPos)
    doc.text(`S/ ${Number(servicio.costoRepuestos).toFixed(2)}`, valueX, yPos, { align: 'right' })
    yPos += 2

    // Línea separadora
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.line(labelX, yPos, valueX, yPos)
    yPos += 5

    // TOTAL
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL:', labelX, yPos)
    doc.text(`S/ ${Number(servicio.total).toFixed(2)}`, valueX, yPos, { align: 'right' })
    yPos += 6

    // PAGADO (con método de pago si existe)
    doc.setFont('helvetica', 'normal')
    const pagado = Number(servicio.aCuenta || 0)
    const saldo = Number(servicio.saldo)

    // Determinar el método de pago a mostrar
    // Priorizar metodoPagoSaldo si existe (pago al entregar), sino usar metodoPago (pago inicial)
    const metodoPagoMostrar = servicio.metodoPagoSaldo || servicio.metodoPago

    if (metodoPagoMostrar) {
      doc.text(`Pagado (${metodoPagoMostrar}):`, labelX, yPos)
    } else {
      doc.text('Pagado:', labelX, yPos)
    }
    doc.text(`S/ ${pagado.toFixed(2)}`, valueX, yPos, { align: 'right' })
    yPos += 2

    // Solo mostrar SALDO si hay saldo pendiente
    if (saldo > 0) {
      // Línea separadora
      doc.line(labelX, yPos, valueX, yPos)
      yPos += 5

      // SALDO PENDIENTE
      doc.setFont('helvetica', 'bold')
      doc.text('SALDO PENDIENTE:', labelX, yPos)
      doc.text(`S/ ${saldo.toFixed(2)}`, valueX, yPos, { align: 'right' })
    }

    yPos += 10

    // ==================== GARANTÍA ====================
    if (yPos > 240) {
      doc.addPage()
      yPos = 20
    }

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(`GARANTÍA: ${servicio.garantiaDias} días desde la entrega`, 20, yPos)
    yPos += 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text('No cubre daños por mal uso, golpes, líquidos o manipulación por terceros', 20, yPos)

    yPos += 10

    // ==================== CONFORMIDAD DEL CLIENTE ====================
    const nombreReceptor = servicio.quienRecibeNombre || servicio.clienteNombre
    const dniReceptor = servicio.quienRecibeDni || servicio.clienteDni

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('CONFORMIDAD DEL CLIENTE', 20, yPos)
    yPos += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`Nombre: ${nombreReceptor}`, 20, yPos)
    yPos += 4
    doc.text(`DNI: ${dniReceptor}`, 20, yPos)
    yPos += 8

    // Línea de firma
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.line(20, yPos, 100, yPos)
    yPos += 4
    doc.setFontSize(7)
    doc.text('Firma del Cliente', 20, yPos)

    // ==================== FOOTER ====================
    const footerY = pageHeight - 15
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.line(15, footerY - 3, pageWidth - 15, footerY - 3)

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(servicio.sede.nombre, pageWidth / 2, footerY, { align: 'center' })
    doc.text(`${servicio.sede.direccion} - Tel: ${servicio.sede.telefono}`, pageWidth / 2, footerY + 3, { align: 'center' })

    const fechaImpresion = new Date().toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    doc.setFontSize(6)
    doc.text(`Impreso: ${fechaImpresion}`, pageWidth / 2, footerY + 6, { align: 'center' })

    // Descargar PDF
    doc.save(`Comprobante_${servicio.numeroServicio}.pdf`)
}

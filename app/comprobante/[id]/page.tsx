"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import jsPDF from "jspdf"

interface Venta {
  id: string
  numeroVenta: string
  tipoComprobante: string
  subtotal: number
  total: number
  fecha: string
  cliente: {
    nombre: string
    numeroDoc: string
    telefono: string | null
  } | null
  usuario: {
    nombre: string
  }
  sede: {
    nombre: string
    direccion: string
    telefono: string | null
  }
  items: Array<{
    cantidad: number
    precioUnit: number
    subtotal: number
    producto: {
      nombre: string
      codigo: string
    }
  }>
  pagos: Array<{
    monto: number
    metodoPago: {
      nombre: string
    }
  }>
}

interface ConfigEmpresa {
  nombreEmpresa: string
  ruc: string
  logotipo: string | null
  direccion?: string
  telefono?: string
  emailContacto: string | null
}

export default function ComprobantePage() {
  const params = useParams()
  const router = useRouter()
  const [venta, setVenta] = useState<Venta | null>(null)
  const [config, setConfig] = useState<ConfigEmpresa | null>(null)
  const [loading, setLoading] = useState(true)
  const comprobanteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    cargarDatos()
  }, [params.id])

  const cargarDatos = async () => {
    try {
      const [ventaRes, configRes] = await Promise.all([
        fetch(`/api/ventas/${params.id}`),
        fetch('/api/configuracion')
      ])

      const ventaData = await ventaRes.json()
      const configData = await configRes.json()

      if (ventaData.success) {
        setVenta(ventaData.venta)
      }

      if (configData.success) {
        setConfig(configData.configuracion)
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImprimir = () => {
    window.print()
  }

  const handleDescargarPDF = () => {
    if (!venta || !comprobanteRef.current) return

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // Configuración
    const pageWidth = doc.internal.pageSize.width
    let y = 20

    // Encabezado - Nombre de empresa
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(config?.nombreEmpresa || 'MEGAHARD', pageWidth / 2, y, { align: 'center' })
    y += 8

    if (config?.ruc) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`RUC: ${config.ruc}`, pageWidth / 2, y, { align: 'center' })
      y += 5
    }

    if (venta.sede.direccion) {
      doc.text(venta.sede.direccion, pageWidth / 2, y, { align: 'center' })
      y += 5
    }

    if (venta.sede.telefono) {
      doc.text(`Tel: ${venta.sede.telefono}`, pageWidth / 2, y, { align: 'center' })
      y += 8
    } else {
      y += 3
    }

    // Línea separadora
    doc.setLineWidth(0.5)
    doc.line(20, y, pageWidth - 20, y)
    y += 8

    // Tipo de comprobante y número
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`${venta.tipoComprobante} DE VENTA`, pageWidth / 2, y, { align: 'center' })
    y += 7
    doc.setFontSize(12)
    doc.text(venta.numeroVenta, pageWidth / 2, y, { align: 'center' })
    y += 10

    // Fecha
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const fecha = new Date(venta.fecha).toLocaleString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    doc.text(`Fecha: ${fecha}`, 20, y)
    y += 10

    // Información del cliente
    doc.setFont('helvetica', 'bold')
    doc.text('CLIENTE:', 20, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    if (venta.cliente) {
      doc.text(`Nombre: ${venta.cliente.nombre}`, 20, y)
      y += 5
      if (venta.cliente.numeroDoc !== '00000000') {
        doc.text(`Documento: ${venta.cliente.numeroDoc}`, 20, y)
        y += 5
      }
    } else {
      doc.text('Cliente no registrado', 20, y)
      y += 5
    }

    y += 5

    // Tabla de productos
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(240, 240, 240)
    doc.rect(20, y, pageWidth - 40, 7, 'F')
    doc.text('CANT', 25, y + 5)
    doc.text('DESCRIPCIÓN', 45, y + 5)
    doc.text('P. UNIT', pageWidth - 65, y + 5)
    doc.text('SUBTOTAL', pageWidth - 35, y + 5)
    y += 10

    // Items
    doc.setFont('helvetica', 'normal')
    venta.items.forEach((item) => {
      doc.text(item.cantidad.toString(), 25, y)
      doc.text(item.producto.nombre, 45, y)
      doc.text(`S/ ${Number(item.precioUnit).toFixed(2)}`, pageWidth - 65, y)
      doc.text(`S/ ${Number(item.subtotal).toFixed(2)}`, pageWidth - 35, y)
      y += 6
    })

    y += 5

    // Línea separadora
    doc.setLineWidth(0.3)
    doc.line(20, y, pageWidth - 20, y)
    y += 8

    // Total
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('TOTAL:', pageWidth - 70, y)
    doc.text(`S/ ${Number(venta.total).toFixed(2)}`, pageWidth - 35, y)
    y += 8

    // Método de pago
    if (venta.pagos && venta.pagos.length > 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Método de pago: ${venta.pagos[0].metodoPago.nombre}`, 20, y)
      y += 5
    }

    // Atendido por
    y += 5
    doc.text(`Atendido por: ${venta.usuario.nombre}`, 20, y)

    // Footer
    y = doc.internal.pageSize.height - 20
    doc.setFontSize(9)
    doc.text('¡Gracias por su preferencia!', pageWidth / 2, y, { align: 'center' })

    // Descargar
    doc.save(`Comprobante-${venta.numeroVenta}.pdf`)
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '1.2rem'
      }}>
        Cargando comprobante...
      </div>
    )
  }

  if (!venta) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        gap: '1rem'
      }}>
        <p>No se encontró el comprobante</p>
        <button
          onClick={() => router.push('/dashboard/ventas')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Volver a Ventas
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Botones de acción - solo visible en pantalla */}
      <div className="no-print" style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        display: 'flex',
        gap: '0.5rem',
        zIndex: 1000
      }}>
        <button
          onClick={handleDescargarPDF}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          📄 Descargar PDF
        </button>
        <button
          onClick={handleImprimir}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          🖨️ Imprimir
        </button>
        <button
          onClick={() => router.push('/dashboard/ventas')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '600'
          }}
        >
          ← Volver
        </button>
      </div>

      {/* Comprobante */}
      <div ref={comprobanteRef} style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '2rem',
        backgroundColor: 'white',
        minHeight: '100vh'
      }}>
        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {config?.logotipo && (
            <img
              src={config.logotipo}
              alt="Logo"
              style={{
                maxWidth: '150px',
                maxHeight: '80px',
                marginBottom: '1rem'
              }}
            />
          )}
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 'bold',
            margin: '0.5rem 0',
            textTransform: 'uppercase'
          }}>
            {config?.nombreEmpresa || 'MEGAHARD'}
          </h1>
          {config?.ruc && (
            <p style={{ margin: '0.25rem 0', fontSize: '0.95rem' }}>
              RUC: {config.ruc}
            </p>
          )}
          <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: '#666' }}>
            {venta.sede.direccion}
          </p>
          {venta.sede.telefono && (
            <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: '#666' }}>
              Tel: {venta.sede.telefono}
            </p>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '2px solid #000', margin: '1.5rem 0' }} />

        {/* Tipo de comprobante */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            margin: '0.5rem 0'
          }}>
            {venta.tipoComprobante} DE VENTA
          </h2>
          <p style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            margin: '0.5rem 0'
          }}>
            {venta.numeroVenta}
          </p>
        </div>

        {/* Información general */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ margin: '0.5rem 0' }}>
            <strong>Fecha:</strong> {new Date(venta.fecha).toLocaleString('es-PE', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <p style={{ margin: '0.5rem 0' }}>
            <strong>Sede:</strong> {venta.sede.nombre}
          </p>
        </div>

        {/* Información del cliente */}
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: 'bold',
            marginBottom: '0.75rem'
          }}>
            CLIENTE:
          </h3>
          {venta.cliente ? (
            <>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Nombre:</strong> {venta.cliente.nombre}
              </p>
              {venta.cliente.numeroDoc !== '00000000' && (
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>Documento:</strong> {venta.cliente.numeroDoc}
                </p>
              )}
              {venta.cliente.telefono && (
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>Teléfono:</strong> {venta.cliente.telefono}
                </p>
              )}
            </>
          ) : (
            <p style={{ margin: '0.25rem 0', fontStyle: 'italic' }}>
              Cliente no registrado
            </p>
          )}
        </div>

        {/* Tabla de productos */}
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '1.5rem'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{
                padding: '0.75rem',
                textAlign: 'left',
                border: '1px solid #d1d5db',
                fontWeight: 'bold'
              }}>CANT</th>
              <th style={{
                padding: '0.75rem',
                textAlign: 'left',
                border: '1px solid #d1d5db',
                fontWeight: 'bold'
              }}>DESCRIPCIÓN</th>
              <th style={{
                padding: '0.75rem',
                textAlign: 'right',
                border: '1px solid #d1d5db',
                fontWeight: 'bold'
              }}>P. UNIT</th>
              <th style={{
                padding: '0.75rem',
                textAlign: 'right',
                border: '1px solid #d1d5db',
                fontWeight: 'bold'
              }}>SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            {venta.items.map((item, index) => (
              <tr key={index}>
                <td style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  textAlign: 'center'
                }}>{item.cantidad}</td>
                <td style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db'
                }}>
                  {item.producto.nombre}
                  <br />
                  <small style={{ color: '#6b7280' }}>{item.producto.codigo}</small>
                </td>
                <td style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  textAlign: 'right'
                }}>S/ {Number(item.precioUnit).toFixed(2)}</td>
                <td style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  textAlign: 'right',
                  fontWeight: '600'
                }}>S/ {Number(item.subtotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '1.5rem'
        }}>
          <div style={{ width: '300px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.75rem',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              fontSize: '1.25rem',
              fontWeight: 'bold'
            }}>
              <span>TOTAL:</span>
              <span>S/ {Number(venta.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Método de pago */}
        {venta.pagos && venta.pagos.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ margin: '0.5rem 0' }}>
              <strong>Método de pago:</strong> {venta.pagos[0].metodoPago.nombre}
            </p>
          </div>
        )}

        {/* Atendido por */}
        <p style={{ margin: '1rem 0', fontSize: '0.95rem', color: '#666' }}>
          <strong>Atendido por:</strong> {venta.usuario.nombre}
        </p>

        <hr style={{ border: 'none', borderTop: '1px solid #d1d5db', margin: '2rem 0' }} />

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#666' }}>
          <p style={{ margin: '0.5rem 0' }}>
            ¡Gracias por su preferencia!
          </p>
          {config?.emailContacto && (
            <p style={{ margin: '0.5rem 0' }}>
              Email: {config.emailContacto}
            </p>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </>
  )
}

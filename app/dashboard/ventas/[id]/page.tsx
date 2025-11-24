"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"

interface Venta {
  id: string
  numeroVenta: string
  tipoComprobante: string
  subtotal: number
  total: number
  fecha: string
  estado: string
  motivoAnulacion: string | null
  servicio: {
    numeroServicio: string
    tipoServicio: string
  } | null
  cliente: {
    id: string
    nombre: string
    numeroDoc: string
    telefono: string | null
  } | null
  usuario: {
    nombre: string
  }
  sede: {
    nombre: string
  }
  items: Array<{
    id: string
    cantidad: number
    precioUnit: number
    precioOriginal: number
    subtotal: number
    producto: {
      codigo: string
      nombre: string
      descripcion: string | null
    }
  }>
  pagos: Array<{
    id: string
    monto: number
    metodoPago: {
      nombre: string
    }
  }>
}

export default function DetalleVentaPage() {
  const router = useRouter()
  const params = useParams()
  const ventaId = params.id as string

  const [venta, setVenta] = useState<Venta | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ventaId) {
      cargarVenta()
    }
  }, [ventaId])

  const cargarVenta = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ventas/${ventaId}`)
      const data = await response.json()

      if (data.success) {
        console.log('🔍 VENTA CARGADA EN FRONTEND:', {
          numeroVenta: data.venta.numeroVenta,
          tieneServicio: !!data.venta.servicio,
          servicio: data.venta.servicio
        })
        setVenta(data.venta)
      } else {
        alert('❌ Error: ' + data.error)
        router.push('/dashboard/ventas')
      }
    } catch (error) {
      console.error('Error al cargar venta:', error)
      alert('❌ Error al cargar venta')
      router.push('/dashboard/ventas')
    } finally {
      setLoading(false)
    }
  }

  const formatearFecha = (fecha: string) => {
    if (!fecha) return 'N/A'
    return new Date(fecha).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const obtenerColorEstado = (estado: string) => {
    return estado === 'COMPLETADA' ? '#10b981' : '#ef4444'
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        fontSize: '1.25rem',
        color: '#6b7280'
      }}>
        ⏳ Cargando venta...
      </div>
    )
  }

  if (!venta) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        fontSize: '1.25rem',
        color: '#ef4444'
      }}>
        ❌ Venta no encontrada
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      {/* HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <button
            onClick={() => router.back()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              marginBottom: '0.5rem'
            }}
          >
            ← Volver
          </button>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 'bold', margin: 0 }}>
            🛒 {venta.numeroVenta}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: '600',
            backgroundColor: obtenerColorEstado(venta.estado) + '20',
            color: obtenerColorEstado(venta.estado)
          }}>
            {venta.estado}
          </div>
        </div>
      </div>

      {/* INFORMACIÓN GENERAL */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '1.5rem',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '0.5rem'
        }}>
          📋 INFORMACIÓN GENERAL
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem'
        }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              Número de Venta
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{venta.numeroVenta}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              Tipo de Comprobante
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{venta.tipoComprobante}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              Fecha
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{formatearFecha(venta.fecha)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              Sede
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{venta.sede.nombre}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              Vendedor
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{venta.usuario.nombre}</div>
          </div>
          {venta.servicio && (
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Servicio Asociado
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                {venta.servicio.numeroServicio} {venta.servicio.tipoServicio === 'DOMICILIO' ? '🏠' : '🔧'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* INFORMACIÓN DEL CLIENTE */}
      {venta.cliente && (
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: '0.5rem'
          }}>
            👤 INFORMACIÓN DEL CLIENTE
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Nombre
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{venta.cliente.nombre}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Documento
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{venta.cliente.numeroDoc}</div>
            </div>
            {venta.cliente.telefono && (
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  Teléfono
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{venta.cliente.telefono}</div>
              </div>
            )}
            <div>
              <button
                onClick={() => router.push(`/dashboard/clientes/${venta.cliente?.id}`)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                Ver Perfil del Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTOS */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '1.5rem',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '0.5rem'
        }}>
          📦 PRODUCTOS ({venta.items.length})
        </h2>
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{
                  padding: '1rem',
                  textAlign: 'left',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  color: '#374151',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  Producto
                </th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  color: '#374151',
                  borderBottom: '1px solid #e5e7eb',
                  width: '120px'
                }}>
                  Cantidad
                </th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'right',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  color: '#374151',
                  borderBottom: '1px solid #e5e7eb',
                  width: '150px'
                }}>
                  Precio Unit.
                </th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'right',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  color: '#374151',
                  borderBottom: '1px solid #e5e7eb',
                  width: '150px'
                }}>
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {venta.items.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                    borderBottom: index < venta.items.length - 1 ? '1px solid #e5e7eb' : 'none'
                  }}
                >
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                      {item.producto.codigo} - {item.producto.nombre}
                    </div>
                    {item.producto.descripcion && (
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        {item.producto.descripcion}
                      </div>
                    )}
                  </td>
                  <td style={{
                    padding: '1rem',
                    textAlign: 'center',
                    fontWeight: '600',
                    fontSize: '1rem'
                  }}>
                    {item.cantidad}
                  </td>
                  <td style={{
                    padding: '1rem',
                    textAlign: 'right',
                    fontWeight: '500',
                    fontSize: '0.95rem'
                  }}>
                    S/ {Number(item.precioUnit).toFixed(2)}
                  </td>
                  <td style={{
                    padding: '1rem',
                    textAlign: 'right',
                    fontWeight: '600',
                    fontSize: '1rem',
                    color: '#10b981'
                  }}>
                    S/ {Number(item.subtotal).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RESUMEN DE PAGO */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '1.5rem',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '0.5rem'
        }}>
          💰 RESUMEN DE PAGO
        </h2>

        <div style={{
          backgroundColor: '#f9fafb',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '2px solid #e5e7eb',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
            fontSize: '1rem'
          }}>
            <span style={{ fontWeight: '500' }}>Subtotal:</span>
            <span style={{ fontWeight: '600' }}>S/ {Number(venta.subtotal).toFixed(2)}</span>
          </div>
          <div style={{
            borderTop: '2px solid #d1d5db',
            paddingTop: '0.75rem',
            marginTop: '0.75rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.5rem'
            }}>
              <span style={{ fontWeight: '700' }}>TOTAL:</span>
              <span style={{ fontWeight: '700', color: '#10b981' }}>
                S/ {Number(venta.total).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Métodos de Pago */}
        {venta.pagos && venta.pagos.length > 0 && (
          <div>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '1rem',
              color: '#374151'
            }}>
              💳 Métodos de Pago
            </h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {venta.pagos.map((pago) => (
                <div
                  key={pago.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '6px',
                    border: '1px solid #10b981'
                  }}
                >
                  <span style={{ fontWeight: '600', color: '#065f46' }}>
                    {pago.metodoPago.nombre}
                  </span>
                  <span style={{ fontWeight: '700', color: '#10b981' }}>
                    S/ {Number(pago.monto).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SI ESTÁ ANULADA */}
      {venta.estado === 'ANULADA' && venta.motivoAnulacion && (
        <div style={{
          backgroundColor: '#fee2e2',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginTop: '1.5rem',
          border: '2px solid #ef4444'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#dc2626'
          }}>
            🚫 VENTA ANULADA
          </h2>
          <div style={{
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '6px',
            fontSize: '0.95rem',
            color: '#374151'
          }}>
            <strong>Motivo:</strong> {venta.motivoAnulacion}
          </div>
        </div>
      )}
    </div>
  )
}
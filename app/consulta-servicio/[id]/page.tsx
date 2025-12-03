"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"

interface Servicio {
  id: string
  numeroServicio: string
  clienteNombre: string
  clienteCelular: string
  tipoEquipo: string
  marcaModelo: string
  descripcionEquipo: string
  problemasReportados: string[]
  otrosProblemas: string | null
  descripcionProblema: string
  estado: string
  prioridad: string
  fechaRecepcion: string
  fechaEntregaEstimada: string
  fechaEntregaReal: string | null
  diagnostico: string | null
  solucion: string | null
  garantiaDias: number
  sede: {
    nombre: string
    direccion: string
    telefono: string
  }
  tipoServicio: {
    nombre: string
  }
}

interface Historial {
  estadoAnterior: string
  estadoNuevo: string
  comentario: string | null
  fecha: string
}

export default function DetalleServicioPublicoPage() {
  const router = useRouter()
  const params = useParams()
  const servicioId = params.id as string

  const [servicio, setServicio] = useState<Servicio | null>(null)
  const [historial, setHistorial] = useState<Historial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const dni = sessionStorage.getItem('consultaDni')

    if (!dni) {
      router.push('/consulta-servicio')
      return
    }

    cargarServicio(dni)
  }, [servicioId, router])

  const cargarServicio = async (dni: string) => {
    try {
      const response = await fetch(`/api/consulta-servicio/${servicioId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni })
      })

      const data = await response.json()

      if (data.success) {
        setServicio(data.servicio)
        setHistorial(data.historial || [])
      } else {
        setError(data.error || 'No se pudo cargar el servicio')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error al cargar el servicio')
    } finally {
      setLoading(false)
    }
  }

  const obtenerColorEstado = (estado: string) => {
    const colores: any = {
      'RECEPCIONADO': '#3b82f6',
      'EN_DIAGNOSTICO': '#f59e0b',
      'EN_REPARACION': '#8b5cf6',
      'ESPERANDO_REPUESTOS': '#ef4444',
      'REPARADO': '#10b981',
      'ENTREGADO': '#6b7280',
    }
    return colores[estado] || '#6b7280'
  }

  const obtenerIconoEstado = (estado: string) => {
    const iconos: any = {
      'RECEPCIONADO': '📋',
      'EN_DIAGNOSTICO': '🔍',
      'EN_REPARACION': '🔧',
      'ESPERANDO_REPUESTOS': '⏳',
      'REPARADO': '✅',
      'ENTREGADO': '📦',
    }
    return iconos[estado] || '📱'
  }

  const formatearFecha = (fecha: string, incluirHora: boolean = true) => {
    if (incluirHora) {
      return new Date(fecha).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      return new Date(fecha).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: '600' }}>
          ⏳ Cargando servicio...
        </div>
      </div>
    )
  }

  if (error || !servicio) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '2rem',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😕</div>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</h2>
          <button
            onClick={() => router.push('/consulta-servicio')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {/* Mensaje para recoger equipo - Solo cuando está REPARADO */}
        {servicio.estado === 'REPARADO' && (
          <div style={{
            backgroundColor: '#10b981',
            borderRadius: '16px',
            padding: '1.5rem 2rem',
            marginBottom: '1.5rem',
            boxShadow: '0 10px 40px rgba(16, 185, 129, 0.4)',
            border: '3px solid #059669',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ fontSize: '3rem' }}>✅</div>
              <div style={{ flex: '1', minWidth: '250px' }}>
                <h2 style={{
                  color: 'white',
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  margin: '0 0 0.5rem 0'
                }}>
                  ¡Tu equipo está listo!
                </h2>
                <p style={{
                  color: '#f0fdf4',
                  fontSize: '1.1rem',
                  margin: 0,
                  fontWeight: '500'
                }}>
                  Ya puedes pasar a recogerlo en nuestra sede de <strong>{servicio.sede.nombre}</strong>
                </p>
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  display: 'inline-block'
                }}>
                  <div style={{ color: 'white', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    📍 {servicio.sede.direccion}
                  </div>
                  <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>
                    📞 {servicio.sede.telefono}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '1.5rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              fontSize: '1rem',
              cursor: 'pointer',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: 0,
              fontWeight: '600'
            }}
          >
            ← Volver
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: '0 0 0.5rem 0'
              }}>
                {servicio.numeroServicio}
              </h1>
              <p style={{ color: '#6b7280', margin: 0 }}>
                {servicio.tipoEquipo} - {servicio.marcaModelo}
              </p>
            </div>
            <div style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '20px',
              backgroundColor: obtenerColorEstado(servicio.estado) + '20',
              color: obtenerColorEstado(servicio.estado),
              fontWeight: '700',
              fontSize: '1.125rem'
            }}>
              {obtenerIconoEstado(servicio.estado)} {servicio.estado.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        {/* Fechas importantes */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '700' }}>📅 Fechas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Recibido</div>
              <div style={{ fontWeight: '600' }}>{formatearFecha(servicio.fechaRecepcion, true)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                {servicio.estado === 'ENTREGADO' ? 'Entregado' : 'Entrega estimada'}
              </div>
              <div style={{ fontWeight: '600', color: servicio.estado === 'ENTREGADO' ? '#10b981' : '#f59e0b' }}>
                {servicio.estado === 'ENTREGADO'
                  ? (() => {
                      // Buscar la fecha exacta del historial cuando cambió a ENTREGADO
                      const entregaHistorial = historial.find(h => h.estadoNuevo === 'ENTREGADO')
                      return entregaHistorial
                        ? formatearFecha(entregaHistorial.fecha, true)
                        : formatearFecha(servicio.fechaEntregaReal!, true)
                    })()
                  : formatearFecha(servicio.fechaEntregaEstimada, false)
                }
              </div>
            </div>
            {servicio.estado === 'ENTREGADO' && (
              <div>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Garantía</div>
                <div style={{ fontWeight: '600' }}>{servicio.garantiaDias} días</div>
              </div>
            )}
          </div>
        </div>

        {/* Historial */}
        {historial.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: '700' }}>📝 Historial</h3>
            <div style={{ position: 'relative', paddingLeft: '2rem' }}>
              {/* Línea vertical */}
              <div style={{
                position: 'absolute',
                left: '0.5rem',
                top: '0.5rem',
                bottom: '0.5rem',
                width: '2px',
                backgroundColor: '#e5e7eb'
              }} />

              {historial.map((item, index) => (
                <div key={index} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                  {/* Punto */}
                  <div style={{
                    position: 'absolute',
                    left: '-1.5rem',
                    top: '0.25rem',
                    width: '1rem',
                    height: '1rem',
                    borderRadius: '50%',
                    backgroundColor: obtenerColorEstado(item.estadoNuevo),
                    border: '3px solid white',
                    boxShadow: '0 0 0 2px ' + obtenerColorEstado(item.estadoNuevo)
                  }} />

                  <div>
                    <div style={{ fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
                      {obtenerIconoEstado(item.estadoNuevo)} {item.estadoNuevo.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {formatearFecha(item.fecha)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Información de contacto */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '700' }}>📍 Sede</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>{servicio.sede.nombre}</strong>
          </div>
          <div style={{ fontSize: '0.95rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            {servicio.sede.direccion}
          </div>
          <div style={{ fontSize: '0.95rem', color: '#3b82f6', fontWeight: '600' }}>
            📞 {servicio.sede.telefono}
          </div>
        </div>
      </div>
    </div>
  )
}

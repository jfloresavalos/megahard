"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

interface Servicio {
  id: string
  numeroServicio: string
  clienteNombre: string
  tipoEquipo: string
  marcaModelo: string
  estado: string
  prioridad: string
  fechaRecepcion: string
  fechaEntregaEstimada: string
  fechaEntregaReal: string | null
  sede: {
    nombre: string
  }
}

function ResultadosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dni = searchParams.get('dni')

  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Validar DNI en sessionStorage
    const dniGuardado = sessionStorage.getItem('consultaDni')

    if (!dni || dni !== dniGuardado) {
      router.push('/consulta-servicio')
      return
    }

    cargarServicios()
  }, [dni, router])

  const cargarServicios = async () => {
    try {
      const response = await fetch('/api/consulta-servicio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni })
      })

      const data = await response.json()

      if (data.success) {
        setServicios(data.servicios)
      } else {
        setError(data.error || 'No se encontraron servicios')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error al cargar los servicios')
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

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
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
          ⏳ Cargando servicios...
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
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '1.5rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}>
          <button
            onClick={() => router.push('/consulta-servicio')}
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
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1f2937',
            margin: '0 0 0.5rem 0'
          }}>
            Tus Servicios
          </h1>
          <p style={{
            color: '#6b7280',
            margin: 0
          }}>
            Encontramos {servicios.length} {servicios.length === 1 ? 'servicio' : 'servicios'}
          </p>
        </div>

        {/* Lista de servicios */}
        {error ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</div>
            <p style={{ color: '#ef4444', fontSize: '1.125rem', fontWeight: '600' }}>
              {error}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {servicios.map((servicio) => (
              <div
                key={servicio.id}
                onClick={() => router.push(`/consulta-servicio/${servicio.id}`)}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  border: '2px solid transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.15)'
                  e.currentTarget.style.borderColor = '#3b82f6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'
                  e.currentTarget.style.borderColor = 'transparent'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: '#1f2937',
                      margin: '0 0 0.25rem 0'
                    }}>
                      {servicio.numeroServicio}
                    </h2>
                    <p style={{
                      color: '#6b7280',
                      margin: 0,
                      fontSize: '0.95rem'
                    }}>
                      {servicio.tipoEquipo} - {servicio.marcaModelo}
                    </p>
                  </div>
                  <div style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    backgroundColor: obtenerColorEstado(servicio.estado) + '20',
                    color: obtenerColorEstado(servicio.estado),
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap'
                  }}>
                    {obtenerIconoEstado(servicio.estado)} {servicio.estado.replace(/_/g, ' ')}
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                      Recibido
                    </div>
                    <div style={{ fontWeight: '600', color: '#374151' }}>
                      {formatearFecha(servicio.fechaRecepcion)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                      {servicio.estado === 'ENTREGADO' ? 'Entregado' : 'Entrega estimada'}
                    </div>
                    <div style={{ fontWeight: '600', color: '#374151' }}>
                      {servicio.fechaEntregaReal
                        ? formatearFecha(servicio.fechaEntregaReal)
                        : formatearFecha(servicio.fechaEntregaEstimada)
                      }
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                      Sede
                    </div>
                    <div style={{ fontWeight: '600', color: '#374151' }}>
                      {servicio.sede.nombre}
                    </div>
                  </div>
                </div>

                <div style={{
                  marginTop: '1rem',
                  textAlign: 'right'
                }}>
                  <span style={{
                    color: '#3b82f6',
                    fontWeight: '600',
                    fontSize: '0.95rem'
                  }}>
                    Ver detalles →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ResultadosConsultaPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: '600' }}>
          ⏳ Cargando servicios...
        </div>
      </div>
    }>
      <ResultadosContent />
    </Suspense>
  )
}

"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

interface MetricasDashboard {
  totalServicios: number
  serviciosEntregados: number
  totalVentas: number
  ingresosVentas: number
  ingresosServicios: number
  serviciosPorEstado: {
    estado: string
    cantidad: number
    masAntiguo: string | null
  }[]
  comparativaSedes: {
    sede: string
    servicios: number
    ventas: number
    ingresosVentas: number
    ingresosServicios: number
    ingresos: number
  }[]
}

interface Sede {
  id: string
  nombre: string
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [isMobile, setIsMobile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [metricas, setMetricas] = useState<MetricasDashboard | null>(null)

  // Filtros
  const [sedes, setSedes] = useState<Sede[]>([])
  const [sedeSeleccionada, setSedeSeleccionada] = useState('todas')
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('hoy')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  // Función para obtener fecha de Perú
  const obtenerFechaHoyPeru = () => {
    const ahora = new Date()
    const fechaLima = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Lima' }))
    const year = fechaLima.getFullYear()
    const month = String(fechaLima.getMonth() + 1).padStart(2, '0')
    const day = String(fechaLima.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Calcular rango de fechas según período
  const calcularRangoFechas = () => {
    // Si hay fechas personalizadas, usarlas
    if (periodoSeleccionado === 'personalizado' && fechaDesde && fechaHasta) {
      return { desde: fechaDesde, hasta: fechaHasta }
    }

    const hoy = obtenerFechaHoyPeru()
    const fecha = new Date(hoy + 'T00:00:00')

    switch (periodoSeleccionado) {
      case 'hoy':
        return { desde: hoy, hasta: hoy }

      case 'semana':
        const inicioSemana = new Date(fecha)
        inicioSemana.setDate(fecha.getDate() - fecha.getDay())
        return {
          desde: inicioSemana.toISOString().split('T')[0],
          hasta: hoy
        }

      case 'mes':
        const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
        return {
          desde: inicioMes.toISOString().split('T')[0],
          hasta: hoy
        }

      default:
        return { desde: hoy, hasta: hoy }
    }
  }

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    cargarSedes()
  }, [])

  useEffect(() => {
    cargarMetricas()
  }, [sedeSeleccionada, periodoSeleccionado, fechaDesde, fechaHasta])

  const cargarSedes = async () => {
    try {
      const response = await fetch('/api/sedes')
      const data = await response.json()
      if (data.success) {
        setSedes(data.sedes)
      }
    } catch (error) {
      console.error('Error al cargar sedes:', error)
    }
  }

  const cargarMetricas = async () => {
    try {
      setLoading(true)
      const { desde, hasta } = calcularRangoFechas()

      const params = new URLSearchParams({
        sedeId: sedeSeleccionada,
        fechaDesde: desde,
        fechaHasta: hasta
      })

      const response = await fetch(`/api/dashboard?${params}`)
      const data = await response.json()

      if (data.success) {
        setMetricas(data.metricas)
      }
    } catch (error) {
      console.error('Error al cargar métricas:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return 'N/A'
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short'
    })
  }

  const obtenerEmojiEstado = (estado: string) => {
    switch (estado) {
      case 'DIAGNOSTICO': return '🔴'
      case 'EN_REPARACION': return '🔧'
      case 'EN_DOMICILIO': return '🏠'
      case 'REPARADO': return '✅'
      default: return '📋'
    }
  }

  const obtenerNombreEstado = (estado: string) => {
    switch (estado) {
      case 'DIAGNOSTICO': return 'Diagnóstico'
      case 'EN_REPARACION': return 'En Reparación'
      case 'EN_DOMICILIO': return 'En Domicilio'
      case 'REPARADO': return 'Reparado'
      default: return estado
    }
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#6b7280' }}>Cargando dashboard...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? '1rem' : '0', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: isMobile ? '1.75rem' : '2.25rem',
          fontWeight: '700',
          margin: '0 0 0.5rem 0',
          color: '#111827'
        }}>
          📊 Dashboard
        </h1>
        <p style={{
          fontSize: '1rem',
          color: '#6b7280',
          margin: 0
        }}>
          Hola, {session?.user?.nombre || 'Usuario'} - Vista general del negocio
        </p>
      </div>

      {/* Filtros */}
      <div style={{
        backgroundColor: 'white',
        padding: isMobile ? '1rem' : '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '2rem',
        display: 'flex',
        gap: '1rem',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center'
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem', display: 'block' }}>
            Sede
          </label>
          <select
            value={sedeSeleccionada}
            onChange={(e) => setSedeSeleccionada(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          >
            <option value="todas">📍 Todas las sedes</option>
            {sedes.map(sede => (
              <option key={sede.id} value={sede.id}>{sede.nombre}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem', display: 'block' }}>
            Período
          </label>
          <select
            value={periodoSeleccionado}
            onChange={(e) => {
              setPeriodoSeleccionado(e.target.value)
              // Limpiar fechas personalizadas si se selecciona otro período
              if (e.target.value !== 'personalizado') {
                setFechaDesde('')
                setFechaHasta('')
              }
            }}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          >
            <option value="hoy">📅 Hoy</option>
            <option value="semana">📆 Esta semana</option>
            <option value="mes">📊 Este mes</option>
            <option value="personalizado">🗓️ Rango personalizado</option>
          </select>
        </div>

        {/* Campos de fecha personalizada */}
        {periodoSeleccionado === 'personalizado' && (
          <>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem', display: 'block' }}>
                Desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem', display: 'block' }}>
                Hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Cards Principales */}
      {metricas && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {/* Card 1: Total Ventas */}
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '2px solid #10b981'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                💰 Ventas
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981', marginBottom: '0.25rem' }}>
                {metricas.totalVentas}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#059669', fontWeight: '600' }}>
                S/ {metricas.ingresosVentas.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                Independientes
              </div>
            </div>

            {/* Card 2: Total Servicios */}
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '2px solid #3b82f6'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                🔧 Servicios
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>
                {metricas.totalServicios}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#2563eb', fontWeight: '600' }}>
                Registrados
              </div>
            </div>

            {/* Card 2.5: Ingresos Servicios */}
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '2px solid #06b6d4'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                💵 Ingresos Servicios
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#06b6d4', marginBottom: '0.25rem' }}>
                S/ {metricas.ingresosServicios.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#0891b2', fontWeight: '600' }}>
                Total generado
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                + ventas asociadas
              </div>
            </div>

            {/* Card 3: Servicios Entregados */}
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '2px solid #8b5cf6'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                📦 Entregados
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#8b5cf6' }}>
                {metricas.serviciosEntregados}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#7c3aed', fontWeight: '600' }}>
                Completados
              </div>
            </div>

            {/* Card 4: Servicios Activos */}
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '2px solid #f59e0b'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                ⚡ Activos
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
                {metricas.serviciosPorEstado.reduce((sum, s) => sum + s.cantidad, 0)}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#d97706', fontWeight: '600' }}>
                En proceso
              </div>
            </div>
          </div>

          {/* Tabla de Servicios por Estado */}
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '2rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>
              🔧 Servicios por Estado
            </h2>

            {metricas.serviciosPorEstado.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
                No hay servicios activos en este período
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>
                        Estado
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>
                        Cantidad
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>
                        % Total
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>
                        Más Antiguo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricas.serviciosPorEstado.map((item, index) => {
                      const totalActivos = metricas.serviciosPorEstado.reduce((sum, s) => sum + s.cantidad, 0)
                      const porcentaje = ((item.cantidad / totalActivos) * 100).toFixed(1)

                      return (
                        <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                              {obtenerEmojiEstado(item.estado)} {obtenerNombreEstado(item.estado)}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                              borderRadius: '12px',
                              fontSize: '0.875rem',
                              fontWeight: '600'
                            }}>
                              {item.cantidad}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                            {porcentaje}%
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#6b7280', fontSize: '0.875rem' }}>
                            {formatearFecha(item.masAntiguo)}
                          </td>
                        </tr>
                      )
                    })}
                    <tr style={{ backgroundColor: '#f9fafb', fontWeight: '600' }}>
                      <td style={{ padding: '0.75rem' }}>TOTAL ACTIVOS</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {metricas.serviciosPorEstado.reduce((sum, s) => sum + s.cantidad, 0)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>100%</td>
                      <td style={{ padding: '0.75rem' }}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Comparativa por Sedes (solo si filtro = "todas") */}
          {sedeSeleccionada === 'todas' && metricas.comparativaSedes.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>
                📊 Comparativa por Sede
              </h2>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>
                        Sede
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>
                        Ventas
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>
                        Servicios
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>
                        Ingresos
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricas.comparativaSedes.map((sede, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '0.75rem', fontWeight: '500' }}>
                          📍 {sede.sede}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', color: '#10b981', fontWeight: '600' }}>
                          {sede.ventas}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', color: '#3b82f6', fontWeight: '600' }}>
                          {sede.servicios}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: '#059669', fontWeight: '600' }}>
                          S/ {sede.ingresos.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: '#f9fafb', fontWeight: '700' }}>
                      <td style={{ padding: '0.75rem' }}>TOTAL</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#10b981' }}>
                        {metricas.comparativaSedes.reduce((sum, s) => sum + s.ventas, 0)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#3b82f6' }}>
                        {metricas.comparativaSedes.reduce((sum, s) => sum + s.servicios, 0)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#059669' }}>
                        S/ {metricas.comparativaSedes.reduce((sum, s) => sum + s.ingresos, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
